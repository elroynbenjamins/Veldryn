const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../apps/mobile'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
const run=read('src/components/coop/CoopRunOverview.tsx'),stage=read('src/components/coop/DungeonCombatStage.tsx');
const rooms=read('src/components/coop/DungeonRouteChoices.tsx'),event=read('src/screens/CoopExpeditionScreen.tsx');
const modal=read('src/components/CombatTheaterModal.tsx');
assert(run.includes('<DungeonRouteChoices options={run.options}')&&!run.includes('run.options.map(option=><FantasyPanel'),'Illustrated room choices retained');
assert(run.includes('<CombatTheaterModal visible')&&run.includes('<DungeonCombatStage run={run}'),'Full-screen theater renders combat');
assert.equal((run.match(/<DungeonCombatStage run=\{run\}/g)||[]).length,1,'No second inline arena when minimized');
assert(run.includes('lastReplay.current!==replayKey')&&run.includes('setTheaterOpen(false)'),'New replay opens once and theater can minimize');
assert(stage.includes("run.mode!=='live'&&(!complete||paused)")&&stage.includes("if(run.mode!=='live'&&!reduceMotion&&cues.length>1"),'Live fights cannot be paused, stepped or skipped');
assert(!stage.includes('DUNGEON_PLAYBACK_SPEEDS')&&!stage.includes('playbackSpeed'),'Live and Echo have no speed controls');
assert(stage.includes('playbackAdvanceDelayMs(current,next,1)')&&stage.includes('playbackCastDisplayMs(currentBossCast,1)'),'Cue and boss timings fixed to 1x');
assert(stage.includes('CombatantInspectPanel')&&stage.includes('currentHp={state?.hp}')&&stage.includes('combatShield={state?.shield??0}'),'Recent HP, shields and inspection preserved');
assert(stage.includes('CombatAttackSprite')&&stage.includes('CombatImpactBurst')&&stage.includes('CombatOutcomeMoment'),'Class attacks, impacts and outcome visuals');
assert(stage.includes('backdrop=combatBackdrop(seasonal,eventName)')&&stage.includes('arenaBackdrop'),'Seasonal illustrated arena');
assert(event.includes('seasonal eventName={eventRun.eventName}'),'Event name passed to scene');
assert(rooms.includes('onPress={()=>onChoose?.(option.nodeId)}')&&rooms.includes("phase==='awaiting_choice'&&!busy"),'Authoritative voting preserved');
assert(modal.includes('onRequestClose={onClose}')&&modal.includes('useSafeAreaInsets'),'Android Back and safe area handled');
const ts=require(path.join(root,'node_modules/typescript'));
for(const filename of ['src/components/coop/CoopRunOverview.tsx','src/components/coop/DungeonCombatStage.tsx','src/components/coop/DungeonRouteChoices.tsx','src/components/CombatTheaterModal.tsx','src/components/CombatAttackSprite.tsx','src/components/CombatImpactBurst.tsx','src/components/CombatOutcomeMoment.tsx','src/screens/CoopExpeditionScreen.tsx']){
 const diagnostics=ts.transpileModule(read(filename),{fileName:filename,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).diagnostics??[];
 const errors=diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,filename+': '+errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')));
}
console.log('PASS: integrated fullscreen dungeon and event combat, automatic 1x Live, combat FX, voting and TSX syntax');
