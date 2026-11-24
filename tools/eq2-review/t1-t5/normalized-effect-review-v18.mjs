import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL('../../../docs/'+p,import.meta.url),'utf8'));
export const contract=load('2-0/eq2-normalized-effects-review-v18.json');
const v17=load('2-0/eq2-set-trait-authoring-review-v17.json');
const blueprint=load('equipment-2-0/t1-t4-expansion-design.json');
const deny=Object.freeze({reviewOnly:true,mayApply:false,mayMint:false,mayEquip:false,mayTrade:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_effect_v18_'+x);};
const idFor=x=>x.setId?x.setId+':'+x.pieces:x.traitId??x.itemId;
export function audit(){
 const originals=v17.sets.flatMap(s=>s.milestones.filter(x=>x.sourceEffect).map(x=>({id:s.setId+':'+x.pieces,source:x.sourceEffect})));
 const byId=new Map(contract.sets.map(x=>[idFor(x),x]));
 if(byId.size!==68||contract.sets.length!==68)fail('count');
 for(const x of originals){const n=byId.get(x.id);if(!n||JSON.stringify(n.source)!==JSON.stringify(x.source))fail('source');
  if(n.kind==='conditional'&&(n.internalCooldownSeconds!==(x.source.internalCooldownSeconds??x.source.icdSeconds)||!n.trigger||!n.outputs.length))fail('conditional');
  if(n.kind==='permanent'&&!n.stats.length)fail('permanent');
 }
 const bs=blueprint.items.filter(x=>x.kind==='rare_blueprint');
 if(bs.length!==6||contract.blueprintTraits.length!==6)fail('blueprints');
 for(const b of bs){const x=contract.blueprintTraits.find(x=>x.itemId===b.id);if(!x||JSON.stringify(x.source)!==JSON.stringify(b.trait)||x.sourceBlueprintId!==b.blueprintId||x.maxCopiesEquipped!==1||x.mayCraft!==false)fail('blueprint_source');}
 return {sets:95,milestones:195,typedNew:127,typedPreserved:68,permanentPreserved:contract.sets.filter(x=>x.kind==='permanent').length,conditionalPreserved:contract.sets.filter(x=>x.kind==='conditional').length,signatureTraits:27,blueprintTraits:6,...deny};
}
function adaptV17(x,id){
 const trigger=x.trigger,extra={};
 let t=trigger;
 const loss=trigger.match(/^direct_nontrue_hp_loss_at_least_(\d+)pct$/),below=trigger.match(/^(effective_direct_class_heal|direct_physical_ability_hit|direct_class_ability_hit)_target_below_(\d+)$/),cross=trigger.match(/^cross_below_(\d+)pct_hp$/);
 if(loss){t='direct_nontrue_hp_loss';extra.minActualHpLossPct=Number(loss[1]);}
 if(below){t=below[1];extra.targetBelowHpPct=Number(below[2]);}
 if(cross){t='cross_below_hp';extra.thresholdHpPct=Number(cross[1]);}
 if(trigger.startsWith('three_consecutive_direct_')){t=trigger.includes('bow')?'consecutive_direct_bow_hits':'consecutive_direct_weapon_hits';extra.count=3;extra.sameTarget=true;}
 const consume={next_direct_spell_damage:'direct_class_spell_hit',next_basic_damage:'basic_direct_weapon_hit',next_effective_heal_on_same_ally:'effective_direct_heal_same_target',next_direct_weapon_damage:'direct_weapon_hit',next_direct_physical_ability_damage:'direct_physical_ability_hit',next_direct_nontrue_reduction:'direct_nontrue_hp_loss',next_direct_class_ability_damage:'direct_class_ability_hit',next_basic_hit_self_heal:'basic_direct_weapon_hit',next_basic_chained_scourge_damage:'basic_chained_scourge_hit'}[x.effect]??null;
 if(x.charges===1&&!consume)fail('unmapped_charge');
 return {...x,id,trigger:t,...extra,consumeOn:consume,windowSeconds:consume?x.durationSeconds:0,outputs:[{channel:x.effect,value:x.value,unit:x.unit,target:x.target,durationSeconds:consume?0:x.durationSeconds}]};
}
export function conditionalCandidates(){
 const existing=v17.sets.flatMap(s=>s.milestones.filter(x=>x.kind==='conditional').map(x=>adaptV17({...x,origin:'v17_typed_set'},s.setId+':'+x.pieces)));
 const normalize=x=>({id:idFor(x),...x});
 return [...existing,...contract.sets.filter(x=>x.kind==='conditional').map(normalize),...v17.traits.map(x=>adaptV17(x,x.itemId)),...contract.blueprintTraits.map(normalize)];
}
const validEvent=e=>e&&typeof e.id==='string'&&e.id.length>0&&typeof e.owner==='string'&&Number.isFinite(e.at)&&e.at>=0&&e.authenticated===true&&!e.recursive&&!e.reflected&&!e.selfDamage&&!e.duplicate&&!e.miss&&!e.overheal&&!e.absorbedOnly;
// An abstract, explicitly classified QA event, NOT a conversion from a raw engine log.
export function matches(c,e){
 if(!validEvent(e)||e.kind!==c.trigger)return false;
 if(/effective.*heal/.test(c.trigger)&&!c.trigger.includes('_or_')&&e.effectiveHeal!==true)return false;
 if(c.trigger==='direct_ability_hit_or_effective_heal'&&!e.directAbilityHit&&!e.effectiveHeal)return false;
 if(c.trigger==='successful_authored_cleanse_or_effective_direct_heal'&&!e.removedHostileStatus&&!e.effectiveHeal)return false;
 if(/cleanse/.test(c.trigger)&&!c.trigger.includes('_or_')&&e.removedHostileStatus!==true)return false;
 if(/evade/.test(c.trigger)&&e.verifiedEvade!==true)return false;
 if(c.trigger.includes('marked_target')&&e.authoredMark!==true||c.trigger.includes('armored_target')&&e.armoredTarget!==true||c.trigger.includes('warded_enemy')&&e.wardedTarget!==true||c.trigger.includes('debuffed_target')&&e.authoredDebuff!==true||c.trigger.includes('hostile_dot')&&e.hostileDot!==true)return false;
 if(c.trigger==='ally_direct_nontrue_hp_loss'||c.trigger==='ally_cross_below_hp'||c.trigger.includes('on_ally')){if(!e.target||e.target===e.owner)return false;}
 if(e.trueDamage&&(/nontrue|hp_loss|mitigat|heavy_direct_hit/.test(c.trigger)))return false;
 if(c.minActualHpLossPct!==undefined&&!(e.actualHpLossPct>=c.minActualHpLossPct))return false;
 if(c.selfBelowHpPct!==undefined&&!(e.selfHpPct<c.selfBelowHpPct))return false;
 if(c.targetBelowHpPct!==undefined&&!(e.targetHpPct<c.targetBelowHpPct))return false;
 if(c.thresholdHpPct!==undefined&&!(e.beforeHpPct>=c.thresholdHpPct&&e.afterHpPct<c.thresholdHpPct))return false;
 if(c.count!==undefined&&!(e.verifiedHitCount>=c.count))return false;
 if(c.sameTarget&&!e.sameTarget)return false;
 if(c.countWindowSeconds!==undefined&&!(e.countWindowSeconds<=c.countWindowSeconds))return false;
 if(c.allyOnly&&(!e.target||e.target===e.owner))return false;
 if(c.requiresEquippedShield&&!e.equippedShield)return false;
 if(c.requiredShieldEffect&&e.shieldEffect!==c.requiredShieldEffect)return false;
 if(c.minRemainingCooldownSeconds!==undefined&&!(e.remainingCooldownSeconds>=c.minRemainingCooldownSeconds))return false;
 if(c.excludeBasic&&e.basic)return false;
 return true;
}
const cooldownKey=(c,e)=>e.owner+':'+(c.sharedTraitFamily?'trait:'+c.sharedTraitFamily:c.id);
export function reviewLedger(){
 const seen=new Set(),cooldowns=new Map(),charges=new Map(),encounters=new Set();
 return {
  trigger(c,e){
   if(!matches(c,e))return {accepted:false,reason:'ineligible',...deny};
   const k=cooldownKey(c,e),receipt=k+':'+e.id,enc=k+':'+(e.encounter??'QA');
   if(seen.has(receipt))return {accepted:false,reason:'duplicate',...deny};
   seen.add(receipt);
   if(c.oncePerEncounter&&encounters.has(enc))return {accepted:false,reason:'once_per_encounter',...deny};
   if((cooldowns.get(k)??-1)>e.at||charges.has(k)&&charges.get(k).expiresAt>e.at)return {accepted:false,reason:'cooldown_or_charge',...deny};
   cooldowns.set(k,e.at+c.internalCooldownSeconds*1000);encounters.add(enc);
   if(c.consumeOn)charges.set(k,{expiresAt:e.at+c.windowSeconds*1000,triggerReceipt:e.id,kind:c.consumeOn,target:e.target,outputs:c.chargeOutputs??c.outputs});
   return {accepted:true,immediate:c.consumeOn?(c.chargeOutputs?c.outputs:[]):c.outputs??[],charge:!!c.consumeOn,...deny};
  },
  consume(c,e){
   if(!validEvent(e)||e.trueDamage&&e.kind==='direct_nontrue_hp_loss')return {accepted:false,...deny};
   const k=cooldownKey(c,e),ch=charges.get(k);
   if(!ch||ch.triggerReceipt===e.id||e.at>=ch.expiresAt||e.at<ch.expiresAt-c.windowSeconds*1000)return {accepted:false,...deny};
   if(ch.kind==='direct_ability_hit_or_effective_heal'){
    if(!['direct_class_ability_hit','effective_direct_class_heal'].includes(e.kind))return {accepted:false,...deny};
   }else if(e.kind!==ch.kind)return {accepted:false,...deny};
   if(ch.kind==='effective_direct_heal_same_target'&&e.effectiveHeal!==true)return {accepted:false,...deny};
   if(ch.kind==='direct_ability_hit_or_effective_heal'&&e.kind==='effective_direct_class_heal'&&e.effectiveHeal!==true)return {accepted:false,...deny};
   if(ch.kind.includes('same_target')&&(!ch.target||ch.target!==e.target))return {accepted:false,...deny};
   const receipt=k+':'+e.id;
   if(seen.has(receipt))return {accepted:false,...deny};
   seen.add(receipt);charges.delete(k);return {accepted:true,outputs:ch.outputs,...deny};
  }
 };
}
export function stackingPreview({damage=[],mitigation=[],shields=[],trueDamage=false,refunds=[]}={}){
 for(const xs of [damage,mitigation,shields,refunds])if(!Array.isArray(xs)||xs.some(x=>!Number.isFinite(x)||x<0))fail('stacking_input');
 return {damagePct:Math.min(20,damage.reduce((a,b)=>a+b,0)),mitigationPct:trueDamage?0:Math.min(15,Math.max(0,...mitigation)),
  equipmentShield:Math.max(0,...shields),refundSeconds:Math.min(.5,Math.max(0,...refunds)),...deny};
}
export function eligibleFixture(c,extra={}){
 return {id:'QA-1',owner:'QA-actor',target:'QA-target',encounter:'QA-fight',at:1000,authenticated:true,kind:c.trigger,
  actualHpLossPct:10,selfHpPct:25,targetHpPct:25,beforeHpPct:60,afterHpPct:20,verifiedHitCount:5,countWindowSeconds:5,
  sameTarget:true,effectiveHeal:true,removedHostileStatus:true,verifiedEvade:true,authoredMark:true,armoredTarget:true,wardedTarget:true,authoredDebuff:true,hostileDot:true,directAbilityHit:true,equippedShield:true,shieldEffect:c.requiredShieldEffect,remainingCooldownSeconds:4,...extra};
}
export function summary(){
 const c=conditionalCandidates();
 return {...audit(),conditionalCandidates:c.length,proposedStacking:true,engineEffectsApplied:0,fullCpApproved:false,...deny};
}
