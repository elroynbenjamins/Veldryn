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
const gameGuide=fs.readFileSync('src/core/onboarding.ts','utf8');
const gameGuidePanel=fs.readFileSync('src/components/GameGuidePanel.tsx','utf8');
const guildTutorial=fs.readFileSync('src/core/guild-tutorial.ts','utf8');
const guildTutorialPanel=fs.readFileSync('src/components/GuildTutorialGuide.tsx','utf8');
const accountLanguage=fs.readFileSync('src/i18n/account.ts','utf8');
const guildLanguage=fs.readFileSync('src/i18n/guild-tutorial.ts','utf8');
const sectionGuide=fs.readFileSync('src/components/SectionGuide.tsx','utf8');
const companion=fs.readFileSync('src/components/CombatCompanionPanel.tsx','utf8');
const guildScreen=fs.readFileSync('src/screens/GuildScreen.tsx','utf8');
const coreGuidance=fs.readFileSync('src/core/section-guidance.ts','utf8');

ok(app.includes("tab!=='Guild'&&tab!=='Social'&&tab!=='Party'"),'Social must not render the redundant global back/title bar');
ok(app.includes("partyUnlocked={earlyFeatureUnlocked(state,'party')}"),'Party gate must honor account-wide unlocks, including earlier characters');
ok(hub.includes("hasParty?[...VISIBLE_TABS,'chat']:VISIBLE_TABS"),'Chat tab must only appear when a party exists');
ok(hub.includes("const VISIBLE_TABS:SocialHubTab[]=['party','guild']"),'Guild remains visible regardless of Party status');
ok(social.includes("tab==='party'&&partyLocked?<PartyLockedNotice"),'Locked Party view must show only the locked notice');
ok(party.includes("if(!inParty&&props.partyUnlocked===false)return"),'Locked Party hub must not render recruitment or other Party controls');
ok(social.includes("tab==='chat'?(canUsePartyChat?<View style={s.chatContent}><SectionGuide")&&social.includes("<OnlinePartyChat expanded/></View>:social.loading?"),'Chat must have its own full-height view with optional contextual guidance');
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
ok(social.includes('const generation=++requestGeneration.current')&&social.includes('if(generation!==requestGeneration.current||accountIdRef.current!==accountId)return'),'Stale background results must never overwrite a newer screen');
ok(social.includes('const [membership,next,mine,board,invites,outgoing,alerts]=await Promise.all'),'Independent Social requests must load concurrently');
ok(social.includes("if(membership!==undefined){"),'A membership lookup failure must preserve the cached Party or Guild view');
ok(social.includes('setBackgroundError(\'refresh_failed\')')&&!social.includes('setCards([])'),'Failed refreshes must show a retry instead of clearing listings');
ok(social.includes("await social.refresh();")&&social.includes('void load();')&&!social.includes('await load();'),'Mutations must not wait for an unrelated recruitment refresh');
ok(social.includes('setTimeout(()=>setShowUpdating(true),1200)'),'Fast background refreshes should not flash a spinner');
ok(!social.includes('LoadingState')&&social.includes('guildMembership===undefined?<><GameButton'),'Guild entry must remain actionable during its first lookup');
ok(social.includes('backgroundError||social.error||showUpdating')&&social.includes('st("Retry")'),'Transient data failures should have one compact retry action');

ok(social.includes("tab==='party'&&!!social.accountId&&social.loading&&!social.party?<Text"),'Do not offer Create Party while the initial membership snapshot is still loading');
ok(social.includes("social.loading?<View style={s.chatContent}"),'Initial Party Chat links should show a small loading label, not bounce away');

ok(social.includes('accountIdRef.current!==accountId'),'Account switches must discard results from old background requests');
ok(social.includes("setBackgroundError('');}}"),'Switching tabs should clear unrelated transient retry messages');
ok(gameGuide.includes("id:'parties'")&&gameGuide.includes("earlyFeatureUnlocked(s,'party')"),'Party help must unlock only when the account can actually create or join a Party');
ok(gameGuide.includes("unlockHint:`Reach Level ${PARTY_UNLOCK_LEVEL}`"),'Party Game Guide must give the real unlock level');
ok(gameGuide.includes("unlockHint:`Reach Level ${GUILD_UNLOCK_LEVEL}`"),'Guild Game Guide must not suggest the obsolete Level 10 gate');
ok(gameGuide.includes('Party Chat appears only when you join a Party.'),'Game Guide must describe conditional Chat visibility');
ok(gameGuide.includes('persistent Social Party')&&gameGuide.includes('1 Tank, 2 Damage and 1 Support'),'Dungeon guidance must distinguish Live matchmaking from persistent Social Parties');
ok(gameGuidePanel.includes('const ready=GAME_GUIDE.filter')&&gameGuidePanel.includes('showLocked?locked.map'),'Available Game Guides must appear first; locked topics should remain collapsed until requested');
ok(guildTutorial.includes('Guild Home → Members')&&!guildTutorial.includes('More → Roster'),'Guild tour must navigate via the current Guild Home shortcut');
ok(guildTutorial.includes('Hall → Shop')&&!guildTutorial.includes('More → Shop'),'Guild shop guidance must point to Hall, not the old More menu');
ok(guildTutorial.includes('Activities → Muster')&&guildTutorial.includes('Activities → Quests')&&guildTutorial.includes('Activities → Projects'),'Guild guide must describe the current Activities sections');
ok(guildTutorialPanel.includes('details?<><Text')&&!guildTutorialPanel.includes('Look around below. No message'),'Secondary Guild guide explanations must be opt-in, not shown over each screen');
ok(accountLanguage.includes('"Parties & weekly rewards"')&&accountLanguage.includes('"Show locked topics"'),'The updated Game Guide must retain translated titles and controls');
ok(guildLanguage.includes('Gilde Home → Leden')&&guildLanguage.includes('Hall → Boutique'),'Guild guidance must translate the new destinations');

ok(companion.includes('COMPANION_TOUR_STEPS.find(step=>step.section===section)')&&companion.includes('area="companions"'),'Companion Roster, Training, Sanctuary, Trials, Expeditions and Codex must use independent tab tips');
ok(party.includes('area="social-party"')&&party.includes("inParty?section:'solo'"),'My Party and Recruitment should not share the same guide acknowledgement');
ok(social.includes('area="social" section="Chat"')&&social.includes('area="social" section="Guild"'),'Social Chat and Guild must have separate optional tips');
ok(guildScreen.includes('area="guild"')&&guildScreen.includes("Activities/${activityView}"),'Guild Activities subviews require independent tips');
ok(app.includes('MAIN_TAB_GUIDANCE')&&app.includes('area="main" section={tab}')&&app.includes('showReplay={false}'),'Main tabs must show only a one-time compact hint, not a mandatory tutorial');
ok(sectionGuide.includes('if(!expanded&&!showReplay)return null')&&sectionGuide.includes('void store.complete(scope,area,section)'),'A player can dismiss each tab guide without blocking gameplay');
ok(coreGuidance.includes('veldryn.section-guidance.v1:')&&coreGuidance.includes("veldryn.companion-tour.v1:"),'Guide progress persists per account and migrates from the old full-screen Companion tour');

console.log('PASS: Social navigation, Party lock, Guild independence, and party-only Chat UI contracts');
