import {UiIcon} from '../components/UiIcon';
import {navigationIcons} from '../theme/ui-icons';
import {Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {C,radii,spacing,typography} from '../theme/theme';
import type {GameState} from '../core/types';

export type MoreDestination='Social'|'Quests'|'Companions'|'Events'|'Friends'|'Guild'|'WorldFeed'|'Settings'|'Arena'|'Rankings'|'Collections'|'Profile'|'Achievements'|'Journal'|'Bestiary'|'Pets';
type IconRoute=keyof typeof navigationIcons;
type Row={id:MoreDestination;title:string;description:string;icon:IconRoute;badge?:'friends'|'events'};
const SECTIONS:Array<{title:string;rows:Row[]}>= [
 {title:'Progression & Tasks',rows:[
  {id:'Quests',title:'Quests',description:'Story, contracts and objectives that need your attention.',icon:'Quests'},
 ]},
 {title:'Social',rows:[
  {id:'Social',title:'Social',description:'Party, chat, recruitment and social overview.',icon:'Social'},
  {id:'Friends',title:'Friends',description:'Friends, incoming requests and player search.',icon:'Friends',badge:'friends'},
  {id:'Guild',title:'Guild',description:'Guild Hall, projects, recruitment and member activity.',icon:'Guild'},
  {id:'WorldFeed',title:'World Milestones',description:'Recent public accomplishments from real players.',icon:'World'},
  {id:'Rankings',title:'Rankings',description:'Server-calculated progression and challenge rankings.',icon:'Social'},
  {id:'Arena',title:'Arena',description:'Three-character ranked squad competition.',icon:'Social'},
 ]},
 {title:'Collections & Events',rows:[
  {id:'Journal',title:"Adventurer's Journal",description:'Long-term achievements, titles, records and completion.',icon:'Social'},
  {id:'Achievements',title:'Achievements',description:'Claimable achievements and achievement showcase.',icon:'Social'},
  {id:'Collections',title:'Collections',description:'Account-bound collectibles and completion sets.',icon:'Social'},
  {id:'Bestiary',title:'Bestiary',description:'Creature discovery, mastery and known drops.',icon:'World'},
  {id:'Profile',title:'Public Profile',description:'Your character identity, cosmetics and showcases.',icon:'Social'},
  {id:'Pets',title:'Pets & Bonuses',description:'Account-wide passive pet bonuses and your active pet.',icon:'Companions'},
  {id:'Companions',title:'Companions',description:'Train, equip and manage your companion roster.',icon:'Companions'},
  {id:'Events',title:'Events',description:'Current rotating event, tasks, rewards and collection.',icon:'Events',badge:'events'},
 ]},
 {title:'Account & Help',rows:[
  {id:'Settings',title:'Settings & Account',description:'Account, shortcuts, gameplay, chat and accessibility.',icon:'Settings'},
 ]},
];

export function MoreScreen({language:_,onNavigate,onOpenChatPilot,friendRequestCount=0,eventRewardCount=0}:{language:GameState['settings']['language'];onNavigate:(destination:MoreDestination)=>void;onOpenChatPilot?:()=>void;friendRequestCount?:number;eventRewardCount?:number}){
 return <ScrollView contentContainerStyle={s.root}>
  <Text style={s.kicker}>ACCOUNT</Text><Text accessibilityRole="header" style={s.heading}>Account</Text><Text style={s.sub}>Account progression, social features, collections, benefits and settings.</Text>
  {SECTIONS.map(section=><View key={section.title} style={s.section}><Text style={s.sectionTitle}>{section.title}</Text><View style={s.list}>{section.rows.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={()=>onNavigate(item.id)} style={({pressed})=>[s.card,pressed&&s.pressed]}>
    <View style={s.iconFrame}><Image accessible={false} source={navigationIcons[item.icon]} resizeMode="contain" style={s.icon}/></View>
    <View style={s.copy}><Text style={s.title}>{item.title}</Text><Text style={s.description}>{item.description}</Text></View>
    {item.badge==='friends'&&friendRequestCount>0?<View style={s.badge}><Text style={s.badgeText}>{friendRequestCount>99?'99+':friendRequestCount}</Text></View>:null}{item.badge==='events'&&eventRewardCount>0?<View style={s.badge}><Text style={s.badgeText}>{eventRewardCount>99?'99+':eventRewardCount}</Text></View>:null}
    <UiIcon name="next" size={24}/>
  </Pressable>)}</View></View>)}
  {onOpenChatPilot?<Pressable accessibilityRole="button" accessibilityLabel="Open Chat Pilot development screen" onPress={onOpenChatPilot} style={({pressed})=>[s.card,s.devCard,pressed&&s.pressed]}><View style={s.iconFrame}><Image source={navigationIcons.Social} resizeMode="contain" style={s.icon}/></View><View style={s.copy}><Text style={s.title}>Chat Pilot</Text><Text style={s.description}>Development-only interactive chat review</Text></View><UiIcon name="next" size={24}/></Pressable>:null}
 </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.1},heading:{...typography.hero,color:C.text},sub:{...typography.body,color:C.muted,marginBottom:spacing.sm},section:{gap:spacing.sm},sectionTitle:{...typography.bodyStrong,color:C.accent,letterSpacing:.4},list:{gap:spacing.sm},card:{width:'100%',minHeight:76,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,borderWidth:StyleSheet.hairlineWidth,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},devCard:{borderStyle:'dashed'},pressed:{opacity:.76},iconFrame:{width:40,height:40,alignItems:'center',justifyContent:'center'},icon:{width:32,height:32},copy:{flex:1,minWidth:0,gap:4},title:{...typography.bodyStrong,color:C.text},description:{...typography.caption,color:C.muted},badge:{minWidth:22,height:22,borderRadius:11,backgroundColor:'#d93646',alignItems:'center',justifyContent:'center',paddingHorizontal:5},badgeText:{color:'#fff',fontSize:10,fontWeight:'900'}});
