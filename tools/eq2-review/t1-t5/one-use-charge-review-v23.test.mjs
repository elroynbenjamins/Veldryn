import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceAudit,summarize} from './one-use-charge-review-v23.mjs';
const follow='eq2_t5_avalanche:4',talons='eq2_combo_t5_glacier_talons:2',thorn='eq2_dungeon_rootbound_t2_thornstrider:4';
const baseline={victory:false,reason:'timeout',durationMs:120000,damage:100,healing:0,damageTaken:20,hp:80,maxHp:100,enemyHp:900,enemyMaxHp:1000};
test('three exact source charge definitions',()=>assert.deepEqual(sourceAudit(),{sourceIds:3,distinctMechanics:3,reviewOnly:true,releaseApproved:false}));
test('96 synthetic pairs, 48 distinct baselines and fail-closed charge receipt audit',()=>{
 const rows=[];
 for(const [bossId,region] of Object.entries({BOSS_EXP_ROOT:'asterfall',BOSS_EXP_BELL:'asterfall',BOSS_EXP_BELLBEAST:'frostmarch',BOSS_EXP_CANTOR:'frostmarch'}))
 for(const specIndex of [0,1])for(const strategy of ['generic','targeted','alternative'])for(const band of ['accessible','pressure']){
  for(const ids of region==='asterfall'?[[thorn]]:[[follow],[talons],[follow,talons]])rows.push({bossId,region,classId:'RAVAGER',specIndex,strategy,band,ids,equippedCopies:9,
   baseline,candidate:baseline,perId:ids.map(id=>({id,earned:1,consumed:0})),extraHpDamage:0});
 }
 const report={scope:'QA_ORIGINAL_FORGE_ONE_USE_CHARGE_COUNTERFACTUAL',actualOwnedCandidateCopies:false,releaseApproved:false,rows};
 const s=summarize(report);assert.equal(s.pairs,96);assert.equal(s.distinctBaselineEncounters,48);assert.equal(s.earned,120);assert.equal(s.consumed,0);
 assert.throws(()=>summarize({...report,actualOwnedCandidateCopies:true}));
 assert.throws(()=>summarize({...report,rows:[{...rows[0],perId:[{id:thorn,earned:0,consumed:1}]},...rows.slice(1)]}));
 assert.throws(()=>summarize({...report,rows:[{...rows[0],candidate:{...baseline,damage:101}},...rows.slice(1)]}));
});
