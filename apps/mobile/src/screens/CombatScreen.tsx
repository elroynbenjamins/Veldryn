import {RegionArtwork} from '../components/RegionArtwork';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useState} from 'react';
import type {CombatChallengeId,CombatTacticId,GameState} from '../core/types';
import {WORLD_ZONES} from '../content/world-map';
import {currentCombatRegionId} from '../core/combat-region';
import {environmentForZone} from '../core/world-weather';
import {characterProgressWithinLevel} from '../core/progression';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';
import {EnvironmentBanner} from '../components/EnvironmentBanner';
import {GameButton} from '../components/GameButton';
import {RegionEncounterList} from '../components/RegionEncounterList';
import {StatBar} from '../components/StatBar';
import {COMBAT_TACTIC_IDS,COMBAT_TACTICS} from '../core/combat-tactics';

export function CombatScreen({state,onChangeRegion,onStart,onBoss}:{state:GameState;onChangeRegion:()=>void;onStart:(id:string,challengeId?:CombatChallengeId,tacticId?:CombatTacticId)=>void;onBoss:()=>void}){
  const [tacticId,setTacticId]=useState<CombatTacticId>(state.activity?.kind==='combat'?state.activity.combatTacticId??'balanced':'balanced');
  const character=state.character!,progress=characterProgressWithinLevel(character.xp,character.level),tactic=COMBAT_TACTICS[tacticId];
  const zone=WORLD_ZONES.find(entry=>entry.id===currentCombatRegionId(state))??WORLD_ZONES[0];
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>COMBAT</Text><Text accessibilityRole="header" style={s.h}>Combat Level {character.level}</Text><StatBar reduceMotion={state.settings.reduceMotion} label="Combat experience" current={progress.current} max={progress.need}/>
    <View style={[s.region,{borderColor:zone.accent}]}><RegionArtwork regionId={zone.id}/><View style={s.shade}/><View style={s.flex}><Text style={s.regionLabel}>CURRENT REGION</Text><Text style={s.regionName}>{zone.symbol} {zone.name}</Text><Text style={s.sub}>{zone.subtitle}</Text></View><View style={s.change}><GameButton title="Change" tone="secondary" onPress={onChangeRegion}/></View></View>
    <EnvironmentBanner environment={environmentForZone(zone.id)} kind="combat"/>
    <View style={s.tactics}><View style={s.tacticCopy}><Text style={s.section}>COMBAT TACTIC</Text><Text style={s.sub}>{tactic.summary}</Text></View><View style={s.tacticRow}>{COMBAT_TACTIC_IDS.map(id=><Pressable key={id} accessibilityRole="radio" accessibilityState={{selected:tacticId===id}} onPress={()=>setTacticId(id)} style={[s.tacticButton,tacticId===id&&s.tacticSelected]}><Text style={[s.tacticText,tacticId===id&&s.tacticTextSelected]}>{COMBAT_TACTICS[id].name}</Text></Pressable>)}</View></View>
    {state.activity?.kind==='combat'&&<Text style={s.activeTactic}>ACTIVE HUNT · {COMBAT_TACTICS[state.activity.combatTacticId??'balanced'].name.toUpperCase()} TACTIC</Text>}
    <Text style={s.section}>ENEMIES IN {zone.name.toUpperCase()}</Text><Text style={s.sub}>Choose an enemy to inspect. Drop tables stay hidden until you expand a row.</Text>
    <RegionEncounterList state={state} zone={zone} tacticId={tacticId} onStart={onStart} onBoss={onBoss}/>
  </ScrollView>;
}

const s=StyleSheet.create({shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(7,12,20,.8)'},root:{padding:spacing.lg,gap:spacing.md},kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'900',letterSpacing:1.2},h:{...typography.hero,color:C.text},region:{overflow:'hidden',minHeight:112,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.lg},flex:{flex:1,minWidth:0},regionLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},regionName:{...typography.title,color:equipmentColors.goldSoft},sub:{...typography.body,color:C.muted},change:{width:92},section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},tactics:{gap:8,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},tacticCopy:{gap:2},tacticRow:{flexDirection:'row',gap:6},tacticButton:{flex:1,minHeight:36,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},tacticSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},tacticText:{fontSize:11,color:C.muted,fontWeight:'900'},tacticTextSelected:{color:C.text},activeTactic:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.6}});
