/**
 * HIDDEN / NOT MOUNTED: source-owned exact-copy Equipment 2.0 -> Combat 2.0
 * skill/trait adapter. This is a structural on-server verification layer,
 * not an actual database reader. The injected verifyPersisted callback MUST
 * independently confirm the immutable account, item and build receipt digest
 * against an atomic privileged ledger. It MUST NEVER come from a client.
 *
 * Important: the existing 13 old Combat V2 affix types remain in their own
 * separately validated base/stat pipeline. Only the 3 genuinely new
 * ordinary-hit/skill-hit/retaliation channels are mapped here, ONCE.
 */
import type {GearSlotV2} from './build-contract';
import type {VerifiedSkillBuildV2} from './skill-effects';
import type {TrustedEquipmentRuntimeV2} from './unified-equipment-encounter';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {
 EQUIPMENT_V2_TRAIT_ENGINE_POLICY,EXECUTABLE_EQUIPMENT_TRAITS_V2,
 type VerifiedV2EquipmentEffectSource,type ExecutableEquipmentTraitV2,
} from './equipment-trait-engine-authority';

export const EQ2_REVIEW_ROLL_POLICY='eq2-combat-affix-traits-review-v2' as const;
export type NewEquipmentV2AffixId='basic_attack_damage_pct'|'ability_damage_pct'|'reflect_damage_pct';
export type EquipmentV2AcquisitionSource='ordinary_craft'|'rare_blueprint_craft'|
 'dungeon_boss_chest'|'party_event_chest'|'world_boss_chest';
export interface FrozenTraitRollV2{
 readonly id:NewEquipmentV2AffixId;
 /** Percent-valued, e.g. 2.5 means +2.5%, not fractional .025. */
 readonly percent:number;
}
export interface FrozenEquipmentTraitItemReceiptV2{
 readonly source:'server-persisted-exact-copy-v2';
 readonly policy:typeof EQ2_REVIEW_ROLL_POLICY;
 readonly instanceId:string;
 readonly itemId:string;
 readonly ownerCharacterId:string;
 readonly slot:GearSlotV2;
 readonly tier:'T1'|'T2'|'T3'|'T4';
 readonly rarity:'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
 readonly quality:number;
 readonly acquisition:EquipmentV2AcquisitionSource;
 readonly newAffixRolls:readonly FrozenTraitRollV2[];
 readonly signatureTraitId?:string;
}
export interface TrustedEquipmentTraitReceiptPortV2{
 readonly accountId:string;
 readonly characterId:string;
 readonly receiptRevision:number;
 readonly receiptsByInstanceId:Readonly<Record<string,FrozenEquipmentTraitItemReceiptV2>>;
 /** Authoritative server-saved build selection, not user-provided roll values. */
 readonly selectedTraitInstanceIds:readonly string[];
 readonly verifyPersisted:(
  sources:readonly VerifiedV2EquipmentEffectSource[],combatInputDigest:string,
 )=>boolean;
}
const ranges:Readonly<Record<NewEquipmentV2AffixId,Readonly<{
 readonly slots:readonly GearSlotV2[];
 readonly values:readonly [number,number];
}[]>>> = {
 basic_attack_damage_pct:[
  {slots:['weapon','gloves','amulet','ring'],values:[.8,1.6]},
  {slots:['weapon','gloves','amulet','ring'],values:[1.2,2.6]},
  {slots:['weapon','gloves','amulet','ring'],values:[1.8,3.8]},
  {slots:['weapon','gloves','amulet','ring'],values:[2.2,4.5]},
 ],
 ability_damage_pct:[
  {slots:['weapon','gloves','amulet','ring'],values:[.8,1.8]},
  {slots:['weapon','gloves','amulet','ring'],values:[1.2,2.8]},
  {slots:['weapon','gloves','amulet','ring'],values:[2,4.5]},
  {slots:['weapon','gloves','amulet','ring'],values:[2.5,5]},
 ],
 reflect_damage_pct:[
  {slots:['chest','legs','offhand','ring'],values:[.3,.7]},
  {slots:['chest','legs','offhand','ring'],values:[.5,1]},
  {slots:['chest','legs','offhand','ring'],values:[.7,1.4]},
  {slots:['chest','legs','offhand','ring'],values:[.9,1.8]},
 ],
};
const maxTotal:Readonly<Record<NewEquipmentV2AffixId,number>>={
 basic_attack_damage_pct:19,ability_damage_pct:22,reflect_damage_pct:8,
};
const counts:Readonly<Record<FrozenEquipmentTraitItemReceiptV2['rarity'],readonly [number,number]>>={
 common:[1,1],uncommon:[1,1],rare:[1,1],epic:[1,2],legendary:[2,2],mythic:[2,3],
};
const traitOrigins=new Set<EquipmentV2AcquisitionSource>([
 'rare_blueprint_craft','dungeon_boss_chest','party_event_chest',
]);
const roleTraitSources:Readonly<Record<ExecutableEquipmentTraitV2,ReadonlySet<EquipmentV2AcquisitionSource>>>={
 sword_dance:traitOrigins,
 echoing_strike:new Set(['rare_blueprint_craft','dungeon_boss_chest']),
 thornbound_riposte:new Set(['dungeon_boss_chest','party_event_chest']),
 mending_echo:new Set(['rare_blueprint_craft','party_event_chest']),
 restorative_bloom:new Set(['rare_blueprint_craft','dungeon_boss_chest']),
};
const allowedTraits=new Set<string>(EXECUTABLE_EQUIPMENT_TRAITS_V2);
const id=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=128&&
 /^[A-Za-z0-9:_-]+$/.test(x);
