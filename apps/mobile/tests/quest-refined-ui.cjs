const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');

const screen=fs.readFileSync(path.join(__dirname,'../src/screens/QuestRefinedScreen.tsx'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../App.tsx'),'utf8');
const tabs=fs.readFileSync(path.join(__dirname,'../src/components/QuestModeSwitch.tsx'),'utf8');
const syntax=ts.transpileModule(screen,{fileName:'QuestRefinedScreen.tsx',reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[];
assert.equal(syntax.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,
  'refined quest layout must parse as TypeScript/JSX');

assert.ok(app.includes("QuestRefinedScreen as QuestScreen"),'App must mount the redesigned quests screen');
assert.ok(screen.includes("journalEntries(state,filter,'').filter(({def})=>questMatchesLocalizedSearch(language,def,query))"),'story filtering must use real journal state and preserve English/localized search');
assert.ok(screen.includes('seasonalQuestBoard(state'),'challenge cards must preserve class/period projections');
assert.ok(screen.includes('weeklyOrderBoardForState(state)'),'contracts must use real current weekly board');
assert.ok(!screen.includes('weeklyOrderPendingRewards')&&!screen.includes('contractAttention={boardPending.length}')&&!screen.includes('rewards pending processing'),
  'automatic Contract reward receipts must not create sticky attention badges or misleading pending copy');
const legacy=fs.readFileSync(path.join(__dirname,'../src/screens/QuestScreen.tsx'),'utf8');
assert.ok(!legacy.includes('pendingBoardRewards')&&!legacy.includes('contractAttention={pendingBoardRewards.length}'),
  'legacy Quest layout must not count settled Contract rewards as notifications');
assert.ok(screen.includes('storyAttention={storyReady} challengeAttention={challengeReady.length}')&&
  legacy.includes('storyAttention={ready} challengeAttention={challengeReadyCount}'),
  'Journal and Challenge claimable badges must remain while Contracts have no passive-reward alert');

assert.ok(screen.includes('GameModalSurface')&&screen.includes('GameModalHeader'),
  'details and final reward receipts use the shared themed native sheet');
assert.ok(screen.includes('accessibilityRole="button"')&&screen.includes('minHeight:touchTargetMin'),
  'list rows and tabs must have clear accessible touch targets');
assert.ok(screen.includes('newlyConfirmedIds(prior.story,next.story)')&&screen.includes('newlyConfirmedIds(prior.challenges,next.challenges)'),
  'reward success must be gated on confirmed authoritative state transitions');
assert.ok(screen.includes("setSheetStage('claiming')")&&screen.includes("selectedStatus!=='ready'"),
  'claim confirmation must prevent unsolicited/repeated claims');
assert.ok(!screen.includes("sheetStage==='confirm'")&&!screen.includes("setSheetStage('confirm')")&&!screen.includes('Collect quest rewards?'),
  'one-tap Journal claims must not open an intermediate confirmation');
assert.ok(screen.includes("submitClaimFor('story',nextChapter.id)")&&screen.includes("open('challenge',nextReward.id)"),
  'story rewards remain one-tap while challenges open the reward choice before claim');
assert.ok(screen.includes("if(sheetStage==='success')setMoment(null)")&&screen.includes("sheetStage==='success'&&selected?.id===moment.id"),
  'closing the final receipt must not show another reward banner or time out prematurely');
assert.ok(screen.includes("pendingClaim.current")&&screen.includes("if(confirmed===false)"),
  'single-flight claims must recover safely on rejection');
assert.ok(screen.includes('storyRewardTitle(quest:QuestDef)')&&screen.includes('titleName={moment.titleName}')&&screen.includes("'titleName' in selectedRewards"),
  'Act III permanent title must appear in quest previews and confirmed receipts');
assert.ok(screen.includes('onClaimContract(chosenChallenge.period,chosenChallenge.id,rewardChoiceByQuest[id]??chosenChallenge.rewardOptions[0].id)'),
  'challenge claims must send their actual period, id and selected reward choice');
assert.ok(screen.includes("p('CHOOSE ONE REWARD')")&&screen.includes('accessibilityRole="radio"')&&screen.includes('seasonalContractRewardChoices'),
  'ready challenge selection must be accessible and confirmed receipts must reflect the server-selected reward');
assert.ok(screen.includes('onQueueWeeklyOrder(chosenOrder)')&&screen.includes('onStopWeeklyOrder(chosenOrder)'),
  'weekly orders must retain Queue and Stop at done actions');
assert.ok(screen.includes('weeklyOrderLockReason(state,chosenOrder)'),
  'weekly contract actions must honour progression locks');
assert.ok(screen.includes('onOpenWeeklyBoss'),'Fallen Knight weekly bounty flow must remain reachable');
assert.ok(screen.includes('onOpenWeeklyOrder(chosenOrder)'),'contract routes must open the canonical destination');
assert.ok(screen.includes('Rewards process automatically')&&screen.includes('chosenOrder&&selectedStatus'),
  'contract rewards remain automatic without a manual claim action');
assert.ok(screen.includes('onClose={closeSheet}')&&screen.includes("sheetScroll:{flexShrink:1,minHeight:0}"),
  'native detail sheet must close and scroll on smaller devices');
assert.ok(screen.includes('recoveredStoryDiscoveries(state,language)')&&screen.includes('storyActProgress(state)'),
  'Story hero and recovered archive derive from current claimed quest state');
assert.ok(screen.includes("campaignFinished?p('The Asterfall chronicle is complete')"),
  'Completed Asterfall campaigns show a real ending rather than a perpetual next chapter');
assert.ok(screen.includes("moment.source==='story'&&storyDiscoveryText(language,moment.id)"),
  'New lore is only displayed with a confirmed story reward receipt');
assert.ok(screen.includes("selectedStatus==='locked'?<Text")&&screen.includes('Complete earlier chapters to read this story page.'),
  'Locked chapter story pages cannot disclose future plot');
assert.ok(screen.includes("campaignFinished?<View")&&screen.includes("zoneId:'SUNSCAR'")&&screen.includes("p('Open Sunscar')"),
  'Claiming all Asterfall chapters offers a clear, region-safe Sunscar story handoff');
assert.ok(screen.includes('accessibilityState={{expanded:chronicleExpanded}}')&&screen.includes('chronicleToggle:{minHeight:touchTargetMin'),
  'Chronicle archive is accessible and touch-friendly');
assert.ok(tabs.includes('minHeight:50'),'mode tabs should be compact');
const lessonPanel=fs.readFileSync(path.join(__dirname,'../src/components/JournalSkillPathsPanel.tsx'),'utf8');
const lessonModel=fs.readFileSync(path.join(__dirname,'../src/core/journal-skill-lessons.ts'),'utf8');
const lessonSyntax=ts.transpileModule(lessonPanel,{fileName:'JournalSkillPathsPanel.tsx',reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).diagnostics??[];
assert.equal(lessonSyntax.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,'Training panel must parse on mobile');
assert.ok(screen.includes('<JournalSkillPathsPanel state={state} onNavigate={onNavigate}/>'),'Training lives alongside the canonical story journal');
assert.ok(lessonPanel.includes('accessibilityRole="button"')&&lessonPanel.includes('minHeight:44'),'Training cards and browse control have accessible touch targets');
assert.ok(lessonPanel.includes('journalSkillLessonProgress(state)')&&lessonModel.includes('status:practiceComplete?'),'Milestones follow the live skill state');
assert.ok(app.includes("destination.skillId==='faith'?'faith'")&&app.includes("?'gathering':'crafting'"),'Quest deep links route to the correct skill mode');

console.log('PASS: Quest redesign, selected rewards, server-confirmed receipts and weekly controls');
