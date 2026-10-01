import {LineworkIcon} from '../components/LineworkIcon';
import {HuntingPreview} from '../components/HuntingPreview';
import {regionEncounters} from '../core/world-navigation';
import {useGameplayText} from '../i18n/gameplay';
import {Image,Platform,Pressable,ScrollView,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {useEffect,useMemo,useState} from 'react';
import type {CombatTacticId,GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import type {HuntGoalId} from '../core/hunt-goals';
import {WORLD_ZONES} from '../content/world-map';
import {currentCombatRegionId} from '../core/combat-region';
import {characterProgressWithinLevel} from '../core/progression';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from '../components/GameButton';
import {RegionEncounterList} from '../components/RegionEncounterList';
import {StatBar} from '../components/StatBar';
import {ActionQueuePanel} from '../components/ActionQueuePanel';
import {CombatXpSplit} from '../components/CombatXpSplit';

export function CombatScreen({state,onCommand,onChangeRegion,onStart,onQueue,onQueueRemove,onQueueMove,onQueueClear,onQueueStart,onBoss,initialMonsterId}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>;onChangeRegion:()=>void;onStart:(id:string,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueue:(id:string,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueueRemove:(index:number)=>void;onQueueMove:(index:number,direction:'up'|'down')=>void;onQueueClear:()=>void;onQueueStart:()=>void;onBoss:()=>void;initialMonsterId?:string}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const character=state.character!,progress=characterProgressWithinLevel(character.xp,character.level);
  const zone=WORLD_ZONES.find(entry=>entry.id===currentCombatRegionId(state))??WORLD_ZONES[0];
  const encounters=regionEncounters(state,zone.name,'',false),preview=encounters.find(m=>m.id===(state.activity?.kind==='combat'?state.activity.targetId:initialMonsterId))??encounters[0];
  const [showTraining,setShowTraining]=useState(false),[showLoot,setShowLoot]=useState(false),[inspectedId,setInspectedId]=useState<string>();
  const {height}=useWindowDimensions(),detail=encounters.find(m=>m.id===inspectedId)??preview;
  useEffect(()=>{setInspectedId(undefined);setShowLoot(false);},[zone.id]);
  return <View style={{flex:1,minHeight:0,backgroundColor:C.bg}}><ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.header}><View style={s.flex}><Text style={s.kicker}>{gt("Combat").toLocaleUpperCase(language)}</Text><Text accessibilityRole="header" style={s.h}>{gt("Hunting")}</Text></View><View style={s.levelBadge}><Text style={s.levelBadgeText}>{gt("Level {value}",{value:character.level})}</Text></View></View>
    <View style={[s.region,{borderColor:zone.accent}]}>{zone.id==='IRONWOOD'?<><Image source={require('../../assets/combat-scenes/ironwood-clearing-v1.jpg')} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/><View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(3,9,12,.6)'}]}/></>:null}<View style={s.flex}><Text style={[s.regionName,zone.id==='IRONWOOD'&&{color:'#F0F3F4'}]}>{zone.name}</Text><Text numberOfLines={1} style={[s.sub,zone.id==='IRONWOOD'&&{color:'#BBC5CB'}]}>{gl(zone.subtitle)}</Text></View><View style={s.change}><GameButton compact title={gt("Change")} tone="secondary" onPress={onChangeRegion}/></View></View>
    <StatBar rounded reduceMotion={state.settings.reduceMotion} label={gt("Combat XP")} current={progress.current} max={progress.need}/>
    {preview?<HuntingPreview state={state} monster={preview} regionId={zone.id}/>:null}
    <ActionQueuePanel state={state} onRemove={onQueueRemove} onMove={onQueueMove} onClear={onQueueClear} onStartNext={onQueueStart}/>
    <View style={s.enemiesHeading}><Text style={[s.section,s.flex]}>{gt("ENEMIES IN {region}",{region:zone.name.toUpperCase()})}</Text><Text style={s.sub}>{gt("{count} enemies",{count:encounters.length})}</Text></View>
    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{height:188,flexGrow:1,minHeight:188,borderRadius:8}} contentContainerStyle={{paddingRight:0,paddingBottom:2}}><RegionEncounterList state={state} zone={zone} compact presentation="rows" initialExpandedId={initialMonsterId} onInspect={id=>{setInspectedId(id);setShowLoot(true);setShowTraining(false);}} onStart={onStart} onQueue={onQueue} onBoss={onBoss}/></ScrollView>
  </ScrollView>
  <View style={s.dock}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showLoot}} onPress={()=>{setShowLoot(value=>!value);setShowTraining(false);}} style={s.trainingToggle}><LineworkIcon name="inventory" size={23}/><View style={s.flex}><Text style={s.dockTitle}>{gt("Loot & encounter details")}</Text>{showLoot&&detail?<Text style={s.sub}>{detail.name}</Text>:null}</View><Text style={s.trainingMark}>{showLoot?'⌃':'⌄'}</Text></Pressable>
    {showLoot&&detail?<ScrollView key={detail.id} nestedScrollEnabled showsVerticalScrollIndicator={false} style={{maxHeight:height*.34}}><RegionEncounterList state={state} zone={zone} compact presentation="details" detailId={detail.id} onStart={onStart} onQueue={onQueue} onBoss={onBoss}/></ScrollView>:null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showTraining}} onPress={()=>{setShowTraining(value=>!value);setShowLoot(false);}} style={s.trainingToggle}><LineworkIcon name="skills" size={23}/><View style={s.flex}><Text style={s.dockTitle}>{gt("Training XP")}</Text></View><Text style={s.trainingMark}>{showTraining?'⌃':'⌄'}</Text></Pressable>
    {showTraining?<ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{maxHeight:height*.34}}><CombatXpSplit state={state} onCommand={onCommand}/></ScrollView>:null}
  </View></View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{flexGrow:1,padding:spacing.lg,gap:spacing.sm,paddingBottom:12},dock:{paddingHorizontal:16,paddingTop:6,paddingBottom:12,gap:8,backgroundColor:C.bg},dockTitle:{fontFamily:Platform.OS==='web'?'system-ui':'sans-serif',fontSize:14,lineHeight:19,fontWeight:'600',color:C.text},enemiesHeading:{flexDirection:'row',alignItems:'center',gap:10,marginTop:2},dockIcon:{fontSize:22,color:C.muted,width:26,textAlign:'center'},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm},kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'700',letterSpacing:1.2},h:{fontFamily:Platform.OS==='web'?'system-ui':'sans-serif',fontSize:26,lineHeight:32,fontWeight:'700',color:C.text},levelBadge:{maxWidth:'56%',paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},levelBadgeText:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},region:{overflow:'hidden',minHeight:66,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.md},flex:{flex:1,minWidth:0},regionLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},regionName:{fontFamily:Platform.OS==='web'?'system-ui':'sans-serif',fontSize:18,lineHeight:24,fontWeight:'700',color:equipmentColors.goldSoft},sub:{...typography.caption,color:C.muted},change:{width:84},trainingToggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},trainingCopy:{...typography.caption,color:C.muted},trainingMark:{width:24,color:C.muted,fontSize:23,textAlign:'center',fontWeight:'700'},section:{...typography.caption,color:C.muted,fontWeight:'700',letterSpacing:.6}});}
