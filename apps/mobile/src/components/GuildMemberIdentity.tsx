import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {typography,type ThemeColors} from '../theme/theme';
import {myGuild,guildDetails,ownGuildMemberCount,type OnlineGuild} from '../online/social';
import {GuildCrest} from './SocialIdentity';
import {StatusPill} from './StatusPill';
import {Panel} from './Panel';
import {GameButton} from './GameButton';

/** Compact, real guild identity card. Never invents player counts, activity or officers. */
export function GuildMemberIdentity(){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [guild,setGuild]=useState<OnlineGuild|null>(null);
 const [role,setRole]=useState<'leader'|'officer'|'member'|null>(null);
 const [members,setMembers]=useState<number|null>(null);
 const [failure,setFailure]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const mine=await myGuild();
    if(!mine||!active)return;
    const details=await guildDetails(mine.guild_id);
    if(!active)return;
    setGuild(details);setRole(mine.role);setFailure(false);
    const count=await ownGuildMemberCount(mine.guild_id).catch(()=>null);
    if(active)setMembers(count);
   }catch{if(active)setFailure(true)}
  })();
  return()=>{active=false};
 },[retry]);
 if(!guild)return <Panel><View style={s.loading}><View style={s.flex}><Text style={s.kicker}>YOUR GUILD</Text><Text style={s.title}>{failure?'Guild details unavailable':'Loading your Guild…'}</Text></View>{!failure?<ActivityIndicator color={C.accent}/>:null}</View>{failure?<GameButton compact tone="secondary" title="Retry Guild details" onPress={()=>{setFailure(false);setRetry(n=>n+1)}}/>:null}</Panel>;
 return <Panel accentColor={C.lineStrong} accentSurface={C.panelRaised} style={s.card}>
  <Text style={s.kicker}>YOUR GUILD</Text>
  <View style={s.identity}><GuildCrest size={73} bannerId={guild.banner_id} frameId={guild.profile_frame_id}/>
   <View style={s.flex}>
    <Text accessibilityRole="header" numberOfLines={2} style={s.title}>{guild.name}</Text>
    <Text style={s.muted}>{guild.tag?'['+guild.tag+'] · ':''}Guild Level {guild.level}</Text>
    <View style={s.tags}><StatusPill label={(role??'member').toUpperCase()} tone={role==='leader'?'special':role==='officer'?'info':'muted'}/><StatusPill label={guild.join_policy==='open'?'OPEN':guild.join_policy==='apply'?'APPLICATIONS':'INVITE ONLY'} tone={guild.join_policy==='open'?'good':'muted'}/></View>
   </View>
  </View>
  <View style={s.stats}>
   <View style={s.stat}><Text style={s.statValue}>Lv. {guild.level}</Text><Text style={s.statLabel}>Guild level</Text></View>
   <View style={s.separator}/>
   <View style={s.stat}><Text style={s.statValue}>{members===null?'—':members+'/'+guild.member_cap}</Text><Text style={s.statLabel}>Members</Text></View>
   <View style={s.separator}/>
   <View style={s.stat}><Text style={s.statValue}>Lv. {guild.minimum_level}</Text><Text style={s.statLabel}>Required</Text></View>
  </View>
  {guild.motto?<Text numberOfLines={2} style={s.motto}>“{guild.motto}”</Text>:null}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 card:{gap:11},loading:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0},
 identity:{flexDirection:'row',alignItems:'center',gap:13},
 kicker:{color:C.accent,fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:1},
 title:{...typography.title,color:C.text,fontSize:20,lineHeight:26},
 muted:{color:C.muted,fontSize:12,lineHeight:18},tags:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:7},
 stats:{minHeight:52,borderTopWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center'},
 stat:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',gap:3},separator:{width:1,height:27,backgroundColor:C.line},
 statValue:{fontSize:14,fontWeight:'800',color:C.text},statLabel:{fontSize:10,lineHeight:14,color:C.muted},
 motto:{fontSize:12,lineHeight:17,color:C.muted,fontStyle:'italic',borderTopWidth:1,borderColor:C.line,paddingTop:8},
 });}
