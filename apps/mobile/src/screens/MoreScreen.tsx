import {useMemo} from 'react';
import {UiIcon} from '../components/UiIcon';
import {navigationIcons} from '../theme/ui-icons';
import {Image,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {t} from '../i18n';
import {GameState} from '../core/types';

export type MoreDestination='Home'|'Social'|'Activity'|'Progression'|'DailySupplies'|'AccountBonuses'|'Quests'|'Companions'|'Skills'|'Events'|'Friends'|'Guild'|'Settings'|'Arena'|'Rankings'|'Collections'|'Profile'|'Achievements';

const sections:Array<{label:string;items:MoreDestination[]}>= [
  {label:'PLAY & PROGRESSION',items:['Home','Activity','Progression','Quests','Skills','Companions','DailySupplies','AccountBonuses']},
  {label:'SOCIAL & COMPETITION',items:['Social','Friends','Guild','Events','Arena','Rankings']},
  {label:'IDENTITY & ACCOUNT',items:['Profile','Collections','Achievements','Settings']},
];

function iconForDestination(id:MoreDestination):keyof typeof navigationIcons{
  if(id==='Activity'||id==='Progression')return 'Home';
  if(id==='DailySupplies')return 'Events';
  if(id==='AccountBonuses')return 'Character';
  if(id==='Arena'||id==='Rankings'||id==='Collections'||id==='Profile'||id==='Achievements')return 'Social';
  return id;
}
function itemMeta(language:GameState['settings']['language'],id:MoreDestination){
  switch(id){
    case 'Home':return {title:'Home',description:'Current activity and account overview'};
    case 'Social':return {title:'Social',description:'Party, contracts, recruitment and chat'};
    case 'Activity':return {title:'Character Activity',description:'Switch characters and review activity'};
    case 'Progression':return {title:'Working Toward',description:'Goals, sources and safe idle rules'};
    case 'DailySupplies':return {title:'Daily Supplies',description:'28-claim track and +10% activity boosts'};
    case 'AccountBonuses':return {title:'Account Bonuses',description:'Permanent and temporary modifiers'};
    case 'Quests':return {title:t(language,'more.quests'),description:t(language,'more.questsDescription')};
    case 'Companions':return {title:'Companions',description:'Train, equip and master your roster'};
    case 'Skills':return {title:t(language,'more.skills'),description:t(language,'more.skillsDescription')};
    case 'Events':return {title:t(language,'more.events'),description:t(language,'more.eventsDescription')};
    case 'Friends':return {title:t(language,'more.friends'),description:t(language,'more.friendsDescription')};
    case 'Guild':return {title:t(language,'more.guild'),description:t(language,'more.guildDescription')};
    case 'Settings':return {title:t(language,'more.settings'),description:t(language,'more.settingsDescription')};
    case 'Arena':return {title:'Arena',description:'Three-character ranked squad'};
    case 'Rankings':return {title:'Rankings',description:'Server-calculated prestige boards'};
    case 'Collections':return {title:'Collections',description:'Collectibles and account bonuses'};
    case 'Profile':return {title:'Profile',description:'Identity, showcase and customization'};
    case 'Achievements':return {title:'Achievements',description:'Prestige milestones and rewards'};
  }
}

export function MoreScreen({language,onNavigate,onOpenChatPilot,companionAttention=false,workingTowardAttention=false,dailySuppliesAttention=false,eventAttention=false,friendRequestCount=0,guildAttentionCount=0,socialAttentionCount=0,profileAttention=false}:{language:GameState['settings']['language'];onNavigate:(destination:MoreDestination)=>void;onOpenChatPilot?:()=>void;companionAttention?:boolean;workingTowardAttention?:boolean;dailySuppliesAttention?:boolean;eventAttention?:boolean;friendRequestCount?:number;guildAttentionCount?:number;socialAttentionCount?:number;profileAttention?:boolean}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),singleColumn=width<350||fontScale>=1.25;
  const attention=(id:MoreDestination)=>{
    if(id==='Social'&&socialAttentionCount>0)return <AttentionCount count={socialAttentionCount} label="Social updates"/>;
    if(id==='Friends'&&friendRequestCount>0)return <AttentionCount count={friendRequestCount} label="Incoming friend requests"/>;
    if(id==='Guild'&&guildAttentionCount>0)return <AttentionCount count={guildAttentionCount} label="Guild updates"/>;
    if(id==='Companions'&&companionAttention)return <AttentionDot label="Companion actions ready"/>;
    if(id==='Progression'&&workingTowardAttention)return <AttentionDot label="Working Toward goal complete"/>;
    if(id==='DailySupplies'&&dailySuppliesAttention)return <AttentionDot label="Daily Supplies ready"/>;
    if(id==='Events'&&eventAttention)return <AttentionDot label="Event rewards ready"/>;
    if(id==='Profile'&&profileAttention)return <AttentionDot label="New profile customization available"/>;
    return null;
  };
  return <ScrollView contentContainerStyle={s.root}>
    <Text accessibilityRole="header" style={s.heading}>Account</Text>
    <Text style={s.sub}>{t(language,'more.intro')}</Text>
    {sections.map(section=><View key={section.label} style={s.section}>
      <Text style={s.sectionLabel}>{section.label}</Text>
      <View style={s.grid}>{section.items.map(id=>{const meta=itemMeta(language,id);return <Pressable key={id} accessibilityRole="button" accessibilityLabel={meta.title} accessibilityHint={meta.description} onPress={()=>onNavigate(id)} style={({pressed})=>[s.tile,singleColumn&&s.tileWide,pressed&&s.pressed]}>
        <View style={s.tileTop}><View style={s.iconFrame}><Image accessible={false} source={navigationIcons[iconForDestination(id)]} resizeMode="contain" style={s.icon}/></View><View style={s.attentionSlot}>{attention(id)}</View><UiIcon name="next" size={18}/></View>
        <Text numberOfLines={1} style={s.title}>{meta.title}</Text>
        <Text numberOfLines={singleColumn?2:1} style={s.description}>{meta.description}</Text>
      </Pressable>})}</View>
    </View>)}
    {onOpenChatPilot?<View style={s.section}><Text style={s.sectionLabel}>DEVELOPER</Text><Pressable accessibilityRole="button" accessibilityLabel="Open Chat Pilot development screen" onPress={onOpenChatPilot} style={({pressed})=>[s.devCard,pressed&&s.pressed]}><Image source={navigationIcons.Social} resizeMode="contain" style={s.icon}/><View style={s.devCopy}><Text style={s.title}>Chat Pilot</Text><Text style={s.description}>Development-only interactive chat review</Text></View><UiIcon name="next" size={18}/></Pressable></View>:null}
  </ScrollView>;
}

