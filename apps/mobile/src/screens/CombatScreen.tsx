import {RegionArtwork} from '../components/RegionArtwork';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {useMemo} from 'react';
import type {CombatChallengeId,CombatTacticId,GameState} from '../core/types';
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

export function CombatScreen({state,onCommand,onChangeRegion,onStart,onQueue,onQueueRemove,onQueueMove,onQueueClear,onQueueStart,onBoss,initialMonsterId}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>;onChangeRegion:()=>void;onStart:(id:string,challengeId?:CombatChallengeId,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueue:(id:string,challengeId?:CombatChallengeId,tacticId?:CombatTacticId,goalId?:HuntGoalId)=>void;onQueueRemove:(index:number)=>void;onQueueMove:(index:number,direction:'up'|'down')=>void;onQueueClear:()=>void;onQueueStart:()=>void;onBoss:()=>void;initialMonsterId?:string}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const character=state.character!,progress=characterProgressWithinLevel(character.xp,character.level);
  const zone=WORLD_ZONES.find(entry=>entry.id===currentCombatRegionId(state))??WORLD_ZONES[0];
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>COMBAT</Text><Text accessibilityRole="header" style={s.h}>Combat Level {character.level}</Text>
    <CombatXpSplit state={state} onCommand={onCommand}/>
    <StatBar reduceMotion={state.settings.reduceMotion} label="Combat experience" current={progress.current} max={progress.need}/>
    <View style={[s.region,{borderColor:zone.accent}]}><RegionArtwork regionId={zone.id}/><View style={s.shade}/><View style={s.flex}><Text style={s.regionLabel}>CURRENT REGION</Text><Text style={s.regionName}>{zone.symbol} {zone.name}</Text><Text style={s.sub}>{zone.subtitle}</Text></View><View style={s.change}><GameButton compact title="Change" tone="secondary" onPress={onChangeRegion}/></View></View>
    <ActionQueuePanel state={state} onRemove={onQueueRemove} onMove={onQueueMove} onClear={onQueueClear} onStartNext={onQueueStart}/>
    <Text style={s.section}>ENEMIES IN {zone.name.toUpperCase()}</Text><Text style={s.sub}>Choose an enemy to inspect. Drop tables stay hidden until you expand a row.</Text>
    <RegionEncounterList state={state} zone={zone} initialExpandedId={initialMonsterId} onStart={onStart} onQueue={onQueue} onBoss={onBoss}/>
  </ScrollView>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({shade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(7,12,20,.8)':'rgba(255,255,255,.78)'},root:{padding:spacing.lg,gap:spacing.md},kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'900',letterSpacing:1.2},h:{...typography.hero,color:C.text},region:{overflow:'hidden',minHeight:112,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.lg},flex:{flex:1,minWidth:0},regionLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},regionName:{...typography.title,color:equipmentColors.goldSoft},sub:{...typography.body,color:C.muted},change:{width:92},section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1}});}
