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
  'ordinary quest detail and reward selection still use the shared themed native sheet');
assert.ok(screen.includes('accessibilityRole="button"')&&screen.includes('minHeight:touchTargetMin'),
  'list rows and tabs must have clear accessible touch targets');
assert.ok(screen.includes('newlyConfirmedIds(prior.story,next.story)')&&screen.includes('newlyConfirmedIds(prior.challenges,next.challenges)'),
  'reward success must be gated on confirmed authoritative state transitions');
assert.ok(screen.includes("setClaimingKey(kind+':'+id)")&&screen.includes("if(pendingClaim.current)return")&&screen.includes("selectedStatus!=='ready'"),
  'direct claim must remain single-flight and reject non-ready rewards');
assert.ok(!screen.includes("sheetStage==='confirm'")&&!screen.includes("setSheetStage('confirm')")&&!screen.includes('Collect quest rewards?'),
  'one-tap Journal claims must not open an intermediate confirmation');
assert.ok(screen.includes("submitClaimFor('story',nextChapter.id)")&&screen.includes("quest.status==='complete'?submitClaimFor('story',def.id)")&&
  screen.includes("nextReward.rewardOptions.length>1?open('challenge',nextReward.id):submitClaimFor('challenge',nextReward.id)")&&
  screen.includes("q.rewardOptions.length===1?submitClaimFor('challenge',q.id):open('challenge',q.id)"),
  'ready story and single-option class claims are direct, multi-option rewards only open selection');
assert.ok(screen.includes("questRewardReceipt(moment,language)")&&screen.includes("moment?.source===mode?")&&
  screen.includes("setTimeout(()=>setMoment(null),4500)")&&!screen.includes("setSheetStage('success')")&&!screen.includes("setSheetStage('claiming')"),
  'verified rewards appear in a timed, non-blocking notification without a claiming or success popup');
assert.ok(screen.includes("pendingClaim.current")&&screen.includes("if(confirmed===false)"),
  'single-flight claims must recover safely on rejection');
assert.ok(screen.includes('storyRewardTitle(quest:QuestDef)')&&screen.includes('if(moment.titleName)rewards.push')&&screen.includes("'titleName' in selectedRewards"),
  'Act III permanent title must appear in detail previews and confirmed receipt text');
assert.ok(screen.includes('onClaimContract(chosenChallenge.period,chosenChallenge.id,rewardChoiceByQuest[id]??chosenChallenge.rewardOptions[0].id)'),
  'challenge claims must send their actual period, id and selected reward choice');
assert.ok(screen.includes("p('CHOOSE ONE REWARD')")&&screen.includes('accessibilityRole="radio"')&&screen.includes('seasonalContractRewardChoices'),
  'ready challenge selection must be accessible and confirmed receipts must reflect the server-selected reward');
assert.ok(screen.includes('onQueueWeeklyOrder(chosenOrder)')&&screen.includes('onStopWeeklyOrder(chosenOrder)'),
  'weekly orders must retain Queue and Stop at done actions');
assert.ok(screen.includes('weeklyOrderLockReason(state,chosenOrder)'),
  'weekly contract actions must honour progression locks');
assert.ok(screen.includes('seasonalChallengeDestination(chosenChallenge)')&&screen.includes('onNavigate(challengeDestination)'),
 'Active Class Challenges must deep-link to the relevant skill or activity without settling rewards');
assert.ok(app.includes('destination.mode??')&&app.includes('setSelectedSkill(destination.skillId)'),
 'Quest skill buttons must select the correct skill screen and clear stale deep-link targets');
assert.ok(app.includes('questClaims.challenges')&&app.includes('questClaims.milestones'),
 'Account quest alerts include class challenges and milestone rewards');
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
assert.ok(screen.includes("selectedStatus==='claimed'&&storyDiscoveryText(language,chosenStory.id)"),
  'New lore remains available only after a story chapter is claimed');
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

assert.ok(screen.includes("state.character?.personalSeasonal?.claimIds??state.account.seasonalContractClaimIds??[]"),
  'quest receipt reconciliation must observe per-character challenge claims');
assert.ok(screen.includes("setSelected(null);setStoryExpanded(false);setMoment(null);setMilestoneReceipt(null);setNotice('')"),
  'claiming closes any selection sheet immediately without a second screen');
assert.ok(screen.includes("onClaimed={({characterName,skillId,xp})=>")&&screen.includes("milestoneReceipt?<View"),
  'monthly milestones still require their skill selection but show the applied XP as a notification');
console.log('PASS: Quest direct claims, selected rewards, confirmed toast receipts and weekly controls');
