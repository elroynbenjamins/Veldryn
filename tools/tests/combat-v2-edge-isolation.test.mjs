import assert from 'node:assert/strict';
import {liveEdgeCombatV2IsolationPlugin,assertLegacyEdgeIsolation} from '../combat-v2-live-edge-isolation.mjs';

// Test the real build plugin without connecting it to a production endpoint.
let resolve,load;
liveEdgeCombatV2IsolationPlugin().setup({
 onResolve(_options,callback){resolve=callback;},
 onLoad(_options,callback){load=callback;},
});
const engine='/repo/backend/src/server/combat/engine.ts';
const unrelated='/repo/backend/online/coop.ts';
assert.equal(resolve({path:'./v2/resource-runtime',importer:unrelated}),undefined,
 'Unrelated modules must not be silently rewritten');
assert.equal(resolve({path:'./calculation',importer:engine}),undefined);
assert.throws(()=>resolve({path:'./v2/unexpected-new-runtime',importer:engine}),
 /unexpected_combat_v2_legacy_shim/,'A new experimental hook must fail closed');
for(const path of [
 './v2/resource-runtime','./v2/capstone-runtime','./v2/reactive-passive-runtime',
 './v2/enemy-engine-authority','./v2/equipment-trait-engine-authority',
 './v2/equipment-trait-engine-runtime','./v2/party-sync-authority','./v2/tactical-ai',
 './v2/dungeon-reward-engine-v2','./v2/equipment-private-hit-qa-v22','./enemy-v2-status-rules',
]){
 const redirected=resolve({path,importer:engine});
 assert.equal(redirected?.namespace,'live-edge-v2-disabled');
 assert.equal(redirected?.path,path);
 const shim=load({path,namespace:redirected.namespace});
 assert.equal(shim.loader,'js');
 const m=await import('data:text/javascript;base64,'+
   Buffer.from(shim.contents,'utf8').toString('base64'));
 if(path==='./v2/resource-runtime'){
  assert.equal(m.initCombatResourceV2({team:'players'}),undefined);
  assert.equal(m.awardCombatResourceV2({}),undefined);
  assert.deepEqual(m.spendCombatResourceV2({}, {id:'legacy'}),{ability:{id:'legacy'}});
  assert.throws(()=>m.initCombatResourceV2({combatV2:{version:2}}),/not_available_in_live/);
  assert.throws(()=>m.awardCombatResourceV2({combatV2:{}}),/not_available_in_live/);
 }
 if(path==='./v2/enemy-engine-authority'){
  assert.equal(m.authorizeEnemyV2EngineExecution({players:[{}],enemies:[{}]}),false);
  assert.throws(()=>m.authorizeEnemyV2EngineExecution({players:[{}]},{}),/not_available_in_live/);
  assert.throws(()=>m.authorizeEnemyV2EngineExecution({
   players:[{combatV2:{version:2}}],
  }),/not_available_in_live/);
 }
 if(path==='./v2/equipment-trait-engine-authority'||path==='./v2/dungeon-reward-engine-v2'){
  const authorize=path.includes('equipment')?m.authorizeEquipmentV2TraitEngine:m.authorizeDungeonRewardEngineV2;
  const value=authorize({players:[{}],enemies:[{}]});
  if(path.includes('equipment'))assert.equal(value.size,0);else assert.equal(value,undefined);
  for(const token of [{},null,false,0])assert.throws(()=>authorize({players:[{}]},token),/not_available_in_live/);
  assert.throws(()=>authorize({players:[{combatV2:{version:2}}]}),/not_available_in_live/);
 }
 if(path==='./v2/equipment-private-hit-qa-v22'){
  assert.equal(m.authorizeEq2PrivateHitQaV22({players:[{}]}),undefined);
  for(const token of [{},null,false,0])assert.throws(()=>m.authorizeEq2PrivateHitQaV22({players:[{}]},token),/not_available_in_live/);
  assert.throws(()=>m.authorizeEq2PrivateHitQaV22({players:[{combatV2:{version:2}}]}),/not_available_in_live/);
 }
 if(path==='./v2/party-sync-authority'){
  assert.equal(m.authorizePartySyncV2({players:[{}]}).size,0);
  for(const token of [{},null,false,0])assert.throws(()=>m.authorizePartySyncV2({players:[{}]},token),/not_available_in_live/);
  assert.throws(()=>m.authorizePartySyncV2({players:[{combatV2:{version:2}}]}),/not_available_in_live/);
 }
 if(path==='./v2/equipment-trait-engine-runtime')
  assert.throws(()=>new m.EquipmentTraitRuntimeV2(new Map()),/not_available_in_live/);
 if(path==='./v2/reactive-passive-runtime')
  assert.throws(()=>m.triggerReactivePassiveV2(),/not_available_in_live/);
 if(path==='./v2/capstone-runtime')
  assert.throws(()=>m.triggerCapstoneV2(),/not_available_in_live/);
 if(path==='./v2/tactical-ai'){
  for(const name of ['supportV2','tankV2','damageV2']){
   assert.equal(m[name]({}),false);
   assert.throws(()=>m[name]({combatV2:{}}),/not_available_in_live/);
  }
  assert.equal(m.CRITICAL_SUPPORT_HP_V2,.30);
  for(const name of ["emergencySupportRankV2","supportTargetsV2","incomingBossPressureV2","predictiveShieldTargetsV2","ordinaryHealSufficientV2","tankProtectionDecisionV2","damageTacticsV2","pureSingleHealV2","coordinatedHealV2","redundantPureShieldV2","sequenceDamageActionV2"])
   assert.throws(()=>m[name](),/not_available_in_live/);
 }
 if(path==='./enemy-v2-status-rules')
  assert.throws(()=>m.applyEnemyV2Periodic(),/not_available_in_live/);
}
const fake=(input,body='// only released engine')=>({
 metafile:{inputs:{[input]:{bytes:100}},outputs:{}},
 outputFiles:[{path:'/tmp/edge.ts',text:body,contents:Buffer.from(body)}],
});
assert.deepEqual(assertLegacyEdgeIsolation(fake('backend/src/server/combat/engine.ts'),'coop').entry,'coop');
for(const secret of [
 'backend/src/server/combat/v2/resource-runtime.ts',
 'backend/src/server/combat/v2/equipment-trait-engine-authority.ts',
 'backend/src/server/combat/v2/equipment-trait-engine-runtime.ts',
 'backend/src/server/combat/v2/solo-encounter-persistence.ts',
 'backend/src/server/combat/v2/party-sync-authority.ts',
 'backend/src/server/combat/v2/tactical-ai.ts',
 'backend/src/server/combat/v2/dungeon-reward-engine-v2.ts',
 'backend/src/server/combat/v2/equipment-private-hit-qa-v22.ts',
 'backend/src/server/combat/enemy-v2-status-rules.ts',
]){
 assert.throws(()=>assertLegacyEdgeIsolation(fake(secret),'gameplay'),
  /private_runtime_in_bundle/);
}
for(const leak of ['issueEnemyV2EngineAuthority','combat_v2_solo_test',
 'enemy-v2-prototype-1','SoloEncounterPersistenceServiceV2',
 'issueEquipmentV2TraitAuthority','compileExactEquipmentTraitSourceV2','issuePartySyncAuthorityV2','party_sync_authority_',
 'issuePersistedPartyEquipmentV2TraitAuthority','party-v2-run-binding-review-1',
 'issuePersistedPartyEnemyV2EngineAuthority','preparePartyEnemyKitsV2',
 'projectPartySynchronizationLobbyV2','previewPartySynchronizationCandidateV2',
 'eq2-traits-hidden-engine-pass1','issueDungeonRewardEngineAuthorityV2','dungeon-reward-reactive-hidden-v1',
 'issueEq2PrivateHitQaV22','eq2-v22-private-current-hit-qa']){
 assert.throws(()=>assertLegacyEdgeIsolation(fake('backend/online/edge.ts',leak),'gameplay'),
 /private_token_in_bundle/);
}
assert.throws(()=>assertLegacyEdgeIsolation({},'gameplay'),/missing_metafile/);
console.log('PASS: legacy Edge isolation, fail-closed forged V2 hooks, private source and payload leakage guards');
