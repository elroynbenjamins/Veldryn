import {useCoopStyles} from '../../theme/useCoopStyles';
import {useSocialText} from '../../i18n/social';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {dungeonCombatCueFx,type DungeonCombatCueFx} from '../../core/dungeon-combat-fx';
import {dungeonCombatLayout} from '../../core/dungeon-combat-layout';
import {playbackAdvanceDelayMs,playbackBossCombatant,playbackCastDisplayMs,playbackCombatant,playbackCombatantState,playbackCombatantStatuses,playbackEnemyCombatants,playbackCueLabel,playbackRecentCues,playbackVisualDurationMs} from '../../core/dungeon-combat-playback';
import {type CoopColors} from '../../theme/coop-ui-theme';
import {FantasyPanel,StateChip} from './CoopVisualKit';
import {CombatantProfileCard,EnemyCombatProfileCard} from './CombatantProfileCard';
import {CombatantInspectPanel,type CombatantInspectTarget} from './CombatantInspectPanel';

type Slot=CoopRunView['roleSlots'][number];

function seconds(value:number){return `${Math.max(0,value/1000).toFixed(1)}s`;}
type Contribution={id:string;damage:number;healing:number;damageTaken:number;interrupts:number};
function compactMetric(value:number){
 const safe=Math.max(0,value);
 if(safe>=1_000_000)return `${(safe/1_000_000).toFixed(safe>=10_000_000?0:1)}m`;
 if(safe>=1000)return `${(safe/1000).toFixed(safe>=10_000?0:1)}k`;
 return `${Math.round(safe)}`;
}
function contributionSummary(role:Slot['role'],value:Contribution){
 const dmg=`DMG ${compactMetric(value.damage)}`,heal=`HEAL ${compactMetric(value.healing)}`,taken=`TAKEN ${compactMetric(value.damageTaken)}`,interrupts=`INT ${value.interrupts}`;
 if(role==='tank')return `${taken} · ${dmg} · ${interrupts}`;
 if(role==='support')return `${heal} · ${dmg} · ${interrupts}`;
 return `${dmg} · ${interrupts}${value.healing>0?` · ${heal}`:''}`;
}
function roleShort(role:Slot['role']){return role==='tank'?'TANK':role==='support'?'SUP':'DPS';}
function slotInspectKey(slot:Slot){return `party:${slot.memberId??slot.name}`;}
function enemyInspectKey(id:string){return `enemy:${id}`;}

