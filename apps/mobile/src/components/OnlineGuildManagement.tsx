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
 guildApplications,guildDetails,guildRoster,myGuild,reviewGuildApplication,
 type GuildApplication,type GuildMember,type OnlineGuild,
} from '../online/social';

export function OnlineGuildManagement({onApplicationsChanged}:{onApplicationsChanged?:()=>void}={}){
 const [members,setMembers]=useState<GuildMember[]>([]),[applications,setApplications]=useState<GuildApplication[]>([]),[guild,setGuild]=useState<OnlineGuild|null>(null);
 const [selected,setSelected]=useState<ChatPlayerIdentity|null>(null),[role,setRole]=useState<'leader'|'officer'|'member'|null>(null),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const load=async()=>{
  if(!onlineConfigured)return;
  setBusy(true);
  try{
   const mine=await myGuild();setRole(mine?.role??null);
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
 if(!role||!guild)return <Panel><Text style={s.title}>My guild · online</Text><Text style={s.sub}>You have not joined an online guild yet.</Text><GameButton title="Refresh my guild" tone="secondary" disabled={busy} onPress={()=>void load()}/></Panel>;
 const review=async(id:string,accept:boolean)=>{setBusy(true);try{await reviewGuildApplication(id,accept);await load();onApplicationsChanged?.()}catch(error){Alert.alert('Guild application',error instanceof Error?error.message:'Unable to review application.')}finally{setBusy(false)}};
 const openMember=(member:GuildMember)=>setSelected({account_id:member.account_id,sender_name:member.display_name,guild_tag:member.guild_tag,guild_tag_color_id:member.guild_tag_color_id});
 return <Panel>
  <GuildIdentitySummary name={guild.name} tag={guild.tag} tagColorId={guild.tag_color_id} level={guild.level} memberCount={members.length} memberCap={guild.member_cap} bannerId={guild.banner_id} frameId={guild.profile_frame_id} nameColorId={guild.name_color_id} nameplateId={guild.nameplate_id} motto={guild.motto}/>
  <View style={s.sectionHead}><Text style={s.section}>ROSTER</Text><Text style={s.sectionMeta}>Your role · {role.toUpperCase()}</Text></View>
  {members.map(member=><View key={member.account_id} style={s.member}>
   <View style={s.memberIdentity}><CompactPlayerIdentity name={member.display_name} guildTag={member.guild_tag} guildTagColorId={member.guild_tag_color_id} role={member.role} hint="VIEW PROFILE ›"/></View>
   <View style={s.profileButton}><GameButton compact title="Profile" tone="secondary" onPress={()=>openMember(member)}/></View>
  </View>)}
  {(role==='leader'||role==='officer')?<><View style={s.sectionHead}><Text style={s.section}>PENDING APPLICATIONS</Text><Text style={s.sectionMeta}>{applications.length} waiting</Text></View>{applications.length?applications.map(app=><View key={app.id} style={s.application}><View style={s.copy}><Text style={s.name}>Applicant {app.account_id.slice(0,8)}</Text><Text style={s.subCompact}>Awaiting guild review</Text></View><View style={s.actions}><GameButton compact title="Accept" disabled={busy} onPress={()=>void review(app.id,true)}/><GameButton compact title="Decline" tone="secondary" disabled={busy} onPress={()=>void review(app.id,false)}/></View></View>):<Text style={s.empty}>No pending applications.</Text>}</>:null}
  <GameButton title={busy?'Refreshing…':'Refresh roster'} tone="secondary" disabled={busy} onPress={()=>void load()}/>
  <ChatPlayerSheet message={selected} onClose={()=>setSelected(null)} onBlocked={accountId=>{setSelected(null);setMembers(rows=>rows.filter(row=>row.account_id!==accountId));}}/>
 </Panel>;
}

const s=StyleSheet.create({
 title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted,lineHeight:19,marginTop:4},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:spacing.md},
 section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
 sectionMeta:{fontSize:9,color:C.muted,fontWeight:'800'},
 member:{minHeight:66,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 memberIdentity:{flex:1,minWidth:0},
 profileButton:{width:82},
 application:{minHeight:62,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,borderTopWidth:1,borderColor:C.line},
 copy:{flex:1,minWidth:0},name:{color:C.text,fontWeight:'800'},subCompact:{fontSize:10,color:C.muted,marginTop:2},
 actions:{flexDirection:'row',gap:6},empty:{...typography.body,color:C.muted,paddingVertical:spacing.sm},
});
