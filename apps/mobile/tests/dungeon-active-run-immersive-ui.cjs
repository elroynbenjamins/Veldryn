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
const theater=read('components/CombatTheaterModal.tsx');
const browser=read('components/coop/CoopDungeonBrowser.tsx');
const hero=read('components/coop/DungeonPreparation.tsx');
const liveChat=read('components/coop/CoopLiveChatBar.tsx');
const partyChat=read('components/coop/CoopPartyChat.tsx');

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
assert(app.includes("showActivityBar={tab!=='ProfileCustomize'&&tab!=='Coop'&&tab!=='Events'&&!(tab==='Guild'&&(guildEventPageOpen||guildInitialPve||guildRaidScope===((auth.session?.user.id??state.character.id)+':'+guildMembershipRevision)))&&!featureHubShell.hideActivityBar}"),'The activity bar is hidden on the entire Dungeon tab, including browser, loadout, shops and event details');
assert(app.includes("hideDock={tab==='ProfileCustomize'||tab==='Coop'||featureHubShell.hideGlobalChatDock}"),'Dungeon tab hides the global World chat dock so it cannot duplicate Live party chat');
assert(run.includes("run.mode==='live'&&onChatSend&&!terminal?<CoopLiveChatBar"),'Only active Live runs show the dedicated party chat dock');
assert(run.indexOf('<CoopLiveChatBar')>run.indexOf('</ExpeditionScreenShell>'),'Party chat stays docked below the dungeon scroll content');
assert(!run.includes("<DungeonDisclosure title={st('Party Chat')}"),'Party chat is no longer buried in a scroll disclosure');
assert(liveChat.includes("latest.senderName")&&liveChat.includes("latest.body"),'Live chat bar previews the latest party message');
assert(liveChat.includes('<Modal visible={open}')&&liveChat.includes('<CoopPartyChat messages={messages} onSend={onSend}/>'),'Party dock expands into the existing server-backed party chat');
assert(liveChat.includes('KeyboardAvoidingView')&&liveChat.includes("onRequestClose={close}"),'Live chat composer adapts to keyboard and supports hardware Back');
assert(partyChat.includes('catch{setError(')&&partyChat.includes("setText('');"),'Failed chat sends preserve drafts for retry');
assert((browser.match(/<ExpeditionScreenShell compactHeader hideHeader titleInHero/g)||[]).length===2,'Normal and seasonal dungeon details remove the standalone Back to expeditions row');
assert(browser.includes("description=\"\" onBack={onBack} backLabel={ct(language,'details.backList')}"),'Normal dungeon details keep an accessible in-hero back control');
assert(browser.includes("description={event.description} onBack={preparing?()=>setPreparing(false):onBack}"),'Seasonal dungeon detail back control preserves preparation step navigation');
assert(hero.includes('accessibilityRole="button" accessibilityLabel={backLabel}')&&hero.includes("position:'absolute',top:10,left:10"),'A compact, accessible back control sits over the hero instead of using its own row');
assert(app.includes('{!immersiveDungeonFlow&&mainTabGuide'),'World guidance does not take up room during a run');
assert(app.includes('const disableHistorySwipe=immersiveDungeonFlow||'),'Active dungeon runs remain excluded from swipe history');
assert(app.includes('{...(disableHistorySwipe?{}:backSwipe.panHandlers)}'),'Back-edge gesture does not interrupt room selection');

// Keep the normal bottom navigation as a safe exit from active runs.
assert(app.includes('<PrimaryNavigation destinations={primaryTabs}'),'App navigation remains present');

// The active run has only its status strip above the room choices.
assert(run.includes('<ExpeditionScreenShell hideHeader'),'Run header and back control are suppressed');
assert(!run.includes('onBack={onBack} backLabel={ct(language,\'details.backList\')}'),'Duplicate Back to expeditions is gone');
assert(shell.includes('hideHeader=false')&&shell.includes('{!hideHeader&&<View style={[s.shellHeader'),'Headerless shell is opt-in');
assert(shell.indexOf('{banner?<View style={s.banner}>')<shell.indexOf('<ScrollView style={s.scroll}'),'Mode/phase strip remains above the room list');
assert(run.indexOf('<DungeonRouteChoices')<run.indexOf('Party & formation'),'Room choices stay ahead of optional details');
assert(run.includes('Return to dungeon list'),'Completed run still has an explicit exit');
assert(browser.includes('accessibilityLabel={a("Back")} onPress={onBack}'),'Compact dungeon toolbar retains its navigation');

// Q-Mode / Live / seasonal dungeon battles use a two-line, compact header.
// Keep the mode in the lobby/route context, not as a third combat-header row.
assert(run.includes("eyebrow={st('DUNGEON COMBAT')} compactHeader reduceMotion={reduceMotion}"),'Dungeon combat opts into the compact theater header');
assert(!run.includes('subtitle={modeLabel}'),'Combat theater no longer displays Q-Mode or Live as a subtitle');
assert(theater.includes('compactHeader?:boolean'),'Theater compact spacing is opt-in for dungeon combat only');
assert(theater.includes('compactHeader&&s.headerCompact')&&theater.includes('compactHeader&&s.headingCompact'),'Dungeon header reduces vertical spacing');
assert(theater.includes('closeCompact:{width:44,height:44}'),'Compact close target remains at least 44dp');

console.log('PASS standalone Account Dungeon screen, immersive run and safe exit; no World dungeon tabs');
