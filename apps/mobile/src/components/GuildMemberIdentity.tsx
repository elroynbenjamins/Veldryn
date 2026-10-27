import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {typography,type ThemeColors} from '../theme/theme';
import {myGuild,guildDetails,ownGuildMemberCount,type OnlineGuild} from '../online/social';
import {GuildCrest} from './SocialIdentity';

import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {useSocialText} from '../i18n/social';
import {CardBackground} from './CardBackground';
import {guildBackgroundSources} from '../theme/card-background-assets';
import {GuildTaggedPlayerName} from './GuildTaggedPlayerName';

/** Compact, real guild identity card. Never invents player counts, activity or officers. */
export function GuildMemberIdentity({onRoster,onManage}:{onRoster?:()=>void;onManage?:()=>void}={}){
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
 return <GuildMemberIdentityCard guild={guild} role={role} members={members} onRoster={onRoster} onManage={onManage}/>;
}

/** The live home and isolated visual review share the same presentation. */
export function GuildMemberIdentityCard({guild,role,members,onRoster,onManage}:{guild:OnlineGuild;role:'leader'|'officer'|'member'|null;members:number|null;onRoster?:()=>void;onManage?:()=>void}){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const backdrop=guildBackgroundSources.get(guild.background_id??'')??guildBackgroundSources.get('guild_plaza')!;
 return <View style={s.banner}>
  <CardBackground sources={backdrop} shade={.7}/>
  <View style={s.identity}><GuildCrest size={52} bannerId={guild.banner_id} frameId={guild.profile_frame_id}/><View style={s.flex}><GuildTaggedPlayerName name={guild.name} guildTag={guild.tag} tagColorId={guild.tag_color_id} numberOfLines={2} style={s.bannerName}/><Text style={s.bannerMeta}>{st('Guild Level {level}',{level:guild.level})} · {members===null?'—':members+'/'+guild.member_cap}</Text>{guild.motto?<Text numberOfLines={1} style={s.bannerMeta}>{guild.motto}</Text>:null}</View><View style={s.bannerActions}>
   {onRoster?<Pressable accessibilityRole="button" accessibilityLabel={st('Members')} onPress={onRoster} style={s.bannerAction}><Text style={s.bannerActionText}>{st('Members')} ›</Text></Pressable>:null}
   {onManage&&(role==='leader'||role==='officer')?<Pressable accessibilityRole="button" accessibilityLabel={st('Manage Guild')} onPress={onManage} style={s.bannerAction}><Text style={s.bannerActionText}>{st('Manage Guild')} ›</Text></Pressable>:null}
  </View></View>
 </View>;

}
function styles(C:ThemeColors){return StyleSheet.create({
 banner:{padding:12,minHeight:110,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:10,overflow:'hidden',backgroundColor:C.stage},bannerName:{fontSize:19,lineHeight:25,fontWeight:'700',color:'#E8ECEF'},bannerMeta:{fontSize:11,lineHeight:17,color:'#D3DCE8'},bannerActions:{maxWidth:78,gap:2,flexShrink:0},bannerAction:{minHeight:44,minWidth:44,justifyContent:'center',paddingHorizontal:4},bannerActionText:{fontSize:11,lineHeight:16,color:'#E8ECEF',fontWeight:'600'},
 card:{gap:11},loading:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0},
 identity:{flexDirection:'row',alignItems:'center',gap:8},
 kicker:{color:C.accent,fontSize:11,lineHeight:15,fontWeight:'900',letterSpacing:1},
 title:{...typography.title,color:C.text,fontSize:20,lineHeight:26},
 muted:{color:C.muted,fontSize:12,lineHeight:18},tags:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:7},
 stats:{minHeight:52,borderTopWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center'},
 stat:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',gap:3},separator:{width:1,height:27,backgroundColor:C.line},
 statValue:{fontSize:15,lineHeight:19,fontWeight:'800',color:C.text},statLabel:{fontSize:11,lineHeight:15,color:C.muted},
 motto:{fontSize:12,lineHeight:17,color:C.muted,fontStyle:'italic',borderTopWidth:1,borderColor:C.line,paddingTop:8},
 });}
