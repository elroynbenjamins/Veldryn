const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const src=(p)=>fs.readFileSync(path.join(__dirname,'../src/',p),'utf8');
const home=src('screens/HomeScreen.tsx');
const header=src('components/HomeAdventureHeader.tsx');
const focus=src('components/HomeActivityFocus.tsx');
const queue=src('components/HomeQueueSummary.tsx');
const ready=src('components/HomeSessionOverview.tsx');
const files=[home,header,focus,queue,ready];
for(const [i,source] of files.entries()){
 const d=ts.transpileModule(source,{fileName:['HomeScreen.tsx','HomeAdventureHeader.tsx','HomeActivityFocus.tsx','HomeQueueSummary.tsx','HomeSessionOverview.tsx'][i],reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[];
 assert.equal(d.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'Home React TSX must parse cleanly');
}
assert.ok(home.includes('<HomeAdventureHeader state={state} compactHome/>'),'Compact Home must retain real character/region art');
assert.ok(header.includes('ZoneSceneArtwork')&&header.includes('CharacterPortrait')&&header.includes('compactHome&&s.heroCompact'),'Compact header must keep real assets');
assert.ok(home.includes('<HomeActivityFocus title={activityName}')&&home.includes('kind={state.activity.kind}')&&home.includes('preview={preview}'),'Home focus must use real live activity projections');
assert.ok(focus.includes('<ActivityCard {...props}')&&focus.includes('GameModalSurface visible={detailOpen}')&&focus.includes('GameModalHeader'),'Detailed activity remains available in shared native sheet');
assert.ok(focus.includes("const requestStop=()=>{setStopFor(activityKey);setStopOpen(true)}")&&focus.includes('presentation="dialog"')&&focus.includes("title={gl('Keep running')}")&&focus.includes("if(stopFor!==activityKey)")&&focus.includes("props.onStop()"),'Collect & stop must require confirmation and protect against stale activity');
assert.ok(focus.includes("canCollect=count>0||!!preview.stoppedReason")&&focus.includes('disabled={!canCollect}'),'No empty reward claim action');
assert.ok(focus.includes('props.onClaim()')&&!focus.includes('setReward('),'Reward collection must call the existing authoritative action');
assert.ok(ready.includes('homeSessionSummary(state,summaryMs)')&&ready.includes("readyRows.slice(0,3)")&&ready.includes("summary.storyRewards")&&ready.includes("summary.forgeReady")&&ready.includes("summary.dailyReady")&&ready.includes("summary.eventRewards")&&ready.includes("summary.companionAttention"),'Ready Now must reflect canonical status projections, with bounded visible rows');
assert.ok(home.indexOf('<HomeActivityFocus')<home.indexOf('<HomeSessionOverview')&&home.indexOf('<HomeSessionOverview')<home.indexOf('<HomeQueueSummary')&&home.indexOf('<HomeQueueSummary')<home.indexOf('<HomeCommandDeck'),'Home priority sections must follow approved hierarchy');
assert.ok(home.includes('queueComposerOpen')&&home.includes('GameModalSurface visible={queueSheetOpen}')&&home.includes('<ActionQueuePanel state={state}')&&home.includes('onRemove={onQueueRemove}')&&home.includes('onMove={onQueueMove}')&&home.includes('onClear={onQueueClear}')&&home.includes('onStartNext={onQueueStart}'),'Existing queue mutations must remain wired inside the management sheet');
assert.ok(queue.includes('normalizeActivityQueue(state.character?.activityQueue,capacity)')&&queue.includes('queuedActivityReadiness(state,next)')&&queue.includes('activityQueueHandoffStatus(state)'),'Queue summary must honour real readiness');
assert.ok(home.includes('showProgress&&<View style={s.expanded}>')&&home.includes('showLedger&&<View style={s.expanded}>')&&home.includes('onSetCurrentHandoff={onSetCurrentHandoff}'),'Secondary and handoff features must remain');
assert.ok(home.includes('GuildDashboardCard')&&home.includes('HomeCommandDeck'),'Guild and quick actions retained');
console.log('PASS: Home approved hierarchy, server-backed rewards, confirmation, queue safety and native sheets');
