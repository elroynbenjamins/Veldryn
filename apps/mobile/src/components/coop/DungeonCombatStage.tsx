import {useCoopStyles} from '../../theme/useCoopStyles';
import {useGameTheme} from '../../theme/ThemeContext';
import {CLASS_ICON_ACCENT} from '../../content/class-icon-colors';
import {battleText} from '../../i18n/battle';
import type {ClassId} from '../../core/types';
import {useSocialText} from '../../i18n/social';
import {useGameLanguage} from '../../i18n/GameLanguageProvider';
import type {Language} from '../../i18n/languages';
import {seasonalBossDisplayName} from '../../i18n/seasonal-boss-copy';
import {dungeonDynamicUiText,localizedDungeonCueType,localizedDungeonPlaybackCue} from '../../i18n/dungeon-dynamic-ui';
import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Pressable,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import type {CoopRunView} from '../../core/coop-presentation';
import {dungeonCombatClassFx,dungeonCombatCueFx,type DungeonCombatCueFx} from '../../core/dungeon-combat-fx';
import {dungeonCombatLayout} from '../../core/dungeon-combat-layout';
import {dungeonEnemyAbilityDisplayName,dungeonEnemyDisplayName} from '../../core/dungeon-enemy-display';
import {playbackAdvanceDelayMs,playbackBossCombatant,playbackCastDisplayMs,playbackCombatant,playbackCombatantState,playbackCombatantStatuses,playbackEnemyCombatants,playbackCueTone,playbackSkillActivation,playbackVisualDurationMs} from '../../core/dungeon-combat-playback';
import {type CoopColors} from '../../theme/coop-ui-theme';
import {StateChip} from './CoopVisualKit';
import {radii,spacing,touchTargetMin,typography} from '../../theme/theme';
import {CombatantProfileCard,EnemyCombatProfileCard} from './CombatantProfileCard';
import {CombatantInspectPanel,type CombatantInspectTarget} from './CombatantInspectPanel';
import {CombatAttackSprite} from '../CombatAttackSprite';
import {CombatImpactBurst,type CombatImpactKind} from '../CombatImpactBurst';
import {CombatOutcomeMoment} from '../CombatOutcomeMoment';

type Slot=CoopRunView['roleSlots'][number];

function seconds(value:number){return `${Math.max(0,value/1000).toFixed(1)}s`;}
function elapsedClock(value:number){const whole=Math.max(0,Math.floor(value/1000));return `${String(Math.floor(whole/60)).padStart(2,"0")}:${String(whole%60).padStart(2,"0")}`;}
/** Only the timer text rerenders once per second: the combat arena and animated
 * sprites remain mounted and do not recompute their layouts on a clock tick. */
function BattleElapsedSeconds({battleKey,serverElapsedMs,active}:{battleKey:string;serverElapsedMs?:number;active:boolean}){
 const [tick,setTick]=useState(Date.now());
 const anchor=useRef({key:battleKey,elapsedMs:serverElapsedMs??0,localAt:Date.now()});
 if(anchor.current.key!==battleKey)anchor.current={key:battleKey,elapsedMs:serverElapsedMs??0,localAt:Date.now()};
 useEffect(()=>{if(serverElapsedMs===undefined)return;const now=Date.now(),previous=anchor.current.elapsedMs+Math.max(0,now-anchor.current.localAt);anchor.current={key:battleKey,elapsedMs:Math.max(previous,serverElapsedMs),localAt:now};setTick(now);},[battleKey,serverElapsedMs]);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(timer);},[battleKey,active]);
 return <Text>{elapsedClock(anchor.current.elapsedMs+Math.max(0,tick-anchor.current.localAt))}</Text>;
}

type Contribution={id:string;damage:number;healing:number;damageTaken:number;interrupts:number};
function compactMetric(value:number){
 const safe=Math.max(0,value);
 if(safe>=1_000_000)return `${(safe/1_000_000).toFixed(safe>=10_000_000?0:1)}m`;
 if(safe>=1000)return `${(safe/1000).toFixed(safe>=10_000?0:1)}k`;
 return `${Math.round(safe)}`;
}
function contributionSummary(language:Language,role:Slot['role'],value:Contribution){
  const dmg=dungeonDynamicUiText(language,'DMG {amount}',{amount:compactMetric(value.damage)});
  const heal=dungeonDynamicUiText(language,'HEAL {amount}',{amount:compactMetric(value.healing)});
  const taken=dungeonDynamicUiText(language,'TAKEN {amount}',{amount:compactMetric(value.damageTaken)});
  const interrupts=dungeonDynamicUiText(language,'INT {count}',{count:value.interrupts});
  if(role==='tank')return `${taken} · ${dmg} · ${interrupts}`;
  if(role==='support')return `${heal} · ${dmg} · ${interrupts}`;
  return `${dmg} · ${interrupts}${value.healing>0?` · ${heal}`:''}`;
}
function roleShort(language:Language,role:Slot['role']){return dungeonDynamicUiText(language,role==='tank'?'TANK':role==='support'?'SUP':'DPS');}
function slotInspectKey(slot:Slot){return `party:${slot.memberId??slot.name}`;}
function enemyInspectKey(id:string){return `enemy:${id}`;}

