import {useGameplayText} from '../i18n/gameplay';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import type {GameState,RewardBundle} from '../core/types';
import {typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ActivityArtwork} from './ActivityArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {activeGatheringRuntimeProjection,activityProgressFeedback} from '../core/balance-projection';
import {activeCombatRuntimeProjection,previewActivityReward} from '../core/game';
import {activityStopPresentation} from '../core/activity-stop-presentation';

const labels:Record<string,string>={combat:'HUNTING',mining:'MINING',woodcutting:'WOODCUTTING',fishing:'FISHING',herbalism:'HERBALISM',alchemy:'ALCHEMY',processing:'PROCESSING',faith:'FAITH',training:'TRAINING',hunting:'HUNTING',exploration:'EXPLORATION'};
function elapsed(startedAtMs:number,nowMs:number){const total=Math.max(0,Math.floor((nowMs-startedAtMs)/1000)),hours=Math.floor(total/3600),minutes=Math.floor(total%3600/60),seconds=total%60;return hours?`${hours}h ${minutes}m`:minutes?`${minutes}m ${seconds}s`:`${seconds}s`;}

type ActiveActivityBarProps={state:GameState;nowMs:number;reward?:RewardBundle;onOpen:()=>void;onRecoverCombat?:()=>void};
export function ActiveActivityBar(props:ActiveActivityBarProps){
 const {gt,gl}=useGameplayText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const reward=useMemo(()=>props.reward??(props.state.activity?.kind==='combat'?previewActivityReward(props.state,props.nowMs):undefined),[props.reward,props.state,props.nowMs]);
 if(reward?.stoppedReason){
  const stop=activityStopPresentation(reward.stoppedReason);
  const monster=MONSTERS.find(entry=>entry.id===props.state.activity?.targetId);
  const isCombat=props.state.activity?.kind==='combat';
  return <Pressable accessibilityRole="button" accessibilityLabel={gt(stop.title)+'. '+gl(reward.stoppedReason)+'. '+gt('Open Home to collect rewards.')} onPress={props.onOpen} style={({pressed})=>[s.root,isCombat?s.combat:s.skilling,pressed&&s.pressed]}>
   <View style={[s.art,isCombat&&s.combatArt]}>{isCombat&&monster?<MonsterPortraitFrame monster={monster} size={28} framed={false} reduceMotion/>:<ActivityArtwork id={(props.state.activity?.kind==='processing'?'cooking':props.state.activity?.kind??'combat') as any} size={28}/>}</View>
   <View style={s.copy}><Text style={s.combatName}>{gt(stop.title)}</Text><Text style={s.combatMeta} numberOfLines={1}>{gl(reward.stoppedReason)} · {gt('Collect rewards on Home')}</Text></View>{stop.category==='recovery'&&props.onRecoverCombat?<Pressable accessibilityRole="button" accessibilityLabel={gt('Open food and gear')} onPress={props.onRecoverCombat} style={s.recoverButton}><Text style={s.recover}>{gt('Food')}</Text></Pressable>:null}<Text style={s.chevron}>›</Text>
  </Pressable>;
 }
 return props.state.activity?<RunningActivityBar {...props} combatKills={reward?.kills}/>:null;
}
function RunningActivityBar({state,nowMs,onOpen,combatKills}:ActiveActivityBarProps&{combatKills?:number}){
 const {gt,gl,language}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const activity=state.activity;
 if(!activity)return null;
 const combat=activity.kind==='combat';
 const monster=combat?MONSTERS.find(entry=>entry.id===activity.targetId):undefined;
 const gathering=!combat?[...GATHERING,...HERB_NODES].find(entry=>entry.id===activity.targetId):undefined,crafting=activity.kind==='processing'||activity.kind==='alchemy'?RECIPES.find(entry=>entry.id===activity.targetId):undefined;
 const combatRuntime=combat?activeCombatRuntimeProjection(state):undefined,gatherRuntime=!combat?activeGatheringRuntimeProjection(state):undefined;
 const name=monster?monster.name:crafting?.name??gathering?.name??activity.targetId;
 const cycleSeconds=Math.max(1,combatRuntime?.killCycleSeconds??gatherRuntime?.cycleSeconds??activity.processing?.cycleSeconds??activity.brew?.cycleSeconds??gathering?.seconds??crafting?.seconds??1);
 const cycleElapsedSeconds=Math.max(0,(nowMs-activity.lastClaimAtMs)/1000),cycleProgressSeconds=(activity.progressFraction??0)*cycleSeconds+cycleElapsedSeconds;
 const completedCycles=Math.floor(cycleProgressSeconds/cycleSeconds),progressPct=Math.round((cycleProgressSeconds%cycleSeconds)/cycleSeconds*100),progress=`${progressPct}%` as `${number}%`;
 const progressKind=combat?'combat':activity.kind==='alchemy'||activity.kind==='processing'?'crafting':activity.kind==='faith'?'faith':activity.kind==='training'?'training':activity.kind==='exploration'?'exploration':'gathering',phase=activityProgressFeedback(progressKind,progressPct/100),cycleRemaining=Math.max(1,Math.ceil(cycleSeconds-(cycleProgressSeconds%cycleSeconds)));
 const sessionKills=combat?(activity.sessionKills??0)+(combatKills??completedCycles):0;
 const cycleCopy=combat?gt('Next kill {seconds}s',{seconds:cycleRemaining}):`${gl(phase).replace('…','').toLocaleUpperCase(language)} · ${cycleRemaining}s`;
 if(combat)return <Pressable accessibilityRole="button" accessibilityLabel={gt('{kind} {name}, active for {duration}',{kind:gl(labels[activity.kind]),name,duration:elapsed(activity.startedAtMs,nowMs)})} accessibilityHint={gt("Opens the active activity")} onPress={onOpen} style={({pressed})=>[s.root,s.combat,pressed&&s.pressed]}>
  <View style={[s.art,s.combatArt]}>{monster?<MonsterPortraitFrame monster={monster} size={28} framed={false} reduceMotion={state.settings.reduceMotion}/>:<ActivityArtwork id="combat" size={28}/>}</View>
  <View style={s.copy}><Text numberOfLines={1} style={s.combatName}>{name}</Text><Text numberOfLines={1} style={s.combatMeta}>{cycleCopy} · {gt('{count} kills',{count:sessionKills})}</Text></View>
  <Text style={s.time}>{elapsed(activity.startedAtMs,nowMs)}</Text><Text style={s.chevron}>›</Text>
  <View pointerEvents="none" style={s.combatTrack}><View style={[s.fill,s.combatFill,{width:progress}]}/></View>
 </Pressable>;
 return <Pressable accessibilityRole="button" accessibilityLabel={gt('{kind} {name}, active for {duration}',{kind:gl(labels[activity.kind]),name,duration:elapsed(activity.startedAtMs,nowMs)})} accessibilityHint={gt("Opens the active activity")} onPress={onOpen} style={({pressed})=>[s.root,combat?s.combat:s.skilling,pressed&&s.pressed]}>
  <View style={s.art}>{monster?<MonsterPortraitFrame monster={monster} size={32} active reduceMotion={state.settings.reduceMotion} framed={false}/>:<ActivityArtwork id={(crafting?.skillId??activity.kind) as any} size={30}/>}</View>
  <View style={s.copy}><View style={s.line}><Text numberOfLines={1} style={s.name}>{name}</Text><Text style={s.time}>{elapsed(activity.startedAtMs,nowMs)}</Text></View><View style={s.meta}><Text style={[s.kind,s.skillText]}>{gl(labels[activity.kind])}</Text><Text numberOfLines={1} style={s.cycle}>{cycleCopy}</Text></View><View style={s.track}><View style={[s.fill,s.skillFill,{width:progress}]}/></View></View>
  <Text style={s.chevron}>›</Text>
 </Pressable>;
}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 recoverButton:{minHeight:38,minWidth:48,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.warning,borderRadius:8,backgroundColor:C.warningSurface},
 root:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:5,backgroundColor:C.panel,borderBottomWidth:1},
 combat:{minHeight:44,borderBottomColor:C.bad,position:'relative',paddingBottom:6},skilling:{borderBottomColor:C.info},pressed:{opacity:.78},
 art:{width:36,height:36,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.stage},combatArt:{width:28,height:28,borderRadius:7},
 copy:{flex:1,minWidth:0,gap:2},line:{flexDirection:'row',alignItems:'baseline',gap:8},name:{...typography.bodyStrong,color:C.text,flex:1},
 combatName:{fontSize:12,lineHeight:16,fontWeight:'800',color:C.text},combatMeta:{fontSize:11,lineHeight:14,color:C.muted},recover:{fontSize:12,fontWeight:'800',color:C.bad},
 time:{...typography.caption,color:C.muted,fontVariant:['tabular-nums']},meta:{flexDirection:'row',alignItems:'center',gap:8},kind:{fontSize:10,lineHeight:13,fontWeight:'900',letterSpacing:.8},skillText:{color:C.info},cycle:{fontSize:9,lineHeight:12,color:C.muted,fontWeight:'800'},
 track:{height:4,overflow:'hidden',borderRadius:2,backgroundColor:C.panel2,position:'relative'},combatTrack:{position:'absolute',left:0,right:0,bottom:0,height:2,backgroundColor:C.panel2,overflow:'hidden'},fill:{height:'100%',borderRadius:3},combatFill:{backgroundColor:C.bad},skillFill:{backgroundColor:C.info},chevron:{color:equipmentColors.goldSoft,fontSize:24,lineHeight:28}
 });}
