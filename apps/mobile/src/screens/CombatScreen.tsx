import {useGameplayText} from '../i18n/gameplay';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useMemo,useState} from 'react';
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
  const [showTraining,setShowTraining]=useState(false);
  return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.header}><View style={s.flex}><Text style={s.kicker}>{gt("Combat").toLocaleUpperCase(language)}</Text><Text accessibilityRole="header" style={s.h}>{gt("Combat")}</Text></View><View style={s.levelBadge}><Text style={s.levelBadgeText}>{gt("Level {value}",{value:character.level})}</Text></View></View>
    <View style={[s.region,{borderColor:zone.accent}]}><View style={s.flex}><Text style={s.regionLabel}>{gt("CURRENT REGION")}</Text><Text style={s.regionName}>{zone.symbol} {zone.name}</Text><Text numberOfLines={1} style={s.sub}>{gl(zone.subtitle)}</Text></View><View style={s.change}><GameButton compact title={gt("Change")} tone="secondary" onPress={onChangeRegion}/></View></View>
    <StatBar reduceMotion={state.settings.reduceMotion} label={gt("Combat XP")} current={progress.current} max={progress.need}/>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showTraining}} onPress={()=>setShowTraining(value=>!value)} style={s.trainingToggle}><View style={s.flex}><Text style={s.regionLabel}>{gt("TRAINING XP")}</Text><Text style={s.trainingCopy}>{gt("Choose how new combat XP is split between your class skills.")}</Text></View><Text style={s.trainingMark}>{showTraining?'−':'+'}</Text></Pressable>
    {showTraining?<CombatXpSplit state={state} onCommand={onCommand}/>:null}
    <ActionQueuePanel state={state} onRemove={onQueueRemove} onMove={onQueueMove} onClear={onQueueClear} onStartNext={onQueueStart}/>
    <Text style={s.section}>{gt("ENEMIES IN {region}",{region:zone.name.toUpperCase()})}</Text><Text style={s.sub}>{gt("Choose an enemy to inspect. Drop tables stay hidden until you expand a row.")}</Text>
    <RegionEncounterList state={state} zone={zone} initialExpandedId={initialMonsterId} onStart={onStart} onQueue={onQueue} onBoss={onBoss}/>
  </ScrollView>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({root:{padding:spacing.lg,gap:spacing.sm,paddingBottom:110},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm},kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'900',letterSpacing:1.2},h:{...typography.title,color:C.text},levelBadge:{maxWidth:'56%',paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},levelBadgeText:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},region:{minHeight:76,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.md},flex:{flex:1,minWidth:0},regionLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},regionName:{...typography.bodyStrong,color:equipmentColors.goldSoft},sub:{...typography.caption,color:C.muted},change:{width:84},trainingToggle:{minHeight:52,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},trainingCopy:{...typography.caption,color:C.muted},trainingMark:{width:28,color:C.info,fontSize:24,textAlign:'center',fontWeight:'700'},section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1}});}