function motionScale(fx:DungeonCombatCueFx|undefined){
 if(!fx)return 1;
 if(fx.actorMotion==='pulse'||fx.actorMotion==='cast')return 1.06;
 if(fx.actorMotion==='brace')return .98;
 if(fx.actorMotion==='smash')return 1.035;
 if(fx.actorMotion==='dash')return 1.025;
 return 1.015;
}
export function DungeonCombatStage({run,enemyLabel,boss=false}:{run:CoopRunView;enemyLabel?:string;boss?:boolean}){
 const {colors:coopColors,styles:s}=useCoopStyles(makeStyles);
 const st=useSocialText();
 const {width:windowWidth}=useWindowDimensions(),layout=useMemo(()=>dungeonCombatLayout(windowWidth),[windowWidth]);
 const tank=run.roleSlots.find(slot=>slot.role==='tank'),damage=run.roleSlots.filter(slot=>slot.role==='damage'),support=run.roleSlots.find(slot=>slot.role==='support');
 const ordered=[tank,damage[0],damage[1],support].filter((slot):slot is Slot=>Boolean(slot)),assists=ordered.filter(slot=>slot.companionId).length;
 const replay=run.lastCombat,cues=replay?.cues??[],replayKey=`${run.runId}:${replay?.nodeId??'preview'}:${replay?.durationMs??0}:${cues.length}`;
 const [cueIndex,setCueIndex]=useState(0),[reduceMotion,setReduceMotion]=useState(false),[showLog,setShowLog]=useState(false),[inspectKey,setInspectKey]=useState<string>();
 const playbackSpeed=1;
 const actorAnim=useRef(new Animated.Value(0)).current,targetAnim=useRef(new Animated.Value(0)).current,fxAnim=useRef(new Animated.Value(0)).current,feedbackAnim=useRef(new Animated.Value(0)).current,castAnim=useRef(new Animated.Value(0)).current;
 useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(value);});return()=>{mounted=false;};},[]);
 useEffect(()=>{setCueIndex(reduceMotion&&cues.length?cues.length-1:0);setShowLog(false);setInspectKey(undefined);},[replayKey,reduceMotion,cues.length]);
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
 const replayEnemies=useMemo(()=>playbackEnemyCombatants(replay),[replay]),bossEnemy=boss?playbackBossCombatant(replay,enemyLabel??replayEnemy):undefined;
 const visibleEnemies=boss?(bossEnemy?[bossEnemy]:[]):replayEnemies.slice(0,4);
 const fallbackEnemyName=enemyLabel??replayEnemy??(boss?'Final Boss':'Dungeon Enemy');
 const shownEnemy=enemyLabel??(bossEnemy?.name??(visibleEnemies.length>1?`${visibleEnemies.length} Enemy Encounter`:visibleEnemies[0]?.name??fallbackEnemyName));
 const fallbackEnemyCombatant=!visibleEnemies.length?playbackCombatant(replay,fallbackEnemyName):undefined;
 const fallbackEnemyState=playbackCombatantState(replay,cueIndex,fallbackEnemyCombatant?.id),fallbackEnemyStatuses=playbackCombatantStatuses(replay,cueIndex,fallbackEnemyCombatant?.id);
 const complete=Boolean(replay&&(!cues.length||cueIndex>=cues.length-1));
 const contributionRows=complete&&replay?(ordered.map(slot=>{const combatant=playbackCombatant(replay,slot.memberId??slot.name),value=(replay.contributions??[]).find(row=>row.id===combatant?.id);return value?{slot,value}:undefined;}).filter((row):row is {slot:Slot;value:Contribution}=>Boolean(row))):[];
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
 const feedbackStyle=currentCue?.type==='action'&&!reduceMotion?{opacity:feedbackAnim.interpolate({inputRange:[0,.12,.72,1],outputRange:[0,1,1,0]}),transform:[{translateY:feedbackAnim.interpolate({inputRange:[0,1],outputRange:[6,-12]})},{scale:feedbackAnim.interpolate({inputRange:[0,.18,1],outputRange:[.9,1.08,1]})}]}:undefined;
 const bossCast=currentBossCast?{label:currentBossCast.abilityName??'Boss ability',durationMs:currentBossCast.durationMs??0,interruptible:bossCastDef?.interruptible??false,targetLabel:currentBossCast.targetName?.trim(),progressStyle:{width:reduceMotion?'100%' as const:castAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}}:undefined;
 const toggleInspect=(key:string)=>setInspectKey(current=>current===key?undefined:key);
 const inspectedSlot=inspectKey?.startsWith('party:')?ordered.find(slot=>slotInspectKey(slot)===inspectKey):undefined;
 const inspectedEnemy=inspectKey?.startsWith('enemy:')?visibleEnemies.find(enemy=>enemyInspectKey(enemy.id)===inspectKey):undefined;
 const inspectedCombatant=inspectedSlot?playbackCombatant(replay,inspectedSlot.memberId??inspectedSlot.name):undefined,inspectedState=playbackCombatantState(replay,cueIndex,inspectedCombatant?.id),inspectedStatuses=playbackCombatantStatuses(replay,cueIndex,inspectedCombatant?.id);
 const inspectedEnemyState=playbackCombatantState(replay,cueIndex,inspectedEnemy?.id),inspectedEnemyStatuses=playbackCombatantStatuses(replay,cueIndex,inspectedEnemy?.id);
 const fallbackInspect=inspectKey==='enemy:fallback';
 const inspectTarget:CombatantInspectTarget|undefined=inspectedEnemy?{kind:'enemy',name:inspectedEnemy.name,boss:inspectedEnemy.boss,currentHp:inspectedEnemyState?.hp,maximumHp:inspectedEnemyState?.maxHp,shield:inspectedEnemyState?.shield??0,statuses:inspectedEnemyStatuses,phaseLabel:inspectedEnemy.boss?bossPhaseLabel:undefined,cast:inspectedEnemy.boss?bossCast:undefined}:fallbackInspect?{kind:'enemy',name:fallbackEnemyName,boss,currentHp:fallbackEnemyState?.hp,maximumHp:fallbackEnemyState?.maxHp,shield:fallbackEnemyState?.shield??0,statuses:fallbackEnemyStatuses,phaseLabel:boss?bossPhaseLabel:undefined,cast:boss?bossCast:undefined}:inspectedSlot?{kind:'party',name:inspectedSlot.name,role:inspectedSlot.role,classId:inspectedSlot.classId,companionId:inspectedSlot.companionId,currentHp:inspectedState?.hp??inspectedSlot.currentHp,maximumHp:inspectedState?.maxHp??inspectedSlot.maximumHp,shield:inspectedState?.shield??0,statuses:inspectedStatuses}:undefined;
 return <View style={{gap:10}}>
  <View style={s.arena}>
   {visibleEnemies.length?<View style={boss?[s.enemyField,{width:'100%'}]:[s.enemyGroup,{gap:layout.partyGap}]}>{visibleEnemies.map(enemy=>{const state=playbackCombatantState(replay,cueIndex,enemy.id),statuses=playbackCombatantStatuses(replay,cueIndex,enemy.id),active=currentCue?.actorId===enemy.id,targeted=!active&&currentCue?.targetId===enemy.id,key=enemyInspectKey(enemy.id);return <View key={enemy.id} style={boss?undefined:s.enemySlot}><EnemyCombatProfileCard name={enemy.name} combatantId={enemy.id} boss={enemy.boss} compact={!boss&&visibleEnemies.length>1} active={active} targeted={targeted} currentCue={currentCue} bossPhaseLabel={enemy.boss?bossPhaseLabel:undefined} bossPhases={enemy.boss?run.bossMechanic?.telegraph?.phases:undefined} bossCast={enemy.boss?bossCast:undefined} currentHp={state?.hp} maximumHp={state?.maxHp} combatShield={state?.shield??0} statuses={statuses} statusLimit={layout.statusLimit} animateHealth={!reduceMotion} onPress={()=>toggleInspect(key)} selectedForInspect={inspectKey===key} feedbackStyle={feedbackStyle} motionStyle={active?actorStyle:targeted?targetStyle:undefined}/></View>;})}</View>:<View style={[s.enemyField,{width:'100%'}]}><EnemyCombatProfileCard name={fallbackEnemyName} combatantId={fallbackEnemyCombatant?.id} boss={boss} active={Boolean(currentCue?.actorId&&!partyIds.has(currentCue.actorId))} targeted={Boolean(currentCue?.targetId&&!partyIds.has(currentCue.targetId)&&currentCue.actorId!==currentCue.targetId)} currentCue={currentCue} bossPhaseLabel={boss?bossPhaseLabel:undefined} bossPhases={boss?run.bossMechanic?.telegraph?.phases:undefined} bossCast={boss?bossCast:undefined} currentHp={fallbackEnemyState?.hp} maximumHp={fallbackEnemyState?.maxHp} combatShield={fallbackEnemyState?.shield??0} statuses={fallbackEnemyStatuses} statusLimit={layout.statusLimit} animateHealth={!reduceMotion} onPress={()=>toggleInspect('enemy:fallback')} selectedForInspect={inspectKey==='enemy:fallback'} feedbackStyle={feedbackStyle} motionStyle={currentCue?.actorId&&!partyIds.has(currentCue.actorId)?actorStyle:currentCue?.targetId&&!partyIds.has(currentCue.targetId)?targetStyle:undefined}/></View>}
   <View style={[s.partyField,{gap:8}]}>{ordered.map((slot,index)=>{const active=Boolean(currentCue?.actorId&&slot.memberId===currentCue.actorId),isTarget=Boolean(currentCue?.targetId&&slot.memberId===currentCue.targetId),targeted=!active&&isTarget,assistProc=active&&currentCue?.type==='assist',combatant=playbackCombatant(replay,slot.memberId??slot.name),state=playbackCombatantState(replay,cueIndex,combatant?.id),statuses=playbackCombatantStatuses(replay,cueIndex,combatant?.id),displaySlot=state?{...slot,currentHp:state.hp,maximumHp:state.maxHp,ready:state.hp>0}:slot,gemProcActive=Boolean(currentCue?.gemProc&&currentCue.actorId===combatant?.id);return <View key={slot.memberId??`${slot.name}-${index}`} style={s.formationSlot}><CombatantProfileCard level={run.syncedLevel} slot={displaySlot} active={active} targeted={targeted} assistProc={assistProc} currentCue={currentCue} combatShield={state?.shield??0} statuses={statuses} gemProcActive={gemProcActive} animateHealth={!reduceMotion} layout={{...layout,sceneHeight:106,portraitWidth:76,portraitHeight:76}} onPress={()=>toggleInspect(slotInspectKey(slot))} selectedForInspect={inspectKey===slotInspectKey(slot)} feedbackStyle={feedbackStyle} motionStyle={active?actorStyle:isTarget?targetStyle:undefined}/></View>;})}</View>

  </View>
  {inspectTarget?<CombatantInspectPanel target={inspectTarget} onClose={()=>setInspectKey(undefined)}/>:null}
  {replay?<View style={s.replayPanel}>
   <Text accessibilityLiveRegion="polite" style={s.note}>{currentCue?playbackCueLabel(currentCue):replay.reason==='victory'?st('Encounter cleared'):replay.reason==='wipe'?st('Party defeated'):st('Encounter timed out')}</Text>
   {contributionRows.length?<View style={s.log}><Text style={s.kicker}>{st('PARTY CONTRIBUTION')}</Text>{contributionRows.map(({slot,value})=><View key={slot.memberId??slot.name} style={s.contribution}><Text style={s.copy}>{slot.name} · {roleShort(slot.role)}</Text><Text style={s.note}>{contributionSummary(slot.role,value)}</Text></View>)}</View>:null}
   {recent.length?<Pressable accessibilityRole="button" accessibilityLabel={showLog?st('Hide combat battle log'):st('Show combat battle log')} accessibilityState={{expanded:showLog}} onPress={()=>setShowLog(value=>!value)} style={s.logToggle}><Text style={s.copy}>{st('Battle log')}</Text><Text style={s.copy}>{showLog?'⌃':'⌄'}</Text></Pressable>:null}
   {showLog?<View style={s.log}>{recent.map((cue,index)=><View key={index} style={s.logRow}><Text style={s.note}>{seconds(cue.atMs)}</Text><Text style={[s.copy,s.grow]}>{playbackCueLabel(cue)}</Text></View>)}</View>:null}
  </View>:<Text style={s.note}>{st('Your party is resolving this room. Progress is saved online.')}</Text>}
 </View>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 header:{flexDirection:'row',alignItems:'center',gap:8},grow:{flex:1,minWidth:0},
 kicker:{fontSize:10,lineHeight:14,color:C.textMuted,fontWeight:'800',letterSpacing:.8},title:{fontSize:18,lineHeight:24,color:C.text,fontWeight:'900'},
 arena:{gap:10,overflow:'hidden'},enemyField:{alignSelf:'center'},enemyGroup:{flexDirection:'row',flexWrap:'wrap'},enemySlot:{flexGrow:1,flexBasis:'48%',maxWidth:'50%',minWidth:0},
 partyField:{width:'100%',flexDirection:'row',flexWrap:'wrap',alignItems:'stretch',justifyContent:'space-between'},formationSlot:{width:'48%',flexGrow:1,minWidth:0},
 divider:{height:14,alignItems:'center'},vs:{fontSize:10,color:C.textMuted,fontWeight:'800'},
 replayPanel:{padding:12,gap:8,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.surface},
 copy:{fontSize:12,lineHeight:17,color:C.text,fontWeight:'700'},note:{fontSize:11,lineHeight:16,color:C.textMuted},
 contribution:{paddingVertical:6,gap:3,borderBottomWidth:1,borderBottomColor:C.line},log:{gap:6},logRow:{flexDirection:'row',gap:8,paddingVertical:4},
 logToggle:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:C.line},
});
