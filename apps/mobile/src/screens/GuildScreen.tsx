import {IdentityArtwork,GuildCrest} from '../components/SocialIdentity';
import {useState,type ReactNode} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {GuildCustomizationPanel} from '../components/GuildCustomizationPanel';
import {OnlineGuildCustomizationPanel} from '../components/OnlineGuildCustomizationPanel';
import {Panel} from '../components/Panel';
import {GameState} from '../core/types';
import {C,spacing,typography} from '../theme/theme';
import {formatGameNumber} from '../core/number-format';

const ROSTER=[['Elowen','Dawnkeeper',28,'Leader'],['Brann','Ironwarden',24,'Officer'],['Mira','Wayfinder',21,'Member'],['Tovan','Ravager',19,'Member'],['Sera','Hexweaver',17,'Member']];
type GuildSection='Overview'|'PvE'|'Roster'|'Customize';

export function GuildScreen({state,onChange,onlineDirectory,onlineManagement,onlinePve,online=false}:{online?:boolean;state:GameState;onChange:(next:GameState)=>void;onlineDirectory?:ReactNode;onlineManagement?:ReactNode;onlinePve?:ReactNode}){
  const [section,setSection]=useState<GuildSection>('Overview');
  if(online)return <ScrollView contentContainerStyle={s.root}><Text style={s.h}>Guild</Text>{onlineDirectory}{onlineManagement}{onlinePve}<OnlineGuildCustomizationPanel/></ScrollView>;
  const joined=state.account.guildMember,contribution=state.account.guildContribution??0,project=state.account.guildProjectProgress??0,bossHp=state.account.guildBossHp??100000;
  const contribute=()=>onChange({...state,account:{...state.account,guildContribution:contribution+100,guildProjectProgress:Math.min(1000,project+100)}});
  const attack=()=>onChange({...state,account:{...state.account,guildContribution:contribution+50,guildBossHp:Math.max(0,bossHp-5000)}});
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.h}>Guild</Text>
    <View style={s.tabs}>{(['Overview','PvE','Roster','Customize'] as const).map(value=><View key={value} style={s.flex}><GameButton title={value} tone={section===value?'primary':'secondary'} onPress={()=>setSection(value)}/></View>)}</View>
    {section==='Overview'&&<><Panel><GuildCrest/><Text style={s.title}>{joined?'The Bloomwardens':'Find your guild'}</Text><Text style={s.sub}>{joined?'A friendly expedition guild focused on steady PvE progress.':'Join a guild to unlock shared projects, guild PvE, and the AFK reserve bonus.'}</Text><GameButton title={joined?'Leave guild':'Join The Bloomwardens'} tone={joined?'danger':'primary'} onPress={()=>onChange({...state,account:{...state.account,guildMember:!joined}})}/></Panel>{onlineDirectory}{onlineManagement}</>}
    {section==='PvE'&&<>{onlinePve}{joined?<><Panel><Text style={s.title}>Weekly PvE project</Text><Text style={s.sub}>{formatGameNumber(project,state.settings.numberMode)}/1,000 restored · You contributed {formatGameNumber(contribution,state.settings.numberMode)}</Text><View style={s.track}><View style={[s.fill,{width:`${Math.min(100,project/10)}%`}]}/></View><GameButton title="Contribute 100" onPress={contribute}/></Panel><Panel><Text style={s.title}>Rootbound Colossus</Text><Text style={s.sub}>{formatGameNumber(bossHp,state.settings.numberMode)} HP remaining</Text><View style={s.track}><View style={[s.bossFill,{width:`${Math.max(0,bossHp/1000)}%`}]}/></View><GameButton title="Attack · 5,000 damage" onPress={attack} disabled={bossHp===0}/></Panel></>:<Panel><Text style={s.title}>Guild membership required</Text><Text style={s.sub}>Join a guild from Overview to participate in weekly projects and bosses.</Text></Panel>}</>}
    {section==='Roster'&&<Panel><Text style={s.title}>Roster · {joined?ROSTER.length:0}</Text>{joined?ROSTER.map(([name,role,level,status])=><View style={s.member} key={name}><IdentityArtwork name={String(name)} className={String(role)}/><View style={s.flex}><Text style={s.memberName}>{name}</Text><Text style={s.sub}>{role} · Level {level}</Text></View><Text style={s.status}>{status}</Text></View>):<Text style={s.sub}>Join a guild to view its members.</Text>}</Panel>}
    {section==='Customize'&&<GuildCustomizationPanel state={state} onChange={onChange}/>}
  </ScrollView>;
}

const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},h:{...typography.hero,color:C.text},tabs:{flexDirection:'row',gap:spacing.sm},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},track:{height:10,backgroundColor:C.panel2,borderRadius:5,overflow:'hidden',marginVertical:10},fill:{height:10,backgroundColor:C.accent},bossFill:{height:10,backgroundColor:'#b85c68'},member:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},avatar:{width:38,height:38,borderRadius:19,backgroundColor:C.panel2,borderWidth:1,borderColor:C.accent,alignItems:'center',justifyContent:'center'},avatarText:{color:C.accent,fontWeight:'900',fontSize:18},flex:{flex:1},memberName:{color:C.text,fontWeight:'900'},status:{color:C.good,fontSize:12,fontWeight:'700'}});
