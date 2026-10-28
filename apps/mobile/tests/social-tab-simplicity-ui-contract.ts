export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}
const social=fs.readFileSync('src/screens/SocialScreen.tsx','utf8');
const hub=fs.readFileSync('src/components/SocialHubPanel.tsx','utf8');
const party=fs.readFileSync('src/components/PartyHubPanel.tsx','utf8');
const weekly=fs.readFileSync('src/components/PartyWeeklyLadder.tsx','utf8');
const chat=fs.readFileSync('src/components/OnlinePartyChat.tsx','utf8');
const chatLog=fs.readFileSync('src/components/ChatLog.tsx','utf8');
const partyEvents=fs.readFileSync('src/components/PartyEventHubPanel.tsx','utf8');
const app=fs.readFileSync('App.tsx','utf8');

ok(app.includes("tab!=='Guild'&&tab!=='Social'&&tab!=='Party'"),'Social must not render the redundant global back/title bar');
ok(app.includes("partyUnlocked={earlyFeatureUnlocked(state,'party')}"),'Party gate must honor account-wide unlocks, including earlier characters');
ok(hub.includes("hasParty?[...VISIBLE_TABS,'chat']:VISIBLE_TABS"),'Chat tab must only appear when a party exists');
ok(hub.includes("const VISIBLE_TABS:SocialHubTab[]=['party','guild']"),'Guild remains visible regardless of Party status');
ok(social.includes("tab==='party'&&partyLocked?<PartyLockedNotice"),'Locked Party view must show only the locked notice');
ok(party.includes("if(!inParty&&props.partyUnlocked===false)return"),'Locked Party hub must not render recruitment or other Party controls');
ok(social.includes("tab==='chat'?(canUsePartyChat?<View style={s.chatContent}><OnlinePartyChat expanded/></View>:social.loading?"),'Chat must have its own full-height screen and a nonblocking initial loading state');
ok(social.includes("if(tab==='chat'&&!canUsePartyChat&&!social.loading){setTab('party')"),'Party disband exits Chat safely without disrupting a pending Chat deep link');
ok(!social.includes('PARTY_SOCIAL_TUTORIAL_STEPS')&&!social.includes('setHelp('),'Duplicate Social help controls must be removed');
ok(!social.includes('onFriends')&&!social.includes('heroStatus'),'Generic Friends toolbar and redundant hero must be removed');
ok(social.includes("<ChatPlayerSheet message={selectedProfile}"),'Player profile interactions must remain available');
ok(social.includes('respondPartyInvitation(invite.id,true,character())'),'Party invite handling must remain available when unlocked');
ok(social.includes("tab==='guild'&&(guildMembership===undefined"),'Guild membership and recruitment view must remain independent of Party lock');

ok(!party.includes('onOpenPartyChat'),'Active Party should not repeat the Chat tab as a button');
ok(party.includes("compact={!expandedContracts.includes(contract.id)}"),'Weekly Party rewards should start in compact mode');
ok(weekly.includes('summary.claimable.map(t=><SocialActionButton'),'Compact Party rewards must remain directly claimable');
ok(party.includes('{props.recruitmentPreferences}')&&party.includes('{props.ownedAdverts}'),'Party recruitment preferences and adverts must remain inside recruitment view');
ok(!party.includes('showFilters'),'Recruitment must not have duplicate Filters toggles');
ok(social.includes('showPartyEvents?<>'),'Party event details must start collapsed');
ok(social.includes('showMatches?<Panel>'),'Recruitment matches must start collapsed');
ok(partyEvents.includes('props.onOpenLeaderboard?<Pressable')&&partyEvents.includes('props.onClaimPersonalMilestone&&'),'Party event buttons must only appear when their callbacks are wired');
ok(!social.includes('onFindParty={()=>setTab'),'Party Event must not show an inert Find Party action');

ok(social.includes('shouldShowPartyChat(social.party,social.accountId)'),'Chat gating must check current membership, not only a party ID');
ok(social.includes('partyInvitations={partyInvitations} invitationCount='),'Party invitations must remain available within Party Options');
ok(social.includes("!social.party?partyInvitations:null"),'Incoming Party invitations must remain visible when no party is active');
ok(party.includes('{props.partyInvitations}')&&party.includes('showSettings?<><View'),'Party invitations must not clutter active Party overview');
ok(party.includes("Recruitment</Text>")&&party.includes('{props.recruitmentDetails}'),'Recruitment composer, matches and details must remain in Recruitment');
ok(social.includes("partyExtras={partyExtras}")&&party.includes("inParty&&section==='party'?props.partyExtras:null"),'Party Events must only appear within My Party');
ok(!weekly.includes('tiers.map(t=><View key={t.tier}'),'Compact Party progress must not render the full tier chip strip');
ok(chat.includes('expanded={expanded}')&&chatLog.includes('expanded&&s.expandedLog'),'Chat must use full available height only in dedicated Social Chat');
ok(social.includes("if(tab!=='chat')void load()"),'Chat must not trigger unrelated social board polling');
ok(party.includes('No active weekly contract.</Text>}'),'Missing contract state must use valid JSX');

ok(social.includes('const [boardCache,setBoardCache]'),'Party and Guild must keep separately cached recruitment lists');
ok(social.includes("previous.accountId===accountId?previous:{accountId,party:EMPTY_BOARD,guild:EMPTY_BOARD}"),'Never show recruitment data from a different account');
ok(social.includes('const generation=++requestGeneration.current')&&social.includes('if(generation!==requestGeneration.current)return'),'Stale background results must never overwrite a newer screen');
ok(social.includes('const [membership,next,mine,board,invites,outgoing,alerts]=await Promise.all'),'Independent Social requests must load concurrently');
ok(social.includes("if(membership!==undefined){"),'A membership lookup failure must preserve the cached Party or Guild view');
ok(social.includes('setBackgroundError(\'refresh_failed\')')&&!social.includes('setCards([])'),'Failed refreshes must show a retry instead of clearing listings');
ok(social.includes("await social.refresh();")&&social.includes('void load();')&&!social.includes('await load();'),'Mutations must not wait for an unrelated recruitment refresh');
ok(social.includes('setTimeout(()=>setShowUpdating(true),1200)'),'Fast background refreshes should not flash a spinner');
ok(!social.includes('LoadingState')&&social.includes('guildMembership===undefined?<><GameButton'),'Guild entry must remain actionable during its first lookup');
ok(social.includes('backgroundError||social.error||showUpdating')&&social.includes('st("Retry")'),'Transient data failures should have one compact retry action');

ok(social.includes("tab==='party'&&social.loading&&!social.party?<Text"),'Do not offer Create Party while the initial membership snapshot is still loading');
ok(social.includes("social.loading?<View style={s.chatContent}"),'Initial Party Chat links should show a small loading label, not bounce away');

console.log('PASS: Social navigation, Party lock, Guild independence, and party-only Chat UI contracts');
