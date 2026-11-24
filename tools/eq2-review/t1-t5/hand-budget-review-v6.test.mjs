import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHandBudget,auditHandBudgets} from './hand-budget-review-v6.mjs';
const f=(classId,mode='double_independent_lanes',rarity='mythic',tier=5,focusMode='focused_crit_damage')=>inspectHandBudget({classId,tier,rarity,quality:50,focusMode,mode});
test('matched source-slot hand budgets: 12960 scenarios, four alternatives, no artificial item',()=>{
 const a=auditHandBudgets();
 assert.equal(a.scenarioCount,12960);
 assert.equal(a.results.length,4);
 const [base,distinct,magnitude,lanes]=a.results;
 assert(base.maxAbsoluteGapPct>5);
 assert(distinct.maxAbsoluteGapPct<base.maxAbsoluteGapPct);
 assert(magnitude.maxAbsoluteGapPct<base.maxAbsoluteGapPct);
 assert(lanes.maxAbsoluteGapPct<.02);
 assert.equal(lanes.groupsOverFivePct,0);
 assert.equal(a.mayMint,false);
 console.log('EQ2_HAND_V6_SUMMARY '+JSON.stringify(a));
});
test('two independent lanes retain original ranges and distinct identities within each lane',()=>{
 for(const cls of ['DREADGUARD','WAYFINDER','RAVAGER','KNIFE_DANCER','STONECALLER']){
  const r=f(cls),one=f('IRONWARDEN');
  assert.equal(r.slots,9);assert.equal(one.slots,10);
  assert.equal(r.rolls.length,30);assert.equal(one.rolls.length,30);
  assert(!r.rolls.some(x=>x.slot==='offhand'));
  const hand=r.rolls.filter(x=>x.slot==='weapon');
  assert.equal(hand.length,6);
  assert.equal(new Set(hand.map(x=>x.itemId)).size,1);
  for(const lane of [0,1]){
   const v=hand.filter(x=>x.lane===lane);
   assert.equal(v.length,3);assert.equal(new Set(v.map(x=>x.stat)).size,3);
   assert(v.every(x=>x.originalCentipercent===x.contributionCentipercent));
  }
  assert.equal(hand.filter(x=>x.stat==='critDamage').length,2);
  assert.deepEqual(r.channels,one.channels);
  assert.equal(r.mayEquip,false);assert.equal(r.mayApplyEffects,false);
 }
});
test('all rarities/tier roll budgets parity, candidate alternatives do not change base stats',()=>{
 for(const tier of [1,2,3,4,5])for(const rarity of ['common','uncommon','rare','epic','legendary','mythic']){
  const one=f('IRONWARDEN','double_independent_lanes',rarity,tier),two=f('STONECALLER','double_independent_lanes',rarity,tier);
  assert.equal(one.rolls.length,two.rolls.length);
  for(const mode of ['baseline','extra_distinct_rolls','double_roll_magnitude'])assert.equal(f('STONECALLER',mode,rarity,tier).base,two.base);
 }
 assert.throws(()=>f('FAKE'),/invalid_fixture/);
 assert.throws(()=>f('STONECALLER','FAKE'),/invalid_fixture/);
});
