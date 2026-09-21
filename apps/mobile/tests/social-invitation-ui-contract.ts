export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const card=read('src/components/SocialInvitationCard.tsx');
const hub=read('src/components/SocialHubPanel.tsx');
const social=read('src/screens/SocialScreen.tsx');
const guild=read('src/components/OnlineGuildManagement.tsx');

for(const [name,source] of [['SocialInvitationCard',card],['SocialHubPanel',hub]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok(source.includes('ThemeColors'),name+' must build theme-aware styles');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not use the static Veldryn palette');
}

ok(card.includes('CompactPlayerIdentity'),'Invitation cards must use the shared social identity component');
ok(card.includes('backgroundColor:C.warningSurface'),'Invitation warnings must remain light-theme safe');
ok(card.includes('marginLeft:48'),'Invitation detail/actions must align under the compact identity copy');
ok(hub.includes('backgroundColor:C.selection'),'Active Social tabs must use the selected theme surface');
ok(hub.includes('minHeight:44'),'Social tabs must remain compact but touchable');
ok(hub.includes('backgroundColor:C.selectionLine'),'Active Social tab indicator must use the theme selection line');

ok(social.includes('<SocialInvitationCard'),'Party invitations must use the shared invitation card');
ok(social.includes('status="PARTY INVITE"'),'Incoming Party invites must remain explicit');
ok(social.includes('status="INVITE SENT"'),'Outgoing Party invites must remain explicit');
ok(social.includes('respondPartyInvitation(invite.id,true,character())'),'Party invite Accept behavior must remain wired');
ok(social.includes('respondPartyInvitation(invite.id,false)'),'Party invite Decline behavior must remain wired');
ok(social.includes('cancelPartyInvitation(invite.id)'),'Outgoing Party invite cancellation must remain wired');
ok(social.includes('Leave your current Party before accepting another invitation.'),'Party conflict warning must remain visible');
ok(social.includes('This Party is currently full.'),'Full-Party warning must remain visible');

ok(guild.includes('<SocialInvitationCard'),'Guild invitations/applications must use the shared invitation card');
ok(guild.includes('status="GUILD INVITE"'),'Incoming Guild invitations must remain explicit');
ok(guild.includes('status="GUILD APPLICATION"'),'Pending Guild applications must remain explicit');
ok(guild.includes('status="GUILD INVITE SENT"'),'Outgoing Guild invitations must remain explicit');
ok(guild.includes('respondGuildInvitation(id,accept)'),'Guild invitation response behavior must remain wired');
ok(guild.includes('reviewGuildApplication(id,accept)'),'Guild application review behavior must remain wired');
ok(guild.includes('cancelGuildInvitation(id)'),'Outgoing Guild invitation cancellation must remain wired');
ok(guild.includes('profile name unavailable for this application'),'Guild application UI must not invent a display name when the API only returns an account reference');
ok(guild.includes('Min Lv. '),'Incoming Guild invite requirements must remain visible');

console.log('PASS: Social Hub, Party/Guild invites and applications share compact theme-aware invitation presentation');
