import {LineworkIcon} from '../components/LineworkIcon';
import {HuntingPreview} from '../components/HuntingPreview';
import {encounterLockRequirement,encounterUnlocked,regionEncounters} from '../core/world-navigation';
import {activityQueueCapacity} from '../core/activity-queue';
import {useGameplayText} from '../i18n/gameplay';
import {Platform,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useEffect,useMemo,useState} from 'react';
import type {CombatTacticId,GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import type {HuntGoalId} from '../core/hunt-goals';
import {WORLD_ZONES} from '../content/world-map';
import {currentCombatRegionId} from '../core/combat-region';
import {characterProgressWithinLevel} from '../core/progression';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from '../components/GameButton';
import {RegionEncounterList} from '../components/RegionEncounterList';
import {StatBar} from '../components/StatBar';
import {ActionQueuePanel} from '../components/ActionQueuePanel';
import {CombatXpSplit} from '../components/CombatXpSplit';
import {MonsterMasteryPanel} from '../components/MonsterMasteryPanel';
import {progressionT} from '../i18n/progression';

export function CombatScreen({state,onCommand,onChangeRegion,onStart,onQueue,onQueueRemove,onQueueMove,onQueueClear,onQueueStart,onBoss,initialMonsterId}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>;onChangeRegion:()=>void;onStart:(id:string,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueue:(id:string,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueueRemove:(index:number)=>void;onQueueMove:(index:number,direction:'up'|'down')=>void;onQueueClear:()=>void;onQueueStart:()=>void;onBoss:()=>void;initialMonsterId?:string}){
 const {gt}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const character=state.character!,progress=characterProgressWithinLevel(character.xp,character.level);
  const zone=WORLD_ZONES.find(entry=>entry.id===currentCombatRegionId(state))??WORLD_ZONES[0];
  const encounters=regionEncounters(state,zone.name,'',false),preview=encounters.find(m=>m.id===(state.activity?.kind==='combat'?state.activity.targetId:initialMonsterId))??encounters[0];
  const explorationLock=encounters.map(monster=>({monster,lock:encounterLockRequirement(state,monster)})).find(row=>row.lock?.kind==='exploration');
  const [showTraining,setShowTraining]=useState(false),[inspectedId,setInspectedId]=useState<string>();
  const detail=encounters.find(m=>m.id===inspectedId)??preview;
  const detailUnlocked=!!detail&&encounterUnlocked(state,detail),detailActive=state.activity?.kind==='combat'&&state.activity.targetId===detail?.id,queueFull=(character.activityQueue?.length??0)>=activityQueueCapacity(state);
  useEffect(()=>{setInspectedId(undefined);},[zone.id]);
  return <View style={{flex:1,minHeight:0,backgroundColor:C.bg}}><ScrollView style={{flex:1,minHeight:0}} contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.header}>
      <View style={s.breadcrumb}><Pressable accessibilityRole="button" onPress={onChangeRegion} hitSlop={8}><Text style={s.worldLink}>{gt("World")} /</Text></Pressable><Text accessibilityRole="header" style={s.regionName}>{zone.name}</Text></View>
      <GameButton compact title={gt("Change")} tone="secondary" onPress={onChangeRegion}/>
    </View>
    <View style={s.xpRow}><View style={s.levelBadge}><Text style={s.levelBadgeText}>{gt("Level {value}",{value:character.level})}</Text></View><View style={s.flex}><StatBar rounded reduceMotion={state.settings.reduceMotion} label={gt("Combat XP")} current={progress.current} max={progress.need}/></View></View>
    {preview?<HuntingPreview state={state} monster={preview} regionId={zone.id}/>:null}
    <View style={s.enemiesHeading}><Text style={[s.section,s.flex]}>{gt("ENEMIES IN {region}",{region:zone.name.toUpperCase()})}</Text><Text style={s.sub}>{gt("{count} enemies",{count:encounters.length})}</Text></View>
    {explorationLock?.lock?.kind==='exploration'?<View style={s.unlockGuide}><Text style={s.unlockGuideTitle}>{progressionT(state.settings.language,"HOW TO UNLOCK")}</Text><Text style={s.unlockGuideText}>{progressionT(state.settings.language,"Level reached. Unlock {name} in Skills → Exploration → {route}.",{name:explorationLock.monster.name,route:explorationLock.lock.routeName})}</Text></View>:null}
    <RegionEncounterList state={state} zone={zone} presentation="all" initialExpandedId={initialMonsterId} onInspect={id=>{setInspectedId(id);setShowTraining(false);}} onStart={(id,tactic,goal)=>{setInspectedId(id);onStart(id,tactic,goal);}} onBoss={onBoss}/>
    <ActionQueuePanel state={state} onRemove={onQueueRemove} onMove={onQueueMove} onClear={onQueueClear} onStartNext={onQueueStart}/>
    <View style={s.afterMonsters}>
      {detail?<View style={s.huntingPanel}><Text style={s.huntingLabel}>{gt("Hunting")}</Text><Text numberOfLines={1} style={s.dockTitle}>{detail.name}</Text><View style={s.huntingActions}><View style={s.flex}><GameButton compact title={gt(detailActive?'HUNTING':detail.boss?'Challenge boss':'Hunt')} disabled={!detailUnlocked||detailActive} onPress={()=>detail.boss?onBoss():onStart(detail.id)}/></View>{!detail.boss?<View style={s.flex}><GameButton compact tone="secondary" title={gt(queueFull?'Queue full':'Queue hunt')} disabled={!detailUnlocked||queueFull} onPress={()=>onQueue(detail.id)}/></View>:null}</View></View>:null}
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showTraining}} onPress={()=>setShowTraining(value=>!value)} style={s.trainingToggle}><LineworkIcon name="skills" size={23}/><View style={s.flex}><Text style={s.dockTitle}>{gt("Training XP")}</Text></View><Text style={s.trainingMark}>{showTraining?'⌃':'⌄'}</Text></Pressable>
      {showTraining?<CombatXpSplit state={state} onCommand={onCommand}/>:null}
    </View>
    <MonsterMasteryPanel state={state}/>
  </ScrollView></View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{flexGrow:1,padding:spacing.lg,gap:spacing.sm,paddingBottom:spacing.xl},unlockGuide:{gap:4,paddingHorizontal:spacing.sm,paddingVertical:10,borderWidth:1,borderColor:C.info,borderRadius:radii.md,backgroundColor:C.infoSurface},unlockGuideTitle:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.7},unlockGuideText:{...typography.body,color:C.text},afterMonsters:{gap:8,paddingTop:spacing.xs},huntingPanel:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:equipmentColors.panel},huntingLabel:{...typography.caption,color:C.muted,fontWeight:'800',letterSpacing:.7},huntingActions:{flexDirection:'row',gap:8},dockTitle:{fontFamily:Platform.OS==='web'?'system-ui':'sans-serif',fontSize:14,lineHeight:19,fontWeight:'600',color:C.text},enemiesHeading:{flexDirection:'row',alignItems:'center',gap:10,marginTop:2},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.md,minHeight:48},breadcrumb:{flex:1,minWidth:0,flexDirection:'row',alignItems:'baseline',flexWrap:'wrap',columnGap:5},worldLink:{...typography.body,color:C.muted},regionName:{fontFamily:Platform.OS==='web'?'system-ui':'sans-serif',fontSize:20,lineHeight:27,fontWeight:'500',color:C.text},xpRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},levelBadge:{paddingHorizontal:10,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},levelBadgeText:{...typography.caption,color:C.text,fontWeight:'700'},flex:{flex:1,minWidth:0},sub:{...typography.caption,color:C.muted},trainingToggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:equipmentColors.panel},trainingMark:{width:24,color:C.muted,fontSize:23,textAlign:'center',fontWeight:'700'},section:{...typography.caption,color:C.muted,fontWeight:'700',letterSpacing:.6}});}