const dungeonScene=require('../../../assets/combat-scenes/hollow-courtyard-v1.jpg');
const combatSceneArt={
 frostfall:require('../../../assets/card-backgrounds/frostfall_wide_v2.webp'),
 veilbreak:require('../../../assets/card-backgrounds/veilbreak_wide_v2.webp'),
 harvestwake:require('../../../assets/card-backgrounds/harvestwake_wide_v2.webp'),
 starfall:require('../../../assets/card-backgrounds/starfall_wide_v2.webp'),
 bloomwake:require('../../../assets/card-backgrounds/bloomwake_wide_v2.webp'),
 heartbond:require('../../../assets/card-backgrounds/heartbond_wide_v2.webp'),
 suncrest:require('../../../assets/card-backgrounds/aurora_citadel_wide_v2.webp'),
 guild:require('../../../assets/card-backgrounds/guild_plaza_wide_v2.webp'),
} as const;
function combatBackdrop(seasonal:boolean,eventName?:string){
 if(!seasonal)return dungeonScene;
 const name=(eventName??'').toLowerCase();
 if(name.includes('frost'))return combatSceneArt.frostfall;
 if(name.includes('veil'))return combatSceneArt.veilbreak;
 if(name.includes('harvest'))return combatSceneArt.harvestwake;
 if(name.includes('star'))return combatSceneArt.starfall;
 if(name.includes('bloom'))return combatSceneArt.bloomwake;
 if(name.includes('heart'))return combatSceneArt.heartbond;
 if(name.includes('sun'))return combatSceneArt.suncrest;
 if(name.includes('merchant')||name.includes('guild'))return combatSceneArt.guild;
 return dungeonScene;
}

