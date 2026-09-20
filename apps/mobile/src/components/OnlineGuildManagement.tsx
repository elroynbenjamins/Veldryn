import {useEffect,useState} from 'react';
import {Alert,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {ChatPlayerSheet,type ChatPlayerIdentity} from './ChatPlayerSheet';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {GuildIdentitySummary} from './GuildIdentitySummary';
import {C,spacing,typography} from '../theme/theme';
import {onlineConfigured} from '../online/supabase';
import {
 cancelGuildInvitation,guildApplications,guildDetails,guildRoster,myGuild,removeGuildMember,reviewGuildApplication,respondGuildInvitation,socialInvitations,socialOutgoingInvitations,updateGuildMemberRole,
 type GuildApplication,type GuildInvitationView,type GuildMember,type OnlineGuild,type OutgoingInvitationView,
} from '../online/social';

export function OnlineGuildManagement({onApplicationsChanged}:{onApplicationsChanged?:()=>void}={}){
 const [members,setMembers]=useState<GuildMember[]>([]),[applications,setApplications]=useState<GuildApplication[]>([]),[invitations,setInvitations]=useState<GuildInvitationView[]>([]),[outgoingInvitations,setOutgoingInvitations]=useState<OutgoingInvitationView[]>([]),[guild,setGuild]=useState<OnlineGuild|null>(null);
 const [selected,setSelected]=useState<ChatPlayerIdentity|null>(null),[role,setRole]=useState<'leader'|'officer'|'member'|null>(null),[ownAccountId,setOwnAccountId]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const load=async()=>{
  if(!onlineConfigured)return;
  setBusy(true);
  try{
   const [mine,inviteState,outgoingState]=await Promise.all([myGuild(),socialInvitations().catch(()=>({party:[],guild:[],serverTime:''})),socialOutgoingInvitations().catch(()=>({party:[],guild:[],serverTime:''}))]);setRole(mine?.role??null);setOwnAccountId(mine?.account_id??'');setInvitations(inviteState.guild);setOutgoingInvitations(outgoingState.guild);
   if(mine){
    const [details,roster,apps]=await Promise.all([
     guildDetails(mine.guild_id),
     guildRoster(mine.guild_id),
     mine.role==='leader'||mine.role==='officer'?guildApplications(mine.guild_id):Promise.resolve([] as GuildApplication[]),
    ]);
    setGuild(details);setMembers(roster);setApplications(apps);
   }else{setGuild(null);setMembers([]);setApplications([]);}
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
  const choices:{text:string;style?:'default'|'cancel'|'destructive';onPress?:()=>void}[]=[{text:'Cancel',style:'cancel'}];
  if(role==='leader'&&member.role==='member')choices.unshift({text:'Promote to Officer',onPress:()=>void updateGuildMemberRole(member.account_id,'officer').then(load).catch(error=>Alert.alert('Guild member',error instanceof Error?error.message:'Unable to promote member.'))});
  if(role==='leader'&&member.role==='officer')choices.unshift({text:'Demote to Member',onPress:()=>void updateGuildMemberRole(member.account_id,'member').then(load).catch(error=>Alert.alert('Guild member',error instanceof Error?error.message:'Unable to demote officer.'))});
  if((role==='leader'&&member.role!=='leader')||(role==='officer'&&member.role==='member'))choices.unshift({text:'Remove from Guild',style:'destructive',onPress:()=>void removeGuildMember(member.account_id).then(load).catch(error=>Alert.alert('Guild member',error instanceof Error?error.message:'Unable to remove member.'))});
  Alert.alert(member.display_name,'Guild member controls',choices);
 };
 const openMember=(member:GuildMember)=>setSelected({account_id:member.account_id,sender_name:member.display_name,guild_tag:member.guild_tag,guild_tag_color_id:member.guild_tag_color_id});
 return <View style={s.stack}>{invitePanel}<Panel>
  <GuildIdentitySummary name={guild.name} tag={guild.tag} tagColorId={guild.tag_color_id} level={guild.level} memberCount={members.length} memberCap={guild.member_cap} bannerId={guild.banner_id} frameId={guild.profile_frame_id} nameColorId={guild.name_color_id} nameplateId={guild.nameplate_id} motto={guild.motto}/>
  <View style={s.sectionHead}><Text style={s.section}>ROSTER</Text><Text style={s.sectionMeta}>Your role · {role.toUpperCase()}</Text></View>
  {members.map(member=><View key={member.account_id} style={s.member}>
   <View style={s.memberIdentity}><CompactPlayerIdentity name={member.display_name} guildTag={member.guild_tag} guildTagColorId={member.guild_tag_color_id} role={member.role} hint="VIEW PROFILE ›"/></View>
   <View style={s.profileButton}><GameButton compact title="Profile" tone="secondary" onPress={()=>openMember(member)}/>{member.account_id!==ownAccountId&&((role==='leader'&&member.role!=='leader')||(role==='officer'&&member.role==='member'))?<GameButton compact title="Manage" tone="secondary" disabled={busy} onPress={()=>manageMember(member)}/>:null}</View>
  </View>)}
  {(role==='leader'||role==='officer')?<><View style={s.sectionHead}><Text style={s.section}>PENDING APPLICATIONS</Text><Text style={s.sectionMeta}>{applications.length} waiting</Text></View>{applications.length?applications.map(app=><View key={app.id} style={s.application}><View style={s.copy}><Text style={s.name}>Applicant {app.account_id.slice(0,8)}</Text><Text style={s.subCompact}>Awaiting guild review</Text></View><View style={s.actions}><GameButton compact title="Accept" disabled={busy} onPress={()=>void review(app.id,true)}/><GameButton compact title="Decline" tone="secondary" disabled={busy} onPress={()=>void review(app.id,false)}/></View></View>):<Text style={s.empty}>No pending applications.</Text>}</>:null}
  {(role==='leader'||role==='officer')&&outgoingInvitations.length?<><View style={s.sectionHead}><Text style={s.section}>OUTGOING INVITES</Text><Text style={s.sectionMeta}>{outgoingInvitations.length} pending</Text></View>{outgoingInvitations.map(invite=><View key={invite.id} style={s.application}><View style={s.copy}><Text style={s.name}>{invite.recipientName}</Text><Text style={s.subCompact}>Pending Guild invitation</Text></View><GameButton compact title="Cancel" tone="secondary" disabled={busy} onPress={()=>void cancelInvite(invite.id)}/></View>)}</>:null}
  <GameButton title={busy?'Refreshing…':'Refresh roster'} tone="secondary" disabled={busy} onPress={()=>void load()}/>
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
 application:{minHeight:62,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 copy:{flex:1,minWidth:0},name:{color:C.text,fontWeight:'800'},subCompact:{fontSize:10,color:C.muted,marginTop:2},
 actions:{flexDirection:'row',gap:6},empty:{...typography.body,color:C.muted,paddingVertical:spacing.sm},
});
