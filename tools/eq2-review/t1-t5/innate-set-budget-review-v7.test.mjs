import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {capChannel} from './universal-affix-overlap-review-v4.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../../../docs/2-0/'+p,import.meta.url),'utf8'));
const d=read('eq2-innate-and-set-budget-review-v7.json'),c=read('eq2-t1-t5-canonical-membership-reconciliation-v2.json'),a=read('eq2-universal-affix-overlap-review-v4.json');
const items=new Map(c.entries.map(x=>[x.itemId,x])),sets=new Map(c.sets.map(x=>[x.setId,x])),channels=new Map(a.stats.map(x=>[x.channel,x]));
test('source-authored premium stats are immutable review inputs, exact units only',()=>{
 assert.equal(d.entries.length,99);assert.equal(new Set(d.entries.map(x=>x.itemId)).size,99);
 let exact=0,unresolved=0;
 for(const row of d.entries){
  const item=items.get(row.itemId);assert(item);assert.equal(row.slot,item.slot);assert.equal(row.tier,item.tier);assert.equal(row.mayApply,false);
  for(const v of row.innates){
   assert.equal(v.centipercent,Math.round(v.value*100));
   if(v.canonicalChannel){const s=channels.get(v.canonicalChannel);assert(s);assert.equal(v.stat,s.channel);assert.equal(v.unit,s.unit);exact++;}
   else{assert.equal(v.mapping,'UNRESOLVED_SEMANTIC_OR_SEPARATE_CHANNEL');unresolved++;}
  }
 }
 assert.equal(exact,71);assert.equal(unresolved,28);
 assert.equal(d.entries.filter(x=>x.trait).length,27);
 assert.equal(d.releaseActivation,false);assert.equal(d.cpApproved,false);
});
test('permanent matching innate and random amounts share one cap; never rescale by rarity or quality',()=>{
 for(const row of d.entries)for(const v of row.innates.filter(x=>x.canonicalChannel)){
  const s=channels.get(v.canonicalChannel);
  const raw=s.softKneeCentipercent+v.centipercent;
  assert.equal(capChannel(s.channel,raw),Math.min(s.hardCapCentipercent,s.softKneeCentipercent+Math.floor(v.centipercent/2)));
  assert(capChannel(s.channel,raw)<=raw);
 }
 assert.equal(capChannel('defense_pct',4000+300),3400);
 assert.throws(()=>capChannel('haste_pct',100),/invalid_cap_input/);
});
test('34 numerical source set records and 68 thresholds preserved without activating effects',()=>{
 assert.equal(d.sets.length,34);assert.equal(new Set(d.sets.map(s=>s.setId)).size,34);
 let n=0;
 for(const s of d.sets){assert.deepEqual(s.bonuses.map(b=>b.pieces),sets.get(s.setId).reconciliation.thresholds);assert.equal(s.effectsApproved,false);assert.equal(s.mayApply,false);n+=s.bonuses.length;}
 assert.equal(n,68);assert.equal(d.summary.setsStillOutsideThisNumericSourceAudit,61);
});
