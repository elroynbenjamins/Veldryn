import {UiIcon} from '../components/UiIcon';
import {navigationIcons} from '../theme/ui-icons';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';
import {MessageKey,t} from '../i18n';
import {GameState} from '../core/types';

export type MoreDestination='Home'|'Social'|'Activity'|'Progression'|'DailySupplies'|'AccountBonuses'|'Quests'|'Companions'|'Skills'|'Events'|'Friends'|'Guild'|'Settings'|'Arena'|'Rankings'|'Collections'|'Profile'|'Achievements';

const destinations:{id:MoreDestination;labelKey:MessageKey;descriptionKey:MessageKey}[]=[
  {id:'Arena',labelKey:'more.guild',descriptionKey:'more.guildDescription'},
  {id:'Rankings',labelKey:'more.guild',descriptionKey:'more.guildDescription'},
  {id:'Collections',labelKey:'more.guild',descriptionKey:'more.guildDescription'},
  {id:'Profile',labelKey:'more.guild',descriptionKey:'more.guildDescription'},
  {id:'Achievements',labelKey:'more.guild',descriptionKey:'more.guildDescription'},
  {id:'Quests',labelKey:'more.quests',descriptionKey:'more.questsDescription'},
  {id:'Skills',labelKey:'more.skills',descriptionKey:'more.skillsDescription'},
  {id:'Events',labelKey:'more.events',descriptionKey:'more.eventsDescription'},
  {id:'Friends',labelKey:'more.friends',descriptionKey:'more.friendsDescription'},
  {id:'Guild',labelKey:'more.guild',descriptionKey:'more.guildDescription'},
  {id:'Settings',labelKey:'more.settings',descriptionKey:'more.settingsDescription'},
];
function iconForDestination(id:MoreDestination):keyof typeof navigationIcons{
  if(id==='Activity'||id==='Progression')return 'Home';
  if(id==='DailySupplies')return 'Events';
  if(id==='AccountBonuses')return 'Character';
  if(id==='Arena'||id==='Rankings'||id==='Collections'||id==='Profile'||id==='Achievements')return 'Social';
  return id;
}

