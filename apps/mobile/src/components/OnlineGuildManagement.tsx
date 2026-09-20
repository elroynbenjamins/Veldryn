import {useEffect,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ChatPlayerSheet,type ChatPlayerIdentity} from './ChatPlayerSheet';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {GuildIdentitySummary} from './GuildIdentitySummary';
import {C,spacing,typography} from '../theme/theme';
import {onlineConfigured} from '../online/supabase';
import {guildMemberManagement} from '../core/social-management';
import {
 cancelGuildInvitation,disbandGuild,guildApplications,guildDetails,guildLeadershipStatus,guildRoster,leaveGuild,myGuild,removeGuildMember,reviewGuildApplication,respondGuildInvitation,socialInvitations,socialOutgoingInvitations,transferGuildLeadership,updateGuildMemberRole,
 type GuildApplication,type GuildInvitationView,type GuildLeadershipStatus,type GuildMember,type OnlineGuild,type OutgoingInvitationView,
} from '../online/social';

export function OnlineGuildManagement({onApplicationsChanged}:{onApplicationsChanged?:()=>void}={}){
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
  }catch(error){Alert.alert('Guild',error instanceof Error?error.message:'Unable to load your online guild.')}
  finally{setBusy(false)}
 };
 useEffect(()=>{void load()},[]);
 if(!onlineConfigured||(!loaded&&!busy))return null;
 const respondInvite=async(id:string,accept:boolean)=>{setBusy(true);try{await respondGuildInvitation(id,accept);await load();onApplicationsChanged?.()}catch(error){Alert.alert('Guild invitation',error instanceof Error?error.message:'Unable to respond to this Guild invitation.')}finally{setBusy(false)}};
 const invitePanel=invitations.length?<Panel><View style={s.sectionHead}><Text style={s.section}>GUILD INVITATIONS</Text><Text style={s.sectionMeta}>{invitations.length} pending</Text></View>{invitations.map(invite=><View key={invite.id} style={s.application}><View style={s.copy}><Text style={s.name}>{invite.guildTag?'['+invite.guildTag+'] ':''}{invite.guildName}</Text><Text style={s.subCompact}>Invited by {invite.inviterName} · {invite.memberCount}/{invite.memberCap} members · Min Lv. {invite.minimumLevel}</Text></View><View style={s.actions}><GameButton compact title={role?'Already joined':'Accept'} disabled={busy||!!role} onPress={()=>void respondInvite(invite.id,true)}/><GameButton compact title="Decline" tone="secondary" disabled={busy} onPress={()=>void respondInvite(invite.id,false)}/></View></View>)}</Panel>:null;
 if(!role||!guild)return <View style={s.stack}>{invitePanel}<Panel><Text style={s.title}>My guild · online</Text><Text style={s.sub}>You have not joined an online guild yet.</Text><GameButton title="Refresh my guild" tone="secondary" disabled={busy} onPress={()=>void load()}/></Panel></View>;
 const review=async(id:string,accept:boolean)=>{setBusy(true);try{await reviewGuildApplication(id,accept);await load();onApplicationsChanged?.()}catch(error){Alert.alert('Guild application',error instanceof Error?error.message:'Unable to review application.')}finally{setBusy(false)}};
 const cancelInvite=async(id:string)=>{setBusy(true);try{await cancelGuildInvitation(id);await load()}catch(error){Alert.alert('Guild invitation',error instanceof Error?error.message:'Unable to cancel invitation.')}finally{setBusy(false)}};
 const manageMember=(member:GuildMember)=>{
  if(!role)return;
  const permissions=guildMemberManagement(role,member.role,member.account_id===ownAccountId);
  const runMember=async(action:()=>Promise<unknown>,fallback:string)=>{if(busy)return;setBusy(true);try{await action();await load();onApplicationsChanged?.()}catch(error){Alert.alert('Guild member',error instanceof Error?error.message:fallback)}finally{setBusy(false)}};
  const choices:{text:string;style?:'default'|'cancel'|'destructive';onPress?:()=>void}[]=[{text:'Cancel',style:'cancel'}];
  if(permissions.canTransferLeadership)choices.unshift({text:'Transfer Leadership',onPress:()=>Alert.alert('Transfer Guild leadership?',member.display_name+' will become Guild Leader. You will become an Officer.',[{text:'Cancel',style:'cancel'},{text:'Transfer',onPress:()=>void runMember(()=>transferGuildLeadership(member.account_id),'Unable to transfer leadership.')}])});
  if(permissions.canPromote)choices.unshift({text:'Promote to Officer',onPress:()=>void runMember(()=>updateGuildMemberRole(member.account_id,'officer'),'Unable to promote member.')});
  if(permissions.canDemote)choices.unshift({text:'Demote to Member',onPress:()=>void runMember(()=>updateGuildMemberRole(member.account_id,'member'),'Unable to demote officer.')});
  if(permissions.canRemove)choices.unshift({text:'Remove from Guild',style:'destructive',onPress:()=>void runMember(()=>removeGuildMember(member.account_id),'Unable to remove member.')});
  Alert.alert(member.display_name,'Guild member controls',choices);
 };
 const leaveCurrentGuild=()=>Alert.alert('Leave Guild?','You will lose access to Guild projects, chat and member benefits until you join another Guild.',[
  {text:'Cancel',style:'cancel'},
  {text:'Leave Guild',style:'destructive',onPress:()=>void (async()=>{setBusy(true);try{await leaveGuild();await load();onApplicationsChanged?.()}catch(error){Alert.alert('Leave Guild',error instanceof Error?error.message:'Unable to leave Guild.')}finally{setBusy(false)}})()}
 ]);
 const disbandCurrentGuild=()=>Alert.alert('Disband Guild?','This permanently closes the Guild for every member and removes its shared Guild progress.',[
  {text:'Cancel',style:'cancel'},
  {text:'Continue',style:'destructive',onPress:()=>Alert.alert('Confirm disband','Disband '+(guild?.name??'this Guild')+' permanently?',[
   {text:'Cancel',style:'cancel'},
   {text:'Disband',style:'destructive',onPress:()=>void (async()=>{setBusy(true);try{await disbandGuild();await load();onApplicationsChanged?.()}catch(error){Alert.alert('Disband Guild',error instanceof Error?error.message:'Unable to disband Guild.')}finally{setBusy(false)}})()}
  ])}
 ]);
 const openMember=(member:GuildMember)=>setSelected({account_id:member.account_id,sender_name:member.display_name,guild_tag:member.guild_tag,guild_tag_color_id:member.guild_tag_color_id});
 return <View style={s.stack}>{invitePanel}<Panel>
  <GuildIdentitySummary name={guild.name} tag={guild.tag} tagColorId={guild.tag_color_id} level={guild.level} memberCount={members.length} memberCap={guild.member_cap} bannerId={guild.banner_id} frameId={guild.profile_frame_id} nameColorId={guild.name_color_id} nameplateId={guild.nameplate_id} motto={guild.motto}/>
  {leadership?<View style={[s.leadership,Number(leadership.inactiveDays??0)>=14&&s.leadershipWarn]}><View style={s.copy}>
   <Text style={s.section}>LEADERSHIP SAFETY · {leadership.thresholdDays} DAYS</Text>
   <Text style={s.subCompact}>{leadership.leaderName??'Guild Leader'} · {Number(leadership.inactiveDays??0)>0?'inactive '+leadership.inactiveDays+'d':'active recently'}</Text>
   {Number(leadership.inactiveDays??0)>=14&&leadership.successorName?<Text style={s.warningText}>If inactivity reaches {leadership.thresholdDays} days, leadership passes to {leadership.successorName} ({leadership.successorRole}).</Text>:null}
  </View></View>:null}
  <View style={s.sectionHead}><Text style={s.section}>ROSTER</Text><Text style={s.sectionMeta}>Your role · {role.toUpperCase()}</Text></View>
  {members.map(member=><View key={member.account_id} style={s.member}>
   <View style={s.memberIdentity}><CompactPlayerIdentity name={member.display_name} guildTag={member.guild_tag} guildTagColorId={member.guild_tag_color_id} role={member.role} hint="VIEW PROFILE ›"/></View>
   <View style={s.profileButton}><GameButton compact title="Profile" tone="secondary" onPress={()=>openMember(member)}/>{role&&Object.values(guildMemberManagement(role,member.role,member.account_id===ownAccountId)).some(Boolean)?<GameButton compact title="Manage" tone="secondary" disabled={busy} onPress={()=>manageMember(member)}/>:null}</View>
  </View>)}
  {(role==='leader'||role==='officer')?<><View style={s.sectionHead}><Text style={s.section}>PENDING APPLICATIONS</Text><Text style={s.sectionMeta}>{applications.length} waiting</Text></View>{applications.length?applications.map(app=><View key={app.id} style={s.application}><View style={s.copy}><Text style={s.name}>Applicant {app.account_id.slice(0,8)}</Text><Text style={s.subCompact}>Awaiting guild review</Text></View><View style={s.actions}><GameButton compact title="Accept" disabled={busy} onPress={()=>void review(app.id,true)}/><GameButton compact title="Decline" tone="secondary" disabled={busy} onPress={()=>void review(app.id,false)}/></View></View>):<Text style={s.empty}>No pending applications.</Text>}</>:null}
  {(role==='leader'||role==='officer')&&outgoingInvitations.length?<><View style={s.sectionHead}><Text style={s.section}>OUTGOING INVITES</Text><Text style={s.sectionMeta}>{outgoingInvitations.length} pending</Text></View>{outgoingInvitations.map(invite=><View key={invite.id} style={s.application}><View style={s.copy}><Text style={s.name}>{invite.recipientName}</Text><Text style={s.subCompact}>Pending Guild invitation</Text></View><GameButton compact title="Cancel" tone="secondary" disabled={busy} onPress={()=>void cancelInvite(invite.id)}/></View>)}</>:null}
  <View style={s.departure}>
  <GameButton title={busy?'Refreshing…':'Refresh roster'} tone="secondary" disabled={busy} onPress={()=>void load()}/>
   {role==='leader'?<><Text style={s.departureNote}>Transfer leadership to another member before leaving, or disband the Guild for everyone.</Text><GameButton title="Disband Guild" tone="danger" disabled={busy} onPress={disbandCurrentGuild}/></>:<GameButton title="Leave Guild" tone="danger" disabled={busy} onPress={leaveCurrentGuild}/>} 
  </View>
  <ChatPlayerSheet message={selected} onClose={()=>setSelected(null)} onBlocked={accountId=>{setSelected(null);setMembers(rows=>rows.filter(row=>row.account_id!==accountId));}}/>
 </Panel></View>;
}

const s=StyleSheet.create({
 stack:{gap:spacing.md},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted,lineHeight:19,marginTop:4},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:spacing.md},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 sectionMeta:{fontSize:9,color:C.muted,fontWeight:'800'},
 member:{minHeight:66,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 memberIdentity:{flex:1,minWidth:0},
 profileButton:{width:82,gap:4},
 leadership:{padding:9,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},leadershipWarn:{borderColor:C.warning,backgroundColor:'#332515'},warningText:{fontSize:10,lineHeight:14,color:C.warning,marginTop:3},departure:{gap:6,marginTop:spacing.sm},departureNote:{fontSize:10,lineHeight:14,color:C.muted},application:{minHeight:62,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 copy:{flex:1,minWidth:0},name:{color:C.text,fontWeight:'800'},subCompact:{fontSize:10,color:C.muted,marginTop:2},
 actions:{flexDirection:'row',gap:6},empty:{...typography.body,color:C.muted,paddingVertical:spacing.sm},
});
