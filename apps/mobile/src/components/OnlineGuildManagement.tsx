import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ChatPlayerSheet,type ChatPlayerIdentity} from './ChatPlayerSheet';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {SocialInvitationCard} from './SocialInvitationCard';
import {GuildIdentitySummary} from './GuildIdentitySummary';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {onlineConfigured} from '../online/supabase';
import {guildMemberManagement} from '../core/social-management';
import {recruitmentTimeLabel} from '../core/party-social';
import {
 cancelGuildInvitation,disbandGuild,guildApplications,guildDetails,guildLeadershipStatus,guildRoster,leaveGuild,myGuild,removeGuildMember,reviewGuildApplication,respondGuildInvitation,socialInvitations,socialOutgoingInvitations,transferGuildLeadership,updateGuildMemberRole,
 type GuildApplication,type GuildInvitationView,type GuildLeadershipStatus,type GuildMember,type OnlineGuild,type OutgoingInvitationView,
} from '../online/social';

function joinedGuildLabel(value:string){
 const date=new Date(value);
 return Number.isFinite(date.getTime())?'JOINED '+date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}).toUpperCase():'JOIN DATE UNAVAILABLE';
}

export function OnlineGuildManagement({onApplicationsChanged}:{onApplicationsChanged?:()=>void}={}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [members,setMembers]=useState<GuildMember[]>([]),[applications,setApplications]=useState<GuildApplication[]>([]),[invitations,setInvitations]=useState<GuildInvitationView[]>([]),[outgoingInvitations,setOutgoingInvitations]=useState<OutgoingInvitationView[]>([]),[guild,setGuild]=useState<OnlineGuild|null>(null),[leadership,setLeadership]=useState<GuildLeadershipStatus|null>(null);
 const [selected,setSelected]=useState<ChatPlayerIdentity|null>(null),[role,setRole]=useState<'leader'|'officer'|'member'|null>(null),[ownAccountId,setOwnAccountId]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const load=async()=>{
  if(!onlineConfigured)return;
  setBusy(true);
  try{
   const succession=await guildLeadershipStatus().catch(()=>null);setLeadership(succession);
   const [mine,inviteState,outgoingState]=await Promise.all([myGuild(),socialInvitations().catch(()=>({party:[],guild:[],serverTime:''})),socialOutgoingInvitations().catch(()=>({party:[],guild:[],serverTime:''}))]);setRole(mine?.role??null);setOwnAccountId(mine?.account_id??'');setInvitations(inviteState.guild);setOutgoingInvitations(outgoingState.guild);
   if(mine){
    const [details,roster,apps]=await Promise.all([
     guildDetails(mine.guild_id),
     guildRoster(mine.guild_id),
     mine.role==='leader'||mine.role==='officer'?guildApplications(mine.guild_id):Promise.resolve([] as GuildApplication[]),
    ]);
    setGuild(details);setMembers(roster);setApplications(apps);
   }else{setGuild(null);setMembers([]);setApplications([]);setLeadership(null);}
   setLoaded(true);
  }catch(error){Alert.alert(st("Guild"),error instanceof Error?error.message:st("Unable to load your online guild."))}
  finally{setBusy(false)}
 };
 useEffect(()=>{void load()},[]);
 if(!onlineConfigured||(!loaded&&!busy))return null;
 const respondInvite=async(id:string,accept:boolean)=>{setBusy(true);try{await respondGuildInvitation(id,accept);await load();onApplicationsChanged?.()}catch(error){Alert.alert(st("Guild invitation"),error instanceof Error?error.message:st("Unable to respond to this Guild invitation."))}finally{setBusy(false)}};
 const invitePanel=invitations.length?<Panel><View style={s.sectionHead}><Text style={s.section}>{st("GUILD INVITATIONS")}</Text><Text style={s.sectionMeta}>{invitations.length} pending</Text></View>{invitations.map(invite=>{const expiry=recruitmentTimeLabel(Date.parse(invite.expiresAt),Date.now());return <SocialInvitationCard key={invite.id} name={invite.guildName} guildTag={invite.guildTag} guild status={st("GUILD INVITE")} statusTone="info" detail={'Invited by '+invite.inviterName+' · '+invite.memberCount+'/'+invite.memberCap+' members · Min Lv. '+invite.minimumLevel} expiry={expiry.text} warning={role?'You are already in a Guild. Leave it before accepting another Guild invitation.':undefined} actions={<><GameButton compact title={role?st("Already joined"):st("Accept")} disabled={busy||!!role} onPress={()=>void respondInvite(invite.id,true)}/><GameButton compact title={st("Decline")} tone="secondary" disabled={busy} onPress={()=>void respondInvite(invite.id,false)}/></>}/>})}</Panel>:null;
 if(!role||!guild)return <View style={s.stack}>{invitePanel}<Panel><Text style={s.title}>{st("My guild · online")}</Text><Text style={s.sub}>{st("You have not joined an online guild yet.")}</Text><GameButton title={st("Refresh my guild")} tone="secondary" disabled={busy} onPress={()=>void load()}/></Panel></View>;
 const review=async(id:string,accept:boolean)=>{setBusy(true);try{await reviewGuildApplication(id,accept);await load();onApplicationsChanged?.()}catch(error){Alert.alert(st("Guild application"),error instanceof Error?error.message:st("Unable to review application."))}finally{setBusy(false)}};
 const cancelInvite=async(id:string)=>{setBusy(true);try{await cancelGuildInvitation(id);await load()}catch(error){Alert.alert(st("Guild invitation"),error instanceof Error?error.message:st("Unable to cancel invitation."))}finally{setBusy(false)}};
 const manageMember=(member:GuildMember)=>{
  if(!role)return;
  const permissions=guildMemberManagement(role,member.role,member.account_id===ownAccountId);
  const runMember=async(action:()=>Promise<unknown>,fallback:string)=>{if(busy)return;setBusy(true);try{await action();await load();onApplicationsChanged?.()}catch(error){Alert.alert(st("Guild member"),error instanceof Error?error.message:fallback)}finally{setBusy(false)}};
  const choices:{text:string;style?:'default'|'cancel'|'destructive';onPress?:()=>void}[]=[{text:'Cancel',style:'cancel'}];
  if(permissions.canTransferLeadership)choices.unshift({text:'Transfer Leadership',onPress:()=>Alert.alert(st("Transfer Guild leadership?"),member.display_name+' will become Guild Leader. You will become an Officer.',[{text:st("Cancel"),style:'cancel'},{text:st("Transfer"),onPress:()=>void runMember(()=>transferGuildLeadership(member.account_id),'Unable to transfer leadership.')}])});
  if(permissions.canPromote)choices.unshift({text:'Promote to Officer',onPress:()=>void runMember(()=>updateGuildMemberRole(member.account_id,'officer'),'Unable to promote member.')});
  if(permissions.canDemote)choices.unshift({text:'Demote to Member',onPress:()=>void runMember(()=>updateGuildMemberRole(member.account_id,'member'),'Unable to demote officer.')});
  if(permissions.canRemove)choices.unshift({text:'Remove from Guild',style:'destructive',onPress:()=>void runMember(()=>removeGuildMember(member.account_id),'Unable to remove member.')});
  Alert.alert(member.display_name,st("Guild member controls"),choices);
 };
 const leaveCurrentGuild=()=>Alert.alert(st("Leave Guild?"),st("You will lose access to Guild projects, chat and member benefits until you join another Guild."),[
  {text:st("Cancel"),style:'cancel'},
  {text:st("Leave Guild"),style:'destructive',onPress:()=>void (async()=>{setBusy(true);try{await leaveGuild();await load();onApplicationsChanged?.()}catch(error){Alert.alert(st("Leave Guild"),error instanceof Error?error.message:st("Unable to leave Guild."))}finally{setBusy(false)}})()}
 ]);
 const disbandCurrentGuild=()=>Alert.alert(st("Disband Guild?"),st("This permanently closes the Guild for every member and removes its shared Guild progress."),[
  {text:st("Cancel"),style:'cancel'},
  {text:'Continue',style:'destructive',onPress:()=>Alert.alert(st("Confirm disband"),'Disband '+(guild?.name??'this Guild')+' permanently?',[
   {text:st("Cancel"),style:'cancel'},
   {text:st("Disband"),style:'destructive',onPress:()=>void (async()=>{setBusy(true);try{await disbandGuild();await load();onApplicationsChanged?.()}catch(error){Alert.alert(st("Disband Guild"),error instanceof Error?error.message:st("Unable to disband Guild."))}finally{setBusy(false)}})()}
  ])}
 ]);
 const openMember=(member:GuildMember)=>setSelected({account_id:member.account_id,sender_name:member.display_name,guild_tag:member.guild_tag,guild_tag_color_id:member.guild_tag_color_id,player_badges:member.player_badges});
 return <View style={s.stack}>{invitePanel}<Panel>
  <GuildIdentitySummary name={guild.name} tag={guild.tag} tagColorId={guild.tag_color_id} level={guild.level} memberCount={members.length} memberCap={guild.member_cap} backgroundId={guild.background_id} bannerId={guild.banner_id} frameId={guild.profile_frame_id} nameColorId={guild.name_color_id} nameplateId={guild.nameplate_id} motto={guild.motto}/><View style={s.managementHead}><View style={s.flex}><Text style={s.section}>{st("GUILD MANAGEMENT")}</Text><Text style={s.subCompact}>{st("Member controls and succession safety")}</Text></View><View style={[s.rolePill,role==='leader'?s.roleLeader:role==='officer'?s.roleOfficer:s.roleMember]}><Text style={[s.roleText,role==='leader'?s.roleTextLeader:role==='officer'?s.roleTextOfficer:s.roleTextMember]}>{role.toUpperCase()}</Text></View></View>
  {leadership?<View style={[s.leadership,Number(leadership.inactiveDays??0)>=14&&s.leadershipWarn]}><View style={s.copy}><View style={s.leadershipHead}><Text style={s.section}>LEADERSHIP SAFETY · {leadership.thresholdDays} DAYS</Text><View style={[s.safetyPill,Number(leadership.inactiveDays??0)>=14&&s.safetyPillWarn]}><Text style={[s.safetyText,Number(leadership.inactiveDays??0)>=14&&s.safetyTextWarn]}>{Number(leadership.inactiveDays??0)>=14?st("WATCH"):st("ACTIVE")}</Text></View></View>
   <Text style={s.subCompact}>{leadership.leaderName??'Guild Leader'} · {Number(leadership.inactiveDays??0)>0?'inactive '+leadership.inactiveDays+'d':'active recently'}</Text>
   {Number(leadership.inactiveDays??0)>=14&&leadership.successorName?<Text style={s.warningText}>If inactivity reaches {leadership.thresholdDays} days, leadership passes to {leadership.successorName} ({leadership.successorRole}).</Text>:Number(leadership.inactiveDays??0)>=14?<Text style={s.warningText}>No active successor is currently eligible. Leadership stays in place until an Officer or Member has been active within the last {leadership.thresholdDays} days.</Text>:null}
  </View></View>:null}
  <View style={s.sectionHead}><Text style={s.section}>ROSTER · {members.length}</Text><View style={s.rosterActions}><Text style={s.sectionMeta}>{members.length}/{guild.member_cap}</Text><GameButton compact title={busy?st("Refreshing…"):st("Refresh")} tone="secondary" disabled={busy} onPress={()=>void load()}/></View></View>
  {members.map(member=><View key={member.account_id} style={s.member}>
   <Pressable accessibilityRole="button" accessibilityLabel={`Open ${member.display_name}'s profile`} onPress={()=>openMember(member)} style={({pressed})=>[s.memberIdentity,pressed&&s.memberPressed]}><CompactPlayerIdentity accountId={member.account_id} badges={member.player_badges} name={member.display_name} guildTag={member.guild_tag} guildTagColorId={member.guild_tag_color_id} role={member.role} status={joinedGuildLabel(member.joined_at)} statusTone="muted" hint={st("VIEW PROFILE ›")}/></Pressable>
   {role&&Object.values(guildMemberManagement(role,member.role,member.account_id===ownAccountId)).some(Boolean)?<View style={s.memberActions}><GameButton compact title={st("Manage")} tone="secondary" disabled={busy} onPress={()=>manageMember(member)}/></View>:null}
  </View>)}
  {(role==='leader'||role==='officer')?<><View style={s.sectionHead}><Text style={s.section}>{st("PENDING APPLICATIONS")}</Text><Text style={s.sectionMeta}>{applications.length} waiting</Text></View>{applications.length?applications.map(app=><SocialInvitationCard key={app.id} accountId={app.account_id} name={'Applicant '+app.account_id.slice(0,8)} status={st("GUILD APPLICATION")} statusTone="info" detail="Awaiting Guild review · profile name unavailable for this application." actions={<><GameButton compact title={st("Accept")} disabled={busy} onPress={()=>void review(app.id,true)}/><GameButton compact title={st("Decline")} tone="secondary" disabled={busy} onPress={()=>void review(app.id,false)}/></>}/>):<Text style={s.empty}>{st("No pending applications.")}</Text>}</>:null}
  {(role==='leader'||role==='officer')&&outgoingInvitations.length?<><View style={s.sectionHead}><Text style={s.section}>{st("OUTGOING INVITES")}</Text><Text style={s.sectionMeta}>{outgoingInvitations.length} pending</Text></View>{outgoingInvitations.map(invite=>{const expiry=recruitmentTimeLabel(Date.parse(invite.expiresAt),Date.now());return <SocialInvitationCard key={invite.id} accountId={invite.recipientAccountId} name={invite.recipientName} status={st("GUILD INVITE SENT")} statusTone="muted" detail={st("Waiting for this player to respond.")} expiry={expiry.text} actions={<GameButton compact title={st("Cancel invite")} tone="secondary" disabled={busy} onPress={()=>void cancelInvite(invite.id)}/>}/>})}</>:null}
  <View style={s.departure}><View style={s.sectionHead}><Text style={s.dangerLabel}>{st("DANGER ZONE")}</Text><Text style={s.sectionMeta}>{role==='leader'?st("Leader controls"):st("Membership")}</Text></View>{role==='leader'?<><Text style={s.departureNote}>Transfer leadership to another member before leaving, or disband the Guild for everyone.</Text><GameButton title={st("Disband Guild")} tone="danger" disabled={busy} onPress={disbandCurrentGuild}/></>:<><Text style={s.departureNote}>Leaving removes access to Guild projects, chat and member benefits until you join another Guild.</Text><GameButton title={st("Leave Guild")} tone="danger" disabled={busy} onPress={leaveCurrentGuild}/></>}</View>
  <ChatPlayerSheet message={selected} onClose={()=>setSelected(null)} onBlocked={accountId=>{setSelected(null);setMembers(rows=>rows.filter(row=>row.account_id!==accountId));}}/>
 </Panel></View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 stack:{gap:10},flex:{flex:1,minWidth:0},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted,lineHeight:19,marginTop:4},managementHead:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:2},rolePill:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderRadius:99},roleLeader:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},roleOfficer:{borderColor:C.info,backgroundColor:C.infoSurface},roleMember:{borderColor:C.line,backgroundColor:C.panel2},roleText:{fontSize:7.5,fontWeight:'900',letterSpacing:.6},roleTextLeader:{color:C.accent},roleTextOfficer:{color:C.info},roleTextMember:{color:C.muted},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:spacing.md},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 sectionMeta:{fontSize:9,color:C.muted,fontWeight:'800'},
 member:{minHeight:60,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 memberIdentity:{flex:1,minWidth:0},memberPressed:{opacity:.72},
 memberActions:{width:82},
 leadership:{padding:9,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},leadershipWarn:{borderColor:C.warning,backgroundColor:C.warningSurface},leadershipHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},safetyPill:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},safetyPillWarn:{borderColor:C.warning,backgroundColor:C.warningSurface},safetyText:{fontSize:7,color:C.good,fontWeight:'900',letterSpacing:.55},safetyTextWarn:{color:C.warning},warningText:{fontSize:10,lineHeight:14,color:C.warning,marginTop:3},rosterActions:{flexDirection:'row',alignItems:'center',gap:6},departure:{gap:6,marginTop:spacing.sm,padding:9,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},dangerLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:.8},departureNote:{fontSize:9.5,lineHeight:13,color:C.muted},
 copy:{flex:1,minWidth:0},subCompact:{fontSize:10,color:C.muted,marginTop:2},
empty:{...typography.body,color:C.muted,paddingVertical:spacing.sm},
});}
