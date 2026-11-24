/**
 * Skills & Abilities 2.0 — REVIEW-ONLY paired counterplay diagnostics.
 *
 * Consumes independently supplied synthetic engine summaries. It does not
 * authenticate a combat trace, grant rewards, modify an encounter, or approve
 * any balance value. Used only by the hidden Combat 2.0 QA workflow.
 */
import type {ClassIdV2} from './build-contract';
import {CLASS_NAMES_V2,SPECIALIZATIONS_V2} from './skill-catalog';

export type CounterplayStrategyV2='generic'|'targeted'|'alternative';
export type CounterplayOutcomeV2='win'|'wipe'|'timeout';

export interface AbilityCounterplaySampleV2 {
 readonly scenarioId:string;
 readonly classId:ClassIdV2;
 readonly specializationId:string;
 readonly enemyId:string;
 readonly seed:number;
 readonly combatLevel:number;
 readonly combatPower:number;
 readonly strategy:CounterplayStrategyV2;
 readonly outcome:CounterplayOutcomeV2;
 readonly enemyHpRemainingPct:number;
 readonly playerHpRemainingPct:number;
 readonly damageDealt:number;
 readonly damageTaken:number;
 readonly effectiveHealing:number;
 readonly interrupts:number;
 readonly cleanses:number;
 readonly mitigationEvents:number;
 readonly counterMechanicEvents:number;
}
export interface CounterplayComparisonV2 {
 readonly scenarioId:string;
 readonly classId:ClassIdV2;
 readonly specializationId:string;
 readonly enemyId:string;
 readonly seed:number;
 readonly combatPower:number;
 readonly generic:CounterplayOutcomeV2;
 readonly targeted:CounterplayOutcomeV2;
 readonly alternative:CounterplayOutcomeV2;
 readonly targetedDamageRatio:number|null;
 readonly alternativeDamageRatio:number|null;
 readonly targetedMechanicEvents:number;
 readonly targetedEnemyHpRemainingPct:number;
 readonly genericEnemyHpRemainingPct:number;
 readonly alternativeEnemyHpRemainingPct:number;
}
export type CounterplayFindingTypeV2=
 'targeted_underperforms_generic'|'targeted_mechanic_absent'|
 'alternative_route_gap'|'all_strategies_wipe'|'zero_damage';
export interface CounterplayFindingV2 {
 readonly type:CounterplayFindingTypeV2;
 readonly scenarioId:string;
 readonly detail:string;
}
export interface CounterplayReviewV2 {
 readonly provenance:'synthetic_qa_not_release_balance';
 readonly releaseApproved:false;
 readonly comparisons:readonly CounterplayComparisonV2[];
 readonly findings:readonly CounterplayFindingV2[];
}
const invalid=(code:string):never=>{throw Error('combat_v2_counterplay_qa_'+code);};
const pct=(v:number)=>Number.isFinite(v)&&v>=0&&v<=100;
const nonnegative=(v:number)=>Number.isFinite(v)&&v>=0;
const ratio=(a:number,b:number)=>b>0?Math.round(a/b*1e4)/1e4:null;
const outcomeRank:Readonly<Record<CounterplayOutcomeV2,number>>={wipe:0,timeout:1,win:2};
const strategies:readonly CounterplayStrategyV2[]=['generic','targeted','alternative'];
const specializations=new Set(SPECIALIZATIONS_V2.map(s=>s.id));
const groupKey=(s:AbilityCounterplaySampleV2)=>[
 s.scenarioId,s.classId,s.specializationId,s.enemyId,s.seed,
].join('|');

/**
 * Every comparison must contain all three strategies on the exact same
 * scenario/seed/combat level/CP. Review findings are descriptive; there is no
 * hardcoded class ranking or unapproved balance threshold.
 */
