export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const card=read('src/components/SocialInvitationCard.tsx');
const hub=read('src/components/SocialHubPanel.tsx');
const social=read('src/screens/SocialScreen.tsx');
const guild=read('src/components/OnlineGuildManagement.tsx');
const friendPicker=read('src/components/PartyFriendInviteSheet.tsx');
const party=read('src/components/PartyHubPanel.tsx');
const recruitment=read('src/components/RecruitmentBoardPanel.tsx');
const socialApi=read('src/online/social.ts');

for(const [name,source] of [['SocialInvitationCard',card],['SocialHubPanel',hub]] as const){
 ok(source.includes('useGameTheme'),name+' must use the active UI theme');
 ok(source.includes('ThemeColors'),name+' must build theme-aware styles');
 ok(!source.includes("import {C,")&&!source.includes("import {C}"),name+' must not use the static Veldryn palette');
}

ok(card.includes('CompactPlayerIdentity'),'Invitation cards must use the shared social identity component');
ok(card.includes('backgroundColor:C.warningSurface'),'Invitation warnings must remain light-theme safe');
ok(card.includes('marginLeft:48'),'Invitation detail/actions must align under the compact identity copy');
ok(hub.includes('backgroundColor:C.selection'),'Active Social tabs must use the selected theme surface');
ok(/tab:\{[^}]*minHeight:(?:4[4-9]|5[0-9])/.test(hub),"Social tabs must remain compact but touchable");
ok(hub.includes('backgroundColor:C.selectionLine'),'Active Social tab indicator must use the theme selection line');
ok(hub.includes('badges?:Partial<Record<SocialHubTab,number>>'),'Social Hub must support compact attention counts');
ok(hub.includes('backgroundColor:C.notification'),'Social tab attention count must use the semantic notification token');
ok(social.includes('badges={{party:partyInvites.length}}'),'Party tab must surface the live incoming invite count');

ok(social.includes('<SocialInvitationCard'),'Party invitations must use the shared invitation card');
ok(social.includes('status={st("PARTY INVITE")}'),'Incoming Party invites must remain explicit and localized');
ok(social.includes('status={st("INVITE SENT")}'),'Outgoing Party invites must remain explicit and localized');
ok(social.includes('respondPartyInvitation(invite.id,true,character())'),'Party invite Accept behavior must remain wired');
ok(social.includes('respondPartyInvitation(invite.id,false)'),'Party invite Decline behavior must remain wired');
ok(social.includes('cancelPartyInvitation(invite.id)'),'Outgoing Party invite cancellation must remain wired');
ok(social.includes('Leave your current Party before accepting another invitation.'),'Party conflict warning must remain visible');
ok(social.includes('This Party is currently full.'),'Full-Party warning must remain visible');

ok(guild.includes('<SocialInvitationCard'),'Guild invitations/applications must use the shared invitation card');
ok(guild.includes('status={st("GUILD INVITE")}'),'Incoming Guild invitations must remain explicit and localized');
ok(guild.includes('status={st("GUILD APPLICATION")}'),'Pending Guild applications must remain explicit and localized');
ok(guild.includes('status={st("GUILD INVITE SENT")}'),'Outgoing Guild invitations must remain explicit and localized');
ok(guild.includes('respondGuildInvitation(id,accept)'),'Guild invitation response behavior must remain wired');
ok(guild.includes('reviewGuildApplication(id,accept)'),'Guild application review behavior must remain wired');
ok(guild.includes('cancelGuildInvitation(id)'),'Outgoing Guild invitation cancellation must remain wired');
ok(guild.includes('publicPlayerProfileV43(app.account_id)')&&guild.includes("name={applicantNames[app.account_id]||'Applicant '")&&guild.includes('Applicant identity is unavailable or private.'),'Guild applicant names must come from a verified public profile with an anonymous fallback');
ok(guild.includes('Min Lv. '),'Incoming Guild invite requirements must remain visible');

ok(friendPicker.includes("friends,sendPartyInvitation,socialInviteCapabilities")&&socialApi.includes("client.rpc('send_party_invitation_v1'"),'Invite friends must use the authenticated Party invitation RPC, not chat messages');
ok(friendPicker.includes("capability.pending")&&friendPicker.includes("!capability.available")&&friendPicker.includes("capability.partyId!==partyId"),'Friend invite picker validates eligibility, pending state and Party identity before sending');
ok(friendPicker.includes("pendingAccountIds.includes(friend.account_id)")&&friendPicker.includes("openSpots<1")&&friendPicker.includes("busyId"),'Invite picker must block duplicate taps, pending invites and full Parties');
ok(friendPicker.includes('onInvited?.()')&&friendPicker.includes('result.status')&&friendPicker.includes("status==='already_pending'"),'Successful invites must receive server confirmation and refresh the Party invitation list');
ok(party.includes('onInviteFriends?:()=>void')&&party.includes('canManageParty&&openSpots>0&&props.onInviteFriends'),'Only a Party leader with open slots can access the private friend invite picker from Party overview');
ok(recruitment.includes('onInviteFriends?:()=>void')&&recruitment.includes('partyLeader&&partyOpenSpots>0&&onInviteFriends')&&recruitment.includes("card.postType==='party_recruiting'"),'Party Recruitment and owned recruiting posts expose friend invites only for eligible leaders');
ok(social.includes('friendInviteSheet')&&social.includes('pendingAccountIds={outgoingPartyInvites.map')&&social.includes('onInvited={()=>{void load();onInvitationsChanged?.();}}'),'Dedicated social routes must show private friend picker with live pending recipients and notification refresh');
ok(friendPicker.includes('Expires after 24 hours')&&friendPicker.includes('not in public chat'),'Private invitations explain the existing Party inbox and expiration policy');
console.log('PASS: Social Hub, Party/Guild invites and applications share compact theme-aware invitation presentation');
