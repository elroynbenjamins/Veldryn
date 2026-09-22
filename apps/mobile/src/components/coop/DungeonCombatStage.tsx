import {useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Pressable,StyleSheet,Text,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {dungeonCombatCueFx,type DungeonCombatCueFx,type DungeonCombatFxAccent} from '../../core/dungeon-combat-fx';
import {DUNGEON_PLAYBACK_SPEEDS,playbackAdvanceDelayMs,playbackBossCombatant,playbackCastDisplayMs,playbackCombatant,playbackCombatantState,playbackCombatantStatuses,playbackCueLabel,playbackCueTone,playbackProgress,playbackRecentCues,playbackVisualDurationMs,type DungeonPlaybackSpeed} from '../../core/dungeon-combat-playback';
import {coopColors,coopRadii,coopSpacing,coopTypography} from '../../theme/coop-ui-theme';
import {FantasyPanel,StateChip} from './CoopVisualKit';
import {CombatantProfileCard,EnemyCombatProfileCard} from './CombatantProfileCard';

type Slot=CoopRunView['roleSlots'][number];

function seconds(value:number){return `${Math.max(0,value/1000).toFixed(1)}s`;}
function fxColor(accent:DungeonCombatFxAccent){
 switch(accent){
  case 'gold': return coopColors.gold;
  case 'danger': return coopColors.danger;
  case 'violet': return coopColors.violet;
  case 'success': return coopColors.success;
  case 'cyan': default: return coopColors.cyan;
 }
}

function motionScale(fx:DungeonCombatCueFx|undefined){
 if(!fx)return 1;
 if(fx.actorMotion==='pulse'||fx.actorMotion==='cast')return 1.06;
 if(fx.actorMotion==='brace')return .98;
 if(fx.actorMotion==='smash')return 1.035;
 if(fx.actorMotion==='dash')return 1.025;
 return 1.015;
}
export function DungeonCombatStage({run,enemyLabel,boss=false}:{run:CoopRunView;enemyLabel?:string;boss?:boolean}){
 const tank=run.roleSlots.find(slot=>slot.role==='tank'),damage=run.roleSlots.filter(slot=>slot.role==='damage'),support=run.roleSlots.find(slot=>slot.role==='support');
 const ordered=[tank,damage[0],damage[1],support].filter((slot):slot is Slot=>Boolean(slot)),assists=ordered.filter(slot=>slot.companionId).length;
 const replay=run.lastCombat,cues=replay?.cues??[],replayKey=`${run.runId}:${replay?.nodeId??'preview'}:${replay?.durationMs??0}:${cues.length}`;
 const [cueIndex,setCueIndex]=useState(0),[reduceMotion,setReduceMotion]=useState(false),[playbackSpeed,setPlaybackSpeed]=useState<DungeonPlaybackSpeed>(1);
 const actorAnim=useRef(new Animated.Value(0)).current,targetAnim=useRef(new Animated.Value(0)).current,fxAnim=useRef(new Animated.Value(0)).current,feedbackAnim=useRef(new Animated.Value(0)).current,castAnim=useRef(new Animated.Value(0)).current;
 useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(value);});return()=>{mounted=false;};},[]);
 useEffect(()=>{setCueIndex(reduceMotion&&cues.length?cues.length-1:0);},[replayKey,reduceMotion,cues.length]);
 useEffect(()=>{
  if(!replay||reduceMotion||cueIndex>=cues.length-1)return;
  const current=cues[cueIndex],next=cues[cueIndex+1],timer=setTimeout(()=>setCueIndex(value=>Math.min(value+1,cues.length-1)),playbackAdvanceDelayMs(current,next,playbackSpeed));
  return()=>clearTimeout(timer);
 },[replay,replayKey,reduceMotion,cueIndex,cues,playbackSpeed]);
 const currentCue=cues.length?cues[Math.min(cueIndex,cues.length-1)]:undefined,recent=replay?playbackRecentCues(replay,cueIndex):[];
 const currentBossCast=currentCue?.type==='cast'?currentCue:undefined;
 const bossCastDef=currentBossCast?run.bossMechanic?.telegraph?.castAbilities.find(ability=>ability.id===currentBossCast.abilityId||ability.label===currentBossCast.abilityName):undefined;
 const partyIds=useMemo(()=>new Set(ordered.map(slot=>slot.memberId).filter((id):id is string=>Boolean(id))),[ordered]);
 const actorSlot=ordered.find(slot=>slot.memberId===currentCue?.actorId);
 const actorIsParty=currentCue?.actorId?partyIds.has(currentCue.actorId):undefined,targetIsParty=currentCue?.targetId?partyIds.has(currentCue.targetId):undefined;
 const fx=useMemo(()=>dungeonCombatCueFx(currentCue,actorSlot?.classId),[currentCue?.atMs,currentCue?.type,currentCue?.actionKind,currentCue?.abilityId,actorSlot?.classId]);
 const fxDuration=fx?playbackVisualDurationMs(fx.durationMs,playbackSpeed):0,feedbackDuration=fx?playbackVisualDurationMs(Math.max(260,Math.min(700,fx.durationMs+180)),playbackSpeed,120):0;
 useEffect(()=>{
  actorAnim.stopAnimation();targetAnim.stopAnimation();fxAnim.stopAnimation();feedbackAnim.stopAnimation();
  actorAnim.setValue(0);targetAnim.setValue(0);fxAnim.setValue(reduceMotion&&fx?1:0);feedbackAnim.setValue(reduceMotion&&currentCue?.type==='action'?1:0);
  if(!fx||reduceMotion)return;
  Animated.parallel([
   Animated.timing(actorAnim,{toValue:1,duration:fxDuration,useNativeDriver:true,easing:Easing.out(Easing.cubic)}),
   ...(currentCue?.type==='action'?[Animated.timing(feedbackAnim,{toValue:1,duration:feedbackDuration,useNativeDriver:true,easing:Easing.out(Easing.quad)})]:[]),
   Animated.timing(targetAnim,{toValue:1,duration:Math.max(120,fxDuration),delay:Math.round(fxDuration*.18),useNativeDriver:true,easing:Easing.out(Easing.quad)}),
   Animated.sequence([
    Animated.timing(fxAnim,{toValue:1,duration:Math.max(90,Math.round(fxDuration*.62)),useNativeDriver:true,easing:Easing.out(Easing.cubic)}),
    Animated.timing(fxAnim,{toValue:.01,duration:Math.max(70,Math.round(fxDuration*.38)),useNativeDriver:true,easing:Easing.in(Easing.quad)}),
   ]),
  ]).start();
  return()=>{actorAnim.stopAnimation();targetAnim.stopAnimation();fxAnim.stopAnimation();feedbackAnim.stopAnimation();};
 },[cueIndex,replayKey,reduceMotion,playbackSpeed,fx?.durationMs,fx?.actorMotion,fx?.targetMotion,currentCue?.type]);
 useEffect(()=>{
  castAnim.stopAnimation();castAnim.setValue(0);
  const displayMs=playbackCastDisplayMs(currentBossCast,playbackSpeed);
  if(!currentBossCast||displayMs<=0)return;
  if(reduceMotion){castAnim.setValue(1);return;}
  Animated.timing(castAnim,{toValue:1,duration:displayMs,useNativeDriver:false,easing:Easing.linear}).start();
  return()=>castAnim.stopAnimation();
 },[cueIndex,replayKey,reduceMotion,playbackSpeed,currentBossCast?.durationMs,currentBossCast?.abilityId]);
 const bossPhaseLabel=useMemo(()=>{for(let index=Math.min(cueIndex,cues.length-1);index>=0;index--){const cue=cues[index];if(cue.type==='phase'&&cue.abilityName)return cue.abilityName;}return undefined;},[cues,cueIndex]);
 const replayEnemy=useMemo(()=>{for(const cue of cues){if(cue.actorId&&!partyIds.has(cue.actorId)&&cue.actorName)return cue.actorName;if(cue.targetId&&!partyIds.has(cue.targetId)&&cue.targetName)return cue.targetName;}return undefined;},[cues,partyIds]);
 const shownEnemy=enemyLabel??replayEnemy??(boss?'Final Boss':'Dungeon Enemy'),enemyActive=Boolean(currentCue?.actorId&&!partyIds.has(currentCue.actorId)),enemyTargeted=!enemyActive&&Boolean(currentCue?.targetId&&!partyIds.has(currentCue.targetId));
 const enemyCombatant=boss?playbackBossCombatant(replay,shownEnemy):playbackCombatant(replay,shownEnemy),enemyState=playbackCombatantState(replay,cueIndex,enemyCombatant?.id);
 const enemyStatuses=playbackCombatantStatuses(replay,cueIndex,enemyCombatant?.id);
 const progress=replay?playbackProgress(replay,cueIndex):0,complete=Boolean(replay&&(!cues.length||cueIndex>=cues.length-1));
 const actorDirection=actorIsParty===false?1:-1,targetDirection=targetIsParty===false?-1:1;
 const actorTravel=(fx?.actorMotion==='lunge'||fx?.actorMotion==='dash'||fx?.actorMotion==='smash'||fx?.actorMotion==='projectile')?(fx.actorTravelPx*actorDirection):0;
 const actorStyle=!reduceMotion&&fx?{transform:[
  {translateY:actorAnim.interpolate({inputRange:[0,.44,1],outputRange:[0,actorTravel,0]})},
  {translateX:actorAnim.interpolate({inputRange:[0,.44,1],outputRange:[0,fx.actorMotion==='smash'?3:fx.actorMotion==='cast'?-2:0,0]})},
  {scale:actorAnim.interpolate({inputRange:[0,.44,1],outputRange:[1,motionScale(fx),1]})},
 ]}:undefined;
 const targetStyle=!reduceMotion&&fx?{transform:[
  {translateX:targetAnim.interpolate({inputRange:[0,.28,.45,.62,1],outputRange:[0,0,fx.targetMotion==='shake'?fx.targetShakePx*targetDirection:0,fx.targetMotion==='shake'?-fx.targetShakePx*targetDirection:0,0]})},
  {scale:targetAnim.interpolate({inputRange:[0,.48,1],outputRange:[1,fx.targetMotion==='pulse'?1.055:fx.targetMotion==='brace'?1.035:1,1]})},
 ]}:undefined;
 const effectDirection=actorIsParty===false?1:-1,effectTravel=(fx?.effectTravelPx??0)*effectDirection,effectColor=fx?fxColor(fx.accent):coopColors.cyan;
 const effectStyle=fx?{left:'50%' as const,top:actorIsParty===false?'35%' as const:'57%' as const,opacity:reduceMotion?1:fxAnim,transform:[
  {translateY:reduceMotion?0:fxAnim.interpolate({inputRange:[0,1],outputRange:[0,effectTravel]})},
  {scale:reduceMotion?1:fxAnim.interpolate({inputRange:[0,.5,1],outputRange:[.75,1.16,1]})},
 ]}:undefined;
 const feedbackStyle=currentCue?.type==='action'&&!reduceMotion?{opacity:feedbackAnim.interpolate({inputRange:[0,.12,.72,1],outputRange:[0,1,1,0]}),transform:[{translateY:feedbackAnim.interpolate({inputRange:[0,1],outputRange:[6,-12]})},{scale:feedbackAnim.interpolate({inputRange:[0,.18,1],outputRange:[.9,1.08,1]})}]}:undefined;
 const bossCast=currentBossCast?{label:currentBossCast.abilityName??'Boss ability',durationMs:currentBossCast.durationMs??0,interruptible:bossCastDef?.interruptible??false,targetLabel:currentBossCast.targetName?.trim(),progressStyle:{width:reduceMotion?'100%' as const:castAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}}:undefined;
 return <FantasyPanel variant={boss?'danger':'selected'}>
  <View style={s.header}><View style={s.grow}><Text style={s.kicker}>{replay?'COMBAT PLAYBACK':boss?'FINAL ENCOUNTER':'DUNGEON COMBAT'}</Text><Text style={s.title}>{shownEnemy}</Text></View><StateChip label={assists?`${assists} ASSIST${assists===1?'':'S'}`:'NO ASSISTS'} tone={assists?'success':'neutral'}/></View>
  <View style={s.arena}>
   <View style={[s.enemyField,boss&&s.bossField]}><EnemyCombatProfileCard name={shownEnemy} boss={boss} active={enemyActive} targeted={enemyTargeted} currentCue={currentCue} bossPhaseLabel={boss?bossPhaseLabel:undefined} bossPhases={boss?run.bossMechanic?.telegraph?.phases:undefined} bossCast={boss?bossCast:undefined} currentHp={enemyState?.hp} maximumHp={enemyState?.maxHp} combatShield={enemyState?.shield??0} statuses={enemyStatuses} animateHealth={!reduceMotion} feedbackStyle={feedbackStyle} motionStyle={enemyActive?actorStyle:enemyTargeted?targetStyle:undefined}/></View>
   <View style={s.divider}><Text style={s.vs}>VS</Text></View>
   <View style={s.partyField}>{ordered.map((slot,index)=>{const active=Boolean(currentCue?.actorId&&slot.memberId===currentCue.actorId),isTarget=Boolean(currentCue?.targetId&&slot.memberId===currentCue.targetId),targeted=!active&&isTarget,assistProc=active&&currentCue?.type==='assist',combatant=playbackCombatant(replay,slot.memberId??slot.name),state=playbackCombatantState(replay,cueIndex,combatant?.id),statuses=playbackCombatantStatuses(replay,cueIndex,combatant?.id),displaySlot=state?{...slot,currentHp:state.hp,maximumHp:state.maxHp,ready:state.hp>0}:slot,gemProcActive=Boolean(currentCue?.gemProc&&currentCue.actorId===combatant?.id);return <View key={slot.memberId??`${slot.name}-${index}`} style={s.formationSlot}><CombatantProfileCard slot={displaySlot} active={active} targeted={targeted} assistProc={assistProc} currentCue={currentCue} combatShield={state?.shield??0} statuses={statuses} gemProcActive={gemProcActive} animateHealth={!reduceMotion} feedbackStyle={feedbackStyle} motionStyle={active?actorStyle:isTarget?targetStyle:undefined}/></View>;})}</View>
   {fx?<View pointerEvents="none" style={s.fxLayer}>
    <Animated.View style={[s.fxMark,effectStyle,{borderColor:effectColor,shadowColor:effectColor}]}>
     <Text style={[s.fxGlyph,{color:effectColor}]}>{fx.glyph}</Text>
     <Text numberOfLines={1} style={[s.fxLabel,{color:effectColor}]}>{fx.label}</Text>
    </Animated.View>
    {(currentCue?.type==='cast'||currentCue?.type==='phase')?<Animated.View style={[s.castHalo,{borderColor:effectColor,opacity:reduceMotion ? .75 : fxAnim,transform:[{scale:reduceMotion?1:fxAnim.interpolate({inputRange:[0,1],outputRange:[.82,1.16]})}]}]}/>:null}
   </View>:null}
  </View>
  {replay?<View style={s.replayPanel}>
   <View style={s.replayHead}><View style={s.grow}><Text style={s.replayKicker}>{complete?'ENCOUNTER RECAP':'NOW PLAYING'}</Text><Text accessibilityLiveRegion="polite" style={s.replayCurrent}>{currentCue?playbackCueLabel(currentCue):replay.reason==='victory'?'Encounter cleared':replay.reason==='wipe'?'Party defeated':'Encounter timed out'}</Text></View><StateChip label={currentCue?.type.toUpperCase()??replay.reason.toUpperCase()} tone={currentCue?playbackCueTone(currentCue):replay.reason==='victory'?'success':replay.reason==='wipe'?'danger':'warning'}/></View>
   {!complete&&!reduceMotion&&cues.length>1?<View style={s.playbackControls}><View style={s.speedGroup}>{DUNGEON_PLAYBACK_SPEEDS.map(speed=><Pressable key={speed} accessibilityRole="button" accessibilityLabel={`Combat replay speed ${speed} times`} accessibilityState={{selected:playbackSpeed===speed}} onPress={()=>setPlaybackSpeed(speed)} style={({pressed})=>[s.speedButton,playbackSpeed===speed&&s.speedButtonActive,pressed&&s.controlPressed]}><Text style={[s.speedButtonText,playbackSpeed===speed&&s.speedButtonTextActive]}>{speed}×</Text></Pressable>)}</View><Pressable accessibilityRole="button" accessibilityLabel="Skip combat replay to result" onPress={()=>setCueIndex(Math.max(0,cues.length-1))} style={({pressed})=>[s.skipButton,pressed&&s.controlPressed]}><Text style={s.skipButtonText}>Skip →</Text></Pressable></View>:null}
   <View style={s.replayMeta}><Text style={s.replayTime}>{currentCue?seconds(currentCue.atMs):'0.0s'} / {seconds(replay.durationMs)}</Text><Text style={s.replayTime}>{cueIndex+1}/{Math.max(1,cues.length)} cues</Text></View>
   <View style={s.replayTrack}><View style={[s.replayFill,{width:`${Math.round(progress*100)}%` as `${number}%`}]} /></View>
   {recent.length?<View style={s.log}>{recent.map((cue,index)=><View key={`${cue.atMs}-${cue.type}-${index}`} style={s.logRow}><Text style={s.logTime}>{seconds(cue.atMs)}</Text><Text numberOfLines={2} style={s.logCopy}>{playbackCueLabel(cue)}</Text></View>)}</View>:<Text style={s.note}>The authoritative result has no detailed replay cues for this older encounter.</Text>}
   {complete&&!reduceMotion&&cues.length>1?<Pressable accessibilityRole="button" accessibilityLabel="Replay combat recap" onPress={()=>setCueIndex(0)} style={({pressed})=>[s.replayButton,pressed&&s.replayButtonPressed]}><Text style={s.replayButtonText}>↻ Replay encounter</Text></Pressable>:null}
  </View>:<Text style={s.note}>Combat uses one fixed class avatar per class plus lightweight motion/VFX. Companions stay attached to their owner and only pop in when their real assist procs.</Text>}
 </FantasyPanel>;
}

