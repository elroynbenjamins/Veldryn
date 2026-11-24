/** Candidate personal-power index v1. Private QA, not player CP.
 * Uses a frozen role reference and standardized opponent, never live rankings,
 * current party composition or the enemy the player happens to fight.
 * Numerical weights below are a proposal, not approved balance.
 */
import type {CombatStats} from '../types';
import {clamp,defenseMitigation,hitChance,roleAdjustedAttackPower} from '../calculations';
import type {RoleV2} from './build-contract';
export const CANDIDATE_POWER_WEIGHTS_V1=Object.freeze({
 tank:Object.freeze({offense:.25,survival:.60,support:.15}),
 damage:Object.freeze({offense:.70,survival:.20,support:.10}),
 support:Object.freeze({offense:.20,survival:.25,support:.55}),
});
export interface CandidatePowerReferenceV1{
 readonly version:string;
 readonly anchor:number;
 readonly enemyAccuracy:number;
 readonly enemyEvasion:number;
 readonly accuracyScale:number;
 readonly mitigationConstant:number;
 readonly roles:Readonly<Record<RoleV2,Readonly<CombatStats>>>;
}
const keys:readonly (keyof CombatStats)[]=['maxHp','attackPower','healingPower','defense',
 'accuracy','evasion','critChance','critMultiplier','haste'];
const finite=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
function fail(x:string):never{throw Error('combat_v2_candidate_power_'+x);}
function proxies(stats:CombatStats,role:RoleV2,ref:CandidatePowerReferenceV1){
 if(!stats||keys.some(k=>!finite(stats[k])||stats[k]<0)||stats.maxHp<=0||stats.critMultiplier<1)
  fail('invalid_stats');
 // Existing hit and mitigation functions preserve rating semantics.
 // Crit expectation is theoretical; do not assume legacy RNG distribution
 // is already calibrated or that all skills share one coefficient.
 const hit=hitChance(stats.accuracy,ref.enemyEvasion,ref.accuracyScale);
 const incomingHit=hitChance(ref.enemyAccuracy,stats.evasion,ref.accuracyScale);
 const mitigation=defenseMitigation(stats.defense,ref.mitigationConstant);
 const tempo=Math.max(.25,1+stats.haste);
 const crit=1+clamp(stats.critChance,0,.75)*(stats.critMultiplier-1);
 const attack=roleAdjustedAttackPower({team:'players',role,attackPower:stats.attackPower,
  defense:stats.defense,maxHp:stats.maxHp,healingPower:stats.healingPower});
 const values={offense:attack*hit*crit*tempo,
  survival:stats.maxHp/((1-mitigation)*incomingHit),
  support:stats.healingPower*tempo};
 if(Object.values(values).some(x=>!finite(x)||x<0))fail('invalid_proxy');
 return values;
}
export function reviewCandidatePowerV1(stats:CombatStats,role:RoleV2,ref:CandidatePowerReferenceV1){
 if(!ref||typeof ref.version!=='string'||!ref.version||!Object.hasOwn(CANDIDATE_POWER_WEIGHTS_V1,role)||
  !finite(ref.anchor)||ref.anchor<=0||!finite(ref.accuracyScale)||ref.accuracyScale<=0||
  !finite(ref.mitigationConstant)||ref.mitigationConstant<=0||
  !finite(ref.enemyAccuracy)||ref.enemyAccuracy<0||!finite(ref.enemyEvasion)||ref.enemyEvasion<0||
  !ref.roles||!ref.roles[role])fail('invalid_reference');
 const baseline=proxies(ref.roles[role],role,ref),actual=proxies(stats,role,ref);
 const w=CANDIDATE_POWER_WEIGHTS_V1[role];
 const axes=['offense','survival','support'] as const;
 const rows=axes.map(axis=>{
  if(baseline[axis]<=0)fail('zero_reference_'+axis);
  const ratio=actual[axis]/baseline[axis],points=ref.anchor*w[axis]*ratio;
  if(!finite(points)||points<0)fail('invalid_points');
  return {axis,rawProxy:actual[axis],referenceProxy:baseline[axis],weight:w[axis],ratio,points};
 });
 const score=rows.reduce((n,r)=>n+r.points,0);
 if(!finite(score)||score>Number.MAX_SAFE_INTEGER)fail('invalid_score');
 return {policy:'CANDIDATE_STATIC_ROLE_POWER_V1' as const,referenceVersion:ref.version,role,
  rows,partialScore:Math.round(score),unroundedScore:score,
  missingDomains:['advanced_effects','skill_coefficients_and_utility','gems_and_innates',
   'companion_passive_and_assist','actual_rng_calibration'] as const,
  cpApproved:false as const,canGateContent:false as const,equalCPVerified:false as const,releaseEnabled:false as const};
}
