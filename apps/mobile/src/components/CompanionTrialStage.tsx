import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {CompanionBattlePlaybackSnapshot} from '../core/companion-runtime';
import {COMBAT_COMPANIONS} from '../content/combat-companions';
import {companionView} from '../core/companion-runtime';
import {companionTeamPower} from '../../../../backend/src/server/companions/team';
import {COMPANION_TRIAL_BOSS_INTERVAL,companionTrialRecommendedPower} from '../../../../backend/src/server/companions/content';
import {companionTrialBossPreview,companionTrialEncounterTheme} from '../../../../backend/src/server/companions/trials';
import {COMPANION_AFFINITIES,companionAffinity} from '../core/companion-affinities';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

const roleGlyph={damage:'⚔',tank:'◆',support:'✦'} as const;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const pct=(current:number,max:number)=>clamp(max>0?current/max*100:0,0,100);
const time=(ms:number)=>`${(Math.max(0,ms)/1000).toFixed(1)}s`;

type PlaybackUnit={id:string;name:string;team:'players'|'enemies';role:string;maxHp:number;boss:boolean;hp:number;shield:number;alive:boolean;casting?:string};
function playbackState(playback:CompanionBattlePlaybackSnapshot,playhead:number){
 const units=new Map<string,PlaybackUnit>(playback.units.map(unit=>[unit.id,{...unit,hp:unit.maxHp,shield:0,alive:true}]));
 const visible=playback.events.filter(event=>event.atMs<=playhead);
 for(const event of visible){
  const target=event.targetId?units.get(event.targetId):undefined,actor=event.actorId?units.get(event.actorId):undefined;
  if((event.type==='damage'||event.type==='dot_tick')&&target){target.shield=Math.max(0,target.shield-(event.absorbed??0));target.hp=Math.max(0,target.hp-(event.amount??0));}
  if((event.type==='heal'||event.type==='hot_tick')&&target)target.hp=Math.min(target.maxHp,target.hp+(event.amount??0));
  if(event.type==='shield'&&target)target.shield+=event.amount??0;
  if((event.type==='down'||event.type==='death')&&target){target.hp=0;target.alive=false;}
  if(event.type==='cast_start'&&actor)actor.casting=playback.abilityNames[event.abilityId??'']??event.abilityId;
  if(event.type==='cast_complete'&&actor)actor.casting=undefined;
  if(event.type==='interrupt'&&target)target.casting=undefined;
 }
 return {units:[...units.values()],visible};
}
function eventText(playback:CompanionBattlePlaybackSnapshot,event:CompanionBattlePlaybackSnapshot['events'][number]){
 const names=new Map(playback.units.map(unit=>[unit.id,unit.name])),actor=event.actorId?names.get(event.actorId):undefined,target=event.targetId?names.get(event.targetId):undefined;
 const ability=playback.abilityNames[event.abilityId??'']??event.abilityId??'Ability';
 if(event.type==='damage')return `${actor??'Attack'} · ${ability} → ${target??'target'} −${Math.round(event.amount??0)}${event.critical?' CRIT':''}`;
 if(event.type==='dot_tick')return `${target??'Target'} suffers ${Math.round(event.amount??0)} periodic damage`;
 if(event.type==='heal'||event.type==='hot_tick')return `${actor??'Support'} restores ${Math.round(event.amount??0)} HP to ${target??'ally'}`;
 if(event.type==='shield')return `${actor??'Support'} shields ${target??'ally'} for ${Math.round(event.amount??0)}`;
 if(event.type==='cast_start')return `${actor??'Enemy'} begins ${ability}`;
 if(event.type==='cast_complete')return `${actor??'Enemy'} casts ${ability}`;
 if(event.type==='interrupt')return `${actor??'Companion'} interrupts ${target??'enemy'}`;
 if(event.type==='phase')return `PHASE · ${ability}`;
 if(event.type==='miss')return `${actor??'Attacker'} misses ${target??'target'}`;
 if(event.type==='down')return `${target??'Companion'} is down`;
 if(event.type==='death')return `${target??'Enemy'} is defeated`;
 if(event.type==='combat_end')return event.detail==='victory'?'Encounter cleared':event.detail==='wipe'?'Formation defeated':'Combat ended';
 return event.type.replace(/_/g,' ');
}

