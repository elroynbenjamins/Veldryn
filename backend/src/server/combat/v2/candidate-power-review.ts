/** Candidate personal-power index v1. Private QA, not player CP.
 * Uses a frozen role reference and standardized opponent, never live rankings,
 * current party composition or the enemy the player happens to fight.
 * Numerical weights below are a proposal, not approved balance.
 */
import type {CombatStats} from '../types';
import {clamp,defenseMitigation,hitChance,roleAdjustedAttackPower} from '../calculations';
import type {RoleV2} from './build-contract';
import type {PowerAttributionStagesV2} from './power-composition';
import {launchPlayer} from '../content/launch-combat';
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
export interface CandidateHitPointsV2{readonly accuracyPp:number;readonly evasionPp:number;}
function proxies(stats:CombatStats,role:RoleV2,ref:CandidatePowerReferenceV1,points?:CandidateHitPointsV2){
 if(!stats||keys.some(k=>!finite(stats[k])||stats[k]<0)||stats.maxHp<=0||stats.critMultiplier<1)
  fail('invalid_stats');
 // Existing hit and mitigation functions preserve rating semantics.
 // Crit expectation is theoretical; do not assume legacy RNG distribution
 // is already calibrated or that all skills share one coefficient.
 if(points&&(!finite(points.accuracyPp)||!finite(points.evasionPp)||points.accuracyPp<0||points.accuracyPp>1||points.evasionPp<0||points.evasionPp>1))
  fail('invalid_hit_points');
 const hit=clamp(hitChance(stats.accuracy,ref.enemyEvasion,ref.accuracyScale)+(points?.accuracyPp??0),0,1);
 const incomingHit=clamp(hitChance(ref.enemyAccuracy,stats.evasion,ref.accuracyScale)-(points?.evasionPp??0),0,1);
 if(incomingHit<=0)fail('unbounded_survival_proxy');
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
function scoreCandidate(stats:CombatStats,role:RoleV2,ref:CandidatePowerReferenceV1,points?:CandidateHitPointsV2){
 if(!ref||typeof ref.version!=='string'||!ref.version||!Object.hasOwn(CANDIDATE_POWER_WEIGHTS_V1,role)||
  !finite(ref.anchor)||ref.anchor<=0||!finite(ref.accuracyScale)||ref.accuracyScale<=0||
  !finite(ref.mitigationConstant)||ref.mitigationConstant<=0||
  !finite(ref.enemyAccuracy)||ref.enemyAccuracy<0||!finite(ref.enemyEvasion)||ref.enemyEvasion<0||
  !ref.roles||!ref.roles[role])fail('invalid_reference');
 const baseline=proxies(ref.roles[role],role,ref),actual=proxies(stats,role,ref,points);
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

/** Original static candidate, unchanged for callers without advanced effects. */
export function reviewCandidatePowerV1(stats:CombatStats,role:RoleV2,ref:CandidatePowerReferenceV1){
 return scoreCandidate(stats,role,ref);
}
/** V2 extends V1 with actual hit probability points only. It does not price
 * Ward, Penetration, Tenacity, Potency, shields or authored abilities using
 * invented encounter-frequency assumptions. */
export function reviewCandidatePowerWithHitPointsV2(stats:CombatStats,role:RoleV2,ref:CandidatePowerReferenceV1,points:CandidateHitPointsV2){
 const scored=scoreCandidate(stats,role,ref,points);
 return {...scored,policy:'CANDIDATE_STATIC_ROLE_POWER_V2_HIT_POINTS' as const,
  pricedAdvancedChannels:['accuracy_pp','evasion_pp'] as const,
  missingDomains:['remaining_advanced_effects','skill_coefficients_and_utility','gems_and_innates',
   'companion_assist','actual_rng_calibration'] as const};
}

/** A single frozen QA reference for every candidate comparison. Its version
 * must change if the source baseline or normalization changes. This is not
 * an approved level-25 progression target. */
export const QA_CANDIDATE_POWER_REFERENCE_V1:CandidatePowerReferenceV1=Object.freeze({
 version:'QA_L25_LAUNCH_REFERENCE_V1',anchor:1000,enemyAccuracy:1600,enemyEvasion:100,
 accuracyScale:1400,mitigationConstant:1200,roles:Object.freeze({
  tank:Object.freeze({...launchPlayer('Ironwarden',25).stats}),
  damage:Object.freeze({...launchPlayer('Ravager',25).stats}),
  support:Object.freeze({...launchPlayer('Dawnkeeper',25).stats}),
 }),
});
/** Nonlinear candidate attribution: recompute the SAME power function at
 * each verified stat stage and take marginal differences. Do not add raw
 * stat weights to the nonlinear score or apply a bonus a second time.
 * Round each cumulative score before subtraction for exact integer totals. */
export function reviewCandidatePowerStagesV1(stages:PowerAttributionStagesV2,role:RoleV2,ref:CandidatePowerReferenceV1){
 const sequence=[
  ['class_only',stages.classOnly],['skills',stages.afterSkills],
  ['item_base',stages.afterItemBase],['set_stats',stages.afterSets],
  ['random_affix_stats',stages.afterAffixes],
 ] as const;
 let previous=0;
 const rows=sequence.map(([source,stats])=>{
  const score=reviewCandidatePowerV1(stats,role,ref);
  const value=score.partialScore-previous;
  previous=score.partialScore;
  return {source,value,cumulative:score.partialScore,axes:score.rows};
 });
 const final=reviewCandidatePowerV1(stages.afterAffixes,role,ref);
 return {...final,stageRows:rows,trainedBaseline:rows[1].cumulative,
  gearContribution:final.partialScore-rows[1].cumulative,
  attributionScope:'NONLINEAR_MARGINAL_STATIC_CANDIDATE' as const};
}

/** Compare compiled personal stats and independently projected companion
 * passives in one rating scale. Active assists are deliberately unpriced.
 * This accepts private QA stat snapshots only, not client item/gem input. */
export function reviewCandidatePowerExtensionsV2(
 stages:PowerAttributionStagesV2,role:RoleV2,ref:CandidatePowerReferenceV1,
 points:CandidateHitPointsV2,afterCompanionPassive:CombatStats,
){
 const base=reviewCandidatePowerStagesV1(stages,role,ref);
 const withPoints=reviewCandidatePowerWithHitPointsV2(stages.afterAffixes,role,ref,points);
 const withPassive=reviewCandidatePowerWithHitPointsV2(afterCompanionPassive,role,ref,points);
 const hitPointContribution=withPoints.partialScore-base.partialScore;
 const companionPassiveContribution=withPassive.partialScore-withPoints.partialScore;
 return {base,withPoints,withPassive,hitPointContribution,companionPassiveContribution,
  total:withPassive.partialScore,activeAssistPriced:false as const,
  gemInnateRuntimeIntegrated:false as const,cpApproved:false as const,releaseEnabled:false as const};
}
