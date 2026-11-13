import {gameAlert} from '../core/game-alerts';
import {useSocialText} from '../i18n/social';
import {useGuildFlowUiText} from '../i18n/guild-flow-ui';
import {sortGuildMembersByActivity} from '../core/guild-member-last-active';
import {GuildMemberActivityLabel} from './GuildMemberActivityLabel';
import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {BoardTabs} from './BoardTabs';
import {GameTextInput} from './GameTextInput';
import {ChatPlayerSheet,type ChatPlayerIdentity} from './ChatPlayerSheet';
import {CompactPlayerIdentity} from './CompactPlayerIdentity';
import {GuildMemberActionSheet,type GuildMemberAction} from './GuildMemberActionSheet';
import {publicPlayerProfileV43} from '../online/profile-extension-v43';
import {SocialInvitationCard} from './SocialInvitationCard';
import {GuildIdentitySummary} from './GuildIdentitySummary';
import {LoadingState} from './LoadingState';
import {ActionFeedback} from './ActionFeedback';
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

export function OnlineGuildManagement({onApplicationsChanged,initialView='Members'}:{onApplicationsChanged?:()=>void;initialView?:'Members'|'Requests'|'Safety'}={}){
 const st=useSocialText(),guildUi=useGuildFlowUiText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [members,setMembers]=useState<GuildMember[]>([]),[applications,setApplications]=useState<GuildApplication[]>([]),[invitations,setInvitations]=useState<GuildInvitationView[]>([]),[outgoingInvitations,setOutgoingInvitations]=useState<OutgoingInvitationView[]>([]),[guild,setGuild]=useState<OnlineGuild|null>(null),[leadership,setLeadership]=useState<GuildLeadershipStatus|null>(null);
 const [selected,setSelected]=useState<ChatPlayerIdentity|null>(null),[role,setRole]=useState<'leader'|'officer'|'member'|null>(null),[ownAccountId,setOwnAccountId]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [view,setView]=useState<'Members'|'Requests'|'Safety'>(initialView),[search,setSearch]=useState('');
 const [memberFilter,setMemberFilter]=useState<'All'|'Leader'|'Officer'|'Member'>('All');
 const [memberSort,setMemberSort]=useState<'role'|'inactive'>('role');
 const [requestView,setRequestView]=useState<'Applications'|'Invites'>('Applications');
 const [activeMemberId,setActiveMemberId]=useState<string|null>(null);
 const [applicantNames,setApplicantNames]=useState<Record<string,string>>({});
 const [loadError,setLoadError]=useState('');
 useEffect(()=>setView(initialView),[initialView]);
 // Fetch identity only when reviewing requests; private/inaccessible accounts retain fallback.
 useEffect(()=>{
  if(view!=='Requests'||(role!=='leader'&&role!=='officer'))return;
  const missing=applications.filter(app=>!Object.prototype.hasOwnProperty.call(applicantNames,app.account_id)).slice(0,4);
  if(!missing.length)return;
  let alive=true;
  void Promise.all(missing.map(async app=>{
   try{const profile=await publicPlayerProfileV43(app.account_id);return [app.account_id,profile?.displayName?.trim()||''] as const}
   catch{return [app.account_id,''] as const}
  })).then(rows=>{if(alive)setApplicantNames(previous=>({...previous,...Object.fromEntries(rows)}))});
  return()=>{alive=false};
 },[view,role,applications,applicantNames]);
 const load=async()=>{
  if(!onlineConfigured)return;
  setLoadError('');
  setBusy(true);
  try{
   const [mine,inviteState,outgoingState,succession]=await Promise.all([myGuild(),socialInvitations().catch(()=>({party:[],guild:[],serverTime:''})),socialOutgoingInvitations().catch(()=>({party:[],guild:[],serverTime:''})),guildLeadershipStatus().catch(()=>null)]);setLeadership(succession);setRole(mine?.role??null);setOwnAccountId(mine?.account_id??'');setInvitations(inviteState.guild);setOutgoingInvitations(outgoingState.guild);
   if(mine){
    const [details,roster,apps]=await Promise.all([
     guildDetails(mine.guild_id),
     guildRoster(mine.guild_id),
     mine.role==='leader'||mine.role==='officer'?guildApplications(mine.guild_id):Promise.resolve([] as GuildApplication[]),
    ]);
    setGuild(details);setMembers(roster);setApplications(apps);
   }else{setGuild(null);setMembers([]);setApplications([]);setLeadership(null);}
   setLoaded(true);
  }catch(error){setLoadError(error instanceof Error?error.message:st("Unable to load your online guild."))}
  finally{setBusy(false)}
 };
 useEffect(()=>{void load()},[]);
 if(!onlineConfigured)return null;
 if(!loaded)return loadError?<Panel><ActionFeedback tone="error" message={loadError}/><GameButton title={st('Retry')} onPress={load}/></Panel>:<LoadingState compact/>;
 const respondInvite=async(id:string,accept:boolean)=>{setBusy(true);try{await respondGuildInvitation(id,accept);await load();onApplicationsChanged?.()}catch(error){gameAlert.alert(st("Guild invitation"),error instanceof Error?error.message:st("Unable to respond to this Guild invitation."))}finally{setBusy(false)}};
 const invitePanel=invitations.length?<Panel><View style={s.sectionHead}><Text style={s.section}>{st("GUILD INVITATIONS")}</Text><Text style={s.sectionMeta}>{invitations.length} pending</Text></View>{invitations.map(invite=>{const expiry=recruitmentTimeLabel(Date.parse(invite.expiresAt),Date.now());return <SocialInvitationCard key={invite.id} name={invite.guildName} guildTag={invite.guildTag} guild status={st("GUILD INVITE")} statusTone="info" detail={'Invited by '+invite.inviterName+' · '+invite.memberCount+'/'+invite.memberCap+' members · Min Lv. '+invite.minimumLevel} expiry={expiry.text} warning={role?'You are already in a Guild. Leave it before accepting another Guild invitation.':undefined} actions={<><GameButton compact title={role?st("Already joined"):st("Accept")} disabled={busy||!!role} onPress={()=>respondInvite(invite.id,true)}/><GameButton compact title={st("Decline")} tone="secondary" disabled={busy} onPress={()=>respondInvite(invite.id,false)}/></>}/>})}</Panel>:null;
 if(!role||!guild)return <View style={s.stack}>{invitePanel}<Panel><Text style={s.title}>{st("My guild · online")}</Text><Text style={s.sub}>{st("You have not joined an online guild yet.")}</Text><GameButton title={st("Refresh my guild")} tone="secondary" disabled={busy} onPress={()=>load()}/></Panel></View>;
 const review=async(id:string,accept:boolean)=>{setBusy(true);try{await reviewGuildApplication(id,accept);await load();onApplicationsChanged?.()}catch(error){gameAlert.alert(st("Guild application"),error instanceof Error?error.message:st("Unable to review application."))}finally{setBusy(false)}};
 const cancelInvite=async(id:string)=>{setBusy(true);try{await cancelGuildInvitation(id);await load()}catch(error){gameAlert.alert(st("Guild invitation"),error instanceof Error?error.message:st("Unable to cancel invitation."))}finally{setBusy(false)}};
 const manageMember=async(member:GuildMember,action:GuildMemberAction):Promise<boolean>=>{
  if(!role||busy)return false;
  const permissions=guildMemberManagement(role,member.role,member.account_id===ownAccountId);
  const allowed={promote:permissions.canPromote,demote:permissions.canDemote,remove:permissions.canRemove,transfer:permissions.canTransferLeadership}[action];
  if(!allowed)return false;
  setBusy(true);
  try{
   if(action==='promote')await updateGuildMemberRole(member.account_id,'officer');
   if(action==='demote')await updateGuildMemberRole(member.account_id,'member');
   if(action==='remove')await removeGuildMember(member.account_id);
   if(action==='transfer')await transferGuildLeadership(member.account_id);
   await load();onApplicationsChanged?.();
   return true;
  }catch(error){gameAlert.alert(st("Guild member"),error instanceof Error?error.message:"Unable to update Guild member.");return false;}
  finally{setBusy(false)}
 };
 const leaveCurrentGuild=()=>gameAlert.alert(st("Leave Guild?"),st("You will lose access to Guild projects, chat and member benefits until you join another Guild."),[
  {text:st("Cancel"),style:'cancel'},
  {text:st("Leave Guild"),style:'destructive',onPress:()=>void (async()=>{setBusy(true);try{await leaveGuild();await load();onApplicationsChanged?.()}catch(error){gameAlert.alert(st("Leave Guild"),error instanceof Error?error.message:st("Unable to leave Guild."))}finally{setBusy(false)}})()}
 ]);
 const disbandCurrentGuild=()=>gameAlert.alert(st("Disband Guild?"),st("This permanently closes the Guild for every member and removes its shared Guild progress."),[
  {text:st("Cancel"),style:'cancel'},
  {text:'Continue',style:'destructive',onPress:()=>gameAlert.alert(st("Confirm disband"),'Disband '+(guild?.name??'this Guild')+' permanently?',[
   {text:st("Cancel"),style:'cancel'},
   {text:st("Disband"),style:'destructive',onPress:()=>void (async()=>{setBusy(true);try{await disbandGuild();await load();onApplicationsChanged?.()}catch(error){gameAlert.alert(st("Disband Guild"),error instanceof Error?error.message:st("Unable to disband Guild."))}finally{setBusy(false)}})()}
  ])}
 ]);
 const openMember=(member:GuildMember)=>setSelected({account_id:member.account_id,sender_name:member.display_name,guild_tag:member.guild_tag,guild_tag_color_id:member.guild_tag_color_id,player_badges:member.player_badges});
 const visibleMembers=members.filter(member=>
  member.display_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  &&(memberFilter==='All'||member.role===memberFilter.toLocaleLowerCase()));
 if(memberSort==='inactive'&&(role==='leader'||role==='officer'))sortGuildMembersByActivity(visibleMembers);
 return <View style={s.stack}>
  {busy?<LoadingState compact/>:null}
  {loadError?<ActionFeedback tone="error" message={loadError}/>:null}
  <Panel>
   <GuildIdentitySummary compact name={guild.name} tag={guild.tag} tagColorId={guild.tag_color_id} level={guild.level} memberCount={members.length} memberCap={guild.member_cap} backgroundId={guild.background_id} bannerId={guild.banner_id} frameId={guild.profile_frame_id} nameColorId={guild.name_color_id} nameplateId={guild.nameplate_id} motto={guild.motto}/>
   <View style={s.managementHead}><View style={s.flex}><Text style={s.managementTitle}>{st("Members")}</Text><Text style={s.subCompact}>{"Guild roster and member requests"}</Text></View><View style={[s.rolePill,role==='leader'?s.roleLeader:role==='officer'?s.roleOfficer:s.roleMember]}><Text style={[s.roleText,role==='leader'?s.roleTextLeader:role==='officer'?s.roleTextOfficer:s.roleTextMember]}>{role.toUpperCase()}</Text></View></View>
   <View style={s.capacityHeader}><Text style={s.capacityCount}>{members.length} / {guild.member_cap} {st("MEMBERS")}</Text><Text style={s.capacityFree}>{Math.max(0,guild.member_cap-members.length)} {"spaces available"}</Text></View>
   <View style={s.capacityTrack}><View style={[s.capacityFill,{width:((Math.min(1,members.length/Math.max(1,guild.member_cap))*100).toFixed(2)+'%') as `${number}%`}]}/></View>
  </Panel>
  <BoardTabs compact label="Guild roster sections" items={[{id:'Members',label:'Members'},{id:'Requests',label:`Requests${applications.length+invitations.length+outgoingInvitations.length?' · '+(applications.length+invitations.length+outgoingInvitations.length):''}`},{id:'Safety',label:'Membership'}]} value={view} onChange={next=>{setView(next);setActiveMemberId(null)}}/>
  {view==='Requests'?invitePanel:null}
  <Panel>
  {view==='Safety'&&leadership?<View style={[s.leadership,Number(leadership.inactiveDays??0)>=14&&s.leadershipWarn]}><View style={s.copy}><View style={s.leadershipHead}><Text style={s.section}>LEADERSHIP SAFETY · {leadership.thresholdDays} DAYS</Text><View style={[s.safetyPill,Number(leadership.inactiveDays??0)>=14&&s.safetyPillWarn]}><Text style={[s.safetyText,Number(leadership.inactiveDays??0)>=14&&s.safetyTextWarn]}>{Number(leadership.inactiveDays??0)>=14?st("WATCH"):st("ACTIVE")}</Text></View></View>
   <Text style={s.subCompact}>{leadership.leaderName??'Guild Leader'} · {Number(leadership.inactiveDays??0)>0?'inactive '+leadership.inactiveDays+'d':'active recently'}</Text>
   {Number(leadership.inactiveDays??0)>=14&&leadership.successorName?<Text style={s.warningText}>If inactivity reaches {leadership.thresholdDays} days, leadership passes to {leadership.successorName} ({leadership.successorRole}).</Text>:Number(leadership.inactiveDays??0)>=14?<Text style={s.warningText}>No active successor is currently eligible. Leadership stays in place until an Officer or Member has been active within the last {leadership.thresholdDays} days.</Text>:null}
  </View></View>:null}
  {view==='Members'?<><GameTextInput accessibilityLabel="Search Guild members" placeholder="Search guild members" value={search} onChangeText={setSearch}/>
  <View style={s.filterRow}>{(['All','Leader','Officer','Member'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={'Show '+value+' Guild members'} accessibilityState={{selected:memberFilter===value}} onPress={()=>setMemberFilter(value)} style={({pressed})=>[s.filterChip,memberFilter===value&&s.filterSelected,pressed&&s.memberPressed]}><Text style={[s.filterText,memberFilter===value&&s.filterTextSelected]}>{value==='All'?'All':value==='Leader'?'Leaders':value==='Officer'?'Officers':'Members'}</Text></Pressable>)}</View>
  <View style={s.sectionHead}><Text style={s.section}>ROSTER · {members.length}</Text><View style={s.rosterActions}>{role!=='member'?<GameButton compact title={guildUi(memberSort==='inactive'?'Role order':'Inactive first')} tone="secondary" disabled={busy} onPress={()=>setMemberSort(previous=>previous==='inactive'?'role':'inactive')}/>:null}<GameButton compact title={busy?st("Refreshing…"):st("Refresh")} tone="secondary" disabled={busy} onPress={()=>load()}/></View></View>
  {visibleMembers.map(member=><Pressable key={member.account_id} accessibilityRole="button" accessibilityLabel={'Open '+member.display_name+' Guild member details'} onPress={()=>setActiveMemberId(member.account_id)} style={({pressed})=>[s.memberCard,pressed&&s.memberPressed]}><View style={s.memberIdentity}><CompactPlayerIdentity accountId={member.account_id} badges={member.player_badges} name={member.display_name} guildTag={member.guild_tag} guildTagColorId={member.guild_tag_color_id} status={joinedGuildLabel(member.joined_at)} statusTone="muted" avatarSize={38}/><GuildMemberActivityLabel lastActiveAt={member.last_active_at}/></View><View style={[s.memberRolePill,member.role==='leader'?s.roleLeader:member.role==='officer'?s.roleOfficer:s.roleMember]}><Text style={[s.memberRoleText,{color:member.role==='leader'?C.accent:member.role==='officer'?C.info:C.muted}]}>{member.role.toUpperCase()}</Text></View><Text style={s.memberArrow}>›</Text></Pressable>)}
  {!visibleMembers.length?<View style={s.noMatches}><Text style={s.empty}>No matching members.</Text><GameButton compact title="Clear search" tone="secondary" onPress={()=>{setSearch('');setMemberFilter('All')}}/></View>:null}</>:null}
  {view==='Requests'&&(role==='leader'||role==='officer')?<><View style={s.sectionHead}><Text style={s.section}>RECRUITMENT</Text><Text style={s.sectionMeta}>{applications.length+outgoingInvitations.length} pending</Text></View>
  <View style={s.filterRow}>{(['Applications','Invites'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:requestView===value}} onPress={()=>setRequestView(value)} style={({pressed})=>[s.filterChip,requestView===value&&s.filterSelected,pressed&&s.memberPressed]}><Text style={[s.filterText,requestView===value&&s.filterTextSelected]}>{value} · {value==='Applications'?applications.length:outgoingInvitations.length}</Text></Pressable>)}</View>
  {requestView==='Applications'?<>{applications.length?applications.map(app=><SocialInvitationCard key={app.id} accountId={app.account_id} name={applicantNames[app.account_id]||'Applicant '+app.account_id.slice(0,8)} status={st("GUILD APPLICATION")} statusTone="info" detail={applicantNames[app.account_id]?"Awaiting Guild review":"Applicant identity is unavailable or private."} actions={<><GameButton compact title="Profile" tone="secondary" disabled={busy} onPress={()=>setSelected({account_id:app.account_id,sender_name:applicantNames[app.account_id]||"Adventurer"})}/><GameButton compact title={st("Accept")} disabled={busy} onPress={()=>review(app.id,true)}/><GameButton compact title={st("Decline")} tone="secondary" disabled={busy} onPress={()=>review(app.id,false)}/></>}/>):<Text style={s.empty}>{st("No pending applications.")}</Text>}</>:<>{outgoingInvitations.length?outgoingInvitations.map(invite=>{const expiry=recruitmentTimeLabel(Date.parse(invite.expiresAt),Date.now());return <SocialInvitationCard key={invite.id} accountId={invite.recipientAccountId} name={invite.recipientName} status={st("GUILD INVITE SENT")} statusTone="muted" detail={st("Waiting for this player to respond.")} expiry={expiry.text} actions={<GameButton compact title={st("Cancel invite")} tone="secondary" disabled={busy} onPress={()=>cancelInvite(invite.id)}/>}/>;}):<Text style={s.empty}>No outgoing invitations.</Text>}</>}
  </>:null}
  {view==='Requests'&&role==='member'?<Text style={s.empty}>Applications and outgoing invitations are managed by Guild leadership.</Text>:null}
  {view==='Safety'?<><View style={s.safetyHelp}><Text style={s.section}>MEMBERSHIP & LEADERSHIP</Text><Text style={s.subCompact}>To transfer leadership, select a member in the Members tab.</Text></View><View style={s.departure}><View style={s.sectionHead}><Text style={s.dangerLabel}>{st("DANGER ZONE")}</Text><Text style={s.sectionMeta}>{role==='leader'?st("Leader controls"):st("Membership")}</Text></View>{role==='leader'?<><Text style={s.departureNote}>Transfer leadership to another member before leaving, or disband the Guild for everyone.</Text><GameButton title={st("Disband Guild")} tone="danger" loading={busy} disabled={busy} onPress={disbandCurrentGuild}/></>:<><Text style={s.departureNote}>Leaving removes access to Guild projects, chat and member benefits until you join another Guild.</Text><GameButton title={st("Leave Guild")} tone="danger" loading={busy} disabled={busy} onPress={leaveCurrentGuild}/></>}</View></>:null}
  {activeMemberId&&role?<GuildMemberActionSheet member={members.find(member=>member.account_id===activeMemberId)??null} actorRole={role} actorAccountId={ownAccountId} busy={busy} onClose={()=>setActiveMemberId(null)} onProfile={openMember} onAction={manageMember}/>:null}
  <ChatPlayerSheet message={selected} onClose={()=>setSelected(null)} onBlocked={()=>setSelected(null)}/>
 </Panel></View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 managementTitle:{...typography.title,color:C.text,fontWeight:'800'},
 capacityHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:10},
 capacityCount:{fontSize:11,lineHeight:16,fontWeight:'800',color:C.accent},
 capacityFree:{fontSize:11,lineHeight:16,fontWeight:'600',color:C.muted},
 capacityTrack:{height:5,backgroundColor:C.stage,borderRadius:5,overflow:'hidden',marginTop:5},
 capacityFill:{height:'100%',backgroundColor:C.accent,borderRadius:5},
 filterRow:{flexDirection:'row',flexWrap:'wrap',gap:5,marginTop:10,marginBottom:4},
 filterChip:{minHeight:44,minWidth:54,paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,borderRadius:6,alignItems:'center',justifyContent:'center'},
 filterSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},
 filterText:{fontSize:11,lineHeight:16,color:C.muted,fontWeight:'700'},
 filterTextSelected:{color:C.text,fontWeight:'900'},
 memberCard:{minHeight:62,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:9,borderWidth:1,borderRadius:8,borderColor:C.line,backgroundColor:C.panel2,marginTop:6},
 memberArrow:{fontSize:21,lineHeight:26,color:C.accentSoft},
 memberRolePill:{maxWidth:77,paddingHorizontal:6,paddingVertical:4,borderWidth:1,borderRadius:5},
 memberRoleText:{fontSize:9,lineHeight:12,fontWeight:'900',letterSpacing:.25},
 noMatches:{alignItems:'center',gap:4,paddingVertical:12},
 memberPressed:{opacity:.72},
 safetyHelp:{gap:4,paddingTop:10},

 stack:{gap:8},flex:{flex:1,minWidth:0},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted,lineHeight:19,marginTop:4},managementHead:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:9},rolePill:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderRadius:99},roleLeader:{borderColor:C.lineStrong,backgroundColor:C.warningSurface},roleOfficer:{borderColor:C.info,backgroundColor:C.infoSurface},roleMember:{borderColor:C.line,backgroundColor:C.panel2},roleText:{fontSize:10,lineHeight:15,fontWeight:'700',letterSpacing:.5},roleTextLeader:{color:C.accent},roleTextOfficer:{color:C.info},roleTextMember:{color:C.muted},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:spacing.md},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 sectionMeta:{fontSize:12,lineHeight:17,color:C.muted,fontWeight:'600'},
 member:{minHeight:60,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 memberIdentity:{flex:1,minWidth:0},
 memberActions:{width:82},
 leadership:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},leadershipWarn:{borderColor:C.warning,backgroundColor:C.warningSurface},leadershipHead:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8},safetyPill:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},safetyPillWarn:{borderColor:C.warning,backgroundColor:C.warningSurface},safetyText:{fontSize:10,lineHeight:15,color:C.good,fontWeight:'700',letterSpacing:.55},safetyTextWarn:{color:C.warning},warningText:{fontSize:13,lineHeight:19,color:C.warning,marginTop:3},rosterActions:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap',justifyContent:'flex-end'},departure:{gap:10,marginTop:spacing.sm,padding:12,borderWidth:1,borderColor:C.bad,borderRadius:10,backgroundColor:C.badSurface},dangerLabel:{...typography.caption,color:C.bad,fontWeight:'700',letterSpacing:.6},departureNote:{fontSize:13,lineHeight:19,color:C.muted},
 copy:{flex:1,minWidth:0},subCompact:{fontSize:12,lineHeight:17,color:C.muted,marginTop:2},
empty:{...typography.body,color:C.muted,paddingVertical:spacing.sm},
});}
