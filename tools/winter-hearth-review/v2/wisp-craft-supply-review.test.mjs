import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WINTER_HEARTH_REVIEW_ONLY_RELEASED,
  WISP_CANDIDATE_RATE_BPS,
  winterHearthSupplyExpectation,
  winterHearthWispReceiptPreview,
  winterHearthCraftQuote
} from './wisp-craft-supply-review.mjs';

const active=Date.parse('2026-12-16T12:00:00Z');
const resources={
 COPPER_ORE:2000,GREENWOOD_LOG:1000,FROSTFALL_WISP_GLOW_2026:500
};
const quote=(changes={})=>winterHearthCraftQuote({
 nowMs:active,eventReleased:true,smithingLevel:4,
 batches:1,availableResources:resources,goldAvailable:15000,...changes
});
test('proposed Wisp percentages remain fish 5% and woodcutting 2%; no power paid boost',()=>{
 assert.deepEqual(WISP_CANDIDATE_RATE_BPS,{fishing:500,woodcutting:200});
 assert.equal(WINTER_HEARTH_REVIEW_ONLY_RELEASED,false);
});
test('500 one-wisp batches are required and will consume 2000 ore, 1000 extra logs and 15000 Gold',()=>{
 const x=winterHearthSupplyExpectation({fishingActions:10000,woodcuttingActions:0});
 assert.equal(x.requiredBatches,500);
 assert.equal(x.expectedWispGlow,500);
 assert.equal(x.expectedFinishedLights,2500);
 assert.equal(x.wispDeficitExpected,0);
 assert.equal(x.oreRequired,2000);
 assert.equal(x.extraGreenwoodLogsRequired,1000);
 assert.equal(x.goldSpentOnCrafts,15000);
 assert.equal(x.smithingXpEarnedIfAll500CraftsComplete,17500);
 assert.equal(x.craftSecondsIfAll500CraftsComplete,20000);
 assert.equal(x.previewOnly,true);
 assert.equal(x.notProofOfSuccess,true);
 assert.equal(winterHearthSupplyExpectation({fishingActions:0,woodcuttingActions:25000}).expectedWispGlow,500);
 assert.equal(winterHearthSupplyExpectation({fishingActions:5000,woodcuttingActions:12500}).expectedWispGlow,500);
});
test('historic guild action proxies project very different supply but are never proof of grants',()=>{
 const big=winterHearthSupplyExpectation({fishingActions:21508,woodcuttingActions:22941});
 const small=winterHearthSupplyExpectation({fishingActions:993,woodcuttingActions:2636});
 assert.equal(Number(big.expectedWispGlow.toFixed(2)),1534.22);
 assert.equal(Number(small.expectedWispGlow.toFixed(2)),102.37);
 assert(big.expectedWispGlow>500);
 assert(small.expectedWispGlow<500);
 assert(small.wispDeficitExpected>397);
 assert.match(big.warning,/not verified/);
 for (const n of [-1,NaN,Infinity,0.5,Number.MAX_SAFE_INTEGER+1]) {
  assert.throws(()=>winterHearthSupplyExpectation({fishingActions:n,woodcuttingActions:0}),RangeError);
 }
});
test('only authenticated-looking successful action receipts can ever pass preview shape, never mint',()=>{
 const base={nowMs:active,sourceReceiptId:'receipt-valid-0001',success:true};
 for(const sourceKind of ['fishing','woodcutting']){
  for(const syntheticUniformRoll of [0,199,200,499,500,9999]){
   const p=winterHearthWispReceiptPreview({...base,sourceKind,syntheticUniformRoll});
   assert.equal(p.eligible,true);
   assert.equal(p.wouldDrop,syntheticUniformRoll<WISP_CANDIDATE_RATE_BPS[sourceKind]);
   assert.equal(p.previewOnly,true);
   assert.equal(p.mayGrant,false);
   assert.equal(p.authority,false);
   assert.equal(p.issuedQuantity,0);
  }
 }
 for(const [changes,reason] of [
  [{sourceKind:'boss',syntheticUniformRoll:0},'unsupported-source'],
  [{sourceKind:'fishing',sourceReceiptId:'x',syntheticUniformRoll:0},'no-server-source-receipt'],
  [{sourceKind:'fishing',success:false,syntheticUniformRoll:0},'not-a-successful-server-action'],
  [{sourceKind:'fishing',syntheticUniformRoll:-1},'invalid-preview-roll'],
  [{sourceKind:'woodcutting',syntheticUniformRoll:10000},'invalid-preview-roll'],
  [{sourceKind:'fishing',nowMs:Date.parse('2026-12-02T23:59:59Z'),syntheticUniformRoll:0},'event-outside-window'],
  [{sourceKind:'woodcutting',nowMs:Date.parse('2026-12-27T00:00:00Z'),syntheticUniformRoll:0},'event-outside-window'],
 ]){
  const p=winterHearthWispReceiptPreview({...base,...changes});
  assert.equal(p.eligible,false);
  assert.equal(p.reason,reason);
  assert.equal(p.mayGrant,false);
 }
});
test('light crafting is profession-only at Smithing 4 and blocked outside season',()=>{
 const p=quote();
 assert.equal(p.ok,true);
 assert.equal(p.outputCount,5);
 assert.equal(p.goldCost,30);
 assert.equal(p.smithingXp,35);
 assert.equal(p.durationSeconds,40);
 assert.deepEqual(p.resourceDebits,[
  {itemId:'COPPER_ORE',quantity:4},
  {itemId:'GREENWOOD_LOG',quantity:2},
  {itemId:'FROSTFALL_WISP_GLOW_2026',quantity:1}
 ]);
 assert.equal(p.mayCraft,false);
 assert.equal(quote({smithingLevel:3}).reason,'insufficient-smithing-level');
 assert.equal(quote({smithingLevel:4,batches:500}).outputCount,2500);
 assert.equal(quote({eventReleased:false}).reason,'event-closed');
 assert.equal(quote({nowMs:Date.parse('2026-12-27T00:00:00Z')}).reason,'event-closed');
 assert.equal(quote({batches:0}).reason,'invalid-batch-count');
 assert.equal(quote({batches:501}).reason,'invalid-batch-count');
 assert.equal(quote({batches:1.5}).reason,'invalid-batch-count');
 assert.equal(quote({goldAvailable:29}).reason,'insufficient-gold');
 assert.equal(quote({availableResources:{...resources,FROSTFALL_WISP_GLOW_2026:0}}).reason,'insufficient-FROSTFALL_WISP_GLOW_2026');
 assert.equal(quote({availableResources:{...resources,COPPER_ORE:3}}).reason,'insufficient-COPPER_ORE');
});
