/**
 * REVIEW ONLY: source-tagged event arithmetic for proposed Equipment 2.0.
 * NOT the live combat engine, a persisted encounter, or a production adapter.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const path=fileURLToPath(new URL('../docs/equipment-2-0/eq2-combat-affix-trait-proposal-v1.json',import.meta.url));
export const loadReviewContract=()=>JSON.parse(readFileSync(path,'utf8'));
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const requireValid=(test,code)=>{if(!test)throw Error('eq2_qa_'+code);};
const clean=x=>Math.round(x*1e6)/1e6;

/** Hit input already includes verified Attack, skill coeff, crit and defense. */
export function directHitReview({origin,damage,basicBonus=0,abilityBonus=0}){
 requireValid(finite(damage)&&damage>=0&&finite(basicBonus)&&basicBonus>=0&&basicBonus<=100&&finite(abilityBonus)&&abilityBonus>=0&&abilityBonus<=100,'bad_direct_hit');
 const boost=origin==='player_direct_basic'?basicBonus:
  origin==='player_direct_class_skill'?abilityBonus:0;
 return clean(damage*(1+boost/100));
}

/** Offline sample of canonical item-roll restrictions: never authoritative issuance. */
export function validateSampleRolls(contract,tier,items){
 requireValid(contract?.status==='REVIEW_ONLY_NOT_APPROVED'&&contract.releaseActivation===false,'missing_review_gate');
 requireValid([1,2,3,4].includes(tier)&&Array.isArray(items)&&items.length<=10,'bad_sample_loadout');
 const copies=new Set(),slots=new Set(),totals={};
 for(const item of items){
  requireValid(typeof item.instanceId==='string'&&item.instanceId.length>0&&!copies.has(item.instanceId),'duplicate_item_copy');
  requireValid(typeof item.slot==='string'&&!slots.has(item.slot),'duplicate_worn_slot');
  requireValid(Array.isArray(item.rolls)&&item.rolls.length<=3,'bad_item_rolls');
  copies.add(item.instanceId);slots.add(item.slot);
  const seen=new Set();
  for(const roll of item.rolls){
   const a=contract.affixes.find(row=>row.id===roll.id);
   requireValid(a&&a.eligibleSlots.includes(item.slot)&&!seen.has(roll.id),'ineligible_roll');
   const range=a.tiers['T'+tier];
   requireValid(finite(roll.percent)&&roll.percent>=range[0]-1e-8&&roll.percent<=range[1]+1e-8,'forged_roll_strength');
   seen.add(roll.id);
   totals[roll.id]=clean((totals[roll.id]??0)+roll.percent);
  }
 }
 for(const [id,total] of Object.entries(totals)){
  requireValid(total<=contract.affixes.find(a=>a.id===id).maxEquipmentOnlyContribution+1e-8,'legal_roll_cap_broken');
 }
 return totals;
}

/** Enforce server-derived exact-copy selection in an OFFLINE sample only. */
export function validateSampleTraitSelection(contract,characterId,equipped,selectedIds){
 requireValid(typeof characterId==='string'&&characterId.length>0,'no_character');
 requireValid(Array.isArray(equipped)&&Array.isArray(selectedIds)&&selectedIds.length<=2,'too_many_selected');
 requireValid(new Set(selectedIds).size===selectedIds.length,'duplicate_selection');
 const selected=[],types=new Set();
 for(const id of selectedIds){
  const piece=equipped.find(x=>x.instanceId===id);
  requireValid(piece&&piece.equipped===true&&piece.ownerCharacterId===characterId,'not_worn_or_owned');
  const t=contract.traits.find(x=>x.id===piece.traitId);
  requireValid(t&&t.role!=='utility'&&t.source.includes(piece.source)&&!types.has(t.id),'bad_trait_source_or_duplicate');
  types.add(t.id);selected.push({instanceId:id,traitId:t.id});
 }
 return selected;
}

