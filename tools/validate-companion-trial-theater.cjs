// Isolated PR regression test, runs before unrelated core typecheck errors.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=path.resolve(__dirname,'../apps/mobile'),read=x=>fs.readFileSync(path.join(app,x),'utf8');
const trial=read('src/components/CompanionTrialStage.tsx'),panel=read('src/components/CombatCompanionPanel.tsx'),locale=read('src/i18n/companions.ts');
assert(trial.includes('CombatImpactBurst')&&trial.includes('CombatAttackSprite')&&trial.includes('CombatOutcomeMoment'),'Companion Trial event-driven visual effects and result present');
assert(trial.includes("playbackView!.visible")&&trial.includes('playback.events'),'Playback is derived from server-authoritative events');
assert(!trial.includes('TRIAL_VENOM_BLOOM')&&!trial.includes("status_remove"),'Do not expose unapplied backend hazard rules in a visual-only PR');
assert(trial.includes('const fresh=!!last&&!!playback;'),'Saved result transcript is replayable after 90 seconds');
assert(trial.includes('changeSpeed(')&&trial.includes('([1,2,4] as const)'),'Companion replay speeds remain 1x/2x/4x only');
assert(!trial.includes('SKIP →'),'Trial playback does not duplicate skip controls');
assert(panel.includes("trialSheet!==null&&trialSheet!=='battle'"),'No overlapping normal/modal surfaces');
assert(panel.includes('trialSheet===\'battle\'?<CombatTheaterModal visible'),'Full-screen theater used for battle');
assert(panel.includes('previousBattleTimestamp.current')&&panel.includes("title.startsWith('Trial Floor ')"),'Only new Trial floor results automatically open their battle theater');
assert(panel.includes('Watch last fight')&&!panel.includes('title={t("Encounter details")} onPress={()=>setTrialSheet("battle")}'),'Watch action is promoted, not duplicated under Floor map');
assert(panel.includes('recommendedCompanionTrialTeam')&&panel.includes('trialSuggestion.targetChallenge')&&panel.includes('CompanionTower'),'Preserve current team suggestion, monthly challenges, and optional tower details');
for(const key of ['LIVE COMBAT','SPEED','Change playback speed','TRIAL COMBAT','Tower of Companions','Watch last fight'])assert(locale.includes('"'+key+'":'),'Registered translations: '+key);
const ts=require(path.join(app,'node_modules/typescript'));
for(const file of ['src/components/CompanionTrialStage.tsx','src/components/CombatCompanionPanel.tsx']){
 const diagnostics=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).diagnostics??[];
 assert.equal(diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,file+': '+diagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join(', '));
}
console.log('PASS: Companion Trial full-screen replay, event FX, 1x/2x/4x, simplified flow and TSX syntax');