const fail=(reason:string):never=>{throw Error('combat_v2_exact_trait_copy_'+reason);};
const positive=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const allowedKeys=new Set(Object.keys(ranges));
const canonical=(r:FrozenEquipmentTraitItemReceiptV2)=>({
 ...r,newAffixRolls:r.newAffixRolls.map(roll=>({...roll})),
});
/** MUST be called after verified skills, ownership, base, sets and existing
 * 13-affix compiler validation. Missing sidecar = fail closed, no empty
 * synthesized trait roll. Banked/other-character copies are not accepted. */
export function compileExactEquipmentTraitSourceV2(
 build:VerifiedSkillBuildV2,
 runtime:TrustedEquipmentRuntimeV2,
 port:TrustedEquipmentTraitReceiptPortV2,
):VerifiedV2EquipmentEffectSource{
 if(!port||typeof port.verifyPersisted!=='function'||!id(port.accountId)||
  !id(port.characterId)||port.characterId!==runtime.characterId||
  !Number.isSafeInteger(port.receiptRevision)||port.receiptRevision<1||
  !Array.isArray(port.selectedTraitInstanceIds)||port.selectedTraitInstanceIds.length>2||
  new Set(port.selectedTraitInstanceIds).size!==port.selectedTraitInstanceIds.length||
  !port.receiptsByInstanceId||runtime.actorId!==build.actor.id)
  fail('trusted_receipt_scope_missing');
 const bySlot=Object.entries(build.selected.equipment) as [GearSlotV2,string][];
 const seen=new Set<string>(),slots=new Set<string>();
 const result:Record<NewEquipmentV2AffixId,number>={
  basic_attack_damage_pct:0,ability_damage_pct:0,reflect_damage_pct:0,
 };
 const receipts:FrozenEquipmentTraitItemReceiptV2[]=[];
 for(const [slot,copyId] of bySlot){
  if(!id(copyId)||seen.has(copyId)||slots.has(slot)||!build.verified.ownedInstanceIds.has(copyId))
   fail('invalid_or_duplicate_worn_copy');
  slots.add(slot);seen.add(copyId);
  const copy=runtime.instancesById[copyId],receipt=port.receiptsByInstanceId[copyId],
   existing=runtime.affixesByInstanceId[copyId];
  if(!copy||!receipt||!existing||receipt.source!=='server-persisted-exact-copy-v2'||
   receipt.policy!==EQ2_REVIEW_ROLL_POLICY||receipt.instanceId!==copyId||
   copy.id!==copyId||receipt.itemId!==copy.itemId||
   receipt.ownerCharacterId!==port.characterId||copy.ownerCharacterId!==port.characterId||
   receipt.tier!==copy.tier||receipt.rarity!==copy.rarity||receipt.quality!==copy.quality||
   receipt.slot!==slot||existing.instanceId!==copyId||existing.slot!==slot||
   existing.rarity!==copy.rarity||existing.quality!==copy.quality||
   existing.tier!==copy.tier)
   fail('item_copy_receipt_does_not_match_equipment');
  if(!Object.prototype.hasOwnProperty.call(counts,receipt.rarity)||
     !Number.isSafeInteger(receipt.quality)||receipt.quality<0||receipt.quality>100)
   fail('invalid_item_rarity_quality');
  const tier=Number(receipt.tier.slice(1));
  if(!Number.isInteger(tier)||tier<1||tier>4||
    !Array.isArray(receipt.newAffixRolls)||receipt.newAffixRolls.length>3)
   fail('invalid_roll_tier');
  const rollCount=receipt.newAffixRolls.length+existing.affixes.length;
  if(rollCount>counts[receipt.rarity][tier<=2?0:1])
   fail('rarity_roll_count_exceeds_approved_draft');
  const rollNames=new Set<string>();
  for(const roll of receipt.newAffixRolls){
   if(!roll||typeof roll.id!=='string'||!allowedKeys.has(roll.id)||
    rollNames.has(roll.id)||!positive(roll.percent)||
    Math.abs(roll.percent*100-Math.round(roll.percent*100))>1e-6)
    fail('invalid_or_duplicate_new_affix');
   const policy=ranges[roll.id][tier-1];
   if(!policy.slots.includes(slot)||roll.percent<policy.values[0]-1e-8||
      roll.percent>policy.values[1]+1e-8)
    fail('invalid_new_affix_slot_or_strength');
   rollNames.add(roll.id);
   result[roll.id]+=roll.percent;
  }
  if(receipt.signatureTraitId!==undefined){
   if(!id(receipt.signatureTraitId)||receipt.acquisition==='ordinary_craft'||
      receipt.acquisition==='world_boss_chest')
    fail('combat_trait_unapproved_source');
  }
  if(!['ordinary_craft','rare_blueprint_craft','dungeon_boss_chest',
    'party_event_chest','world_boss_chest'].includes(receipt.acquisition))
   fail('unknown_receipt_provenance');
  receipts.push(canonical(receipt));
 }
 if(Object.keys(port.receiptsByInstanceId).length!==seen.size||
    Object.keys(port.receiptsByInstanceId).some(x=>!seen.has(x)))
  fail('receipt_contains_banked_or_unequipped_copy');
 for(const kind of Object.keys(result) as NewEquipmentV2AffixId[]){
  if(result[kind]>maxTotal[kind]+1e-8)fail('total_roll_ceiling_exceeded');
 }
 const selected:VerifiedV2EquipmentEffectSource['traits'][number][]=[];
 const selectedTraits=new Set<string>();
 for(const instanceId of port.selectedTraitInstanceIds){
  const row=receipts.find(r=>r.instanceId===instanceId);
  if(!row||!row.signatureTraitId||!allowedTraits.has(row.signatureTraitId)||
    selectedTraits.has(row.signatureTraitId))
   fail('trait_not_selected_from_equipped_copy');
  const traitId=row.signatureTraitId as ExecutableEquipmentTraitV2;
  if(!roleTraitSources[traitId].has(row.acquisition))fail('trait_source_not_approved');
  selectedTraits.add(traitId);selected.push({traitId,instanceId});
 }
 const digest=enemyV2SnapshotDigest({
  policy:EQ2_REVIEW_ROLL_POLICY,accountId:port.accountId,
  characterId:port.characterId,actorId:runtime.actorId,
  revision:port.receiptRevision,items:receipts.sort((a,b)=>a.instanceId.localeCompare(b.instanceId)),
  equippedBySlot:Object.fromEntries(bySlot.sort((a,b)=>a[0].localeCompare(b[0]))),
  selectedTraitInstanceIds:[...port.selectedTraitInstanceIds],
 });
 return {
  source:'server-persisted-equipment-v2',policy:EQUIPMENT_V2_TRAIT_ENGINE_POLICY,
  revision:port.receiptRevision,accountId:port.accountId,characterId:port.characterId,
  actorId:runtime.actorId,ownedEquippedInstanceIds:[...seen],
  equipmentReceiptDigest:digest,
  basicAttackDamagePct:Math.round(result.basic_attack_damage_pct*100)/100,
  abilityDamagePct:Math.round(result.ability_damage_pct*100)/100,
  reflectDamagePct:Math.round(result.reflect_damage_pct*100)/100,
  traits:selected,
 };
}
