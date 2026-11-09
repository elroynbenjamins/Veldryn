const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'App.tsx'),'utf8');
const read=p=>fs.readFileSync(path.join(root,'src',p),'utf8');
const world=read('screens/WorldScreen.tsx');
const screen=read('screens/CoopExpeditionScreen.tsx');
const shell=read('components/coop/CoopVisualKit.tsx');
const run=read('components/coop/CoopRunOverview.tsx');
const browser=read('components/coop/CoopDungeonBrowser.tsx');

// World remains independent of all dungeon browsing and run states.
assert(world.includes('<WorldChapterNavigator'),'World retains region and exploration navigation');
assert(!world.includes('dungeonContent')&&!world.includes('topTab')&&!world.includes('onCoop'),'World does not embed dungeon entry or a World/Dungeon switcher');
assert((app.match(/<CoopExpeditionScreen /g)||[]).length===1,'Dungeons mount as exactly one standalone screen');
assert(app.includes("if(destination==='Dungeon'){setTab('Coop');return;}"),'Account Dungeon button routes to standalone dungeon screen');

// Both standard and seasonal runs report the same immersive state.
assert(screen.includes('const isActiveRun=Boolean(run||eventRun)'),'Q-Mode, Live and event runs share active-flow detection');
assert(screen.includes('onRunActiveChange?.(isActiveRun)'),'Run phase controls the parent chrome');
assert(screen.includes('return ()=>onRunActiveChange?.(false)'),'Chrome resets when the dungeon unmounts');
assert((app.match(/onRunActiveChange={setDungeonFlowActive}/g)||[]).length===1,'Only the standalone dungeon screen changes immersive mode');

// No redundant top bar, section tutorial or edge-swipe back
// above the Q-Mode/Live status banner.
assert(app.includes("dungeonFlowActive&&tab==='Coop'"),'Only the standalone dungeon route becomes immersive');
assert(app.includes('{!immersiveDungeonFlow&&<GameTopBar'),'Active runs hide the global character and activity HUD');
assert(app.includes('{!immersiveDungeonFlow&&mainTabGuide'),'World guidance does not take up room during a run');
assert(app.includes('{...(immersiveDungeonFlow?{}:backSwipe.panHandlers)}'),'Back-edge gesture does not interrupt room selection');

// Keep the normal bottom navigation as a safe exit from active runs.
assert(app.includes('<PrimaryNavigation destinations={primaryTabs}'),'App navigation remains present');

// The active run has only its status strip above the room choices.
assert(run.includes('<ExpeditionScreenShell hideHeader'),'Run header and back control are suppressed');
assert(!run.includes('onBack={onBack} backLabel={ct(language,\'details.backList\')}'),'Duplicate Back to expeditions is gone');
assert(shell.includes('hideHeader=false')&&shell.includes('{!hideHeader&&<View style={[s.shellHeader'),'Headerless shell is opt-in');
assert(shell.indexOf('{banner?<View style={s.banner}>')<shell.indexOf('<ScrollView style={s.scroll}'),'Mode/phase strip remains above the room list');
assert(run.indexOf('<DungeonRouteChoices')<run.indexOf('Party & formation'),'Room choices stay ahead of optional details');
assert(run.includes('Return to dungeon list'),'Completed run still has an explicit exit');
assert(browser.includes('onBack={onBack} backLabel={a("Back")}'),'Normal browser retains its navigation');
console.log('PASS standalone Account Dungeon screen, immersive run and safe exit; no World dungeon tabs');
