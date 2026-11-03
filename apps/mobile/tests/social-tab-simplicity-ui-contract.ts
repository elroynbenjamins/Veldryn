export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const app=read('App.tsx');
const account=read('src/screens/MoreScreen.tsx');
const quick=read('src/core/quick-navigation.ts');
const icons=read('src/components/LineworkIcon.tsx');
const partyRoute=read('src/screens/PartyScreen.tsx');
const recruitmentRoute=read('src/screens/RecruitmentScreen.tsx');
const shared=read('src/screens/SocialScreen.tsx');
const party=read('src/components/PartyHubPanel.tsx');
const recruitment=read('src/components/RecruitmentBoardPanel.tsx');
const composer=read('src/components/RecruitmentComposer.tsx');
const weekly=read('src/components/PartyWeeklyLadder.tsx');
const chat=read('src/components/OnlinePartyChat.tsx');
const chatLog=read('src/components/ChatLog.tsx');
const partyEvents=read('src/components/PartyEventHubPanel.tsx');
const gameGuide=read('src/core/onboarding.ts');
const guildScreen=read('src/screens/GuildScreen.tsx');
const sectionGuide=read('src/components/SectionGuide.tsx');
const companion=read('src/components/CombatCompanionPanel.tsx');
const socialHub=read('src/components/SocialHubPanel.tsx');

ok(app.includes("tab==='Party'&&<PartyScreen")&&app.includes("tab==='Recruitment'||tab==='Social'")&&app.includes('<RecruitmentScreen'), 'Party and Recruitment must have independent route components');
ok(!account.includes("items:['Social'")&&account.includes("items:['Party','Recruitment','Friends','Guild','Arena','Rankings']"),'Account must replace Social with two dedicated destinations');
ok(quick.includes("'Social','Party','Empty'")&&app.includes("if(destination==='Social')destination='Recruitment'"),'Old Social shortcuts must migrate without dropping a saved shortcut');
ok(icons.includes("Social:'search'")&&icons.includes("Party:'party'")&&app.includes("case 'Social':return appText(language,'Recruitment')"),'Party and Recruitment must use distinct icons, with the legacy Social shortcut labeled Recruitment');
ok(app.includes("onRecruitment={()=>{setSocialInitialTab('guild');setTab('Recruitment')}"),'Guild recruiting must navigate directly to Guild Recruitment');
ok(partyRoute.includes('mode="party"')&&recruitmentRoute.includes('mode="recruitment"'),'Separate routes must use the corresponding dedicated flow');
ok(app.includes("partyUnlocked={earlyFeatureUnlocked(state,'party')}"),'Both Party and Recruitment must honor the account-wide Party unlock');

ok(shared.includes("if(mode!=='legacy')")&&shared.includes("<PartyHubPanel dedicated"),'The live Party view must use its focused layout, not the legacy Social tabs');
ok(shared.includes("['Overview','Contracts','Chat'] as const")&&shared.includes('view===\'Chat\'&&!canUsePartyChat'),'Party must expose only Overview, Contracts and membership-gated Chat');
ok(shared.includes('shouldShowPartyChat(social.party,social.accountId)')&&shared.includes("setPartyView('Overview')"),'Chat access must be checked against current Party membership and recover after disbanding');
ok(shared.includes('<PartyCreateSheet')&&shared.includes('savePartyPreferences')&&shared.includes('idempotencyKey:key(\'create:\'+activityLevel+\':\'+partyLanguage+\':\'+minimumLevel)'),'Party creation must use the activity/language/level sheet and preserve idempotent backend creation');
ok(shared.includes('respondPartyInvitation(invite.id,true,character())')&&shared.includes('respondPartyInvitation(invite.id,false)')&&shared.includes('cancelPartyInvitation(invite.id)'),'Party invitations must preserve verified accept, decline and cancel paths');
ok(shared.includes('partyInvitations={partyInvitations} invitationCount=')&&party.includes('GameModalSurface visible={showSettings&&inParty}'),'Invitations and Party management must remain accessible in the focused Party Options sheet');
ok(shared.includes('transferPartyLeadership(')&&shared.includes('removePartyMember(')&&shared.includes('disbandParty('),'Party leadership, removal and disband must retain server-authoritative commands');
ok(party.includes('props.dedicated')&&party.includes('props.onOpenRecruitment?.()')&&party.includes("!props.dedicated&&(section==='find'||!inParty)"),'Dedicated Party must link to Recruitment without duplicating its full board');
ok(party.includes('GameModalSurface visible={!!focusedMember&&inParty}')&&party.includes('partyMemberManagement('),'Member actions must remain a role-restricted modal');
ok(party.includes('compact={!expandedContracts.includes(contract.id)}')&&weekly.includes('summary.claimable.map(t=><SocialActionButton'),'Weekly contracts must remain compact and directly claimable');
ok(shared.includes('claimPartyContractReward(id,character())')&&shared.includes('partyExtras={partyExtras}'),'Party rewards and events must retain the existing server flows');
ok(chat.includes('expanded={expanded}')&&chatLog.includes('expanded&&s.expandedLog'),'Private Party Chat must render at full height when selected');
ok(partyEvents.includes('props.onOpenLeaderboard?<Pressable')&&partyEvents.includes('props.onClaimPersonalMilestone&&'),'Party events may show only actions with real callbacks');

