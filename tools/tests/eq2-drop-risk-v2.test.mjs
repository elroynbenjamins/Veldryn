import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandProcessingInputs, killsUntilDrops, processingIndex, quantileHours,
  seededRng, simulateDropRisk
} from '../lib/eq2-drop-risk-v2.mjs';

test('geometric waiting time respects 100% drop rate and zero requirements', () => {
  assert.equal(killsUntilDrops(7, 1, seededRng(1)), 7);
  assert.equal(killsUntilDrops(0, undefined, seededRng(1)), 0);
  assert.throws(() => killsUntilDrops(1, 0, seededRng(1)), /drop chance/);
  assert.throws(() => killsUntilDrops(-1, 0.2, seededRng(1)), /required drops/);
  assert.throws(() => killsUntilDrops(2, 0.1, () => 1), /RNG/);
});
test('risk simulation is deterministic, quantiles ordered, and disjoint pool no faster', () => {
  const input = {common:116, scarce:13, commonChance:0.05, scarceChance:0.0025, trials:512, seed:20261121};
  const a = simulateDropRisk(input);
  const b = simulateDropRisk(input);
  assert.deepEqual(a,b);
  for (const source of [a.sharedPoolKills, a.separatePoolKills]) {
    assert.ok(source.p50 <= source.p90 && source.p90 <= source.p95);
  }
  for (const percentile of ['p50','p90','p95']) {
    assert.ok(a.separatePoolKills[percentile] >= a.sharedPoolKills[percentile]);
  }
  assert.equal(a.expectedComponentKills.scarce, 5200);
  assert.equal(a.expectedComponentKills.common, 2320);
});
test('zero scarce demand makes shared and disjoint scenarios identical', () => {
  const r = simulateDropRisk({common:12,scarce:0,commonChance:0.14,trials:512,seed:42});
  assert.deepEqual(r.sharedPoolKills,r.separatePoolKills);
});
test('100% drop streams yield the exact shared and separate time', () => {
  const r = simulateDropRisk({common:5,scarce:2,commonChance:1,scarceChance:1,trials:512,seed:11});
  assert.deepEqual(r.sharedPoolKills,{p50:5,p90:5,p95:5});
  assert.deepEqual(r.separatePoolKills,{p50:7,p90:7,p95:7});
});
test('review input guards reject implausible drops, seeds and trial counts', () => {
  assert.throws(() => simulateDropRisk({common:1,scarce:0,commonChance:0,trials:512}), /chance/);
  assert.throws(() => simulateDropRisk({common:1,scarce:0,commonChance:0.5,trials:32}), /Trials/);
  assert.throws(() => simulateDropRisk({common:0,scarce:0,trials:512}), /At least/);
  assert.throws(() => seededRng(-1), /seed/);
  assert.throws(() => quantileHours({p50:10},0), /kill rate/);
});
test('T4 style nested refinement explodes into raw supply and grants separate profession XP', () => {
  const byOutput = processingIndex([
    {processing:[{output:'SUNSTONE_INGOT',quantity:1,seconds:38,xp:32,xpSkill:'smithing',inputs:{SUNSTONE_ORE:3}}]},
    {processing:[{output:'EQ2_GLASSBOUND_ALLOY_BAR',quantity:1,seconds:56,xp:55,xpSkill:'smithing',inputs:{SUNSTONE_INGOT:2,EQ2_GLASSBOUND_DUST:1}}]}
  ]);
  const result = expandProcessingInputs([
    {itemId:'EQ2_GLASSBOUND_ALLOY_BAR',quantity:3},
    {itemId:'EQ2_GLASSHEART_FRAGMENT',quantity:2}
  ],byOutput);
  assert.deepEqual(result.rawInputs,{
    EQ2_GLASSBOUND_DUST:3, EQ2_GLASSHEART_FRAGMENT:2, SUNSTONE_ORE:18
  });
  assert.deepEqual(result.processingBatches,{EQ2_GLASSBOUND_ALLOY_BAR:3,SUNSTONE_INGOT:6});
  assert.deepEqual(result.processingXPBySkill,{smithing:357});
  assert.equal(result.processingSeconds,396);
});
test('processing dependencies fail closed on missing records and cycles', () => {
  assert.throws(() => processingIndex([{processing:[
    {output:'A',quantity:1,seconds:1,xp:1,xpSkill:'smithing',inputs:{ORE:2}},
    {output:'A',quantity:1,seconds:1,xp:1,xpSkill:'smithing',inputs:{ORE:2}}
  ]}]),/Duplicate/);
  const cyclic = processingIndex([{processing:[
    {output:'A',quantity:1,seconds:1,xp:1,xpSkill:'smithing',inputs:{B:1}},
    {output:'B',quantity:1,seconds:1,xp:1,xpSkill:'smithing',inputs:{A:1}}
  ]}]);
  assert.throws(() => expandProcessingInputs([{itemId:'A',quantity:1}],cyclic),/Circular/);
});
