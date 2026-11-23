/**
 * HIDDEN 2.0 read-only classification of WHY a class-native counter is absent.
 * These are observed engine summaries, not a signed event log or balance policy.
 * Never issues combat authority, release approval, skills, XP or rewards.
 */
export type ObservedCounterStrategyV2='targeted'|'alternative';
export type ObservedCounterRouteV2='control'|'cleanse'|'sustain'|'pressure';
export type ObservedCounterExplanationV2=
 'class_native_counter_unavailable'|'boss_opportunity_not_observed'|
 'selected_counter_not_cast'|'counter_cast_without_result'|'counter_effect_observed';

export interface ObservedCounterAttemptV2{
 readonly scenarioId:string;
 readonly classId:string;
 readonly specializationId:string;
 readonly enemyId:string;
 readonly strategy:ObservedCounterStrategyV2;
 readonly route:ObservedCounterRouteV2;
 /** Derived by reading compiled server-authored class abilities, not UI labels. */
 readonly hasMatchingCounter:boolean;
 /** Actual boss opportunity events within this combat trace. */
 readonly observedOpportunityEvents:number;
 /** Actual completed selected class skill casts with eligible effects. */
 readonly eligibleSkillCasts:number;
 /** Actual mechanic events attributed to a selected class skill/effect. */
 readonly attributedCounterEvents:number;
}
export interface ObservedCounterExplanationRowV2{
 readonly scenarioId:string;
 readonly classId:string;
 readonly specializationId:string;
 readonly enemyId:string;
 readonly strategy:ObservedCounterStrategyV2;
 readonly route:ObservedCounterRouteV2;
 readonly explanation:ObservedCounterExplanationV2;
 readonly opportunityEvents:number;
 readonly eligibleCasts:number;
 readonly attributedEvents:number;
}
export interface ObservedCounterOpportunityReviewV2{
 readonly provenance:'unsigned_replayed_engine_QA_only';
 readonly releaseApproved:false;
 readonly comparisons:number;
 readonly rows:readonly ObservedCounterExplanationRowV2[];
 readonly counts:Readonly<Record<ObservedCounterExplanationV2,number>>;
}
const invalid=(reason:string):never=>{throw Error('combat_v2_opportunity_qa_'+reason);};
const possible:readonly ObservedCounterExplanationV2[]=[
 'class_native_counter_unavailable','boss_opportunity_not_observed',
 'selected_counter_not_cast','counter_cast_without_result','counter_effect_observed',
];
const nonnegative=(v:number)=>Number.isSafeInteger(v)&&v>=0;
export function reviewObservedCounterOpportunityV2(
 input:readonly ObservedCounterAttemptV2[],
):ObservedCounterOpportunityReviewV2{
 if(!Array.isArray(input)||input.length===0||input.length%2!==0)invalid('invalid_matrix_size');
 const groups=new Map<string,ObservedCounterAttemptV2[]>();
 const rowKey=new Set<string>();
 for(const row of input){
  if(!row||!row.scenarioId||typeof row.scenarioId!=='string'||
   !row.classId||typeof row.classId!=='string'||
   !row.specializationId||typeof row.specializationId!=='string'||
   !row.enemyId||typeof row.enemyId!=='string'||
   !['targeted','alternative'].includes(row.strategy)||
   !['control','cleanse','sustain','pressure'].includes(row.route)||
   typeof row.hasMatchingCounter!=='boolean'||
   !nonnegative(row.observedOpportunityEvents)||
   !nonnegative(row.eligibleSkillCasts)||!nonnegative(row.attributedCounterEvents))
   invalid('invalid_observed_attempt');
  const key=[row.scenarioId,row.classId,row.specializationId,row.enemyId].join('|');
  const unique=key+'|'+row.strategy;
  if(rowKey.has(unique))invalid('duplicate_strategy');
  rowKey.add(unique);
  groups.set(key,[...(groups.get(key)??[]),row]);
 }
 const counts=Object.fromEntries(possible.map(k=>[k,0])) as Record<ObservedCounterExplanationV2,number>;
 const rows:ObservedCounterExplanationRowV2[]=[];
 for(const [key,entries] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
  if(entries.length!==2||!entries.some(r=>r.strategy==='targeted')||
   !entries.some(r=>r.strategy==='alternative'))
   invalid('missing_counter_route');
  for(const row of [...entries].sort((a,b)=>a.strategy.localeCompare(b.strategy))){
   const explanation:ObservedCounterExplanationV2=
    !row.hasMatchingCounter?'class_native_counter_unavailable':
    row.observedOpportunityEvents===0?'boss_opportunity_not_observed':
    // Instant abilities produce source-attributed mechanic events without a
    // cast_complete log. Never report "not cast" when the counter event
    // itself is present; do not fabricate a cast event or change the engine.
    row.attributedCounterEvents>0?'counter_effect_observed':
    row.eligibleSkillCasts===0?'selected_counter_not_cast':
    'counter_cast_without_result';
   rows.push({
    scenarioId:row.scenarioId,classId:row.classId,
    specializationId:row.specializationId,enemyId:row.enemyId,
    strategy:row.strategy,route:row.route,explanation,
    opportunityEvents:row.observedOpportunityEvents,
    eligibleCasts:row.eligibleSkillCasts,
    attributedEvents:row.attributedCounterEvents,
   });
   counts[explanation]++;
  }
 }
 return {provenance:'unsigned_replayed_engine_QA_only',releaseApproved:false,
  comparisons:groups.size,rows,counts};
}