function motionScale(fx:DungeonCombatCueFx|undefined){
 if(!fx)return 1;
 if(fx.actorMotion==='pulse'||fx.actorMotion==='cast')return 1.06;
 if(fx.actorMotion==='brace')return .98;
 if(fx.actorMotion==='smash')return 1.035;
 if(fx.actorMotion==='dash')return 1.025;
 return 1.015;
}
/** Distinctive but non-authoritative opening effects for known room archetypes. */
function openingEnemyFx(archetype:string|undefined){
 if(archetype==='caster'||archetype==='hexer'||archetype==='support')return{motion:'cast' as const,accent:'violet' as const};
 if(archetype==='assassin')return{motion:'dash' as const,accent:'danger' as const};
 if(archetype==='swarm')return{motion:'lunge' as const,accent:'danger' as const};
 if(archetype==='guardian')return{motion:'brace' as const,accent:'gold' as const};
 return{motion:'smash' as const,accent:'danger' as const};
}
export function DungeonCombatStage({run,enemyLabel,boss=false,seasonal=false,eventName,reduceMotionSetting=false,anticipation=false,entryNodeId,previewArchetypes,onPresentationComplete}:{run:CoopRunView;enemyLabel?:string;boss?:boolean;seasonal?:boolean;eventName?:string;reduceMotionSetting?:boolean;anticipation?:boolean;entryNodeId?:string;previewArchetypes?:Array<{id:string;label:string}>;onPresentationComplete?:()=>void}){
 const {styles:s}=useCoopStyles(makeStyles);
 const theme=useGameTheme();
 const backdrop=combatBackdrop(seasonal,eventName);
 const st=useSocialText(),language=useGameLanguage();
 const {width:windowWidth}=useWindowDimensions(),layout=useMemo(()=>dungeonCombatLayout(windowWidth),[windowWidth]);
 const tank=run.roleSlots.find(slot=>slot.role==='tank'),damage=run.roleSlots.filter(slot=>slot.role==='damage'),support=run.roleSlots.find(slot=>slot.role==='support');
 const ordered=[tank,damage[0],damage[1],support].filter((slot):slot is Slot=>Boolean(slot)),assists=ordered.filter(slot=>slot.companionId).length;
 // Visual-only anticipation never plays the previous encounter's replay.
 const pending=run.pendingCombat,replay=anticipation?undefined:pending?{...pending,reason:'victory' as const}:run.lastCombat,cues=replay?.cues??[],replayKey=`${run.runId}:${replay?.nodeId??'preview'}:${replay?.durationMs??0}`;
 const [cueIndex,setCueIndex]=useState(0),[systemReduceMotion,setReduceMotion]=useState(false);
 const [inspectKey,setInspectKey]=useState<string|undefined>(undefined),[showLog,setShowLog]=useState(false);
 const reduceMotion=reduceMotionSetting||systemReduceMotion;
 // Keep the same arena mounted, gently fading confirmed portraits/actions
 // into the temporary animation without a loading overlay.
 const handoffOpacity=useRef(new Animated.Value(1)).current,wasAnticipating=useRef(anticipation);
 useLayoutEffect(()=>{
  const was=wasAnticipating.current;wasAnticipating.current=anticipation;
  handoffOpacity.stopAnimation();
  if(was&&!anticipation&&replay&&!reduceMotion){
   handoffOpacity.setValue(.72);
   Animated.timing(handoffOpacity,{toValue:1,duration:220,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
  }else handoffOpacity.setValue(1);
  return()=>handoffOpacity.stopAnimation();
 },[anticipation,Boolean(replay),reduceMotion,handoffOpacity]);
 const [anticipationTick,setAnticipationTick]=useState(0);
 useEffect(()=>{
  if(!anticipation||reduceMotion)return;
  // Only loop attack windups; health, damage and outcomes come from the server.
  const timer=setInterval(()=>setAnticipationTick(tick=>tick+1),700);
  return()=>clearInterval(timer);
 },[anticipation,reduceMotion,run.runId]);
 const actorAnim=useRef(new Animated.Value(0)).current,targetAnim=useRef(new Animated.Value(0)).current,fxAnim=useRef(new Animated.Value(0)).current,feedbackAnim=useRef(new Animated.Value(0)).current,castAnim=useRef(new Animated.Value(0)).current;
 useEffect(()=>{let mounted=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(value);}).catch(()=>{});return()=>{mounted=false;};},[]);
 useEffect(()=>{setCueIndex(reduceMotion&&cues.length?cues.length-1:0);setShowLog(false);setInspectKey(undefined);},[replayKey,reduceMotion]);
 // Live receives only elapsed server-authorized cues. Play each new
 // animation quickly enough to catch up with the next network poll.
 // Never jump straight to the newest cue or reveal a future action.
 useEffect(()=>{
  if(!replay||reduceMotion||cueIndex>=cues.length-1)return;
  const current=cues[cueIndex],next=cues[cueIndex+1];
  const delay=playbackAdvanceDelayMs(current,next,1);
  const timer=setTimeout(()=>setCueIndex(value=>Math.min(value+1,cues.length-1)),pending?Math.max(180,Math.min(380,Math.round(delay*.55))):delay);
  return()=>clearTimeout(timer);
 },[replay,replayKey,pending,reduceMotion,cueIndex,cues]);
 const currentCue=cues.length?cues[Math.min(cueIndex,cues.length-1)]:undefined;
 const actionImpact:CombatImpactKind|undefined=currentCue?.type==='action'&&currentCue.outcome!=='miss'
  ?currentCue.actionKind==='heal'?'heal':currentCue.actionKind==='shield'?'shield':currentCue.outcome==='critical'?'critical':'damage'
  :currentCue?.type==='interrupt'?'interrupt':currentCue?.type==='down'?'down':undefined;
 const enemyCastImpact:CombatImpactKind|undefined=currentCue?.type==='cast'?'cast':currentCue?.type==='phase'?'phase':undefined;
 const currentBossCast=currentCue?.type==='cast'?currentCue:undefined;
 const bossCastDef=currentBossCast?run.bossMechanic?.telegraph?.castAbilities.find(ability=>ability.id===currentBossCast.abilityId||ability.label===currentBossCast.abilityName):undefined;
 const partyIds=useMemo(()=>new Set(ordered.map(slot=>slot.memberId).filter((id):id is string=>Boolean(id))),[ordered]);
 const actorSlot=ordered.find(slot=>slot.memberId===currentCue?.actorId);
 const actorIsParty=currentCue?.actorId?partyIds.has(currentCue.actorId):undefined,targetIsParty=currentCue?.targetId?partyIds.has(currentCue.targetId):undefined;
 const skillActivation=playbackSkillActivation(currentCue,actorIsParty===true);
 const skillClassAccent=skillActivation?.kind==='class'&&actorSlot?.classId&&Object.prototype.hasOwnProperty.call(CLASS_ICON_ACCENT,actorSlot.classId)
  ?CLASS_ICON_ACCENT[actorSlot.classId as ClassId]:undefined;
 const localizedSkillName=skillActivation?.kind==='class'?battleText(language,skillActivation.name):skillActivation?.name;
 const fx=useMemo(()=>dungeonCombatCueFx(currentCue,actorSlot?.classId),[currentCue?.atMs,currentCue?.type,currentCue?.actionKind,currentCue?.abilityId,actorSlot?.classId]);
 const fxDuration=fx?playbackVisualDurationMs(fx.durationMs,1):0,feedbackDuration=fx?playbackVisualDurationMs(Math.max(260,Math.min(700,fx.durationMs+180)),1,120):0;
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
 },[cueIndex,replayKey,reduceMotion,fx?.durationMs,fx?.actorMotion,fx?.targetMotion,currentCue?.type]);
 useEffect(()=>{
  castAnim.stopAnimation();castAnim.setValue(0);
  const displayMs=playbackCastDisplayMs(currentBossCast,1);
  if(!currentBossCast||displayMs<=0)return;
  if(reduceMotion){castAnim.setValue(1);return;}
  Animated.timing(castAnim,{toValue:1,duration:displayMs,useNativeDriver:false,easing:Easing.linear}).start();
  return()=>castAnim.stopAnimation();
 },[cueIndex,replayKey,reduceMotion,currentBossCast?.durationMs,currentBossCast?.abilityId]);
 const bossPhaseLabel=useMemo(()=>{for(let index=Math.min(cueIndex,cues.length-1);index>=0;index--){const cue=cues[index];if(cue.type==='phase'&&cue.abilityName)return seasonalBossDisplayName(language,cue.abilityName);}return undefined;},[cues,cueIndex,language]);
 const replayEnemy=useMemo(()=>{for(const cue of cues){if(cue.actorId&&!partyIds.has(cue.actorId)&&cue.actorName)return cue.actorName;if(cue.targetId&&!partyIds.has(cue.targetId)&&cue.targetName)return cue.targetName;}return undefined;},[cues,partyIds]);
 const replayEnemies=useMemo(()=>playbackEnemyCombatants(replay),[replay]);
 // Server combatants retain boss positioning even when the route has advanced.
 const bossEncounter=boss||replayEnemies.some(enemy=>enemy.boss);
 const bossEnemy=bossEncounter?playbackBossCombatant(replay,enemyLabel??replayEnemy):undefined;
 // A chosen route already exposes its enemy archetypes. Use those *visual-only*
 // silhouettes during Echo's network round trip; never invent HP or damage.
 const previewEnemies=anticipation&&!bossEncounter?(previewArchetypes??[]).slice(0,2).map((item,index)=>({id:`preview:${item.id}:${index}`,name:item.label,boss:false})):[];
 const visibleEnemies=bossEncounter?(bossEnemy?[bossEnemy]:[]):replayEnemies.length?replayEnemies.slice(0,4):previewEnemies;
 const fallbackEnemyName=enemyLabel??replayEnemy??previewArchetypes?.[0]?.label??(bossEncounter?'Final Boss':'Dungeon Enemy');
 const fallbackEnemyCombatant=!visibleEnemies.length?playbackCombatant(replay,fallbackEnemyName):undefined;
 const fallbackEnemyState=playbackCombatantState(replay,cueIndex,fallbackEnemyCombatant?.id),fallbackEnemyStatuses=playbackCombatantStatuses(replay,cueIndex,fallbackEnemyCombatant?.id);
 const complete=Boolean(replay&&!pending&&(!cues.length||cueIndex>=cues.length-1));
 // Elapsed wall time only, never expose the scheduled server resolution duration.
 const battleClockKey=`${run.runId}:${entryNodeId??run.selectedNodeId??replay?.nodeId??'waiting'}`;
 const completionHandler=useRef(onPresentationComplete);completionHandler.current=onPresentationComplete;
 useEffect(()=>{if(!complete||!completionHandler.current)return;const timer=setTimeout(()=>completionHandler.current?.(),reduceMotion?0:500);return()=>clearTimeout(timer);},[complete,battleClockKey,replayKey,reduceMotion]);
 const recent=cues.slice(Math.max(0,cueIndex-5),cueIndex+1);
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
 const bossCast=currentBossCast?{label:currentBossCast.abilityName?seasonalBossDisplayName(language,dungeonEnemyAbilityDisplayName(currentBossCast.abilityName)):dungeonDynamicUiText(language,'Boss ability'),durationMs:currentBossCast.durationMs??0,interruptible:bossCastDef?.interruptible??false,targetLabel:currentBossCast.targetName?.trim(),progressStyle:{width:reduceMotion?'100%' as const:castAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}}:undefined;
 const toggleInspect=(key:string)=>setInspectKey(current=>current===key?undefined:key);
  const inspectedSlot=inspectKey?.startsWith('party:')?ordered.find(slot=>slotInspectKey(slot)===inspectKey):undefined;
 const inspectedEnemy=inspectKey?.startsWith('enemy:')?visibleEnemies.find(enemy=>enemyInspectKey(enemy.id)===inspectKey):undefined;
 const inspectedCombatant=inspectedSlot?playbackCombatant(replay,inspectedSlot.memberId??inspectedSlot.name):undefined,inspectedState=playbackCombatantState(replay,cueIndex,inspectedCombatant?.id),inspectedStatuses=playbackCombatantStatuses(replay,cueIndex,inspectedCombatant?.id);
 const inspectedEnemyState=playbackCombatantState(replay,cueIndex,inspectedEnemy?.id),inspectedEnemyStatuses=playbackCombatantStatuses(replay,cueIndex,inspectedEnemy?.id);
 const fallbackInspect=inspectKey==='enemy:fallback';
 const inspectTarget:CombatantInspectTarget|undefined=inspectedEnemy?{kind:'enemy',name:dungeonEnemyDisplayName(inspectedEnemy.name),boss:inspectedEnemy.boss,currentHp:inspectedEnemyState?.hp,maximumHp:inspectedEnemyState?.maxHp,shield:inspectedEnemyState?.shield??0,statuses:inspectedEnemyStatuses,phaseLabel:inspectedEnemy.boss?bossPhaseLabel:undefined,cast:inspectedEnemy.boss?bossCast:undefined}:fallbackInspect?{kind:'enemy',name:dungeonEnemyDisplayName(fallbackEnemyName),boss:bossEncounter,currentHp:fallbackEnemyState?.hp,maximumHp:fallbackEnemyState?.maxHp,shield:fallbackEnemyState?.shield??0,statuses:fallbackEnemyStatuses,phaseLabel:bossEncounter?bossPhaseLabel:undefined,cast:bossEncounter?bossCast:undefined}:inspectedSlot?{kind:'party',name:inspectedSlot.name,role:inspectedSlot.role,classId:inspectedSlot.classId,profileIconId:inspectedSlot.profileIconId,iconClassId:inspectedSlot.iconClassId,companionId:inspectedSlot.companionId,currentHp:inspectedState?.hp??inspectedSlot.currentHp,maximumHp:inspectedState?.maxHp??inspectedSlot.maximumHp,shield:inspectedState?.shield??0,statuses:inspectedStatuses}:undefined;
 return <View style={{gap:10}}>
  <View style={s.header}><Text style={s.kicker}>{st("PARTY FORMATION")}</Text><View style={s.headerRight}>{assists?<StateChip label={st("{count} companion assists",{count:assists})} tone="success"/>:null}<Text style={s.headerElapsed}>{st("Elapsed")} · <BattleElapsedSeconds battleKey={battleClockKey} serverElapsedMs={pending?.elapsedMs} active={!complete}/></Text></View></View>
  {anticipation?<Text accessibilityLiveRegion="polite" style={s.previewHint}>{st('Opening exchange')}</Text>:null}
  <View accessibilityLabel={st('Battle arena: enemies at the top, party at the bottom')} style={[s.arena,{padding:layout.arenaPadding,minHeight:layout.mode==='compact'?420:480}]}>
   <Image accessibilityIgnoresInvertColors source={backdrop} resizeMode="cover" fadeDuration={0} style={s.arenaBackdrop}/>
   <View pointerEvents="none" style={s.arenaShade}/>
   <Animated.View style={[s.enemyFormation,{opacity:handoffOpacity}]}>
    <Text style={s.formationHeading}>{bossEncounter?st('FINAL BOSS'):st('ENEMIES')}</Text>
   {visibleEnemies.length?<View style={bossEncounter?[s.enemyField,{width:`${layout.bossWidthPctFinal}%` as `${number}%`}]:[s.enemyGroup,{gap:layout.partyGap}]}>{visibleEnemies.map((enemy,index)=>{const state=playbackCombatantState(replay,cueIndex,enemy.id),statuses=playbackCombatantStatuses(replay,cueIndex,enemy.id),active=currentCue?.actorId===enemy.id,targeted=!active&&currentCue?.targetId===enemy.id,key=enemyInspectKey(enemy.id);return <View key={enemy.id} style={bossEncounter?undefined:s.enemySlot}><EnemyCombatProfileCard name={enemy.name} combatantId={enemy.id} boss={enemy.boss} compact={!bossEncounter&&visibleEnemies.length>1} active={active} targeted={targeted} currentCue={currentCue} bossPhaseLabel={enemy.boss?bossPhaseLabel:undefined} bossPhases={enemy.boss?run.bossMechanic?.telegraph?.phases:undefined} bossCast={enemy.boss?bossCast:undefined} currentHp={state?.hp} maximumHp={state?.maxHp} combatShield={state?.shield??0} statuses={statuses} statusLimit={layout.statusLimit} animateHealth={!reduceMotion} onPress={()=>toggleInspect(key)} selectedForInspect={inspectKey===key} feedbackStyle={feedbackStyle} motionStyle={active?actorStyle:targeted?targetStyle:undefined}/>{anticipation&&!reduceMotion&&anticipationTick%(ordered.length+1)===ordered.length&&index===Math.floor(anticipationTick/(ordered.length+1))%visibleEnemies.length?<CombatAttackSprite eventId={`${run.runId}:preview-enemy:${index}:${anticipationTick}`} motion={openingEnemyFx(previewArchetypes?.[index]?.id).motion} accent={openingEnemyFx(previewArchetypes?.[index]?.id).accent} enemy reduceMotion={reduceMotion}/>:null}{active&&fx&&(currentCue?.type==='action'||currentCue?.type==='cast'||currentCue?.type==='assist')?<CombatAttackSprite eventId={`${replayKey}:${cueIndex}:attack:${enemy.id}`} motion={fx.actorMotion} accent={fx.accent} actionKind={currentCue?.actionKind} enemy reduceMotion={reduceMotion}/>:null}{((currentCue?.targetId===enemy.id&&actionImpact)||(active&&enemyCastImpact))?<CombatImpactBurst eventId={`${replayKey}:${cueIndex}:enemy:${enemy.id}`} kind={(currentCue?.targetId===enemy.id&&actionImpact)||enemyCastImpact!} size={68} reduceMotion={reduceMotion}/>:null}</View>;})}</View>:<View style={[s.enemyField,{width:`${bossEncounter?layout.bossWidthPctFinal:layout.bossWidthPct}%` as `${number}%`}]}><EnemyCombatProfileCard name={fallbackEnemyName} combatantId={fallbackEnemyCombatant?.id} boss={bossEncounter} active={Boolean(currentCue?.actorId&&!partyIds.has(currentCue.actorId))} targeted={Boolean(currentCue?.targetId&&!partyIds.has(currentCue.targetId)&&currentCue.actorId!==currentCue.targetId)} currentCue={currentCue} bossPhaseLabel={bossEncounter?bossPhaseLabel:undefined} bossPhases={bossEncounter?run.bossMechanic?.telegraph?.phases:undefined} bossCast={bossEncounter?bossCast:undefined} currentHp={fallbackEnemyState?.hp} maximumHp={fallbackEnemyState?.maxHp} combatShield={fallbackEnemyState?.shield??0} statuses={fallbackEnemyStatuses} statusLimit={layout.statusLimit} animateHealth={!reduceMotion} onPress={()=>toggleInspect('enemy:fallback')} selectedForInspect={inspectKey==='enemy:fallback'} feedbackStyle={feedbackStyle} motionStyle={currentCue?.actorId&&!partyIds.has(currentCue.actorId)?actorStyle:currentCue?.targetId&&!partyIds.has(currentCue.targetId)?targetStyle:undefined}/>{fx&&currentCue?.actorId&&!partyIds.has(currentCue.actorId)&&(currentCue.type==='action'||currentCue.type==='cast'||currentCue.type==='assist')?<CombatAttackSprite eventId={`${replayKey}:${cueIndex}:attack:fallback`} motion={fx.actorMotion} accent={fx.accent} actionKind={currentCue.actionKind} enemy reduceMotion={reduceMotion}/>:null}{anticipation&&!reduceMotion&&anticipationTick%(ordered.length+1)===ordered.length?<CombatAttackSprite eventId={`${run.runId}:anticipation-enemy:${anticipationTick}`} motion="smash" accent="danger" enemy reduceMotion={reduceMotion}/>:null}{((currentCue?.targetId&&!partyIds.has(currentCue.targetId)&&actionImpact)||(currentCue?.actorId&&!partyIds.has(currentCue.actorId)&&enemyCastImpact))?<CombatImpactBurst eventId={`${replayKey}:${cueIndex}:enemy:fallback`} kind={(currentCue?.targetId&&!partyIds.has(currentCue.targetId)&&actionImpact)||enemyCastImpact!} size={68} reduceMotion={reduceMotion}/>:null}</View>}
   </Animated.View>
   <Animated.View style={[s.partyFormation,{opacity:handoffOpacity}]}>
    <Text style={s.formationHeading}>{st('YOUR PARTY')}</Text>
   <View style={[s.partyField,{gap:layout.partyGap}]}>{ordered.map((slot,index)=>{const active=Boolean(currentCue?.actorId&&slot.memberId===currentCue.actorId),isTarget=Boolean(currentCue?.targetId&&slot.memberId===currentCue.targetId),targeted=!active&&isTarget,assistProc=active&&currentCue?.type==='assist',combatant=playbackCombatant(replay,slot.memberId??slot.name),state=playbackCombatantState(replay,cueIndex,combatant?.id),statuses=playbackCombatantStatuses(replay,cueIndex,combatant?.id),displaySlot=state?{...slot,currentHp:state.hp,maximumHp:state.maxHp,ready:state.hp>0}:slot,gemProcActive=Boolean(currentCue?.gemProc&&currentCue.actorId===combatant?.id);return <View key={slot.memberId??`${slot.name}-${index}`} style={s.formationSlot}><CombatantProfileCard level={run.syncedLevel} slot={displaySlot} active={active||(anticipation&&anticipationTick%(ordered.length+1)===index)} targeted={targeted} assistProc={assistProc} currentCue={currentCue} combatShield={state?.shield??0} statuses={statuses} gemProcActive={gemProcActive} animateHealth={!reduceMotion} layout={layout} onPress={()=>toggleInspect(slotInspectKey(slot))} selectedForInspect={inspectKey===slotInspectKey(slot)} feedbackStyle={feedbackStyle} motionStyle={active?actorStyle:isTarget?targetStyle:undefined}/>{active&&fx&&(currentCue?.type==='action'||currentCue?.type==='cast'||currentCue?.type==='assist')?<CombatAttackSprite eventId={`${replayKey}:${cueIndex}:attack:${slot.memberId??index}`} motion={fx.actorMotion} accent={fx.accent} actionKind={currentCue?.actionKind} reduceMotion={reduceMotion}/>:null}{anticipation&&!reduceMotion&&anticipationTick%(ordered.length+1)===index?<CombatAttackSprite eventId={`${run.runId}:anticipation-party:${index}:${anticipationTick}`} motion={dungeonCombatClassFx(slot.classId)?.damageMotion??'lunge'} accent={dungeonCombatClassFx(slot.classId)?.damageAccent??'gold'} reduceMotion={reduceMotion}/>:null}{isTarget&&actionImpact?<CombatImpactBurst eventId={`${replayKey}:${cueIndex}:party:${slot.memberId??index}`} kind={actionImpact} size={52} reduceMotion={reduceMotion}/>:null}</View>;})}</View>

   </Animated.View>
  </View>
  {inspectTarget?<CombatantInspectPanel target={inspectTarget} onClose={()=>setInspectKey(undefined)}/>:null}
  {replay?<View style={s.replayPanel}>
   {complete?<CombatOutcomeMoment outcome={replay.reason==='victory'?'victory':replay.reason==='wipe'?'defeat':'timeout'} title={replay.reason==='victory'?st('Encounter cleared'):replay.reason==='wipe'?st('Party defeated'):st('Encounter timed out')} detail={dungeonDynamicUiText(language,'{count} combat events',{count:replay.cues.length})} reduceMotion={reduceMotion}/>:null}
   <View style={s.replayHead}><View style={s.grow}><Text style={s.replayKicker}>{complete?st("ENCOUNTER RECAP"):st("LIVE COMBAT")}</Text><Text accessibilityLiveRegion="polite" style={s.replayCurrent}>{currentCue?localizedDungeonPlaybackCue(language,currentCue):pending?st("Battle in progress"):replay.reason==='victory'?st("Encounter cleared"):replay.reason==='wipe'?st("Party defeated"):st("Encounter timed out")}</Text></View><StateChip label={localizedDungeonCueType(language,currentCue?.type??(pending?undefined:replay.reason))} tone={currentCue?playbackCueTone(currentCue):pending?'selected':replay.reason==='victory'?'success':replay.reason==='wipe'?'danger':'warning'}/></View>
   
   {skillActivation?<View accessibilityLiveRegion="polite" style={[s.skillBanner,skillActivation.kind==='companion'&&s.companionSkillBanner,skillClassAccent&&{borderColor:skillClassAccent}]}>
    <Text style={[s.skillBannerLabel,skillActivation.kind==='companion'&&s.companionSkillLabel,skillClassAccent&&theme.dark&&{color:skillClassAccent}]}>{dungeonDynamicUiText(language,skillActivation.kind==='companion'?'COMPANION SKILL':'CLASS ABILITY')}</Text>
    <View style={s.skillBannerRow}><Text numberOfLines={2} style={[s.skillBannerName,skillClassAccent&&theme.dark&&{color:skillClassAccent}]}>{localizedSkillName}</Text>
     {skillActivation.outcome==='miss'?<Text style={s.skillBannerResult}>{dungeonDynamicUiText(language,'MISS')}</Text>:skillActivation.amount!==undefined&&skillActivation.actionKind?<Text style={s.skillBannerResult}>{dungeonDynamicUiText(language,skillActivation.actionKind==='heal'?'HEAL {amount}':skillActivation.actionKind==='shield'?'SHIELD {amount}':'DMG {amount}',{amount:Math.round(skillActivation.amount)})}</Text>:null}
    </View>
   </View>:null}
   {contributionRows.length?<View style={s.contributionPanel}><View style={s.contributionHead}><Text style={s.contributionKicker}>{st("PARTY CONTRIBUTION")}</Text><Text style={s.contributionHint}>{st("Encounter totals")}</Text></View>{contributionRows.map(({slot,value})=><View key={slot.memberId??slot.name} style={s.contributionRow}><View style={[s.contributionIdentity,{width:`${layout.contributionIdentityWidthPct}%` as `${number}%`,minWidth:layout.contributionIdentityMinWidth}]}><Text style={s.contributionRole}>{roleShort(language,slot.role)}</Text><Text numberOfLines={1} style={s.contributionName}>{slot.name}</Text></View><Text style={s.contributionStats}>{contributionSummary(language,slot.role,value)}</Text></View>)}</View>:null}
   {complete&&recent.length?<Pressable accessibilityRole="button" accessibilityLabel={showLog?st("Hide combat battle log"):st("Show combat battle log")} accessibilityState={{expanded:showLog}} onPress={()=>setShowLog(value=>!value)} style={({pressed})=>[s.logToggle,pressed&&s.controlPressed]}><Text style={s.logToggleText}>{showLog?st("Hide battle log"):st("Battle log")}</Text><Text style={s.logToggleMeta}>{showLog?'▲':dungeonDynamicUiText(language,'{count} recent',{count:recent.length})+' ▼'}</Text></Pressable>:null}
   {recent.length&&(!complete||showLog)?<View style={s.log}>{recent.map((cue,index)=><View key={`${cue.atMs}-${cue.type}-${index}`} style={s.logRow}><Text style={s.logTime}>{seconds(cue.atMs)}</Text><Text numberOfLines={2} style={s.logCopy}>{localizedDungeonPlaybackCue(language,cue)}</Text></View>)}</View>:!recent.length?<Text style={s.note}>{pending?st("Battle in progress"):st("No event details were saved for this encounter.")}</Text>:null}
     </View>:anticipation?null:<Text accessibilityLiveRegion="polite" style={s.note}>{st("Your party is resolving this room. Progress is saved online.")}</Text>}
 </View>;
}
const makeStyles=(C:CoopColors)=>StyleSheet.create({
 header:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},headerRight:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.sm},headerElapsed:{...typography.caption,color:C.text,fontWeight:'800'},grow:{flex:1,minWidth:0},
 kicker:{...typography.caption,color:C.textMuted,fontWeight:'800',letterSpacing:.8},previewHint:{...typography.caption,color:C.cyan,fontWeight:'700'},title:{...typography.title,color:C.text,fontWeight:'900'},
 arena:{gap:14,justifyContent:'space-between',overflow:'hidden',position:'relative',borderRadius:16,backgroundColor:C.background},arenaBackdrop:{...StyleSheet.absoluteFill,width:'100%',height:'100%',opacity:.34},arenaShade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(5,9,18,.24)'},enemyFormation:{width:'100%',gap:5},partyFormation:{width:'100%',gap:5,marginTop:'auto'},formationHeading:{...typography.caption,color:C.textMuted,fontWeight:'800',letterSpacing:.8,fontSize:10},enemyField:{alignSelf:'center'},enemyGroup:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center'},enemySlot:{flexGrow:1,flexBasis:'48%',maxWidth:'50%',minWidth:0},
 partyField:{width:'100%',flexDirection:'row',flexWrap:'wrap',alignItems:'stretch',justifyContent:'space-between'},formationSlot:{width:'48%',flexGrow:1,minWidth:0},
 replayPanel:{padding:spacing.md,gap:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.surface},
 replayHead:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},replayKicker:{...typography.caption,color:C.cyan,fontWeight:'800',letterSpacing:.6},replayCurrent:{...typography.caption,color:C.text,fontWeight:'700'},
 skillBanner:{gap:3,paddingHorizontal:spacing.sm,paddingVertical:7,borderWidth:1,borderColor:C.cyan,borderRadius:radii.md,backgroundColor:C.surfaceRaised},
 companionSkillBanner:{borderColor:C.violet},
 skillBannerLabel:{fontSize:9,lineHeight:12,fontWeight:'900',letterSpacing:.7,color:C.cyan},
 companionSkillLabel:{color:C.violet},
 skillBannerRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
 skillBannerName:{flex:1,minWidth:0,fontSize:12,lineHeight:16,fontWeight:'800',color:C.text},
 skillBannerResult:{fontSize:10,lineHeight:14,fontWeight:'800',color:C.textSecondary},
 replayMeta:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:spacing.sm},replayTime:{...typography.caption,color:C.textMuted},replayTrack:{height:5,borderRadius:99,overflow:'hidden',backgroundColor:C.line},replayFill:{height:'100%',backgroundColor:C.cyan},
 contributionPanel:{gap:spacing.xs},contributionHead:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:spacing.xs},contributionKicker:{...typography.caption,color:C.textMuted,fontWeight:'800',letterSpacing:.6},contributionHint:{...typography.caption,color:C.textMuted},
 contributionRow:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm,paddingVertical:spacing.xs,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},contributionIdentity:{gap:2},contributionRole:{...typography.caption,color:C.cyan,fontWeight:'700'},contributionName:{...typography.caption,color:C.text,fontWeight:'700'},contributionStats:{flex:1,...typography.caption,color:C.textSecondary,textAlign:'right'},
 copy:{...typography.caption,color:C.text,fontWeight:'700'},note:{...typography.caption,color:C.textMuted},
 log:{gap:spacing.xs},logRow:{flexDirection:'row',gap:spacing.sm,paddingVertical:spacing.xs},logTime:{minWidth:36,...typography.caption,color:C.textMuted},logCopy:{flex:1,...typography.caption,color:C.textSecondary},
 logToggle:{minHeight:touchTargetMin,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,borderTopWidth:1,borderTopColor:C.line},controlPressed:{opacity:.7},logToggleText:{...typography.caption,color:C.text,fontWeight:'700'},logToggleMeta:{...typography.caption,color:C.textMuted},
 playbackControls:{gap:spacing.sm},playbackControlsWrap:{flexWrap:'wrap'},controlActions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},controlActionsWrap:{justifyContent:'space-between'},pauseButton:{flex:1,minWidth:110,minHeight:touchTargetMin,justifyContent:'center',alignItems:'center',paddingHorizontal:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.surfaceRaised},stepButton:{flex:1,minWidth:72,minHeight:touchTargetMin,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.surfaceRaised},skipButton:{flex:1,minWidth:130,minHeight:touchTargetMin,justifyContent:'center',alignItems:'center',paddingHorizontal:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.surfaceRaised},controlDisabled:{opacity:.4},replayControlText:{...typography.caption,color:C.text,fontWeight:'700',textAlign:'center'},
});
