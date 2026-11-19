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
 './v2/enemy-engine-authority','./enemy-v2-status-rules',
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
 if(path==='./v2/reactive-passive-runtime')
  assert.throws(()=>m.triggerReactivePassiveV2(),/not_available_in_live/);
 if(path==='./v2/capstone-runtime')
  assert.throws(()=>m.triggerCapstoneV2(),/not_available_in_live/);
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
 'backend/src/server/combat/v2/solo-encounter-persistence.ts',
 'backend/src/server/combat/enemy-v2-status-rules.ts',
]){
 assert.throws(()=>assertLegacyEdgeIsolation(fake(secret),'gameplay'),
  /private_runtime_in_bundle/);
}
for(const leak of ['issueEnemyV2EngineAuthority','combat_v2_solo_test',
 'enemy-v2-prototype-1','SoloEncounterPersistenceServiceV2']){
 assert.throws(()=>assertLegacyEdgeIsolation(fake('backend/online/edge.ts',leak),'gameplay'),
 /private_token_in_bundle/);
}
assert.throws(()=>assertLegacyEdgeIsolation({},'gameplay'),/missing_metafile/);
console.log('PASS: legacy Edge isolation, fail-closed forged V2 hooks, private source and payload leakage guards');
