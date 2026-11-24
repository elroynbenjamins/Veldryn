import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewUniversalRoll} from './universal-affix-overlap-review-v4.mjs';
import {inspectMixedPermanentBudgetV2,projectMixedStatExamplesV2} from './mixed-permanent-budget-review.mjs';
const data=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-innate-and-set-budget-review-v7.json',import.meta.url),'utf8'));
test('all remaining fixed innate source rows assigned to explicit candidate lanes',()=>{
 let newCount=0,missing=0;
 for(const entry of data.entries){
  const roll=previewUniversalRoll(entry.itemId,()=>0);
  const result=inspectMixedPermanentBudgetV2([roll],[]);
  newCount+=result.innateSources.length;missing+=result.unresolvedInnates.length;
  assert.equal(result.cpApproved,false);assert.equal(result.mayApplyEffects,false);
 }
 assert.equal(newCount,19);assert.equal(missing,0);
});
test('Swift and Savage preserve distinct units rather than inflating existing point channels',()=>{
 const roll=previewUniversalRoll('EQ2_RARE_T5_SHARDRUNNER_BOOTS',()=>0);
 for(const [family,channel] of [['swift','haste_pct'],['savage','crit_multiplier_add']]){
  for(let grade=1;grade<=5;grade++)for(let strength=80;strength<=120;strength+=5){
   const report=inspectMixedPermanentBudgetV2([roll],[{itemId:roll.itemId,gemId:'gem:stat_'+family+':g'+grade,rollPercent:strength}]);
   const mixed=report.mixedChannels.find(c=>c.channel===channel);
   assert.equal(report.gemSources.length,1);assert.equal(report.unresolvedGemSources.length,0);
   assert.equal(mixed.gemFractionMicros,report.gemSources[0].fractionMicros);
   const base={haste:.10,critMultiplier:1.5,healingPower:100};
   const actual=projectMixedStatExamplesV2(base,report);
   const gear=id=>report.prior.original.channels.find(c=>c.channel===id).effectiveCentipercent/10000;
   assert.ok(Math.abs(actual.haste-(.10*(1+(family==='swift'?mixed.effectiveCentipercent/10000:0))+gear('haste_pp')))<1e-10);
   assert.ok(Math.abs(actual.critMultiplier-(1.5*(1+gear('crit_damage_pct'))+(family==='savage'?mixed.effectiveCentipercent/10000:0)))<1e-10);
   assert.equal(actual.mayApplyEffects,false);
  }
 }
});
test('five ambiguous gem families remain explicitly unresolved',()=>{
 const roll=previewUniversalRoll('EQ2_RARE_T5_SHARDRUNNER_BOOTS',()=>0);
 for(const family of ['might','ward','piercing','potent','resolute']){
  const report=inspectMixedPermanentBudgetV2([roll],[{itemId:roll.itemId,gemId:'gem:stat_'+family+':g1',rollPercent:100}]);
  assert.equal(report.unresolvedGemSources.length,1);
 }
});
