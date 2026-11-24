import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewUniversalRoll} from './universal-affix-overlap-review-v4.mjs';
import {inspectAdvancedPermanentBudgetV2} from './advanced-permanent-budget-review.mjs';
const data=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-innate-and-set-budget-review-v7.json',import.meta.url),'utf8'));
test('six existing innates join distinct candidate channels without modifying V4',()=>{
 let mapped=0,remaining=0;
 for(const entry of data.entries){
  const roll=previewUniversalRoll(entry.itemId,()=>0);
  const result=inspectAdvancedPermanentBudgetV2([roll],[]);
  mapped+=result.advancedInnates.length;remaining+=result.unresolvedInnates.length;
  for(const s of result.advancedInnates){
   const c=result.advancedChannels.find(x=>x.channel===s.candidateChannel);
   assert.equal(c.rawCentipercent,s.centipercent);
   assert.equal(c.effectiveCentipercent,s.centipercent);
  }
  assert.equal(result.randomPoolChanged,false);assert.equal(result.cpApproved,false);
 }
 assert.equal(mapped,6);assert.equal(remaining,19);
});
test('Elusive joins Evasion innate points, not accuracy rating; old gem semantics preserved',()=>{
 const roll=previewUniversalRoll('EQ2_RARE_T5_SHARDRUNNER_BOOTS',()=>0);
 const result=inspectAdvancedPermanentBudgetV2([roll],[{itemId:roll.itemId,gemId:'gem:stat_elusive:g5',rollPercent:120}]);
 const c=result.advancedChannels.find(x=>x.channel==='evasion_pp');
 assert.equal(c.innateCentipercent,200);assert.equal(c.gemCentipercent,60);
 assert.equal(c.rawCentipercent,260);assert.equal(c.effectiveCentipercent,260);
 assert.equal(result.unresolvedGemSources.length,0);assert.equal(result.mayApplyEffects,false);
});