export function MoreScreen({language,onNavigate,onOpenChatPilot,companionAttention=false,workingTowardAttention=false,dailySuppliesAttention=false,eventAttention=false,friendRequestCount=0,guildAttentionCount=0,socialAttentionCount=0,profileAttention=false}:{language:GameState['settings']['language'];onNavigate:(destination:MoreDestination)=>void;onOpenChatPilot?:()=>void;companionAttention?:boolean;workingTowardAttention?:boolean;dailySuppliesAttention?:boolean;eventAttention?:boolean;friendRequestCount?:number;guildAttentionCount?:number;socialAttentionCount?:number;profileAttention?:boolean}){
  return <ScrollView contentContainerStyle={s.root}>
    <Text accessibilityRole="header" style={s.heading}>Account</Text>
    <Text style={s.sub}>{t(language,'more.intro')}</Text>
    <View style={s.list}>{([{id:'Social',title:'Social',description:'Party, contracts and recruitment'},{id:'Activity',title:'Character Activity',description:'See every character and switch quickly'},{id:'Progression',title:'Working Toward',description:'Pin goals, follow sources and manage safe idle rules'},{id:'AccountBonuses',title:'Account Bonuses',description:'See active permanent and temporary gameplay modifiers'},{id:'DailySupplies',title:'Daily Supplies',description:'28-claim account track and banked +10% activity boosts'},{id:'Home',title:'Home',description:'Your activity overview'},{id:'Companions',title:'Companions',description:'Train, equip, and master your companion roster'}] as const).map(item=><Pressable key={item.id} accessibilityRole="button" onPress={()=>onNavigate(item.id)} style={({pressed})=>[s.card,pressed&&s.pressed]}><View style={s.iconFrame}><Image accessible={false} source={navigationIcons[iconForDestination(item.id)]} resizeMode="contain" style={s.icon}/></View><View style={s.copy}><Text style={s.title}>{item.title}</Text><Text style={s.description}>{item.description}</Text></View>{item.id==='Companions'&&companionAttention?<View accessibilityLabel="Companion actions ready" style={s.attentionDot}/>:item.id==='Progression'&&workingTowardAttention?<View accessibilityLabel="Working Toward goal complete" style={s.attentionDot}/>:item.id==='DailySupplies'&&dailySuppliesAttention?<View accessibilityLabel="Daily Supplies ready" style={s.attentionDot}/>:item.id==='Social'&&socialAttentionCount>0?<AttentionCount count={socialAttentionCount} label="Pending Party invitations"/>:null}<UiIcon name="next" size={24}/></Pressable>)}{destinations.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={t(language,item.labelKey)} onPress={()=>onNavigate(item.id)} style={({pressed})=>[s.card,pressed&&s.pressed]}>
      <View style={s.iconFrame}><Image accessible={false} source={navigationIcons[iconForDestination(item.id)]} resizeMode="contain" style={s.icon}/></View>
      <View style={s.copy}><Text style={s.title}>{item.id==='Arena'?'Arena':item.id==='Rankings'?'Rankings':item.id==='Collections'?'Collections':item.id==='Profile'?'Profile':item.id==='Achievements'?'Achievements':t(language,item.labelKey)}</Text><Text style={s.description}>{item.id==='Arena'?'Three-character ranked squad':item.id==='Rankings'?'Server-calculated prestige boards':item.id==='Collections'?'Account-bound collectibles and bonuses':item.id==='Profile'?'View and customize your player identity':item.id==='Achievements'?'Server-calculated prestige milestones':t(language,item.descriptionKey)}</Text></View>
      {item.id==='Events'&&eventAttention?<View accessibilityLabel="Event rewards ready" style={s.attentionDot}/>:item.id==='Friends'&&friendRequestCount>0?<AttentionCount count={friendRequestCount} label="Incoming friend requests"/>:item.id==='Guild'&&guildAttentionCount>0?<AttentionCount count={guildAttentionCount} label="Pending guild applications"/>:item.id==='Profile'&&profileAttention?<View accessibilityLabel="New profile customization available" style={s.attentionDot}/>:null}<UiIcon name="next" size={24}/>
    </Pressable>)}{onOpenChatPilot?<Pressable accessibilityRole="button" accessibilityLabel="Open Chat Pilot development screen" onPress={onOpenChatPilot} style={({pressed})=>[s.card,s.devCard,pressed&&s.pressed]}><View style={s.iconFrame}><Image source={navigationIcons.Social} resizeMode="contain" style={s.icon}/></View><View style={s.copy}><Text style={s.title}>Chat Pilot</Text><Text style={s.description}>Development-only interactive chat review</Text></View><UiIcon name="next" size={24}/></Pressable>:null}</View>
  </ScrollView>;
}

function AttentionCount({count,label}:{count:number;label:string}){return <View accessible accessibilityLabel={`${count} ${label}`} style={s.attentionCount}><Text style={s.attentionCountText}>{count>99?'99+':count}</Text></View>}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.sm},heading:{...typography.hero,color:C.text},sub:{...typography.body,color:C.muted,marginBottom:spacing.sm},list:{gap:spacing.sm},card:{width:'100%',minHeight:80,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},devCard:{borderStyle:'dashed'},pressed:{opacity:.76},iconFrame:{width:40,height:40,alignItems:'center',justifyContent:'center'},icon:{width:32,height:32},copy:{flex:1,minWidth:0,gap:4},title:{...typography.bodyStrong,color:C.text},description:{...typography.caption,color:C.muted},chevron:{color:C.muted,fontSize:26},attentionDot:{width:10,height:10,borderRadius:5,backgroundColor:'#d93646',borderWidth:1,borderColor:'#09131f'},attentionCount:{minWidth:22,height:22,paddingHorizontal:5,borderRadius:11,backgroundColor:'#d93646',borderWidth:1,borderColor:'#09131f',alignItems:'center',justifyContent:'center'},attentionCountText:{fontSize:9,lineHeight:11,color:'#fff',fontWeight:'900'}});
