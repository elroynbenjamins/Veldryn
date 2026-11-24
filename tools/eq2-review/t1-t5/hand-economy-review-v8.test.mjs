import test from 'node:test';
import assert from 'node:assert/strict';
import {compareRecipeBudgets,proposeHandCostTargets,rarityBudget,summarizeHandEconomy} from './hand-economy-review-v8.mjs';
test('60 same-role source recipe comparisons expose combined weapon underpricing',()=>{
 const rows=compareRecipeBudgets(),s=summarizeHandEconomy();
 assert.equal(rows.length,60);assert.equal(s.comparisons,60);
 assert(s.goldRatioRange[0]>.53&&s.goldRatioRange[1]<.57);
 assert(s.queueRatioRange[0]>.53&&s.queueRatioRange[1]<.57);
 for(const r of rows){
  assert.equal(r.pairGold,r.weapon.gold+r.offhand.gold);
  assert.equal(r.pairSeconds,r.weapon.seconds+r.offhand.seconds);
  assert(r.combined.inputs.every(x=>Number.isSafeInteger(x.quantity)&&x.quantity>0));
  assert.equal(r.mayCraft,false);assert.equal(r.mayMint,false);
 }
 console.log('EQ2_HAND_ECONOMY_V8 '+JSON.stringify(s));
});
test('50 unique proposed hand-cost targets preserve total budgets and no registered material recipe',()=>{
 const rows=proposeHandCostTargets();assert.equal(rows.length,50);
 assert.equal(new Set(rows.map(x=>x.key)).size,50);
 for(const r of rows){
  assert.equal(r.lanes.reduce((n,x)=>n+x.goldCandidate,0),r.totalGoldCandidate);
  assert.equal(r.lanes.reduce((n,x)=>n+x.secondsCandidate,0),r.totalSecondsCandidate);
  assert(r.lanes.every(x=>x.goldCandidate>0&&x.secondsCandidate>0));
  assert(r.totalGoldCandidate>r.existingGold);assert(r.totalSecondsCandidate>r.existingSeconds);
  assert.equal(r.materialRequirements,'OPEN_REAUTHOR_EXACT_SOURCE_PARITY_NO_AUTOMATIC_COPY');
  assert.equal(r.mayCraft,false);assert.equal(r.mayEquip,false);
 }
});
test('independent rarity components avoid shared-rarity windfall and simultaneous jackpot trap',()=>{
 for(const rarity of ['common','uncommon','rare','epic','legendary','mythic']){
  const r=rarityBudget(rarity),p=r.probability;
  assert.equal(r.independentSameCraftJointSuccess,p*p);
  assert.equal(r.assemblyExpectedLaneCrafts,r.separateLaneExpectedTotalCrafts);
  assert.equal(r.assemblyExpectedLaneCrafts,2*r.sharedGradeExpectedCrafts);
  assert.equal(r.mayTrade,false);
 }
 const r=rarityBudget('mythic');
 assert.equal(r.sharedGradeExpectedCrafts,1000);
 assert.equal(r.independentSameCraftExpectedCrafts,1000000);
 assert.equal(r.assemblyExpectedLaneCrafts,2000);
 assert.throws(()=>rarityBudget('unknown'),/rarity/);
});
