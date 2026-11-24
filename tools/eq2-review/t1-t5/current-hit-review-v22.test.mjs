import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceAudit,summarize} from './current-hit-review-v22.mjs';
const regions={BOSS_EXP_ROOT:'asterfall',BOSS_EXP_BELL:'asterfall',BOSS_EXP_SOLAR:'sunscar',BOSS_EXP_SPHINX:'sunscar',BOSS_EXP_BELLBEAST:'frostmarch',BOSS_EXP_CANTOR:'frostmarch'};
const ids={asterfall:'EQ2_DUNGEON_ROOTBOUND_T2_WEAPON_RAVAGER',sunscar:'EQ2_DUNGEON_OBSERVATORY_T4_WEAPON_RAVAGER',frostmarch:'EQ2_DUNGEON_SHIVERLAKE_T5_WEAPON_RAVAGER'};
const baseline={victory:false,reason:'timeout',durationMs:120000,damage:100,healing:0,damageTaken:20,hp:80,maxHp:100,enemyHp:900,enemyMaxHp:1000};
test('exact current-hit proposals: four source IDs, two distinct mechanics',()=>assert.deepEqual(sourceAudit(),{sourceIds:4,distinctMechanics:2,reviewOnly:true,releaseApproved:false}));
test('synthetic matrix audit: 120 rows, 72 baselines, rejects phantom effects and forged scopes',()=>{
 const rows=[];
 for(const [bossId,region] of Object.entries(regions))for(const specIndex of [0,1])for(const strategy of ['generic','targeted','alternative'])for(const band of ['accessible','pressure']){
  const variants=region==='frostmarch'?[[ids[region]],['eq2_t5_avalanche:6'],[ids[region],'eq2_t5_avalanche:6']]:[[ids[region]]];
  for(const ids of variants)rows.push({bossId,region,classId:'RAVAGER',specIndex,strategy,band,ids,equippedCopies:9,baseline,candidate:baseline,activations:0,extraHpDamage:0});
 }
 const report={scope:'QA_ORIGINAL_FORGE_CURRENT_HIT_COUNTERFACTUAL',actualOwnedCandidateCopies:false,releaseApproved:false,rows};
 const s=summarize(report);assert.equal(s.pairs,120);assert.equal(s.distinctBaselineEncounters,72);assert.equal(s.totalActivations,0);
 assert.equal(s.byVariant.winterbreaker.pairs,72);assert.equal(s.byVariant.avalanche.pairs,24);assert.equal(s.byVariant.combined.pairs,24);
 assert.throws(()=>summarize({...report,actualOwnedCandidateCopies:true}));
 assert.throws(()=>summarize({...report,rows:[{...rows[0],candidate:{...baseline,damage:101}},...rows.slice(1)]}));
 assert.throws(()=>summarize({...report,rows:[rows[1],...rows.slice(1)]}));
});
