import {useGameplayText} from '../i18n/gameplay';
import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {activityQueueCapacity,activityQueueHandoffStatus,activityQueueLabel,activityQueueGoalLabel,normalizeActivityQueue,queuedActivityReadiness} from '../core/activity-queue';
import {GameButton} from './GameButton';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function ActionQueuePanel({state,onRemove,onMove,onClear,onStartNext,onAdd,onResolve}:{state:GameState;onAdd?:()=>void;onResolve?:(destination:'Inventory'|'World'|'Skills')=>void;onRemove:(index:number)=>void;onMove:(index:number,direction:'up'|'down')=>void;onClear:()=>void;onStartNext:()=>void}){
 const {gt,gl,language}=useGameplayText();
 const [managing,setManaging]=useState(false),[confirmClear,setConfirmClear]=useState(false);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackRows=width<480||fontScale>=1.25;
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character?.activityQueue,capacity),paused=state.character?.activityQueuePausedReason,handoff=activityQueueHandoffStatus(state);
 const canResume=!!state.character?.activityQueueCombatRecovery&&state.activity?.kind!=='combat'&&state.activity?.queueGoalCompletedAtMs!==undefined&&queue[0]?.kind==='combat';
 const blocker=!handoff.nextReady?handoff.nextBlocker:undefined;
 const problem=blocker??paused;
 const nextStep=problem&&/travel to|not available in/i.test(problem)?{destination:'World' as const,label:gt('Open World')}:problem&&/heal|injured|food|health|restock/i.test(problem)?{destination:'Inventory' as const,label:gt('Open food & gear')}:problem&&/ingredients|alchemy|materials|gold/i.test(problem)?{destination:'Skills' as const,label:gt('Open Skills')}:undefined;
 const staleGoal=!!problem&&/already holding|already level|level 100|storage target above/i.test(problem);
 if(!queue.length){
  const activity=state.activity;
  if(!activity?.queueManaged)return onAdd?<View style={s.panel}><View style={s.header}><View style={s.flex}><Text style={s.kicker}>{gt('ACTION QUEUE')} · 0/{capacity}</Text><Text style={s.sub}>{gt('Plan your next activity here.')}</Text></View></View><GameButton title={gt('＋ Add activity')} tone="secondary" onPress={onAdd}/></View>:null;
  const complete=activity.queueGoalCompletedAtMs!==undefined;
  return <View style={s.panel}><View style={s.handoff}><Text style={s.handoffTitle}>{complete?(state.character?.activityQueueCombatRecovery?gt("GATHERING CONTINUES"):gt("ALL QUEUE GOALS COMPLETED")):gt("CURRENT ACTIVITY GOAL")}</Text><Text style={s.pauseText}>{complete?gt("Still {activity}",{activity:gl(activity.kind==='combat'?'Hunt':activity.kind)}):activity.queueGoal?gl(activityQueueGoalLabel(activity.queueGoal)):gl(activity.huntGoal?.label)||gt("Open-ended activity")}</Text></View>{onAdd?<GameButton compact title={gt('＋ Add activity')} tone="secondary" onPress={onAdd}/>:null}</View>;
 }
 return <View style={s.panel}>
  <View style={[s.header,stackRows&&s.headerStack]}>
   <View style={s.flex}><Text style={s.kicker}>{gt("ACTION QUEUE")} · {queue.length}/{capacity}</Text><Text style={s.sub}>{managing?gt("Reorder or remove waiting activities."):gt("Waiting activities run in this order.")}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel={managing?gt("Finish managing queue"):gt("Manage queued activities")}
    accessibilityState={{expanded:managing}} onPress={()=>{setManaging(value=>!value);setConfirmClear(false);}}
    style={({pressed})=>[s.manageButton,pressed&&s.arrowPressed]}>
    <Text style={s.manageText}>{managing?gt("Done"):gt("Manage")}</Text>
   </Pressable>
  </View>
  {onAdd?<GameButton compact title={queue.length>=capacity?gt('Queue full'):gt('＋ Add activity')} tone="secondary" disabled={queue.length>=capacity} onPress={onAdd}/>:null}
  {managing&&queue.length>0?<View style={s.clearActions}>
   {confirmClear?<><Text style={[s.pauseText,s.flex]}>{gt("Clear all waiting activities? Current activity will continue.")}</Text><View style={s.clearButtons}><GameButton compact title={gt("Cancel")} tone="secondary" onPress={()=>setConfirmClear(false)}/><GameButton compact title={gt("Confirm clear")} tone="secondary" onPress={()=>{setConfirmClear(false);setManaging(false);onClear();}}/></View></>:
    <View style={s.clearInline}><Text style={[s.sub,s.flex]}>{gt("Changes are saved in your queue.")}</Text><GameButton compact title={gt("Clear queue")} tone="secondary" onPress={()=>setConfirmClear(true)}/></View>}
  </View>:null}
  {paused&&<View style={s.pause}><Text style={s.pauseTitle}>{handoff.nextReady?gt('READY TO RETRY'):state.activity?gt("QUEUED ACTIVITY WAITING"):gt("QUEUE PAUSED")}</Text><Text style={s.pauseText}>{handoff.nextReady?gt('The blocker has cleared. You can start the next queued action.'):gl(paused)}</Text></View>}
  {!paused&&state.activity&&<View style={handoff.armed?(handoff.nextReady?s.handoff:s.blocked):s.waiting}><Text style={handoff.armed?(handoff.nextReady?s.handoffTitle:s.blockedTitle):s.waitingTitle}>{handoff.armed?(handoff.nextReady?gt("HANDOFF ARMED"):gt("HANDOFF WILL PAUSE")):gt("QUEUE WAITING")}</Text><Text style={s.pauseText}>{handoff.armed?(handoff.nextReady?`${gl(handoff.sourceLabel)} → ${gl(handoff.nextLabel)}`:gt("{source} can stop this activity, but {next} cannot start yet.",{source:gl(handoff.sourceLabel),next:gl(handoff.nextLabel)})):gt("Current activity has no handoff goal. Queued activities are waiting.")}</Text>{handoff.armed&&!handoff.nextReady&&handoff.nextBlocker?<Text style={s.blocker}>{gl(handoff.nextBlocker)}</Text>:null}{handoff.armed&&handoff.safetyEnabled?<Text style={s.safety}>{gt("Combat recovery blocks hunting; storage safety stops all activities.")}</Text>:null}</View>}
  {queue.map((entry,index)=>{const readiness=queuedActivityReadiness(state,entry),label=gl(activityQueueLabel(entry));return <View key={`${index}:${entry.kind}:${entry.targetId}`} style={[s.row,managing&&stackRows&&s.rowStack]}>
   <View style={s.rowInfo}><View style={s.index}><Text style={s.indexText}>{index+1}</Text></View>
    <View style={s.flex}><Text style={s.name}>{label}</Text>
     <Text style={readiness.ready?s.readyMeta:s.blockedMeta}>{entry.kind==='combat'?gt("Hunt"):entry.kind==='gathering'?gt("Gathering"):gl(entry.kind)}{index===0?' · '+gt('next'):''} · {readiness.ready?gt("Ready"):gl(readiness.blocker)||gt("Blocked")}</Text>
    </View>
   </View>
   {managing?<View style={[s.controls,stackRows&&s.controlsStack]}>
    <Pressable accessibilityRole="button" accessibilityLabel={gt("Move {label} up",{label})} accessibilityState={{disabled:index===0}} disabled={index===0} onPress={()=>onMove(index,'up')} style={({pressed})=>[s.arrow,index===0&&s.arrowDisabled,pressed&&index>0&&s.arrowPressed]}><Text style={s.arrowText}>↑</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={gt("Move {label} down",{label})} accessibilityState={{disabled:index===queue.length-1}} disabled={index===queue.length-1} onPress={()=>onMove(index,'down')} style={({pressed})=>[s.arrow,index===queue.length-1&&s.arrowDisabled,pressed&&index<queue.length-1&&s.arrowPressed]}><Text style={s.arrowText}>↓</Text></Pressable>
    <View style={[s.remove,stackRows&&s.removeStack]}><GameButton compact title={gt("Remove")} tone="secondary" onPress={()=>onRemove(index)}/></View>
   </View>:null}
  </View>})}
  {!state.activity&&!handoff.nextReady&&handoff.nextBlocker?<View style={s.blocked}><Text style={s.blockedTitle}>{gt("NEXT ACTION BLOCKED")}</Text><Text style={s.blocker}>{gl(handoff.nextBlocker)}</Text></View>:null}
  {staleGoal?<Text style={s.blocker}>{gt('This goal was already reached. Remove it and add the activity again with a higher target or a time goal.')}</Text>:null}
  {onResolve&&nextStep&&!handoff.nextReady?<GameButton compact title={nextStep.label} tone="secondary" onPress={()=>onResolve(nextStep.destination)}/>:null}
  {(!state.activity||canResume)&&<GameButton title={canResume?gt("Resume queued combat"):handoff.nextReady?gt("Start next queued action"):gt("Next action unavailable")} disabled={!handoff.nextReady} onPress={onStartNext}/>}
 </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 panel:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:equipmentColors.selectedLine,borderRadius:radii.md,backgroundColor:C.panel},
 header:{flexDirection:'row',alignItems:'center',gap:spacing.sm},headerStack:{alignItems:'stretch',flexDirection:'column'},flex:{flex:1,minWidth:0},manageButton:{minHeight:44,minWidth:86,justifyContent:'center',alignItems:'center',paddingHorizontal:12,borderRadius:radii.sm,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},manageText:{...typography.caption,color:C.accent,fontWeight:'900'},clearActions:{padding:spacing.sm,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,backgroundColor:C.warningSurface,gap:8},clearInline:{flexDirection:'row',alignItems:'center',gap:8},clearButtons:{flexDirection:'row',justifyContent:'flex-end',flexWrap:'wrap',gap:8},controls:{flexDirection:'row',alignItems:'center',gap:4},controlsStack:{width:'100%'},arrow:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.bg},arrowDisabled:{opacity:.28},arrowPressed:{opacity:.65},arrowText:{color:C.accent,fontSize:18,fontWeight:'900'},remove:{width:72},removeStack:{flex:1,width:'auto'},
 kicker:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.8},sub:{...typography.caption,color:C.muted},
 row:{minHeight:52,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,borderRadius:radii.sm,backgroundColor:C.panel2},rowStack:{alignItems:'stretch',flexDirection:'column'},rowInfo:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:spacing.sm},
 index:{width:28,height:28,alignItems:'center',justifyContent:'center',borderRadius:14,borderWidth:1,borderColor:C.info},indexText:{...typography.caption,color:C.info,fontWeight:'900'},
 name:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted},readyMeta:{...typography.caption,color:C.good},blockedMeta:{...typography.caption,color:C.warning},
 pause:{gap:2,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.warning,backgroundColor:C.warningSurface},pauseTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.7},pauseText:{...typography.caption,color:C.text},handoff:{gap:2,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.good,backgroundColor:C.goodSurface},handoffTitle:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.7},waiting:{gap:2,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel2},waitingTitle:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.7},blocked:{gap:2,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.warning,backgroundColor:C.warningSurface},blockedTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.7},blocker:{...typography.caption,color:C.warning,fontWeight:'800'},safety:{...typography.caption,color:C.muted}
});}