ok(recruitment.includes("(['party','guild'] as const)")&&recruitment.includes("(['groups','players'] as const)")&&recruitment.includes("(['browse','posts'] as const)"),'Recruitment must offer Party/Guild, Groups/Players, Browse/My Posts');
ok(recruitment.includes('<RecruitmentFiltersPanel')&&recruitment.includes('<RecruitmentListing')&&recruitment.includes('filterRecruitmentCards('),'Recruitment search and cards must use existing filter and listing models');
ok(recruitment.includes('GameModalSurface visible={showCreate}')&&recruitment.includes('guildMembershipKnown&&!inGuild')&&recruitment.includes('partyUnlocked&&!inParty'),'Advert-type sheet must respect Party unlocks and confirmed Guild membership');
ok(recruitment.includes('canRecruitGuild')&&recruitment.includes('partyLeader&&partyOpenSpots>0'),'Only eligible Guild officers or Party leaders may create recruiting adverts');
ok(shared.includes("['looking_for_guild','guild_recruiting']")&&shared.includes("repository.browseRecruitment(browse)"),'Guild Recruitment must browse both Guild offers and Guild seekers, subject to server access control');
ok(shared.includes('repository.publishRecruitment(input)')&&shared.includes('repository.refreshRecruitment(')&&shared.includes('repository.closeRecruitment('),'Advert publish, refresh and close must remain server-authoritative');
ok(shared.includes('GameModalSurface visible={!!(draft||selected)}')&&shared.includes('RecruitmentComposer'),'Selected advert details and publishing must have independent modal flows');
ok(composer.includes('AUTO-EXPIRES')&&composer.includes('([1,3] as const)'),'Advert composer must retain expiry and Guild duration policies');
ok(recruitment.includes('onDismissMatches')&&shared.includes('ackRecruitmentMatchAlerts()'),'Live match alerts must remain actionable and dismissible');
ok(shared.includes('const [boardCache,setBoardCache]')&&shared.includes('accountIdRef.current!==accountId'),'Recruitment cache must remain account-scoped and reject stale requests');
ok(shared.includes("if(membership!==undefined){")&&shared.includes("setBackgroundError('refresh_failed')"),'Transient fetch errors must preserve the last confirmed board');
ok(shared.includes('await social.refresh();')&&shared.includes('void load();')&&!shared.includes('await load();'),'Party mutations must not wait for an unrelated recruitment search');

ok(gameGuide.includes("id:'parties'")&&gameGuide.includes("earlyFeatureUnlocked(s,'party')"),'Party guide must preserve the real unlock');
ok(guildScreen.includes('onRecruitment')&&app.includes("setTab('Recruitment')"),'Guild recruitment shortcuts must open the new destination');
ok(sectionGuide.includes('if(!expanded&&!showReplay)return null'),'Guidance should never block normal Party navigation');

ok(sectionGuide.includes('header?:ReactNode')&&sectionGuide.includes("placement==='header'||header!==undefined"),'SectionGuide must anchor optional replay controls while preserving legacy card guides');
ok(companion.includes('header={<View style={s.resourceBar}>'),'Companion help must share the resource-strip header without adding a replay row');
ok(party.includes('header={inParty&&!props.dedicated?'),'Party help must reuse the Party/Recruitment tabs when available');
ok(shared.includes('headerGuide={headerGuide}')&&socialHub.includes('<SectionGuide {...headerGuide} header={tabBar}'),'Legacy Social Guild/Chat help must reuse the top tab strip');
console.log('PASS: dedicated Party and Recruitment routing, role gates, server actions, modals and compact UI contracts');
