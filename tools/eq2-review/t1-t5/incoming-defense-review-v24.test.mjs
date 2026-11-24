import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceAudit,summarize} from './incoming-defense-review-v24.mjs';
const helio='eq2_dungeon_observatory_t4_helioguard:4',stone='eq2_combo_t5_stonewinter_frame:2',rime='eq2_dungeon_shiverlake_t5_rimevanguard:4';
const baseline={victory:false,reason:'timeout',durationMs:120000,damage:100,healing:0,damageTaken:20,hp:80,maxHp:100,enemyHp:900,enemyMaxHp:1000};
test('three exact defensive source definitions',()=>assert.deepEqual(sourceAudit(),{sourceIds:3,distinctMechanics:3,reviewOnly:true,releaseApproved:false}));
test('96 synthetic pairs, 48 baselines, receipt and unchanged combat guards',()=>{
 const rows=[];
 for(const [bossId,region] of Object.entries({BOSS_EXP_SOLAR:'sunscar',BOSS_EXP_SPHINX:'sunscar',BOSS_EXP_BELLBEAST:'frostmarch',BOSS_EXP_CANTOR:'frostmarch'}))
 for(const specIndex of [0,1])for(const strategy of ['generic','targeted','alternative'])for(const band of ['accessible','pressure']){
  for(const ids of region==='sunscar'?[[helio]]:[[stone],[rime],[stone,rime]])rows.push({bossId,region,classId:'IRONWARDEN',specIndex,strategy,band,ids,equippedCopies:9,
   baseline,candidate:baseline,perId:ids.map(id=>({id,earned:1,applied:0})),preventedHpDamage:0});
 }
 const report={scope:'QA_ORIGINAL_FORGE_INCOMING_DEFENSE_COUNTERFACTUAL',actualOwnedCandidateCopies:false,releaseApproved:false,rows};
 const s=summarize(report);assert.equal(s.pairs,96);assert.equal(s.distinctBaselineEncounters,48);assert.equal(s.earned,120);assert.equal(s.applied,0);
 assert.throws(()=>summarize({...report,actualOwnedCandidateCopies:true}));
 assert.throws(()=>summarize({...report,rows:[{...rows[0],perId:[{id:helio,earned:1,applied:2}]},...rows.slice(1)]}));
 assert.throws(()=>summarize({...report,rows:[{...rows[0],candidate:{...baseline,damageTaken:19}},...rows.slice(1)]}));
});
