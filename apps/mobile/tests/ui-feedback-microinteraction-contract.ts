export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const feedback=read('src/components/ActionFeedback.tsx');
ok(feedback.includes('useGameTheme'),'Action feedback must use the active theme');
ok(feedback.includes("FeedbackTone='success'|'info'|'warning'|'error'"),'Action feedback must support success, info, warning and error');
ok(feedback.includes('C.goodSurface')&&feedback.includes('C.infoSurface')&&feedback.includes('C.warningSurface')&&feedback.includes('C.badSurface'),'Action feedback must use semantic tone surfaces');
ok(feedback.includes("accessibilityLiveRegion={tone==='error'?'assertive':'polite'}"),'Action feedback must announce errors assertively and other results politely');
ok(!feedback.includes("import {C,"),'Action feedback must not regress to the static Veldryn palette');

const loading=read('src/components/LoadingState.tsx');
ok(loading.includes('accessibilityRole="progressbar"'),'Loading state must expose progress semantics');
ok(loading.includes('ActivityIndicator color={C.accent}'),'Loading state must use the active theme accent');
ok(loading.includes('backgroundColor:C.panel2'),'Loading state must use a theme-safe surface');

const empty=read('src/components/EmptyState.tsx');
ok(empty.includes('iconFrame')&&empty.includes('backgroundColor:C.panel2'),'Empty states must keep a compact visual anchor');
ok(empty.includes('compact=false'),'Empty state must support compact placement inside dense screens');

const status=read('src/components/StatusPill.tsx');
ok(status.includes("StatusPillTone='good'|'info'|'warning'|'bad'|'special'|'muted'"),'Status pills must support semantic state tones');
ok(status.includes('C.specialSurface')&&status.includes('C.goodSurface'),'Status pills must use semantic theme surfaces');

const achievements=read('src/screens/AchievementsScreen.tsx');
ok(achievements.includes('LoadingState')&&achievements.includes('ActionFeedback')&&achievements.includes('EmptyState'),'Achievements must use shared loading/error/empty feedback');
ok(achievements.includes("loading={busy==='showcase'}"),'Achievements showcase save must expose its loading state');
ok(achievements.includes('loading={busy===\`claim:\${entry.id}\`}'),'Achievement claims must expose row-specific loading state');
ok(achievements.includes('selected={showcase.includes(entry.id)}'),'Achievement showcase selection must remain visibly selected');
ok(!achievements.includes('ActivityIndicator'),'Achievements must not regress to a bare spinner');

const rankings=read('src/screens/RankingsScreen.tsx');
ok(rankings.includes('LoadingState')&&rankings.includes('ActionFeedback')&&rankings.includes('EmptyState'),'Rankings must use shared loading/error/empty feedback');
ok(rankings.includes('loading={loading}'),'Rankings refresh must expose its loading state');
ok(!rankings.includes('ActivityIndicator'),'Rankings must not regress to a bare spinner');

const friends=read('src/screens/FriendsScreen.tsx');
ok(friends.includes('LoadingState')&&friends.includes('ActionFeedback')&&friends.includes('EmptyState'),'Friends must use shared loading/error/empty feedback');
ok(friends.includes('label="Updating friends"'),'Friends must explain the shared network lock instead of silently disabling actions');
ok(!friends.includes('ActivityIndicator'),'Friends must not regress to a bare spinner');
ok(!friends.includes('errorCard:{'),'Friends errors must not regress to a one-off error card');

const daily=read('src/screens/DailySuppliesScreen.tsx');
ok(daily.includes('ActionFeedback')&&daily.includes('StatusPill'),'Daily Supplies must use shared action feedback and status pills');
ok(daily.includes("tone={status.canClaim?'good':'muted'}"),'Daily Supplies READY/CLAIMED state must use semantic status tone');

const quest=read('src/screens/QuestScreen.tsx');
ok(quest.includes('EmptyState')&&quest.includes('No matching chapters'),'Quest Journal no-results state must use the shared empty-state pattern');

const rewards=read('src/components/RewardPopup.tsx');
ok(rewards.includes('StatusPill label="NEW" tone="special"'),'Reward discoveries must use the shared special NEW badge');
ok(rewards.includes('StatusPill label="COMPLETE" tone="good"'),'Reward completion moments must use the shared success badge');

console.log('PASS: feedback, loading, empty states and micro-status badges use one theme-aware VELDRYN feedback system');
