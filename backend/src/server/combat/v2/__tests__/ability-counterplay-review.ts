import {strict as assert} from 'node:assert';
import {reviewAbilityCounterplayV2,type AbilityCounterplaySampleV2} from '../ability-counterplay-review';
import {SPECIALIZATIONS_V2,specializationIdV2} from '../skill-catalog';

const generic:AbilityCounterplaySampleV2={
 scenarioId:'rootbound-seed-7',classId:'IRONWARDEN',
 specializationId:specializationIdV2('IRONWARDEN','Sentinel'),
 enemyId:'rootbound-heart',seed:7,combatLevel:30,combatPower:3000,
 strategy:'generic',outcome:'timeout',enemyHpRemainingPct:60,
 playerHpRemainingPct:50,damageDealt:400,damageTaken:200,
 effectiveHealing:0,interrupts:0,cleanses:0,mitigationEvents:0,
 counterMechanicEvents:0,
};
const targeted:AbilityCounterplaySampleV2={
 ...generic,strategy:'targeted',outcome:'win',enemyHpRemainingPct:0,
 playerHpRemainingPct:35,damageDealt:650,damageTaken:270,
 interrupts:1,mitigationEvents:2,counterMechanicEvents:3,
};
const alternative:AbilityCounterplaySampleV2={
 ...generic,strategy:'alternative',outcome:'timeout',
 enemyHpRemainingPct:30,playerHpRemainingPct:70,damageDealt:530,
 mitigationEvents:4,
};
const valid=[generic,targeted,alternative] as const;
const initial=reviewAbilityCounterplayV2(valid);
assert.equal(initial.provenance,'synthetic_qa_not_release_balance');
assert.equal(initial.releaseApproved,false);
assert.equal(initial.comparisons.length,1);
assert.equal(initial.comparisons[0].targetedDamageRatio,1.625);
assert.equal(initial.comparisons[0].alternativeDamageRatio,1.325);
assert.equal(initial.comparisons[0].targetedMechanicEvents,3);
assert.equal(initial.findings.length,0);
assert.deepEqual(reviewAbilityCounterplayV2([...valid].reverse()),initial,
 'Counterplay diagnostics must not depend on incoming sample order');
assert.deepEqual(valid,[generic,targeted,alternative],
 'A read-only QA review must not mutate encounter records');

const flagged=reviewAbilityCounterplayV2([
 generic,
 {...targeted,outcome:'wipe',enemyHpRemainingPct:75,playerHpRemainingPct:0,
  damageDealt:250,counterMechanicEvents:0},
 {...alternative,outcome:'wipe',enemyHpRemainingPct:70,playerHpRemainingPct:0},
]);
assert.ok(flagged.findings.some(f=>f.type==='targeted_underperforms_generic'));
assert.ok(flagged.findings.some(f=>f.type==='targeted_mechanic_absent'));
const noAlternative=reviewAbilityCounterplayV2([
 generic,targeted,
 {...alternative,outcome:'wipe',enemyHpRemainingPct:60,playerHpRemainingPct:0},
]);
assert.ok(noAlternative.findings.some(f=>f.type==='alternative_route_gap'));
assert.equal(noAlternative.releaseApproved,false,
 'Even a successful counterplay comparison is NOT a release authorization');
const allWipe=reviewAbilityCounterplayV2(valid.map(s=>({
 ...s,outcome:'wipe' as const,enemyHpRemainingPct:100,playerHpRemainingPct:0,damageDealt:0,
})));
assert.ok(allWipe.findings.some(f=>f.type==='all_strategies_wipe'));
assert.ok(allWipe.findings.some(f=>f.type==='zero_damage'));

assert.throws(()=>reviewAbilityCounterplayV2([]),/empty_samples/);
assert.throws(()=>reviewAbilityCounterplayV2([generic,targeted]),/incomplete_or_duplicate_strategy/);
assert.throws(()=>reviewAbilityCounterplayV2([generic,targeted,targeted]),/incomplete_or_duplicate_strategy/);
assert.throws(()=>reviewAbilityCounterplayV2([
 generic,{...targeted,combatPower:3001},alternative]),/unmatched_combat_level_or_power/);
assert.throws(()=>reviewAbilityCounterplayV2([
 generic,{...targeted,combatLevel:31},alternative]),/unmatched_combat_level_or_power/);
assert.throws(()=>reviewAbilityCounterplayV2([
 {...generic,classId:'FAKE_CLASS' as typeof generic.classId},targeted,alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 {...generic,specializationId:specializationIdV2('BASTION','Guardian')},targeted,alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 {...generic,enemyHpRemainingPct:101},targeted,alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 {...generic,damageTaken:NaN},targeted,alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 {...generic,interrupts:1.5},targeted,alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 generic,{...targeted,outcome:'win',enemyHpRemainingPct:1},alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 generic,{...targeted,outcome:'wipe',playerHpRemainingPct:50},alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 {...generic,seed:-1},targeted,alternative]),/invalid_sample/);
assert.throws(()=>reviewAbilityCounterplayV2([
 {...generic,combatPower:Infinity},targeted,alternative]),/invalid_sample/);

// Catalogue-wide QA only: all nine classes and all 18 real specialization
// identities can be compared at equal CP without claiming live balance.
const matrix=reviewAbilityCounterplayV2(SPECIALIZATIONS_V2.flatMap((spec,i)=>{
 const base={...generic,classId:spec.classId,specializationId:spec.id,
  scenarioId:'spec-'+i,seed:i};
 return [
  {...base,strategy:'generic' as const},
  {...base,strategy:'targeted' as const,counterMechanicEvents:1},
  {...base,strategy:'alternative' as const},
 ];
}));
assert.equal(matrix.comparisons.length,18);
assert.equal(matrix.releaseApproved,false);
console.log('PASS: 18-specialization equal-power three-path counterplay QA, anomalies and forged/incomplete fixture rejection');
