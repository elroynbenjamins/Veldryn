export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const app=read('App.tsx');
const guildScreen=read('src/screens/GuildScreen.tsx');
const chat=read('src/components/GuildChat.tsx');
const onlineProjects=read('src/components/OnlineGuildProjectsPanel.tsx');
const projectClient=read('src/online/guild-projects-v18.ts');
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
ok(!projectClient.includes('.insert(')&&!projectClient.includes('.update(')&&!projectClient.includes('.delete(')&&!projectClient.includes('.rpc('),'Guild Project mobile client must remain read-only until supported mutation transport exists');

ok(onlineProjects.includes('This view is read-only; management actions remain server-authoritative.'),'Live Projects UI must explain its read-only boundary');
ok(onlineProjects.includes('YOUR CONTRIBUTION'),'Live Projects must surface personal contribution');
ok(onlineProjects.includes('meaningful contributors'),'Live Projects must surface anti-leech contributor progress');
ok(onlineProjects.includes('<GuildActivityFeedPanel entries={snapshot.activity}/>'),'Live Projects must surface recent Guild activity');
ok(onlineProjects.includes("project.status==='completed'"),'Live Project cards must distinguish completed state');

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

console.log('PASS: Guild Chat, live read-only Projects and activity presentation are wired, compact and theme-aware');