export function CompanionTrialStage({state,now,floor,teamIds}:{state:GameState;now:number;floor:number;teamIds:string[]}){
 const view=companionView(state,now),team=teamIds.filter(id=>!!view.owned[id]),power=companionTeamPower(team,view.owned);
 const recommended=companionTrialRecommendedPower(floor),theme=companionTrialEncounterTheme(floor),boss=floor%COMPANION_TRIAL_BOSS_INTERVAL===0,preview=boss?companionTrialBossPreview(floor):undefined;
 const last=state.account.companionLastBattle,playback=last?.playback;
 const fresh=!!last&&!!playback&&now-last.atMs>=0&&now-last.atMs<90_000;
 const playbackRealMs=playback?Math.min(20_000,Math.max(8_000,playback.durationMs*.38)):0;
 const simPerRealMs=playback&&playbackRealMs?playback.durationMs/playbackRealMs:1;
 const [playhead,setPlayhead]=useState(()=>fresh?0:playback?.durationMs??0),startRef=useRef(Date.now()),impact=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(!playback||!fresh){setPlayhead(playback?.durationMs??0);return;}
  startRef.current=Date.now();setPlayhead(0);
  const id=setInterval(()=>setPlayhead(Math.min(playback.durationMs,(Date.now()-startRef.current)*simPerRealMs)),80);
  return()=>clearInterval(id);
 },[fresh,last?.atMs,playback?.durationMs,simPerRealMs]);
 const playbackView=useMemo(()=>playback?playbackState(playback,playhead):undefined,[playback,playhead]);
 const current=playbackView?.visible[playbackView.visible.length-1],finished=!!playback&&playhead>=playback.durationMs;
 useEffect(()=>{
  if(!current||state.settings.reduceMotion)return;
  if(!['damage','heal','shield','interrupt','phase','down','death'].includes(current.type))return;
  impact.setValue(0);Animated.sequence([Animated.timing(impact,{toValue:1,duration:90,useNativeDriver:true}),Animated.timing(impact,{toValue:0,duration:260,useNativeDriver:true})]).start();
 },[current?.atMs,current?.type,impact,state.settings.reduceMotion]);
 const scale=impact.interpolate({inputRange:[0,1],outputRange:[1,1.012]});
 const powerPct=Math.min(100,Math.round(power/Math.max(1,recommended)*100));

 if(playback&&fresh){
  const players=playbackView!.units.filter(unit=>unit.team==='players'),enemies=playbackView!.units.filter(unit=>unit.team==='enemies');
  const feed=playbackView!.visible.filter(event=>!['combat_start','cast_complete'].includes(event.type)).slice(-5).reverse();
  const unitCard=(unit:PlaybackUnit)=>{
   const def=COMBAT_COMPANIONS.find(row=>row.id===unit.id),affinity=def?COMPANION_AFFINITIES[companionAffinity(def)]:undefined;
   return <View key={unit.id} style={[s.liveUnit,!unit.alive&&s.downedUnit,current?.targetId===unit.id&&s.targetUnit]}>
    <View style={s.unitHead}><Text numberOfLines={1} style={s.unitName}>{def?roleGlyph[def.role]+' ':unit.boss?'♛ ':''}{unit.name}</Text><Text style={s.hpText}>{Math.round(unit.hp).toLocaleString()} / {Math.round(unit.maxHp).toLocaleString()}</Text></View>
    <View style={s.hpTrack}><View style={[s.hpFill,{width:(pct(unit.hp,unit.maxHp)+'%') as any}]}/>{unit.shield>0?<View style={[s.shieldFill,{width:(Math.min(100,unit.shield/unit.maxHp*100)+'%') as any}]}/>:null}</View>
    <Text style={s.unitMeta}>{def?`${def.role.toUpperCase()} · ${affinity?.glyph??''} ${affinity?.label??''}`:(unit.boss?'BOSS':'TRIAL ECHO')}{unit.shield>0?` · ${Math.round(unit.shield)} shield`:''}</Text>
    {unit.casting?<Text style={s.castText}>CASTING · {unit.casting}</Text>:null}
   </View>;
  };
  return <Animated.View style={[s.stage,{transform:[{scale}]}]}>
   <View style={s.stageHeader}><View style={s.flex}><Text style={s.kicker}>LIVE TRIAL PLAYBACK · {last!.title.toUpperCase()}</Text><Text style={s.title}>{theme.label}</Text></View><View style={s.timerBadge}><Text style={s.timerText}>{time(Math.min(playhead,playback.durationMs))}</Text><Text style={s.powerSub}>/ {time(playback.durationMs)}</Text></View></View>
   <View style={s.liveArena}><View style={s.liveColumn}><Text style={s.sideLabel}>YOUR FORMATION</Text>{players.map(unitCard)}</View><View style={s.vs}><Text style={s.vsText}>VS</Text></View><View style={s.liveColumn}><Text style={s.sideLabel}>{enemies.some(unit=>unit.boss)?'BOSS ENCOUNTER':'TRIAL FORMATION'}</Text>{enemies.map(unitCard)}</View></View>
   <View style={s.feed}><View style={s.feedHead}><Text style={s.feedTitle}>COMBAT FEED</Text><Text style={s.feedMeta}>{playback.events.length} authoritative events</Text></View>{feed.length?feed.map((event,index)=><View key={event.atMs+':'+event.type+':'+index} style={s.feedRow}><Text style={s.feedTime}>{time(event.atMs)}</Text><Text numberOfLines={1} style={[s.feedText,event.type==='phase'&&s.phaseText,event.type==='interrupt'&&s.interruptText,event.critical&&s.critText]}>{eventText(playback,event)}</Text></View>):<Text style={s.enemyMeta}>The formation enters the Trial…</Text>}</View>
   {!finished?<View style={s.playbackFooter}><Text style={s.combatHintText}>Compressed playback of the already-resolved server simulation.</Text><Pressable accessibilityRole="button" onPress={()=>{startRef.current=Date.now()-playbackRealMs;setPlayhead(playback.durationMs)}} style={s.skip}><Text style={s.skipText}>SKIP →</Text></Pressable></View>:<View style={[s.result,last!.won?s.resultWin:s.resultLoss]}><Text style={s.resultTitle}>{last!.won?'VICTORY':'DEFEAT'} · {last!.title}</Text><Text style={s.resultText}>{(last!.durationMs/1000).toFixed(1)}s simulated · +{last!.essence} Essence · +{last!.gold} Gold{last!.bondstones?' · +'+last!.bondstones+' Bondstone'+(last!.bondstones===1?'':'s'):''}</Text></View>}
  </Animated.View>;
 }

 return <View style={s.stage}>
  <View style={s.stageHeader}><View style={s.flex}><Text style={s.kicker}>TOWER OF COMPANIONS · FLOOR {floor}</Text><Text style={s.title}>{theme.label}</Text></View><View style={[s.powerBadge,power>=recommended?s.powerReady:s.powerLow]}><Text style={s.powerText}>{power.toLocaleString()}</Text><Text style={s.powerSub}>/ {recommended.toLocaleString()} POWER</Text></View></View>
  <View style={s.powerTrack}><View style={[s.powerFill,{width:(Math.max(3,powerPct)+'%') as any}]}/></View>
  <View style={s.arena}>
   <View style={s.teamColumn}><Text style={s.sideLabel}>YOUR FORMATION</Text>{team.length?team.map(id=>{const def=COMBAT_COMPANIONS.find(row=>row.id===id),progress=view.owned[id];if(!def)return null;const affinity=COMPANION_AFFINITIES[companionAffinity(def)];return <View key={id} style={s.unit}><View style={s.unitCopy}><Text numberOfLines={1} style={s.unitName}>{roleGlyph[def.role]} {def.name}</Text><Text style={s.unitMeta}>{def.role.toUpperCase()} · {affinity.glyph} {affinity.label} · LV {progress.level} · B{progress.bondLevel}</Text><Text numberOfLines={1} style={s.ability}>{def.activeAbility.name} · {def.activeAbility.cooldownSeconds}s</Text></View></View>}):<View style={s.empty}><Text style={s.emptyText}>Choose Tank · Damage · Support below to preview the formation.</Text></View>}</View>
   <View style={s.vs}><Text style={s.vsText}>VS</Text></View>
   <View style={s.enemyColumn}><Text style={s.sideLabel}>{boss?'BOSS ENCOUNTER':'TRIAL ENCOUNTER'}</Text><View style={[s.enemySigil,boss&&s.bossSigil]}><Text style={s.enemyGlyph}>{boss?'♛':'◇'}</Text></View><Text style={s.enemyName}>{boss?theme.bossName:'Trial Echoes'}</Text><Text style={s.enemyMeta}>{boss?'Checkpoint boss':'Three-enemy combat formation'}</Text>{preview?.abilities.slice(0,2).map(ability=><Text key={ability.name} numberOfLines={1} style={s.enemyAbility}>• {ability.name}{ability.interruptible?' · interruptible':''}</Text>)}</View>
  </View>
  <View style={s.combatHint}><Text style={s.combatHintLabel}>COMBAT PRESENTATION</Text><Text style={s.combatHintText}>Fight resolves server-side, then replays here from the authoritative event transcript.</Text></View>
 </View>;
}

