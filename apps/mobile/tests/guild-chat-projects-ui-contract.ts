export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const app=read('App.tsx');
const guildScreen=read('src/screens/GuildScreen.tsx');
const navigation=read('src/components/GuildNavigation.tsx');
const chat=read('src/components/GuildChat.tsx');
const composer=read('src/components/ChatComposer.tsx');
const onlineProjects=read('src/components/OnlineGuildProjectsPanel.tsx');
const contributionPanel=read('src/components/GuildProjectContributionsPanel.tsx');
const projectSupplies=read('src/components/GuildProjectSupplyDonationPanel.tsx');
const progress=read('src/components/GuildProgressPanel.tsx');
const skillPaths=read('src/components/GuildSpecializationPaths.tsx');
const onlineSkills=read('src/components/OnlineGuildSkillsPanel.tsx');
const skillsClient=read('src/online/guild-skills.ts');
const guides=read('src/components/SectionGuide.tsx');
const hall=read('src/components/OnlineGuildHallPanel.tsx');
const projectClient=read('src/online/guild-projects-v18.ts');
const projectTransport=read('../../backend/supabase/migrations/20261018000165_guild_project_interactions_v1.sql');
const choiceBoard=read('../../backend/supabase/migrations/20261106100000_guild_choice_board_v1.sql');
const activeSlots=read('../../backend/supabase/migrations/20261106102000_guild_choice_two_active_slots_v1.sql');
const activity=read('src/components/GuildActivityFeedPanel.tsx');
const projects=read('src/components/GuildProjectsPanel.tsx');
const detail=read('src/components/GuildProjectDetailPanel.tsx');
const decrees=read('src/components/GuildDecreePanel.tsx');
const hub=read('src/components/GuildHubPanel.tsx');