const s=StyleSheet.create({
 header:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},grow:{flex:1,minWidth:0},
 kicker:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900',letterSpacing:.8},title:{...coopTypography.section,color:coopColors.text},
 arena:{position:'relative',minHeight:356,alignItems:'stretch',gap:coopSpacing.xs,padding:coopSpacing.sm,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.tile,backgroundColor:'#04111E',overflow:'hidden'},
 enemyField:{width:'58%',alignSelf:'center',alignItems:'stretch',justifyContent:'center',zIndex:2},bossField:{width:'66%'},
 partyField:{width:'100%',flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:4,zIndex:2},
 formationSlot:{flex:1,minWidth:0},
 member:{minHeight:126,padding:coopSpacing.xs,borderWidth:1,borderColor:'#274052',borderRadius:coopRadii.tile,backgroundColor:'rgba(7,24,39,.94)',gap:2},
 memberTank:{borderColor:coopColors.gold},memberTargeted:{borderColor:coopColors.danger},memberActive:{borderColor:coopColors.cyan,shadowColor:coopColors.cyan,shadowOpacity:.5,shadowRadius:5,elevation:2},memberDown:{opacity:.48},
 avatarFrame:{height:44,borderRadius:8,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:3,backgroundColor:coopColors.surfaceRaised},
 avatarTank:{borderColor:coopColors.gold},avatarDamage:{borderColor:coopColors.danger},avatarSupport:{borderColor:coopColors.success},avatarActive:{backgroundColor:'#0A3047'},
 avatarInitial:{fontSize:21,lineHeight:23,color:coopColors.text,fontWeight:'900'},avatarWeapon:{fontSize:7,lineHeight:9,color:coopColors.textMuted,textTransform:'uppercase',fontWeight:'800'},
 memberName:{fontSize:11,lineHeight:13,color:coopColors.text,fontWeight:'900'},className:{fontSize:9,lineHeight:11,color:coopColors.cyan,fontWeight:'800'},
 hpTrack:{height:4,borderRadius:99,overflow:'hidden',backgroundColor:'#20313D'},hpFill:{height:'100%',backgroundColor:coopColors.success},hpText:{fontSize:8,lineHeight:10,color:coopColors.textMuted},
 assistRow:{minHeight:30,flexDirection:'row',alignItems:'center',gap:4,paddingTop:2,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#284255'},
 assistRowActive:{marginHorizontal:-3,paddingHorizontal:3,borderRadius:5,borderTopColor:coopColors.violet,backgroundColor:'rgba(117,76,164,.24)'},
 companionArt:{width:26,height:26,borderRadius:6},companionArtActive:{transform:[{scale:1.08}]},companionFallback:{width:26,height:26,borderRadius:6,borderWidth:1,borderColor:coopColors.violet,alignItems:'center',justifyContent:'center'},companionFallbackText:{color:coopColors.violet},companionFallbackActive:{borderColor:coopColors.cyan},
 assistCopy:{flex:1,minWidth:0},assistLabel:{fontSize:7,lineHeight:9,color:coopColors.violet,fontWeight:'900',letterSpacing:.35},assistName:{fontSize:8,lineHeight:10,color:coopColors.textSecondary,fontWeight:'800'},assistNameActive:{color:coopColors.text},
 divider:{height:18,alignItems:'center',justifyContent:'center',zIndex:2},vs:{fontSize:9,lineHeight:11,color:coopColors.gold,fontWeight:'900'},
 enemyMark:{fontSize:34,lineHeight:38,color:coopColors.danger},enemyName:{...coopTypography.meta,color:coopColors.text,fontWeight:'900',textAlign:'center'},enemyHint:{fontSize:8,lineHeight:11,color:coopColors.textMuted,textAlign:'center'},
 fxLayer:{...StyleSheet.absoluteFillObject,zIndex:4},
 fxMark:{position:'absolute',top:'40%',width:94,minHeight:48,marginLeft:-47,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderWidth:1,borderRadius:coopRadii.tile,backgroundColor:'rgba(4,17,30,.88)',shadowOpacity:.65,shadowRadius:8,elevation:5},
 fxGlyph:{fontSize:25,lineHeight:27,fontWeight:'900'},fxLabel:{fontSize:7,lineHeight:9,fontWeight:'900',letterSpacing:.65,textAlign:'center'},
 castHalo:{position:'absolute',right:'5%',top:'25%',width:'27%',aspectRatio:1,borderWidth:2,borderRadius:999,backgroundColor:'transparent'},
 replayPanel:{padding:coopSpacing.sm,borderWidth:1,borderColor:'#284255',borderRadius:coopRadii.tile,backgroundColor:'rgba(4,17,30,.82)',gap:coopSpacing.xs},
 replayHead:{flexDirection:'row',alignItems:'flex-start',gap:coopSpacing.sm},replayKicker:{fontSize:8,lineHeight:10,color:coopColors.cyan,fontWeight:'900',letterSpacing:.65},replayCurrent:{...coopTypography.body,color:coopColors.text,fontWeight:'900'},
 castWarning:{minHeight:34,paddingHorizontal:coopSpacing.sm,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:coopColors.danger,borderRadius:coopRadii.tile,backgroundColor:'rgba(113,28,46,.28)'},castWarningLabel:{...coopTypography.meta,color:coopColors.danger,fontWeight:'900'},castWarningTime:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900'},
 playbackControls:{minHeight:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:coopSpacing.xs},speedGroup:{flexDirection:'row',alignItems:'center',gap:4},speedButton:{minWidth:34,minHeight:28,alignItems:'center',justifyContent:'center',paddingHorizontal:6,borderWidth:1,borderColor:'#284255',borderRadius:coopRadii.button,backgroundColor:coopColors.surfaceRaised},speedButtonActive:{borderColor:coopColors.cyan,backgroundColor:'#0A3047'},speedButtonText:{fontSize:9,lineHeight:11,color:coopColors.textMuted,fontWeight:'900'},speedButtonTextActive:{color:coopColors.cyan},skipButton:{minHeight:28,alignItems:'center',justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.button,backgroundColor:coopColors.surfaceRaised},skipButtonText:{fontSize:8,lineHeight:10,color:coopColors.gold,fontWeight:'900'},controlPressed:{opacity:.62},replayMeta:{flexDirection:'row',justifyContent:'space-between',gap:coopSpacing.sm},replayTime:{fontSize:9,lineHeight:11,color:coopColors.textMuted,fontWeight:'800'},replayTrack:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:'#20313D'},replayFill:{height:'100%',backgroundColor:coopColors.cyan},
 log:{gap:2},logRow:{minHeight:25,flexDirection:'row',alignItems:'center',gap:coopSpacing.xs,paddingVertical:2,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#20313D'},logTime:{width:38,fontSize:8,lineHeight:10,color:coopColors.gold,fontWeight:'900'},logCopy:{flex:1,fontSize:9,lineHeight:12,color:coopColors.textSecondary,fontWeight:'700'},
 replayButton:{minHeight:36,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:coopColors.goldDim,borderRadius:coopRadii.button,backgroundColor:coopColors.surfaceRaised},replayButtonPressed:{opacity:.66},replayButtonText:{...coopTypography.meta,color:coopColors.gold,fontWeight:'900'},
 note:{...coopTypography.meta,color:coopColors.textMuted,fontSize:11,lineHeight:15},
});
