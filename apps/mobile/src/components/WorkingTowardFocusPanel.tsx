import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {WorkingTowardExecutionOverview,WorkingTowardExecutionPlan} from '../core/working-toward-execution';
import type {WorkingTowardDestination} from '../core/working-toward';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {StatusPill} from './StatusPill';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function tone(plan:WorkingTowardExecutionPlan){
 if(plan.view.status==='complete')return 'good' as const;
 if(plan.executionState==='blocked'||plan.executionState==='full')return 'warning' as const;
 if(plan.executionState==='travel')return 'info' as const;
 return 'special' as const;
}
function status(plan:WorkingTowardExecutionPlan){
 if(plan.view.status==='complete')return 'COMPLETE';
 if(plan.executionState==='active')return 'ACTIVE NOW';
 if(plan.executionState==='ready')return 'READY TO QUEUE';
 if(plan.executionState==='queued')return 'QUEUED';
 if(plan.executionState==='travel')return 'TRAVEL';
 if(plan.executionState==='full')return 'QUEUE FULL';
 if(plan.executionState==='blocked')return 'BLOCKED';
 return 'MANUAL';
}

export function WorkingTowardFocusPanel({overview,busy,onNavigate,onQueue,onToggleStop,onClear}:{overview:WorkingTowardExecutionOverview;busy:boolean;onNavigate:(destination:WorkingTowardDestination)=>void;onQueue:(plan:WorkingTowardExecutionPlan)=>void;onToggleStop:(plan:WorkingTowardExecutionPlan)=>void;onClear:(plan:WorkingTowardExecutionPlan)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),plan=overview.focus;
 if(!plan)return null;
 const pct=Math.max(2,Math.round(plan.view.progress*100))+'%' as `${number}%`;
 const blocker=plan.queueBlocker??plan.view.blocker;
 const detail=plan.view.status==='complete'?'This goal is complete. Clear it to free a Working Toward slot.':blocker??plan.destination.detail;
 const canNavigate=plan.view.status!=='complete'&&plan.destination.kind!=='info';
 const showQueue=plan.view.status!=='complete'&&!!plan.queueActivity&&!plan.activeNow;
 const queueEnabled=plan.executionState==='ready'&&!busy;
 return <Panel accentColor={plan.view.status==='complete'?C.good:plan.executionState==='blocked'||plan.executionState==='full'?C.warning:C.info}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>FOCUS GOAL · RECOMMENDED</Text><Text style={s.title}>{plan.goal.title}</Text></View><StatusPill label={status(plan)} tone={tone(plan)}/></View>
  <View style={s.stats}><Stat label="ACTIVE" value={overview.active} /><Stat label="DONE" value={overview.complete}/><Stat label="BLOCKED" value={overview.blocked}/><Stat label="QUEUEABLE" value={overview.queueable}/></View>
  <View style={s.progressHead}><Text style={s.meta}>{Math.floor(plan.view.current).toLocaleString()} / {Math.floor(plan.view.target).toLocaleString()}</Text><Text style={s.percent}>{Math.round(plan.view.progress*100)}%</Text></View>
  <View style={s.track}><View style={[s.fill,plan.view.status==='complete'&&s.fillDone,{width:pct}]}/></View>
  <Text style={blocker?s.warning:s.detail}>{detail}</Text>
  <Text style={s.eta}>{plan.view.etaLabel}{plan.stopRuleActive?' · stop-at-goal armed':''}</Text>
  <View style={s.actions}>
   {plan.view.status==='complete'?<View style={s.primary}><GameButton compact title="Clear completed goal" disabled={busy} onPress={()=>onClear(plan)}/></View>:<>
    {canNavigate?<View style={s.primary}><GameButton compact title={plan.destination.button} disabled={busy} onPress={()=>onNavigate(plan.destination)}/></View>:null}
    {showQueue?<View style={s.secondary}><GameButton compact title={plan.executionState==='queued'?'Queued ✓':plan.executionLabel} selected={plan.executionState==='queued'} disabled={!queueEnabled} tone="secondary" onPress={()=>onQueue(plan)}/></View>:null}
    {plan.stopRule?<View style={s.secondary}><GameButton compact title={plan.stopRuleActive?'Stop rule ✓':'Stop at goal'} selected={plan.stopRuleActive} disabled={busy} tone="secondary" onPress={()=>onToggleStop(plan)}/></View>:null}
   </>}
  </View>
  <Text style={s.safety}>Queueing is same-region only. Stop-at-goal always keeps food/overflow safety and finishes the current cycle.</Text>
 </Panel>;
}
function Stat({label,value}:{label:string;value:number}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.stat}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 head:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},stats:{flexDirection:'row',flexWrap:'wrap',gap:5},stat:{flexGrow:1,flexBasis:64,minWidth:64,alignItems:'center',paddingVertical:6,paddingHorizontal:4,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},statValue:{...typography.bodyStrong,color:C.text,fontWeight:'900'},statLabel:{fontSize:7.5,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.45},progressHead:{flexDirection:'row',justifyContent:'space-between',gap:8},meta:{...typography.caption,color:C.muted},percent:{...typography.caption,color:C.info,fontWeight:'900'},track:{height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},fill:{height:'100%',borderRadius:4,backgroundColor:C.info},fillDone:{backgroundColor:C.good},detail:{...typography.caption,color:C.muted,lineHeight:17},warning:{...typography.caption,color:C.warning,fontWeight:'800',lineHeight:17},eta:{...typography.caption,color:C.info,fontWeight:'800'},actions:{flexDirection:'row',flexWrap:'wrap',gap:6},primary:{flexGrow:2,flexBasis:160},secondary:{flexGrow:1,flexBasis:105},safety:{fontSize:9,lineHeight:13,color:C.muted},
});}
