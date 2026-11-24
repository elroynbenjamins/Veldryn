import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAT_GEMS_V1,gemItemId} from '../../../backend/src/server/equipment/gems/gem-catalog-v1.ts';
import {previewUniversalRoll,capChannel} from './universal-affix-overlap-review-v4.mjs';
import {inspectPermanentGearGemBudgetV2} from './permanent-gear-gem-budget-review.mjs';
const catalog=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-innate-and-set-budget-review-v7.json',import.meta.url),'utf8'));
const row=previewUniversalRoll(catalog.entries[0].itemId,()=>0);
test('all 12 families, 5 grades, 9 roll strengths: source values preserved, only exact candidate channels mapped',()=>{
 let cases=0,mapped=0;
 for(const family of STAT_GEMS_V1)for(let grade=1;grade<=5;grade++)for(let roll=80;roll<=120;roll+=5){
  const report=inspectPermanentGearGemBudgetV2([row],[{itemId:row.itemId,gemId:gemItemId(family.familyId,grade),rollPercent:roll}]);
  const src=report.gemSources[0];
  assert.equal(src.fractionMicros,Math.round(family.values[grade]*roll/100*1e6));
  if(src.channel){
   mapped++;
   const channel=report.channels.find(c=>c.channel===src.channel);
   assert.equal(channel.gemFractionMicros,src.fractionMicros);
   assert.equal(channel.rawCentipercent,channel.randomCentipercent+channel.innateCentipercent+channel.gemCentipercent);
   assert.equal(channel.effectiveCentipercent,capChannel(channel.channel,channel.rawCentipercent));
  }else assert.equal(report.unresolvedGemSources.length,1);
  assert.equal(report.cpApproved,false);assert.equal(report.mayApplyEffects,false);
  cases++;
 }
 assert.equal(cases,540);assert.equal(mapped,180);
});
test('one socket of each kind per item; effects separate; invalid candidates denied',()=>{
 const s={itemId:row.itemId,gemId:'gem:stat_vitality:g5',rollPercent:120};
 const effect={itemId:row.itemId,gemId:'gem:effect_momentum:g5',rollPercent:100};
 const report=inspectPermanentGearGemBudgetV2([row],[s,effect]);
 assert.equal(report.conditionalGemSources.length,1);
 assert.equal(report.gemSources.length,1);
 for(const bad of [{...s,rollPercent:121},{...s,itemId:'foreign'},{...s,gemId:'gem:stat_unknown:g1'},{...s,raw:10000}])
  assert.throws(()=>inspectPermanentGearGemBudgetV2([row],[bad]),/eq2_gear_gem_budget_/);
 assert.throws(()=>inspectPermanentGearGemBudgetV2([row],[s,s]),/duplicate_socket/);
});
test('aggregate fractional gems once before rounding and applying cap',()=>{
 const other=previewUniversalRoll(catalog.entries.find(x=>x.slot!==row.slot).itemId,()=>0);
 const sockets=[row,other].map(r=>({itemId:r.itemId,gemId:'gem:stat_keen:g1',rollPercent:85}));
 const report=inspectPermanentGearGemBudgetV2([row,other],sockets);
 const c=report.channels.find(x=>x.channel==='crit_rate_pp');
 assert.equal(c.gemFractionMicros,3400);assert.equal(c.gemCentipercent,34);
 assert.equal(c.effectiveCentipercent,capChannel(c.channel,c.rawCentipercent));
});
