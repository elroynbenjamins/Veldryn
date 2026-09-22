import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {homeSessionSummary,type HomeReadyKind} from '../core/dashboard';
import {GameButton} from './GameButton';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function HomeSessionOverview({state,nowMs,onQuests,onDaily,onEvents,onGoals,onWeekly,onNew}:{state:GameState;nowMs:number;onQuests:()=>void;onDaily:()=>void;onEvents:()=>void;onGoals:()=>void;onWeekly:()=>void;onNew:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),summary=homeSessionSummary(state,nowMs);
 const openReady=(kind:HomeReadyKind)=>{if(kind==='quests')onQuests();else if(kind==='daily')onDaily();else if(kind==='events')onEvents();else onGoals()};
 const parts:string[]=[];
 if(summary.storyRewards)parts.push(summary.storyRewards+' story');
 if(summary.dailyReady)parts.push('daily claim');
 if(summary.eventRewards)parts.push(summary.eventRewards+' event');
 if(summary.goalReady)parts.push(summary.goalReady+' goal');
 return <View style={[s.root,summary.readyTotal>0&&s.readyRoot]}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>SESSION OVERVIEW</Text><Text style={s.title}>{summary.primaryReady?.title??'No immediate claims'}</Text><Text style={s.meta}>{summary.primaryReady?.detail??'Your next progression step is shown above. Use this row to jump into planning and weekly progress.'}</Text></View>{summary.readyTotal>0?<Text style={s.readyBadge}>{summary.readyTotal} READY</Text>:<Text style={s.clearBadge}>CLEAR</Text>}</View>
  <View style={s.cells}>
   <SessionCell label="READY" value={String(summary.readyTotal)} tone={summary.readyTotal?'good':'muted'} onPress={summary.primaryReady?()=>openReady(summary.primaryReady!.kind):undefined}/>
   <SessionCell label="GOALS" value={summary.goalReady+'/'+summary.goalTotal} tone={summary.goalReady?'good':'info'} onPress={onGoals}/>
   <SessionCell label="WEEKLY" value={summary.weeklyComplete+'/'+summary.weeklyTotal} tone={summary.weeklyTotal&&summary.weeklyComplete===summary.weeklyTotal?'good':'accent'} onPress={onWeekly}/>
   <SessionCell label="NEW" value={String(summary.newUnlocks)} tone={summary.newUnlocks?'special':'muted'} onPress={onNew}/>
  </View>
  {parts.length?<Text style={s.breakdown}>Ready now · {parts.join(' · ')}</Text>:null}
  {summary.primaryReady?<GameButton compact title={summary.primaryReady.button} onPress={()=>openReady(summary.primaryReady!.kind)}/>:null}
 </View>;
}

function SessionCell({label,value,tone,onPress}:{label:string;value:string;tone:'good'|'info'|'special'|'accent'|'muted';onPress?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),color=tone==='good'?C.good:tone==='info'?C.info:tone==='special'?C.special:tone==='accent'?C.accent:C.muted;
 const body=<><Text style={s.cellLabel}>{label}</Text><Text style={[s.cellValue,{color}]}>{value}</Text></>;
 return onPress?<Pressable accessibilityRole="button" accessibilityLabel={label+' '+value} onPress={onPress} style={({pressed})=>[s.cell,pressed&&s.pressed]}>{body}</Pressable>:<View style={s.cell}>{body}</View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 readyRoot:{borderLeftWidth:4,borderLeftColor:C.good},
 head:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted,lineHeight:16},
 readyBadge:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.5},clearBadge:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.5},
 cells:{flexDirection:'row',gap:5},cell:{flex:1,minWidth:0,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},cellLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.55},cellValue:{...typography.bodyStrong,fontWeight:'900'},breakdown:{fontSize:9,color:C.muted,fontWeight:'700'},pressed:{opacity:.7}
});}
