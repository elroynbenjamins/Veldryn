/**
 * Hidden Veldryn 2.0 compatibility boundary: exact Equipment/Crafting V2
 * receipts -> Combat V2 base-stat evidence (never a live combat actor).
 *
 * Crafting already bakes rarity/quality into frozen Attack, Defense and HP,
 * whereas Combat V2's authored definitions apply those multipliers later.
 * These two source representations must not be treated as equivalent.
 *
 * No production import, economy writer, player-facing flag or endpoint.
 */
export const EQUIPMENT_COMBAT_INTEROP_V1='eq2-cv2-exact-source-v1';
const roles=Object.freeze({
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
 DAWNKEEPER:'support',STONECALLER:'support',
});
const slots=Object.freeze(['helmet','chest','gloves','legs','boots','cape','weapon','offhand','amulet','ring']);
const levelByTier=Object.freeze({1:2,2:12,3:26,4:40});
const fail=(code)=>{throw new Error('eq2_cv2_'+code);};
const obj=(v)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const str=(v)=>typeof v==='string'&&v.length>0;
const finite=(v)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

/**
 * The caller MUST be trusted server code. It must independently load and
 * authenticate the character, equipment custody, canonical recipe and
 * immutable receipt. verifyOwnedReceipt is supplied by that server module,
 * NEVER by a remote request or untrusted client.
 *
 * @param {{actor:{characterId:string,classId:string,level:number},
 * equipped:readonly {instanceId:string,ownerCharacterId:string,location:string,slot:string,receiptId:string,template:object}[],
 * trusted:{manifestVersion:string,rulesVersion:string,verifyOwnedReceipt:(entry:object)=>boolean}}} request
 * @returns {object} Immutable, combat-disabled evidence for a future adapter.
 */
export function projectVerifiedCraftingV2BaseEvidence(request){
 if(!obj(request)||!obj(request.actor)||!Array.isArray(request.equipped)||!obj(request.trusted))fail('invalid_input');
 const {actor,equipped,trusted}=request;
 if(!str(actor.characterId)||!own(roles,actor.classId)||
    !Number.isSafeInteger(actor.level)||actor.level<1||actor.level>1000)fail('unverified_actor');
 if(!str(trusted.manifestVersion)||!str(trusted.rulesVersion)||
    typeof trusted.verifyOwnedReceipt!=='function')fail('trusted_receipt_verifier_required');
 if(equipped.length>slots.length)fail('too_many_equipped_items');
 const usedIds=new Set(),usedReceipts=new Set(),usedSlots=new Set(),evidence=[],totals={attackPower:0,defense:0,maxHp:0};
 let twoHanded=false;
 for(const item of equipped){
  if(!obj(item)||!str(item.instanceId)||!str(item.receiptId)||!str(item.ownerCharacterId)||
     item.ownerCharacterId!==actor.characterId||item.location!=='equipped'||
     !slots.includes(item.slot)||usedIds.has(item.instanceId)||usedReceipts.has(item.receiptId)||usedSlots.has(item.slot))
    fail('invalid_equipped_custody');
  usedIds.add(item.instanceId);usedReceipts.add(item.receiptId);usedSlots.add(item.slot);
  const t=item.template;
  if(!obj(t)||!str(t.pieceId)||t.slot!==item.slot||
     t.manifestVersion!==trusted.manifestVersion||t.rulesVersion!==trusted.rulesVersion||
     !Number.isSafeInteger(t.tier)||!own(levelByTier,t.tier)||
     !Number.isSafeInteger(t.quality)||t.quality<0||t.quality>100||
     !str(t.rarity))fail('invalid_exact_template');
  if(actor.level<levelByTier[t.tier])fail('tier_locked');
  if(t.classRestriction!=null&&t.classRestriction!==actor.classId)fail('wrong_class');
  // Armor role is a build recommendation, not an equip restriction.
  // Only class-specific armaments require matching class role; class checks
  // remain enforced independently through classRestriction.
  if(!['tank','damage','support'].includes(t.role)
     ||((item.slot==='weapon'||item.slot==='offhand')&&t.role!==roles[actor.classId]))
    fail('role_mismatch');
  if(t.hands!==undefined&&!['one','two','dual'].includes(t.hands))fail('invalid_hands');
  if(item.slot!=='weapon'&&t.hands!==undefined)fail('hands_on_nonweapon');
  if(t.enhancementRank!==0||!Array.isArray(t.gemSlots)||t.gemSlots.length!==0)
    fail('unmigrated_gems_or_enhancements');
  if(!Array.isArray(t.affixes)||t.affixes.length>4||
     t.affixes.some(x=>!obj(x)||!str(x.stat)||!finite(x.percent)||
       !Number.isSafeInteger(x.grade)||x.grade<0||x.grade>100)||
     new Set(t.affixes.map(x=>x.stat)).size!==t.affixes.length)
    fail('untrusted_affix_snapshot');
  const base=t.baseStats;
  if(!obj(base)||Object.keys(base).length!==3||
     ['attack','defense','hp'].some(k=>!own(base,k)||!finite(base[k])))
    fail('invalid_frozen_base_stats');
  const active=Object.entries(base).filter(([,value])=>value>0);
  if(active.length<1||active.length>2)fail('one_or_two_base_stats_required');
  // The actual v2ServerExactTemplateConsistent + ownership/receipt source
  // verification must be performed in this server-controlled dependency.
  let approved=false;
  try{approved=trusted.verifyOwnedReceipt(item)===true;}catch{approved=false;}
  if(!approved)fail('receipt_not_verified');
  if(item.slot==='weapon'&&t.hands!=='one')twoHanded=true;
  const mapped=Object.freeze({
   ...(base.attack>0?{attackPower:base.attack}:{}),
   ...(base.defense>0?{defense:base.defense}:{}),
   ...(base.hp>0?{maxHp:base.hp}:{}),
  });
  for(const [key,value] of Object.entries(mapped)){
   totals[key]+=value;
   if(!Number.isFinite(totals[key])||totals[key]>1e10)fail('unbounded_equipment_total');
  }
  evidence.push(Object.freeze({
   instanceId:item.instanceId,receiptId:item.receiptId,itemId:t.pieceId,slot:item.slot,
   tier:'T'+t.tier,rarity:t.rarity,quality:t.quality,
   source:'server-frozen-exact-copy',rarityAndQualityAlreadyApplied:true,
   baseStats:mapped,unappliedAffixCount:t.affixes.length,
  }));
 }
 if(twoHanded&&usedSlots.has('offhand'))fail('two_hand_offhand_conflict');
 return Object.freeze({
  schema:EQUIPMENT_COMBAT_INTEROP_V1,actorCharacterId:actor.characterId,
  classId:actor.classId,role:roles[actor.classId],
  manifestVersion:trusted.manifestVersion,rulesVersion:trusted.rulesVersion,
  scaling:'exact-pre-scaled-do-not-reapply-rarity-or-quality',
  baseTotals:Object.freeze({...totals}),sources:Object.freeze(evidence),
  combatReady:false,
  blockedUntil:Object.freeze([
   'verified_class_baseline','affix_and_set_effects',
   'legacy_gems_and_enhancements','authoritative_combat_snapshot','nine_class_balance',
  ]),
 });
}