for(const [name,source] of [['GuildChat',chat],['OnlineGuildProjectsPanel',onlineProjects],['GuildProjectContributionsPanel',contributionPanel],['GuildActivityFeedPanel',activity],['GuildProjectsPanel',projects],['GuildProjectDetailPanel',detail],['GuildDecreePanel',decrees],['GuildHubPanel',hub]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok(source.includes('ThemeColors'),name+' must build theme-aware styling');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not regress to the static Veldryn palette');
}

ok(app.includes("import {OnlineGuildProjectsPanel}"),'App must wire the live Guild Projects panel');
ok(app.includes("import {GuildChat}"),'App must wire direct Guild Chat');
ok(app.includes('onlineProjects={<OnlineGuildProjectsPanel onRewardsChanged='),"Guild screen must receive live Projects");
ok(app.includes('onlineChat={<GuildChat'),'Guild screen must receive direct Guild Chat');
ok(app.includes('onlineChatUnread={notificationCounts.guildChatUnread}'),'Guild Home chat shortcut must reuse durable unread state');
ok(app.includes('onlineChatMentions={notificationCounts.guildChatMentions}'),'Guild Home chat access must retain mention data');
ok(app.includes('firstUnreadMessageId={notificationCounts.guildFirstUnreadMessageId}'),'Direct Guild Chat must preserve unread divider state');

for(const label of ['Home','PvE','Roster','Activities','Progress','Hall','Chat','Manage'])ok(guildScreen.includes("'"+label+"'"),'Guild destinations must retain '+label);
ok(guildScreen.includes('projects={onlineProjects}')&&guildScreen.includes('<GuildProgressPanel')&&guildScreen.includes("onlineSection==='PvE'?(isValidElement")&&guildScreen.includes('cloneElement(onlinePve,{headerHelp:headerGuide})'),"Guild navigation must expose live Progress tabs and dedicated PvE");
ok(guildScreen.includes("onlineSection==='Progress'?<GuildProgressPanel")&&guildScreen.includes("onlineSection==='PvE'?(isValidElement")&&guildScreen.includes('cloneElement(onlinePve,{headerHelp:headerGuide})'),'Progress must be a dedicated primary Guild destination, separate from PvE');
ok(guildScreen.includes("onlineSection==='Chat'?onlineChat:null")&&guildScreen.includes("onChat={()=>onNavigate('Chat')}"),'Guild Home must preserve working chat access');
ok(guildScreen.includes("onlineSection==='Manage'?<View")&&!guildScreen.includes('{onlineDirectory}')&&guildScreen.includes('{onlineCustomize}'),'Joined-member management must preserve Customize without offering duplicate Guild creation');
ok(guildScreen.includes('<GuildMemberIdentity onRoster=')&&guildScreen.includes('<GuildHomeActions summary=')&&guildScreen.includes('board={onlineBoard}'),'Guild Home must preserve member identity and the private Notice Board');
ok(guildScreen.includes('<GuildDiscoveryFlow onJoined=')&&guildScreen.includes('setGuildTourJustJoined(true)'),'Nonmembers must use the dedicated Guild discovery and creation flow');
ok(navigation.includes("{id:'Progress',label:'Progress',icon:'skills'}")&&!navigation.includes("{id:'Chat',label:'Chat'"),'Guild navigation must replace Chat with Progress');
ok(guildScreen.includes('chatUnread={onlineChatUnread}')&&guildScreen.includes('onOpenChat()'),'Unread attention and Guild Chat access must remain on Guild Home');
ok(!guildScreen.includes("activityView==='Projects'?<GuildProgressPanel"),'Projects must not stay nested under Activities');

ok(projectClient.includes("from('guild_project_instances')"),'Guild Project client must read authoritative Project instances');
ok(projectClient.includes("from('guild_project_member_progress')"),'Guild Project client must read personal authoritative contribution');
ok(projectClient.includes("from('guild_project_resource_progress')"),'Guild Project client must read development resource progress');
ok(projectClient.includes("from('guild_activity_feed')"),'Guild Project client must read the protected Guild activity feed');
ok(!projectClient.includes('.insert(')&&!projectClient.includes('.update(')&&!projectClient.includes('.delete('),'Guild Project mobile client must never mutate Project tables directly');
ok(projectClient.includes("db.rpc('prepare_guild_projects_v2')"),"Guild Project board must load through protected transport");
ok(projectClient.includes("db.rpc('guild_project_vote_v1'"),'Member voting must use a server-authoritative RPC');
ok(projectClient.includes("db.rpc('guild_project_choice_ballot_v1'")&&!projectClient.includes("db.rpc('guild_project_start_v1'"),'Voted weekly projects must use the authoritative ballot and must not offer manual starts');
ok(!projectClient.includes('guild_project_donate_v1')&&!projectClient.includes('guild_project_claim_v1'),'Donation/reward settlement must stay unavailable until atomic authoritative transport exists');

ok(onlineProjects.includes('Weekly Projects')&&onlineProjects.includes('Contribute now')&&onlineProjects.includes("source:'crafting'"),"Live Projects must present compact progress and three verified activity paths");
ok(projectClient.includes("client().rpc('claim_guild_project_reward_v2'")&&onlineProjects.includes('onRewardsChanged'),"Unsafe donation/reward actions must keep an explicit authority boundary");
ok(onlineProjects.includes("Vote for next week's project")&&!onlineProjects.includes('onStart={()=>void act('),'Weekly Guild choices must be vote-only in the UI; the server starts the winning project');
ok(onlineProjects.includes("import {LoadingState} from './LoadingState'"),'Live Projects must use the shared loading state');
ok(onlineProjects.includes("import {StatusPill} from './StatusPill'"),'Live Projects must use shared semantic status pills');
ok(onlineProjects.includes('<StatusPill label={ui("SHARED")} tone="good"/>'),'Live Projects must expose semantic shared-project status');
ok(onlineProjects.includes('Your contribution'),'Live Projects must surface personal contribution');
ok(onlineProjects.includes('const personalShortfall=')&&onlineProjects.includes('personal effort short of reward eligibility')&&onlineProjects.includes('Reward claim period ended'),'Live Projects must explain personal reward shortfall and claim expiry separately');
ok(onlineProjects.includes('const contributorsMissing=')&&onlineProjects.includes('more qualifying contributors needed to complete this project'),'Project cards must explain the missing meaningful contributor requirement');
ok(contributionPanel.includes('Counts toward contributor minimum')&&contributionPanel.includes('Below contributor minimum'),'Inline member rows must explain meaningful contributor status');
ok(projectSupplies.includes('quantityProblem')&&projectSupplies.includes('That exceeds the remaining {count} supply needed.')&&projectSupplies.includes('You only have {count} eligible items available.'),'Project supply donations must explain why invalid amounts cannot be submitted');
ok(projectSupplies.includes('All supply goals are complete.')&&projectSupplies.includes('personal limit'),'Donation UI must distinguish complete goals from stock limits and retain server authority');
ok(onlineProjects.includes("ui('{count}/{minimum} contributors'"),'Live Projects must surface anti-leech contributor progress');
ok(contributionPanel.includes("ui('Member contributions')")&&contributionPanel.includes("ui('Gather {count}',{count:member.gatheringPoints.toLocaleString(language)})"),'Inline contribution panel must expose per-member gathering contribution');
ok(onlineProjects.includes('<GuildProjectContributionsPanel projects={active}/>')&&onlineProjects.includes('claimableCompleted')&&!onlineProjects.includes('View member contributions')&&!onlineProjects.includes('GuildProjectContributionsModal')&&projectClient.includes("db.rpc('guild_roster'"),'Project contributions must be visible directly below Weekly Projects with live roster data, without a launch button');
ok(contributionPanel.includes('const TOP_COUNT=5')&&contributionPanel.includes('members.slice(0,TOP_COUNT)')&&contributionPanel.includes('Show {count} more members')&&contributionPanel.includes('<IdentityArtwork'),'Inline contributor rankings must show the top five with avatars and allow expanding the remaining members');
ok(contributionPanel.includes('<Panel style={s.panel}>')&&!contributionPanel.includes('<GameModalSurface')&&contributionPanel.includes("project.resourceGoals.map")&&contributionPanel.includes('projects.length>1'),'Contribution panel must be inline, preserve optional project details and handle multiple active projects');
ok(onlineProjects.includes('<GuildProjectContributionsPanel projects={recentCompleted} embedded/>')&&onlineProjects.includes('<GuildActivityFeedPanel entries={snapshot.activity}/>'),'Live Projects must surface recent Guild activity');
ok(onlineProjects.includes("project.status==='completed'"),'Live Project cards must distinguish completed state');
ok(projectTransport.includes("v_role not in('leader','guild_master','co_leader','officer','quartermaster')"),'Server must enforce start-project role permissions');
ok(projectTransport.includes("v_slot_cap:=case when v_level<5 then 0 when v_level<10 then 1 else 2 end"),'Server must enforce the launch-era Guild Project slot cap');
ok(projectTransport.includes('for update'),'Vote/start transport must serialize candidate selection');
ok(choiceBoard.includes('GUILD_PROJECT_STARTS_AUTOMATICALLY')&&choiceBoard.includes('guild_project_choice_tick_v1'),'Weekly Guild Project start must be authoritative and automatic');
ok(activeSlots.includes('DROP INDEX IF EXISTS public.uq_guild_project_one_weekly_active')&&activeSlots.includes('uq_guild_project_active_slot'),'Weekly Guild Projects must allow two separate active slots without duplicating a slot');

// Unified Progress navigation and second-confirmation guard are UI-only.
ok(progress.includes("id:'Projects',label:st('Projects')")&&progress.includes("id:'Skills',label:st('Skills')"),'Progress must present localized Skills and Projects tabs');
ok(guildScreen.includes("next==='Skills'")&&guildScreen.includes("setProgressTab('Skills')")&&guildScreen.includes("setOnlineSection('Progress')"),'Saved Hall Skills navigation must still open Guild Progress');
ok(skillPaths.includes('<Modal visible={review}')&&skillPaths.includes('Confirm upgrade')&&skillPaths.includes('Cancel'),'Guild Skill upgrades must use a real dismissal-safe confirmation modal');
ok(skillPaths.includes('const ready=known&&released&&canUpgrade')&&skillPaths.includes('disabled={!ready}'),'Release, role, points and materials must gate confirmations');
ok(onlineSkills.includes('isReleased={id=>releasedIds.has(id)}')&&onlineSkills.includes('upgradeFlight.current'),'Live skill upgrade must retain server flags and single-flight protection');
ok(skillsClient.includes("import {versionedFetch as fetch} from './versioned-fetch';")&&skillsClient.includes('view=guild-skills')&&skillsClient.includes('view=guild-skills&action=upgrade'), 'Guild Skills GET and upgrade must use the same versioned Edge transport as Guild Shop; missing headers are rejected by the live 1.0.5 release gate');
ok(guides.includes("placement==='header'")&&guides.includes('accessibilityViewIsModal'),'Header tutorials must use an accessible compact modal while preserving card guides');
ok(guildScreen.includes('placement="header"')&&guildScreen.includes('action={headerGuide}')&&progress.includes('headerHelp?:ReactNode')&&hall.includes('headerHelp?:ReactNode'),'Guild section help must live in relevant headings rather than a standalone question row');
ok(onlineSkills.includes("error==='app_update_required'")&&onlineSkills.includes('openStoreListing()'),'Outdated Guild Skills clients must receive a safe Android update action');
ok(onlineProjects.includes('const qualifying=project.personalRewardThreshold>0'),'Personal reward claim must require a positive configured threshold');
ok(onlineProjects.includes('claimOnlineGuildProjectReward')&&onlineProjects.includes('Date.now()<claimDeadline'),'Claim must use server RPC and respect reward deadline');
ok(chat.includes('MEMBERS ONLY'),'Guild Chat must keep member-only context');
ok(chat.includes('GuildTaggedPlayerName name={guild.name}'),'Guild Chat header must use the shared Guild identity treatment');
const chatMessageRow=read('src/components/ChatMessageRow.tsx');
ok(chat.includes('<ChatMessageRow')&&chatMessageRow.includes('rolePill')&&chatMessageRow.includes('accessibilityLabel={roleLabel}')&&!chatMessageRow.includes('role.toUpperCase()'),"Guild Chat roles must use compact, accessible rank badges without repeated role text");
ok(chat.includes('<ChatComposer')&&chat.includes('busy={busy}')&&chat.includes('onSend={onSend}'),'Guild Chat must use the shared composer with its existing send and busy state');
ok(composer.includes('width:touchTargetPreferred')&&composer.includes('minHeight:touchTargetPreferred')&&composer.includes('flexShrink:0'),'Guild Chat send action must retain a compact, accessible touch target');

ok(activity.includes('kindGood')&&activity.includes('kindWarning')&&activity.includes('kindInfo'),'Guild activity kinds must use semantic status surfaces');
ok(activity.includes('No recent Guild activity'),'Guild activity feed must have a useful empty state');
ok(projects.includes('disabled={!onVote}')&&projects.includes('disabled={!onStart}'),'Legacy Project controls must not present dead actions without supported callbacks');
ok(detail.includes('disabled={!onDonate}')&&detail.includes('disabled={!onClaim}'),'Project detail mutations must disable without authoritative callbacks');
ok(decrees.includes('disabled={!onVote}'),'Decree voting must disable without an authoritative callback');
ok(hub.includes('backgroundColor:C.selection'),'Legacy Guild hub tabs must use active theme selection surfaces');

console.log('PASS: Guild Progress replaces the Chat tab, while chat access and server-authoritative Projects remain available');
