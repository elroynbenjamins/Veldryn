import {useEffect,useMemo,useRef} from 'react';
import {Animated,Image,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {companionView} from '../core/companion-runtime';
import {companionTeamPower} from '../../../../backend/src/server/companions/team';
import {COMPANION_TRIAL_BOSS_INTERVAL,companionTrialRecommendedPower} from '../../../../backend/src/server/companions/content';
import {companionTrialBossPreview,companionTrialEncounterTheme} from '../../../../backend/src/server/companions/trials';
import {companionArtSource} from '../theme/companion-art';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

const roleGlyph={damage:'⚔',tank:'◆',support:'✦'} as const;

export function CompanionTrialStage({state,now,floor,teamIds}:{state:GameState;now:number;floor:number;teamIds:string[]}){
 const view=companionView(state,now),team=teamIds.filter(id=>!!view.owned[id]),power=companionTeamPower(team,view.owned);
 const recommended=companionTrialRecommendedPower(floor),theme=companionTrialEncounterTheme(floor),boss=floor%COMPANION_TRIAL_BOSS_INTERVAL===0,preview=boss?companionTrialBossPreview(floor):undefined;
 const last=state.account.companionLastBattle,recent=!!last&&now-last.atMs>=0&&now-last.atMs<12_000;
 const drift=useRef(new Animated.Value(0)).current,impact=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(state.settings.reduceMotion){drift.setValue(0);return;}
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(drift,{toValue:1,duration:900,useNativeDriver:true}),
   Animated.timing(drift,{toValue:0,duration:900,useNativeDriver:true}),
  ]));
  animation.start();return ()=>animation.stop();
 },[drift,state.settings.reduceMotion]);
 useEffect(()=>{
  if(!last||state.settings.reduceMotion){impact.setValue(0);return;}
  impact.setValue(0);
  Animated.sequence([
   Animated.timing(impact,{toValue:1,duration:120,useNativeDriver:true}),
   Animated.timing(impact,{toValue:0,duration:320,useNativeDriver:true}),
  ]).start();
 },[impact,last?.atMs,state.settings.reduceMotion]);
 const teamTransform=useMemo(()=>({transform:[{translateY:drift.interpolate({inputRange:[0,1],outputRange:[0,-3]})}]}),[drift]);
 const enemyTransform=useMemo(()=>({transform:[{scale:impact.interpolate({inputRange:[0,1],outputRange:[1,1.055]})}]}),[impact]);
 const powerPct=Math.min(100,Math.round(power/Math.max(1,recommended)*100));
 return <View style={s.stage}>
  <View style={s.stageHeader}><View style={s.flex}><Text style={s.kicker}>TOWER OF COMPANIONS · FLOOR {floor}</Text><Text style={s.title}>{theme.label}</Text></View><View style={[s.powerBadge,power>=recommended?s.powerReady:s.powerLow]}><Text style={s.powerText}>{power.toLocaleString()}</Text><Text style={s.powerSub}>/ {recommended.toLocaleString()} POWER</Text></View></View>
  <View style={s.powerTrack}><View style={[s.powerFill,{width:(Math.max(3,powerPct)+'%') as any}]}/></View>
  <View style={s.arena}>
   <View style={s.teamColumn}><Text style={s.sideLabel}>YOUR FORMATION</Text>{team.length?team.map(id=>{const def=COMBAT_COMPANIONS.find(row=>row.id===id),progress=view.owned[id],art=companionArtSource(id);if(!def)return null;return <Animated.View key={id} style={[s.unit,teamTransform]}>{art?<Image source={art} resizeMode="contain" style={s.unitArt}/>:<View style={s.fallback}><Text style={s.fallbackText}>{roleGlyph[def.role]}</Text></View>}<View style={s.unitCopy}><Text numberOfLines={1} style={s.unitName}>{def.name}</Text><Text style={s.unitMeta}>{roleGlyph[def.role]} {def.role.toUpperCase()} · LV {progress.level} · B{progress.bondLevel}</Text><Text numberOfLines={1} style={s.ability}>{def.activeAbility.name} · {def.activeAbility.cooldownSeconds}s</Text></View></Animated.View>}):<View style={s.empty}><Text style={s.emptyText}>Choose Tank · Damage · Support below to preview the formation.</Text></View>}</View>
   <View style={s.vs}><Text style={s.vsText}>VS</Text></View>
   <Animated.View style={[s.enemyColumn,enemyTransform]}><Text style={s.sideLabel}>{boss?'BOSS ENCOUNTER':'TRIAL ENCOUNTER'}</Text><View style={[s.enemySigil,boss&&s.bossSigil]}><Text style={s.enemyGlyph}>{boss?'♛':'◇'}</Text></View><Text style={s.enemyName}>{boss?theme.bossName:'Trial Echoes'}</Text><Text style={s.enemyMeta}>{boss?'Checkpoint boss':'Three-enemy combat formation'}</Text>{preview?.abilities.slice(0,2).map(ability=><Text key={ability.name} numberOfLines={1} style={s.enemyAbility}>• {ability.name}{ability.interruptible?' · interruptible':''}</Text>)}</Animated.View>
  </View>
  <View style={s.combatHint}><Text style={s.combatHintLabel}>COMBAT PRESENTATION</Text><Text style={s.combatHintText}>Server-authoritative auto battle · role abilities, mitigation, healing and boss phases resolve from the real Trial simulator.</Text></View>
  {recent&&last?<View style={[s.result,last.won?s.resultWin:s.resultLoss]}><Text style={s.resultTitle}>{last.won?'VICTORY':'DEFEAT'} · {last.title}</Text><Text style={s.resultText}>{(last.durationMs/1000).toFixed(1)}s · +{last.essence} Essence · +{last.gold} Gold{last.bondstones?' · +'+last.bondstones+' Bondstone'+(last.bondstones===1?'':'s'):''}</Text></View>:null}
 </View>;
}