/** Rolling target-specific five-second retaliation budget, never a fixed bucket. */
export function retaliationReview(contract,event,previous={history:[],lastRiposteMs:null,lastEventMs:-1}){
 const policy=contract.combatChannelPolicy.reflection;
 const {timestampMs,targetId,source,actualHpLost,defenderHpAfter,defenderMaxHp,targetMaxHp,
  regionalBoss,reflectPercent=0,thornboundActive=false}=event;
 requireValid(Number.isSafeInteger(timestampMs)&&timestampMs>=0&&timestampMs>=previous.lastEventMs&&
  typeof targetId==='string'&&targetId.length>0,'bad_retaliation_time_or_target');
 requireValid([actualHpLost,defenderHpAfter,defenderMaxHp,targetMaxHp,reflectPercent].every(finite)&&
  actualHpLost>=0&&defenderMaxHp>0&&targetMaxHp>0&&
  actualHpLost<=defenderMaxHp&&defenderHpAfter>=0&&defenderHpAfter<=defenderMaxHp&&
  reflectPercent>=0&&reflectPercent<=100&&typeof regionalBoss==='boolean','bad_retaliation_units');
 const history=previous.history.filter(x=>timestampMs-x.timestampMs<5000).map(x=>({...x}));
 const base={history,lastRiposteMs:previous.lastRiposteMs,lastEventMs:timestampMs};
 const zero={amount:0,fromAffix:0,fromTrait:0,tag:'eq2_qa_no_secondary_proc',next:base};
 if(source!=='enemy_direct_hit_post_shield_hp_loss'||actualHpLost===0||defenderHpAfter===0)
  return zero;
 const riposte=contract.traits.find(x=>x.id==='thornbound_riposte');
 const traitReady=thornboundActive&&(previous.lastRiposteMs===null||
  timestampMs-previous.lastRiposteMs>=riposte.cooldownSeconds*1000);
 const affix=actualHpLost*reflectPercent/100;
 const trait=traitReady?Math.min(actualHpLost*riposte.params.reflectedTakenDamagePercent/100,
  defenderMaxHp*riposte.params.reflectOwnMaxHpCapPercent/100):0;
 const perHit=defenderMaxHp*policy.maxPlayerMaxHpPercentPerSourceHit/100;
 const window=targetMaxHp*(regionalBoss?
  policy.maxRegionalBossHpPercentPerFiveSeconds:policy.maxEnemyMaxHpPercentPerFiveSeconds)/100;
 const spent=history.filter(x=>x.targetId===targetId).reduce((sum,x)=>sum+x.amount,0);
 const amount=Math.max(0,Math.min(affix+trait,perHit,window-spent));
 const fromAffix=Math.min(amount,affix),fromTrait=Math.max(0,amount-fromAffix);
 return {amount:clean(amount),fromAffix:clean(fromAffix),fromTrait:clean(fromTrait),
  tag:'eq2_qa_no_secondary_proc',next:{
   ...base,
   history:amount>0?[...history,{timestampMs,targetId,amount}]:history,
   lastRiposteMs:fromTrait>0?timestampMs:previous.lastRiposteMs,
  }};
}

/** Only direct original basic hits count. Misses or swaps reset the streak. */
export function swordDanceReview(trait,event,state={hits:0,targetId:null,lastProcMs:null}){
 requireValid(trait?.id==='sword_dance','wrong_sword_trait');
 const next={...state};
 if(event.origin!=='player_direct_basic'||event.hit!==true){
  if(event.origin==='player_direct_basic')next.hits=0;
  return {bonus:0,next};
 }
 next.hits=(next.targetId===event.targetId?next.hits:0)+1;
 next.targetId=event.targetId;
 if(next.hits<trait.params.requiredConsecutiveHits)return {bonus:0,next};
 next.hits=0;
 if(next.lastProcMs!==null&&event.timestampMs-next.lastProcMs<trait.cooldownSeconds*1000)
  return {bonus:0,next};
 next.lastProcMs=event.timestampMs;
 return {bonus:clean(event.damage*trait.params.basicDamageBonusPercent/100),next};
}

/** Trait damage is strictly secondary, capped, and cannot reenter this hook. */
export function echoingStrikeReview(trait,event,lastProcMs=null){
 requireValid(trait?.id==='echoing_strike','wrong_echo_trait');
 if(event.origin!=='player_direct_class_skill'||event.hit!==true||
  (lastProcMs!==null&&event.timestampMs-lastProcMs<trait.cooldownSeconds*1000))
  return {bonus:0,lastProcMs};
 const bonus=clean(Math.max(0,Math.min(event.damage*trait.params.echoPercentOfActualDamage/100,
  event.attackPower*trait.params.echoOwnAttackPowerCapPercent/100)));
 return {bonus,lastProcMs:bonus>0?event.timestampMs:lastProcMs};
}
export function healingEchoReview(trait,event,lastProcMs=null){
 requireValid(['mending_echo','restorative_bloom'].includes(trait?.id),'wrong_heal_trait');
 if(event.origin!=='player_direct_class_heal'||event.effectiveHeal<=0||
  event.otherAllyMissingHp<=0||
  (lastProcMs!==null&&event.timestampMs-lastProcMs<trait.cooldownSeconds*1000))
  return {bonus:0,lastProcMs};
 const percent=trait.id==='mending_echo'?
  trait.params.secondaryHealPercentOfEffectiveHeal:trait.params.hotPercentOfEffectiveHeal;
 const bonus=clean(Math.min(event.otherAllyMissingHp,event.effectiveHeal*percent/100));
 return {bonus,lastProcMs:bonus>0?event.timestampMs:lastProcMs};
}
