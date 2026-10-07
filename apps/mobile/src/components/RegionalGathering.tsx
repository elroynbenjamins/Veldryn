import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,GatheringSkillId} from '../core/types';
import {currentRegionId} from '../core/combat-region';
import {WORLD_ZONES} from '../content/world-map';
import {regionalGatheringNodes} from '../core/regional-gathering';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {WorkingTowardDestination} from '../core/working-toward';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';
import {ActivityArtwork} from './ActivityArtwork';
import {GatheringActivityList} from './GatheringActivityList';

export function RegionalGathering({state,preferredActionId,onGather,onNavigate,onManageSkill,onBack}:{state:GameState;preferredActionId?:string;onGather:(id:string)=>void;onNavigate?:(destination:WorkingTowardDestination)=>void;onManageSkill:(skill:GatheringSkillId)=>void;onBack?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{gt,gl}=useGameplayText();
 const [showSkills,setShowSkills]=useState(false);
 const region=WORLD_ZONES.find(row=>row.id===currentRegionId(state))??WORLD_ZONES[0],nodes=regionalGatheringNodes(state),skills=[...new Set(nodes.map(row=>row.skillId))];
 const level=(id:string)=>state.skills.find(row=>row.skillId===id)?.level??1,ready=nodes.filter(row=>level(row.skillId)>=row.unlockLevel).length;
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false}>
  <View style={s.heading}>{onBack?<Pressable accessibilityRole="button" onPress={onBack} style={s.back}><Text style={s.backText}>‹ {gt('World')}</Text></Pressable>:null}<Text accessibilityRole="header" style={s.title}>{gt('Gathering')}</Text></View>
  <View style={s.hero}><ZoneSceneArtwork regionId={region.id}/><View style={s.shade}/><View style={s.heroCopy}><Text style={s.eyebrow}>{gt('CURRENT REGION')}</Text><Text style={s.region}>{region.name}</Text><Text style={s.heroMeta}>{ready} / {nodes.length} resources ready</Text></View></View>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showSkills}} onPress={()=>setShowSkills(value=>!value)} style={s.toolsToggle}><Text style={s.sectionTitle}>{gt('Skills')}</Text><Text style={s.sub}>{showSkills?'−':'+'}</Text></Pressable>
  {showSkills&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.skills}>{skills.map(skill=><Pressable key={skill} accessibilityRole="button" accessibilityLabel={gl(skill)+' · '+gt('Skills')} onPress={()=>onManageSkill(skill as GatheringSkillId)} style={({pressed})=>[s.skill,pressed&&s.pressed]}><ActivityArtwork id={skill} size={22}/><View style={s.skillCopy}><Text style={s.skillName}>{gl(skill)}</Text><Text style={s.sub}>{gt('Level {value}',{value:level(skill)})}</Text></View><Text style={s.sub}>›</Text></Pressable>)}</ScrollView>}
  <View style={s.section}><View style={s.skillCopy}><Text style={s.sectionTitle}>Regional resources</Text><Text style={s.sub}>{gt('Tap a resource to begin gathering.')}</Text></View><Text style={s.count}>{nodes.length}</Text></View>
  {skills.map(skill=><View key={skill} style={s.skillSection}><Text style={s.skillHeading}>{gl(skill)}</Text><GatheringActivityList state={state} skillId={skill as GatheringSkillId} skillLevel={level(skill)} preferredActionId={preferredActionId} onGather={onGather} onNavigate={onNavigate} currentRegionOnly showInstruction={false}/></View>)}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{padding:16,paddingBottom:28,gap:14,maxWidth:680,width:'100%',alignSelf:'center'},heading:{gap:6},back:{minHeight:44,alignSelf:'flex-start',justifyContent:'center',paddingRight:12},backText:{fontSize:13,color:C.muted},title:{fontSize:26,lineHeight:32,fontWeight:'600',color:C.text},hero:{minHeight:120,borderRadius:18,overflow:'hidden',justifyContent:'flex-end',borderWidth:1,borderColor:C.line},shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,12,18,.56)'},heroCopy:{padding:18,gap:5},eyebrow:{fontSize:10,lineHeight:15,letterSpacing:1.6,fontWeight:'600',color:'#d5e6dc'},region:{fontSize:23,lineHeight:29,fontWeight:'600',color:'#ffffff'},heroMeta:{fontSize:12,lineHeight:18,color:'#e0e9e4'},section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},sectionTitle:{fontSize:14,lineHeight:20,fontWeight:'600',color:C.text},sub:{fontSize:11,lineHeight:17,color:C.muted},toolsToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},skills:{gap:8},skill:{minWidth:136,minHeight:52,flexDirection:'row',alignItems:'center',gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},skillCopy:{flex:1,minWidth:0,gap:2},skillName:{fontSize:12,lineHeight:18,fontWeight:'600',color:C.text},skillHeading:{fontSize:12,lineHeight:18,fontWeight:'800',color:C.muted,letterSpacing:1},skillSection:{gap:7},count:{fontSize:12,color:C.accent,backgroundColor:C.panel2,paddingHorizontal:10,paddingVertical:5,borderRadius:8},pressed:{opacity:.75}});}
