/**
 * Release boundary for the current production gameplay and co-op Edge bundles.
 * Never ship the draft Classes/Skills/Enemies V2 runtime through a shared import.
 *
 * The private backend TypeScript tests still import the REAL engine and modules.
 * This plugin replaces only engine.ts's experimental imports while building the
 * legacy Edge entrypoints. No client or caller can enable V2 via request JSON.
 */
const ENGINE_SUFFIX='/backend/src/server/combat/engine.ts';
const experimentalSource=input=>{const clean=input.replaceAll(String.fromCharCode(92),'/');return clean.includes('src/server/combat/v2/')||clean.endsWith('src/server/combat/enemy-v2-status-rules.ts');};
const ALLOWED=new Set([
 './v2/resource-runtime',
 './v2/capstone-runtime',
 './v2/reactive-passive-runtime',
 './v2/enemy-engine-authority',
 './enemy-v2-status-rules',
]);
const DISABLED='throw Error("combat_v2_not_available_in_live_edge_bundle");';
const neutral={
 './v2/resource-runtime':`
const blocked=()=>{ ${DISABLED} };
export function initCombatResourceV2(def){if(def.combatV2)blocked();return undefined;}
export function awardCombatResourceV2(state){if(state.combatV2)blocked();return undefined;}
export function spendCombatResourceV2(state,ability){if(state.combatV2)blocked();return {ability};}
export function consumeQueuedCombatBonusV2(state,ability){if(state.combatV2)blocked();return ability;}
`,
 './v2/capstone-runtime':`
export function triggerCapstoneV2(){ ${DISABLED} }
`,
 './v2/reactive-passive-runtime':`
const blocked=()=>{ ${DISABLED} };
export function triggerReactivePassiveV2(){blocked();}
export function defensiveReactiveTriggerV2(){blocked();}
export function outgoingReactiveMultiplierV2(){blocked();}
export function incomingReactiveMultiplierV2(){blocked();}
export function reactiveDamageFlatReductionV2(){blocked();}
export function reactiveHasteV2(){blocked();}
export function reactiveHealingMultiplierV2(){blocked();}
export function reactiveShieldMultiplierV2(){blocked();}
`,
 './v2/enemy-engine-authority':`
export function authorizeEnemyV2EngineExecution(input,authority){
 if(authority!==undefined||input?.players?.some(player=>player.combatV2))
   ${DISABLED}
 return false;
}
`,
 './enemy-v2-status-rules':`
export function applyEnemyV2Periodic(){ ${DISABLED} }
export function applyEnemyV2Modifier(){ ${DISABLED} }
export function enemyV2AllowedShieldAmount(){ ${DISABLED} }
`,
};

/** Used solely in production Edge esbuild, NEVER in the private V2 test engine. */
export function liveEdgeCombatV2IsolationPlugin(){
 return {
  name:'live-edge-combat-v2-isolation',
  setup(build){
   build.onResolve({filter:/.*/},args=>{
    if(!args.importer.replaceAll(String.fromCharCode(92),'/').endsWith(ENGINE_SUFFIX))return;
    if(!args.path.startsWith('./v2/')&&args.path!=='./enemy-v2-status-rules')return;
    if(!ALLOWED.has(args.path))throw Error('unexpected_combat_v2_legacy_shim:'+args.path);
    return {path:args.path,namespace:'live-edge-v2-disabled'};
   });
   build.onLoad({filter:/.*/,namespace:'live-edge-v2-disabled'},args=>({
    contents:neutral[args.path],loader:'js',
   }));
  },
 };
}

/** Fail the build if any newly reachable private V2 source sneaks into Edge. */
export function assertLegacyEdgeIsolation(result,outputName){
 if(!result?.metafile||!Array.isArray(result.outputFiles)||!result.outputFiles.length)
  throw Error('combat_v2_edge_isolation_missing_metafile:'+outputName);
 const imported=Object.keys(result.metafile.inputs).filter(input=>experimentalSource(input));
 if(imported.length)
  throw Error('combat_v2_edge_private_runtime_in_bundle:'+outputName+':'+imported.join(','));
 const js=result.outputFiles.filter(item=>item.path.endsWith('.js')||item.path.endsWith('.ts'))
  .map(item=>item.text).join(String.fromCharCode(10));
 for(const forbidden of [
  'combat_v2_enemy_authority_','combat_v2_solo_',
  'enemy-v2-prototype-1','issueEnemyV2EngineAuthority',
  'prepareSoloEnemyKitsV2','SoloEncounterPersistenceServiceV2',
 ]){
  if(js.includes(forbidden))
   throw Error('combat_v2_edge_private_token_in_bundle:'+outputName+':'+forbidden);
 }
 return {entry:outputName,inputs:Object.keys(result.metafile.inputs).length,
  outputBytes:result.outputFiles.reduce((sum,item)=>sum+item.contents.length,0)};
}
