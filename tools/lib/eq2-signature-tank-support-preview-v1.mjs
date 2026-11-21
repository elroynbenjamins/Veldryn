/**
 * Review-only support/tank signature runtime feasibility. This MUST NEVER be
 * imported by Combat 2.0, live V33, Edge rewards or mobile UI.
 * All events are offline fixtures, not authenticated server encounter records.
 */
const fail=why=>{throw Error('eq2_signature_support_review_rejected:'+why)};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Number(n.toFixed(5));
const verifyTimeline=events=>{
 if(!Array.isArray(events))fail('events');
 let last=-Infinity;
 for(const e of events){
  if(!e||!finite(e.atSeconds)||e.atSeconds<0||e.atSeconds<last)fail('timeline');
  last=e.atSeconds;
 }
};
export function previewOasisAfterglow({events,trait}={}){
 if(!trait||trait.family!=='defensive_or_support'||trait.trigger!=='positive_heal_or_shield_ally'
  ||trait.shieldFractionOfTargetMaxHp!==0.02||trait.cooldownSeconds<18)fail('trait');
 verifyTimeline(events);
 let readyAt=0,shieldTotal=0;
 const shields=[],seenUses=new Set(),targetExpiry=new Map();
 for(const e of events){
  if(typeof e.abilityUseId!=='string'||!e.abilityUseId||typeof e.sourceId!=='string'
    ||!e.sourceId||typeof e.targetId!=='string'||!e.targetId
    ||!finite(e.targetMaxHp)||e.targetMaxHp<=0||!finite(e.creditedEffectiveAmount)
    ||e.creditedEffectiveAmount<0||typeof e.isDirect!=='boolean'
    ||typeof e.isAlly!=='boolean')fail('event_fields');
  if(!['heal','shield','hot_tick','gem','proc'].includes(e.kind))fail('event_kind');
  // Never roll twice from the same heal/shield ability use or on its bonus effect.
  if(seenUses.has(e.abilityUseId))continue;
  seenUses.add(e.abilityUseId);
  if(!e.isDirect||!e.isAlly||e.sourceId===e.targetId||
    e.kind==='hot_tick'||e.kind==='gem'||e.kind==='proc'||
    e.creditedEffectiveAmount<=0||e.atSeconds<readyAt)continue;
  // Preview-only target cap: an existing signature afterglow prevents reapplying
  // within six seconds. Final server status/absorption rules are still missing.
  if(e.atSeconds<(targetExpiry.get(e.targetId)??-Infinity))continue;
  const amount=round(e.targetMaxHp*0.02);
  if(amount<=0)continue;
  shieldTotal+=amount;
  shields.push({atSeconds:e.atSeconds,targetId:e.targetId,amount,
   expiresAtSeconds:e.atSeconds+6,triggeredBy:e.abilityUseId});
  targetExpiry.set(e.targetId,e.atSeconds+6);
  readyAt=e.atSeconds+trait.cooldownSeconds;
 }
 return {status:'SYNTHETIC_REVIEW_ONLY',shields,procs:shields.length,
   totalPotentialShield:round(shieldTotal),nextReadyAtSeconds:readyAt};
}
export function previewHeartwoodRetort({events,trait,maxHp}={}){
 if(!trait||trait.family!=='defensive_or_support'
  ||trait.trigger!=='damage_taken_direct_enemy_hit_at_least_15pct_max_hp'
  ||trait.damageReductionFraction!==0.02
  ||trait.durationSeconds!==5||trait.cooldownSeconds<18)fail('trait');
 if(!finite(maxHp)||maxHp<=0)fail('max_hp');
 verifyTimeline(events);
 let readyAt=0,activeUntil=-Infinity,blocked=0;
 const activations=[],outcomes=[];
 for(const e of events){
  if(!finite(e.creditedHpDamage)||e.creditedHpDamage<0
    ||!['enemy_direct','enemy_dot','environment'].includes(e.sourceKind)
    ||!['physical','magical','true'].includes(e.damageKind))fail('event_fields');
  const permitted=e.sourceKind==='enemy_direct'&&e.damageKind!=='true';
  // A heavy hit that activates the shield does not retroactively mitigate itself.
  const active=permitted&&e.atSeconds<activeUntil;
  const prevented=active?e.creditedHpDamage*trait.damageReductionFraction:0;
  blocked+=prevented;
  outcomes.push({atSeconds:e.atSeconds,prevented:round(prevented),active,
    damageAfterProtection:round(e.creditedHpDamage-prevented)});
  if(permitted&&!active&&e.atSeconds>=readyAt&&e.creditedHpDamage>=maxHp*.15){
    activeUntil=e.atSeconds+trait.durationSeconds;
    readyAt=e.atSeconds+trait.cooldownSeconds;
    activations.push({atSeconds:e.atSeconds,activeUntil,readyAt});
  }
 }
 return {status:'SYNTHETIC_REVIEW_ONLY',activations,
   activationCount:activations.length,outcomes,totalDamagePrevented:round(blocked)};
}
