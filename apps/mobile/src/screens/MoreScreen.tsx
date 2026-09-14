import {UiIcon} from '../components/UiIcon';
import {navigationIcons} from '../theme/ui-icons';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';
import {MessageKey,t} from '../i18n';
import {GameState} from '../core/types';

export type MoreDestination='Home'|'Social'|'Quests'|'Companions'|'Skills'|'Events'|'Friends'|'Guild'|'Settings'|'Arena'|'Rankings'|'Collections'|'Profile'|'Achievements';

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

export function MoreScreen({language,onNavigate,onOpenChatPilot}:{language:GameState['settings']['language'];onNavigate:(destination:MoreDestination)=>void;onOpenChatPilot?:()=>void}){
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.heading}>Account</Text>
    <Text style={s.sub}>{t(language,'more.intro')}</Text>
    <View style={s.list}>{([{id:'Social',title:'Social',description:'Party, contracts and recruitment'},{id:'Home',title:'Home',description:'Your activity overview'},{id:'Companions',title:'Companions',description:'Train, equip, and master your companion roster'}] as const).map(item=><Pressable key={item.id} accessibilityRole="button" onPress={()=>onNavigate(item.id)} style={({pressed})=>[s.card,pressed&&s.pressed]}><View style={s.iconFrame}><Image accessible={false} source={navigationIcons[item.id]} resizeMode="contain" style={s.icon}/></View><View style={s.copy}><Text style={s.title}>{item.title}</Text><Text style={s.description}>{item.description}</Text></View><UiIcon name="next" size={24}/></Pressable>)}{destinations.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={t(language,item.labelKey)} onPress={()=>onNavigate(item.id)} style={({pressed})=>[s.card,pressed&&s.pressed]}>
      <View style={s.iconFrame}><Image accessible={false} source={navigationIcons[item.id==='Arena'||item.id==='Rankings'||item.id==='Collections'||item.id==='Profile'||item.id==='Achievements'?'Social':item.id]} resizeMode="contain" style={s.icon}/></View>
      <View style={s.copy}><Text style={s.title}>{item.id==='Arena'?'Arena':item.id==='Rankings'?'Rankings':item.id==='Collections'?'Collections':item.id==='Profile'?'Profile':item.id==='Achievements'?'Achievements':t(language,item.labelKey)}</Text><Text style={s.description}>{item.id==='Arena'?'Three-character ranked squad':item.id==='Rankings'?'Server-calculated prestige boards':item.id==='Collections'?'Account-bound collectibles and bonuses':item.id==='Profile'?'Your earned identity and showcase':item.id==='Achievements'?'Server-calculated prestige milestones':t(language,item.descriptionKey)}</Text></View>
      <UiIcon name="next" size={24}/>
    </Pressable>)}{onOpenChatPilot?<Pressable accessibilityRole="button" accessibilityLabel="Open Chat Pilot development screen" onPress={onOpenChatPilot} style={({pressed})=>[s.card,s.devCard,pressed&&s.pressed]}><View style={s.iconFrame}><Image source={navigationIcons.Social} resizeMode="contain" style={s.icon}/></View><View style={s.copy}><Text style={s.title}>Chat Pilot</Text><Text style={s.description}>Development-only interactive chat review</Text></View><UiIcon name="next" size={24}/></Pressable>:null}</View>
  </ScrollView>;
}

const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.sm},heading:{...typography.hero,color:C.text},sub:{...typography.body,color:C.muted,marginBottom:spacing.sm},list:{gap:spacing.sm},card:{width:'100%',minHeight:80,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},devCard:{borderStyle:'dashed'},pressed:{opacity:.76},iconFrame:{width:40,height:40,alignItems:'center',justifyContent:'center'},icon:{width:32,height:32},copy:{flex:1,minWidth:0,gap:4},title:{...typography.bodyStrong,color:C.text},description:{...typography.caption,color:C.muted},chevron:{color:C.muted,fontSize:26}});