const s=StyleSheet.create({
 stage:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:equipmentColors.lineStrong,borderRadius:radii.lg,backgroundColor:'#081521',overflow:'hidden'},
 stageHeader:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},powerBadge:{minWidth:94,paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderRadius:radii.sm,alignItems:'flex-end'},powerReady:{borderColor:C.good,backgroundColor:'#14261d'},powerLow:{borderColor:C.warning,backgroundColor:'#332515'},powerText:{...typography.bodyStrong,color:C.text},powerSub:{fontSize:8,color:C.muted,fontWeight:'900'},powerTrack:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},powerFill:{height:'100%',backgroundColor:C.good},
 arena:{minHeight:210,flexDirection:'row',alignItems:'stretch',gap:6,paddingVertical:6},teamColumn:{flex:1.18,gap:6},enemyColumn:{flex:.82,alignItems:'center',justifyContent:'center',gap:5,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:'#111a27'},sideLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.8},unit:{minHeight:58,flexDirection:'row',alignItems:'center',gap:7,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#0e1b29'},unitArt:{width:48,height:48},fallback:{width:48,height:48,alignItems:'center',justifyContent:'center'},fallbackText:{fontSize:20,color:C.accent},unitCopy:{flex:1,minWidth:0},unitName:{fontSize:11,color:C.text,fontWeight:'900'},unitMeta:{fontSize:8,color:C.info,fontWeight:'800'},ability:{fontSize:8,color:C.muted,marginTop:2},vs:{width:22,alignItems:'center',justifyContent:'center'},vsText:{fontSize:10,color:C.accent,fontWeight:'900'},enemySigil:{width:64,height:64,borderRadius:32,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.info,backgroundColor:'#102536'},bossSigil:{borderColor:C.accent,backgroundColor:'#2b2417'},enemyGlyph:{fontSize:30,color:C.accent},enemyName:{...typography.bodyStrong,color:C.text,textAlign:'center'},enemyMeta:{fontSize:9,color:C.muted,textAlign:'center'},enemyAbility:{fontSize:8,color:C.warning,textAlign:'center'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:12,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md},emptyText:{...typography.caption,color:C.muted,textAlign:'center'},
 combatHint:{padding:8,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:'#102536'},combatHintLabel:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.8},combatHintText:{...typography.caption,color:C.muted},result:{padding:9,borderWidth:1,borderRadius:radii.sm},resultWin:{borderColor:C.good,backgroundColor:'#14261d'},resultLoss:{borderColor:C.bad,backgroundColor:'#321a1c'},resultTitle:{...typography.bodyStrong,color:C.text},resultText:{...typography.caption,color:C.muted},
});