export function reviewAbilityCounterplayV2(
 samples:readonly AbilityCounterplaySampleV2[],
):CounterplayReviewV2 {
 if(!Array.isArray(samples)||samples.length===0)invalid('empty_samples');
 const grouped=new Map<string,AbilityCounterplaySampleV2[]>();
 for(const s of samples){
  if(!s||typeof s.scenarioId!=='string'||!s.scenarioId||
    typeof s.enemyId!=='string'||!s.enemyId||
    !Object.prototype.hasOwnProperty.call(CLASS_NAMES_V2,s.classId)||
    !specializations.has(s.specializationId)||
    !SPECIALIZATIONS_V2.some(spec=>spec.id===s.specializationId&&spec.classId===s.classId)||
    !Number.isSafeInteger(s.seed)||s.seed<0||
    !Number.isSafeInteger(s.combatLevel)||s.combatLevel<1||
    !Number.isSafeInteger(s.combatPower)||s.combatPower<1||
    !strategies.includes(s.strategy)||
    !['win','wipe','timeout'].includes(s.outcome)||
    !pct(s.enemyHpRemainingPct)||!pct(s.playerHpRemainingPct)||
    [s.damageDealt,s.damageTaken,s.effectiveHealing].some(v=>!nonnegative(v))||
    [s.interrupts,s.cleanses,s.mitigationEvents,s.counterMechanicEvents]
      .some(v=>!Number.isSafeInteger(v)||v<0)||
    (s.outcome==='win'&&s.enemyHpRemainingPct!==0)||
    (s.outcome==='wipe'&&s.playerHpRemainingPct!==0))
    invalid('invalid_sample');
  const key=groupKey(s);
  grouped.set(key,[...(grouped.get(key)??[]),s]);
 }
 const comparisons:CounterplayComparisonV2[]=[];
 const findings:CounterplayFindingV2[]=[];
 for(const [key,rows] of [...grouped.entries()].sort(([a],[b])=>a.localeCompare(b))){
  if(rows.length!==3||new Set(rows.map(r=>r.strategy)).size!==3)
   invalid('incomplete_or_duplicate_strategy');
  const [base,...others]=rows;
  if(others.some(s=>s.combatLevel!==base.combatLevel||s.combatPower!==base.combatPower))
   invalid('unmatched_combat_level_or_power');
  const generic=rows.find(r=>r.strategy==='generic')!;
  const targeted=rows.find(r=>r.strategy==='targeted')!;
  const alternative=rows.find(r=>r.strategy==='alternative')!;
  const comparison:CounterplayComparisonV2={
   scenarioId:base.scenarioId,classId:base.classId,specializationId:base.specializationId,
   enemyId:base.enemyId,seed:base.seed,combatPower:base.combatPower,
   generic:generic.outcome,targeted:targeted.outcome,alternative:alternative.outcome,
   targetedDamageRatio:ratio(targeted.damageDealt,generic.damageDealt),
   alternativeDamageRatio:ratio(alternative.damageDealt,generic.damageDealt),
   targetedMechanicEvents:targeted.counterMechanicEvents,
   targetedEnemyHpRemainingPct:targeted.enemyHpRemainingPct,
   genericEnemyHpRemainingPct:generic.enemyHpRemainingPct,
   alternativeEnemyHpRemainingPct:alternative.enemyHpRemainingPct,
  };
  comparisons.push(comparison);
  const note=(type:CounterplayFindingTypeV2,detail:string)=>
   findings.push({type,scenarioId:base.scenarioId,detail});
  const targetedRank=outcomeRank[targeted.outcome],genericRank=outcomeRank[generic.outcome];
  if(targetedRank<genericRank||
    (targetedRank===genericRank&&
     targeted.enemyHpRemainingPct>=generic.enemyHpRemainingPct&&
     targeted.playerHpRemainingPct<=generic.playerHpRemainingPct))
   note('targeted_underperforms_generic','Counter build has no clear outcome/HP advantage over generic');
  if(targeted.counterMechanicEvents===0)
   note('targeted_mechanic_absent','Targeted build did not exercise any counterplay mechanic');
  if(targeted.outcome==='win'&&alternative.outcome==='wipe')
   note('alternative_route_gap','Targeted win but alternative wiped; review mandatory-counter risk');
  if(rows.every(r=>r.outcome==='wipe'))
   note('all_strategies_wipe','All three simulated approaches wiped');
  if(rows.every(r=>r.damageDealt===0))
   note('zero_damage','All three simulated approaches dealt no damage');
 }
 return {provenance:'synthetic_qa_not_release_balance',releaseApproved:false,
  comparisons,findings};
}
