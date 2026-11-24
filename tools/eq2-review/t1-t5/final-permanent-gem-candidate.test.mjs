import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAT_GEMS_V1,gemItemId} from '../../../backend/src/server/equipment/gems/gem-catalog-v1.ts';
import {previewUniversalRoll} from './universal-affix-overlap-review-v4.mjs';
import {inspectFinalPermanentBudgetV2,projectPermanentStatCandidateV2} from './final-permanent-gem-candidate.mjs';
const catalogue=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-innate-and-set-budget-review-v7.json',import.meta.url),'utf8'));
const row=previewUniversalRoll('EQ2_RARE_T5_SHARDRUNNER_GLOVES',()=>0);
test('all 99 innate candidates and all 540 gem configurations represented without claiming migration approval',()=>{
 for(const e of catalogue.entries){
  const result=inspectFinalPermanentBudgetV2([previewUniversalRoll(e.itemId,()=>0)],[]);
  assert.equal(result.unresolvedInnates.length,0);
 }
 let count=0,migrations=0;
 for(const def of STAT_GEMS_V1)for(let grade=1;grade<=5;grade++)for(let strength=80;strength<=120;strength+=5){
  const r=inspectFinalPermanentBudgetV2([row],[{itemId:row.itemId,gemId:gemItemId(def.familyId,grade),rollPercent:strength}]);
  assert.equal(r.unresolvedGemSources.length,0);
  assert.equal(r.requiresMigrationApproval,true);assert.equal(r.cpApproved,false);assert.equal(r.mayApplyEffects,false);
  assert.equal(r.channels.length,new Set(r.channels.map(c=>c.channel)).size);
  for(const c of r.channels)assert.ok(c.effectiveCentipercent<=c.rawCentipercent);
  migrations+=r.migrationSources.length;count++;
 }
 assert.equal(count,540);assert.equal(migrations,225);
});
test('Might joins Attack before one cap, not an additional display rating multiplier',()=>{
 const report=inspectFinalPermanentBudgetV2([row],[{itemId:row.itemId,gemId:'gem:stat_might:g5',rollPercent:120}]);
 const c=report.channels.find(x=>x.channel==='attack_pct');
 assert.equal(c.innateCentipercent,300);assert.equal(c.gemCentipercent,120);assert.equal(c.effectiveCentipercent,420);
 const base={maxHp:1000,attackPower:100,healingPower:100,defense:100,accuracy:600,evasion:100,critChance:.05,critMultiplier:1.5,haste:.05};
 const result=projectPermanentStatCandidateV2(base,[row],[{itemId:row.itemId,gemId:'gem:stat_might:g5',rollPercent:120}]);
 assert.ok(Math.abs(result.stats.attackPower-104.2)<1e-9);
 assert.equal(result.stats.accuracy,base.accuracy);assert.equal(result.stats.evasion,base.evasion);
 assert.equal(result.mayApplyEffects,false);assert.equal(base.attackPower,100);
 assert.throws(()=>projectPermanentStatCandidateV2({...base,attackPower:NaN},[row],[]),/invalid_pre_affix_stats/);
});
