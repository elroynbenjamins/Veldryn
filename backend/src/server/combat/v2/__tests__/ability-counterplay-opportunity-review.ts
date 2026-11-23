import {strict as assert} from 'node:assert';
import {reviewObservedCounterOpportunityV2,type ObservedCounterAttemptV2} from '../ability-counterplay-opportunity-review';

const base:ObservedCounterAttemptV2={
 scenarioId:'ironwarden|sentinel|root',classId:'IRONWARDEN',
 specializationId:'IRONWARDEN:sentinel',enemyId:'BOSS_EXP_ROOT',
 strategy:'targeted',route:'control',hasMatchingCounter:true,
 observedOpportunityEvents:2,eligibleSkillCasts:1,attributedCounterEvents:1,
};
const alt:ObservedCounterAttemptV2={
 ...base,strategy:'alternative',route:'sustain',
 observedOpportunityEvents:4,eligibleSkillCasts:2,attributedCounterEvents:1,
};
const known=reviewObservedCounterOpportunityV2([base,alt]);
assert.equal(known.comparisons,1);
assert.equal(known.releaseApproved,false);
assert.equal(known.provenance,'unsigned_replayed_engine_QA_only');
assert.equal(known.counts.counter_effect_observed,2);
assert.deepEqual(known,reviewObservedCounterOpportunityV2([alt,base]),
 'Review must be stable under input order reversal');

const explanations=[
 {hasMatchingCounter:false,observedOpportunityEvents:5,eligibleSkillCasts:0,
  attributedCounterEvents:0,reason:'class_native_counter_unavailable'},
 {hasMatchingCounter:true,observedOpportunityEvents:0,eligibleSkillCasts:0,
  attributedCounterEvents:0,reason:'boss_opportunity_not_observed'},
 {hasMatchingCounter:true,observedOpportunityEvents:2,eligibleSkillCasts:0,
  attributedCounterEvents:0,reason:'selected_counter_not_cast'},
 {hasMatchingCounter:true,observedOpportunityEvents:2,eligibleSkillCasts:1,
  attributedCounterEvents:0,reason:'counter_cast_without_result'},
 {hasMatchingCounter:true,observedOpportunityEvents:2,eligibleSkillCasts:1,
  attributedCounterEvents:3,reason:'counter_effect_observed'},
] as const;
for(const [index,row] of explanations.entries()){
 const first={...base,scenarioId:'fixture-'+index,
  hasMatchingCounter:row.hasMatchingCounter,
  observedOpportunityEvents:row.observedOpportunityEvents,
  eligibleSkillCasts:row.eligibleSkillCasts,
  attributedCounterEvents:row.attributedCounterEvents};
 const review=reviewObservedCounterOpportunityV2([first,{
  ...first,strategy:'alternative',route:'sustain',
 }]);
 assert.equal(review.rows.length,2);
 assert.ok(review.rows.every(x=>x.explanation===row.reason));
}
const fail=(rows:readonly ObservedCounterAttemptV2[],match:RegExp)=>
 assert.throws(()=>reviewObservedCounterOpportunityV2(rows),match);
fail([],/invalid_matrix_size/);
fail([base],/invalid_matrix_size/);
fail([base,base],/duplicate_strategy/);
fail([base,{...alt,scenarioId:'different'}],/missing_counter_route/);
fail([base,{...alt,eligibleSkillCasts:-1}],/invalid_observed_attempt/);
fail([base,{...alt,attributedCounterEvents:NaN}],/invalid_observed_attempt/);
fail([base,{...alt,observedOpportunityEvents:1.5}],/invalid_observed_attempt/);
fail([base,{...alt,strategy:'cheat' as 'alternative'}],/invalid_observed_attempt/);
fail([base,{...alt,route:'invincible' as 'sustain'}],/invalid_observed_attempt/);
fail([base,{...alt,hasMatchingCounter:'yes' as unknown as boolean}],/invalid_observed_attempt/);
console.log('PASS: 5 observed route classifications, stable ordering, no release authorization, forged/incomplete matrix rejection');
