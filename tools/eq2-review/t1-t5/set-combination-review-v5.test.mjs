import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {findSetCombination,auditSetCombinations} from './set-combination-review-v5.mjs';
const d=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json',import.meta.url),'utf8'));
const byId=new Map(d.entries.map(x=>[x.itemId,x]));
test('each exact source threshold is attainable alone, no effects or CP authorization',()=>{
 let n=0;
 for(const s of d.sets)for(const threshold of s.reconciliation.thresholds){
  const x=findSetCombination([{setId:s.setId,threshold}]);
  assert.equal(x.possible,true);
  assert.equal(x.itemIds.length,threshold);
  assert(x.itemIds.every(id=>byId.get(id).setId===s.setId));
  assert.equal(x.mayApplyEffects,false);
  n++;
 }
 assert.equal(n,195);
});
test('all 95 sets: same-tier pair/triple slot compatibility and full-set witnesses',()=>{
 const a=auditSetCombinations();
 for(const row of a.byTier){
  assert.equal(row.pairChecks,row.setCount*(row.setCount-1)/2);
  assert.equal(row.tripleChecks,row.setCount*(row.setCount-1)*(row.setCount-2)/6);
  assert(row.pairPossible<=row.pairChecks&&row.triplePossible<=row.tripleChecks);
  for(const sample of row.samples){
   assert.equal(new Set(sample.itemIds.map(id=>byId.get(id).slot)).size,sample.itemIds.length);
   assert(sample.itemIds.every(id=>byId.get(id).tier===row.tier));
  }
 }
 assert.equal(a.byTier.reduce((n,x)=>n+x.setCount,0),95);
 assert.equal(a.releaseApproved,false);
 console.log('EQ2_SET_V5_SUMMARY '+JSON.stringify(a));
});
test('reject retired, duplicate, mixed-tier and unattainable thresholds; impossible 6+4 set combination',()=>{
 const s=d.sets.find(x=>x.tier===5&&x.itemCount===6),b=d.sets.find(x=>x.tier===5&&x.itemCount===4);
 assert.equal(findSetCombination([{setId:s.setId,threshold:6},{setId:b.setId,threshold:4}]).possible,false);
 assert.throws(()=>findSetCombination([{setId:'eq2_t4_citadel',threshold:2}]),/unknown_or_duplicate/);
 assert.throws(()=>findSetCombination([{setId:s.setId,threshold:2},{setId:s.setId,threshold:2}]),/unknown_or_duplicate/);
 assert.throws(()=>findSetCombination([{setId:s.setId,threshold:2},{setId:d.sets.find(x=>x.tier===1).setId,threshold:2}]),/cross_tier/);
 assert.throws(()=>findSetCombination([{setId:s.setId,threshold:5}]),/invalid_threshold/);
});
