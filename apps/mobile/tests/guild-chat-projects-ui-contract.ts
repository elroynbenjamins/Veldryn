export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const app=read('App.tsx');
const guildScreen=read('src/screens/GuildScreen.tsx');
const chat=read('src/components/GuildChat.tsx');
const onlineProjects=read('src/components/OnlineGuildProjectsPanel.tsx');
const projectClient=read('src/online/guild-projects-v18.ts');
const projectTransport=read('../../backend/supabase/migrations/20261018000160_guild_project_interactions_v1.sql');
const activity=read('src/components/GuildActivityFeedPanel.tsx');
const projects=read('src/components/GuildProjectsPanel.tsx');
const detail=read('src/components/GuildProjectDetailPanel.tsx');
const decrees=read('src/components/GuildDecreePanel.tsx');
const hub=read('src/components/GuildHubPanel.tsx');

for(const [name,source] of [['GuildChat',chat],['OnlineGuildProjectsPanel',onlineProjects],['GuildActivityFeedPanel',activity],['GuildProjectsPanel',projects],['GuildProjectDetailPanel',detail],['GuildDecreePanel',decrees],['GuildHubPanel',hub]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok(source.includes('ThemeColors'),name+' must build theme-aware styling');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not regress to the static Veldryn palette');
}

ok(app.includes("import {OnlineGuildProjectsPanel}"),'App must wire the live Guild Projects panel');
ok(app.includes("import {GuildChat}"),'App must wire direct Guild Chat');
ok(app.includes('onlineProjects={<OnlineGuildProjectsPanel/>}'),'Guild screen must receive live Projects');
ok(app.includes('onlineChat={<GuildChat'),'Guild screen must receive direct Guild Chat');
ok(app.includes('onlineChatUnread={notificationCounts.guildChatUnread}'),'Guild Chat tab must reuse durable unread state');
ok(app.includes('onlineChatMentions={notificationCounts.guildChatMentions}'),'Guild Chat tab must reuse durable mention state');
ok(app.includes('firstUnreadMessageId={notificationCounts.guildFirstUnreadMessageId}'),'Direct Guild Chat must preserve unread divider state');

for(const label of ['My Guild','Projects','PvE','Chat','Hall','Directory','Customize'])ok(guildScreen.includes("'"+label+"'"),'Online Guild tabs must include '+label);
ok(guildScreen.includes("onlineSection==='Projects'?onlineProjects:null"),'Projects tab must render live Project content');
ok(guildScreen.includes("onlineSection==='Chat'?onlineChat:null"),'Chat tab must render Guild Chat');
ok(guildScreen.includes("badge={value==='Chat'?Math.max(onlineChatUnread,onlineChatMentions):0}"),'Guild Chat tab must surface unread/mention attention');
ok(guildScreen.includes('tabBadgeWarning:{backgroundColor:C.warning}'),'Guild Chat mentions must have warning emphasis');

ok(projectClient.includes("from('guild_project_instances')"),'Guild Project client must read authoritative Project instances');
ok(projectClient.includes("from('guild_project_member_progress')"),'Guild Project client must read personal authoritative contribution');
ok(projectClient.includes("from('guild_project_resource_progress')"),'Guild Project client must read development resource progress');
ok(projectClient.includes("from('guild_activity_feed')"),'Guild Project client must read the protected Guild activity feed');
ok(!projectClient.includes('.insert(')&&!projectClient.includes('.update(')&&!projectClient.includes('.delete('),'Guild Project mobile client must never mutate Project tables directly');
ok(projectClient.includes("db.rpc('guild_project_board_state_v1')"),'Guild Project board must load through protected transport');
ok(projectClient.includes("db.rpc('guild_project_vote_v1'"),'Member voting must use a server-authoritative RPC');
ok(projectClient.includes("db.rpc('guild_project_start_v1'"),'Project starting must use a server-authoritative RPC');
ok(!projectClient.includes('guild_project_donate_v1')&&!projectClient.includes('guild_project_claim_v1'),'Donation/reward settlement must stay unavailable until atomic authoritative transport exists');

ok(onlineProjects.includes('Members can vote on the weekly board'),'Live Projects UI must expose supported member voting');
ok(onlineProjects.includes('Resource donations and completion rewards stay server-owned'),'Unsafe donation/reward actions must keep an explicit authority boundary');
ok(onlineProjects.includes('Start Project'),'Authorized roles must get the supported server-validated start action');
ok(onlineProjects.includes("import {LoadingState} from './LoadingState'"),'Live Projects must use the shared loading state');
ok(onlineProjects.includes("import {StatusPill} from './StatusPill'"),'Live Projects must use shared semantic status pills');
ok(onlineProjects.includes('<StatusPill label="LIVE" tone="good"/>'),'Live Projects must expose a semantic live status');
ok(onlineProjects.includes('YOUR CONTRIBUTION'),'Live Projects must surface personal contribution');
ok(onlineProjects.includes('meaningful contributors'),'Live Projects must surface anti-leech contributor progress');
ok(onlineProjects.includes('<GuildActivityFeedPanel entries={snapshot.activity}/>'),'Live Projects must surface recent Guild activity');
ok(onlineProjects.includes("project.status==='completed'"),'Live Project cards must distinguish completed state');
ok(projectTransport.includes("v_role not in('leader','guild_master','co_leader','officer','quartermaster')"),'Server must enforce start-project role permissions');
ok(projectTransport.includes("v_slot_cap:=case when v_level<5 then 0 when v_level<10 then 1 else 2 end"),'Server must enforce the launch-era Guild Project slot cap');
ok(projectTransport.includes('for update'),'Vote/start transport must serialize candidate selection');
ok(projectTransport.includes('GUILD_WEEKLY_PROJECT_ALREADY_ACTIVE'),'Server must enforce one active weekly Guild Project');

ok(chat.includes('MEMBERS ONLY'),'Guild Chat must keep member-only context');
ok(chat.includes('GuildTaggedPlayerName name={guild.name}'),'Guild Chat header must use the shared Guild identity treatment');
ok(chat.includes('rolePill'),'Guild Chat roles must use compact semantic role pills');
ok(chat.includes('<GameButton compact title={busy?'),'Guild Chat send action must remain compact');

ok(activity.includes('kindGood')&&activity.includes('kindWarning')&&activity.includes('kindInfo'),'Guild activity kinds must use semantic status surfaces');
ok(activity.includes('No recent Guild activity'),'Guild activity feed must have a useful empty state');
ok(projects.includes('disabled={!onVote}')&&projects.includes('disabled={!onStart}'),'Legacy Project controls must not present dead actions without supported callbacks');
ok(detail.includes('disabled={!onDonate}')&&detail.includes('disabled={!onClaim}'),'Project detail mutations must disable without authoritative callbacks');
ok(decrees.includes('disabled={!onVote}'),'Decree voting must disable without an authoritative callback');
ok(hub.includes('backgroundColor:C.selection'),'Legacy Guild hub tabs must use active theme selection surfaces');

console.log('PASS: Guild Chat, safe Project voting/starting and activity presentation are wired, compact and server-authoritative');