function AttentionDot({label}:{label:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View accessible accessibilityLabel={label} style={s.attentionDot}/>}
function AttentionCount({count,label}:{count:number;label:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View accessible accessibilityLabel={`${count} ${label}`} style={s.attentionCount}><Text style={s.attentionCountText}>{count>99?'99+':count}</Text></View>}
function makeStyles(C:ThemeColors){return StyleSheet.create({
  root:{padding:spacing.md,gap:7,paddingBottom:spacing.xl},
  heading:{...typography.hero,color:C.text},
  sub:{...typography.body,color:C.muted,marginBottom:2},
  section:{gap:5,marginTop:3},
  sectionLabel:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:1},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:7},
  tile:{flexGrow:1,flexBasis:'47%',minWidth:138,minHeight:88,gap:3,padding:8,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  tileWide:{flexBasis:'100%',minWidth:0},tileTop:{minHeight:30,flexDirection:'row',alignItems:'center',gap:6},
  iconFrame:{width:30,height:30,alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},
  icon:{width:24,height:24},
  attentionSlot:{flex:1,alignItems:'flex-start'},
  title:{...typography.bodyStrong,color:C.text,fontSize:13},
  description:{...typography.caption,color:C.muted,fontSize:10,lineHeight:13},
  pressed:{opacity:.72,transform:[{translateY:1}]},
  attentionDot:{width:10,height:10,borderRadius:5,backgroundColor:C.notification,borderWidth:1,borderColor:C.notificationText},
  attentionCount:{minWidth:22,height:22,paddingHorizontal:5,borderRadius:11,backgroundColor:C.notification,alignItems:'center',justifyContent:'center'},
  attentionCountText:{fontSize:9,lineHeight:11,color:C.notificationText,fontWeight:'900'},
  devCard:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10,padding:10,borderWidth:StyleSheet.hairlineWidth,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
  devCopy:{flex:1,minWidth:0,gap:2},
});}