const s=StyleSheet.create({
 stage:{gap:spacing.sm,padding:spacing.md,borderWidth:1,borderColor:equipmentColors.lineStrong,borderRadius:radii.lg,backgroundColor:'#081521',overflow:'hidden'},
 stageHeader:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},
 powerBadge:{minWidth:94,paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderRadius:radii.sm,alignItems:'flex-end'},powerReady:{borderColor:C.good,backgroundColor:'#14261d'},powerLow:{borderColor:C.warning,backgroundColor:'#332515'},powerText:{...typography.bodyStrong,color:C.text},powerSub:{fontSize:8,color:C.muted,fontWeight:'900'},timerBadge:{minWidth:80,paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.info,borderRadius:radii.sm,alignItems:'flex-end',backgroundColor:'#102536'},timerText:{...typography.bodyStrong,color:C.info},
 powerTrack:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},powerFill:{height:'100%',backgroundColor:C.good},
 arena:{minHeight:210,flexDirection:'row',alignItems:'stretch',gap:6,paddingVertical:6},teamColumn:{flex:1.18,gap:6},enemyColumn:{flex:.82,alignItems:'center',justifyContent:'center',gap:5,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:'#111a27'},sideLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.8},unit:{minHeight:52,flexDirection:'row',alignItems:'center',gap:7,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#0e1b29'},unitCopy:{flex:1,minWidth:0},unitName:{fontSize:10,color:C.text,fontWeight:'900'},unitMeta:{fontSize:7,color:C.info,fontWeight:'800'},ability:{fontSize:8,color:C.muted,marginTop:2},vs:{width:22,alignItems:'center',justifyContent:'center'},vsText:{fontSize:10,color:C.accent,fontWeight:'900'},enemySigil:{width:64,height:64,borderRadius:32,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.info,backgroundColor:'#102536'},bossSigil:{borderColor:C.accent,backgroundColor:'#2b2417'},enemyGlyph:{fontSize:30,color:C.accent},enemyName:{...typography.bodyStrong,color:C.text,textAlign:'center'},enemyMeta:{fontSize:9,color:C.muted,textAlign:'center'},enemyAbility:{fontSize:8,color:C.warning,textAlign:'center'},empty:{flex:1,alignItems:'center',justifyContent:'center',padding:12,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md},emptyText:{...typography.caption,color:C.muted,textAlign:'center'},
 combatHint:{padding:8,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:'#102536'},combatHintLabel:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.8},combatHintText:{...typography.caption,color:C.muted},
 liveArena:{minHeight:210,flexDirection:'row',alignItems:'stretch',gap:5},liveColumn:{flex:1,gap:5},liveUnit:{gap:3,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#0e1b29'},targetUnit:{borderColor:C.warning},downedUnit:{opacity:.55},unitHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5},hpText:{fontSize:7,color:C.muted,fontVariant:['tabular-nums']},hpTrack:{height:7,borderRadius:99,overflow:'hidden',backgroundColor:'#291417',position:'relative'},hpFill:{height:'100%',backgroundColor:C.good},shieldFill:{position:'absolute',right:0,top:0,bottom:0,backgroundColor:C.info},castText:{fontSize:7,color:C.warning,fontWeight:'900',letterSpacing:.5},
 feed:{gap:4,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#0b1723'},feedHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},feedTitle:{fontSize:8,color:C.accent,fontWeight:'900',letterSpacing:.7},feedMeta:{fontSize:7,color:C.muted},feedRow:{flexDirection:'row',gap:6},feedTime:{width:31,fontSize:8,color:C.muted,fontVariant:['tabular-nums']},feedText:{flex:1,fontSize:8,color:C.text,fontWeight:'700'},phaseText:{color:C.info,fontWeight:'900'},interruptText:{color:C.good,fontWeight:'900'},critText:{color:C.warning,fontWeight:'900'},
 playbackFooter:{minHeight:30,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},skip:{paddingHorizontal:8,paddingVertical:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},skipText:{fontSize:8,color:C.accent,fontWeight:'900'},result:{padding:9,borderWidth:1,borderRadius:radii.sm},resultWin:{borderColor:C.good,backgroundColor:'#14261d'},resultLoss:{borderColor:C.bad,backgroundColor:'#321a1c'},resultTitle:{...typography.bodyStrong,color:C.text},resultText:{...typography.caption,color:C.muted},
});
