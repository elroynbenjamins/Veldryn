import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {homeSessionSummary,type HomeReadyKind} from '../core/dashboard';
import {GameButton} from './GameButton';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function HomeSessionOverview({state,nowMs,onQuests,onDaily,onEvents,onGoals,onWeekly,onNew}:{state:GameState;nowMs:number;onQuests:()=>void;onDaily:()=>void;onEvents:()=>void;onGoals:()=>void;onWeekly:()=>void;onNew:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),summary=homeSessionSummary(state,nowMs),{width,fontScale}=useWindowDimensions(),stackCells=width<350||fontScale>=1.25;
 const openReady=(kind:HomeReadyKind)=>{if(kind==='quests')onQuests();else if(kind==='daily')onDaily();else if(kind==='events')onEvents();else onGoals()};
 const parts:string[]=[];
 if(summary.storyRewards)parts.push(summary.storyRewards+' story');
 if(summary.dailyReady)parts.push('daily claim');
 if(summary.eventRewards)parts.push(summary.eventRewards+' event');
 if(summary.goalReady)parts.push(summary.goalReady+' goal');
 return <View style={[s.root,summary.readyTotal>0&&s.readyRoot]}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>SESSION OVERVIEW</Text><Text style={s.title}>{summary.primaryReady?.title??'No immediate claims'}</Text><Text style={s.meta}>{summary.primaryReady?.detail??'Your next progression step is shown above. Use this row to jump into planning and weekly progress.'}</Text></View>{summary.readyTotal>0?<Text style={s.readyBadge}>{summary.readyTotal} READY</Text>:<Text style={s.clearBadge}>CLEAR</Text>}</View>
  <View style={s.cells}>
   <SessionCell label="READY" value={String(summary.readyTotal)} tone={summary.readyTotal?'good':'muted'} emphasized={summary.readyTotal>0} stack={stackCells} onPress={summary.primaryReady?()=>openReady(summary.primaryReady!.kind):undefined}/>
   <SessionCell label="GOALS" value={summary.goalReady+'/'+summary.goalTotal} tone={summary.goalReady?'good':'info'} emphasized={summary.goalReady>0} stack={stackCells} onPress={onGoals}/>
   <SessionCell label="WEEKLY" value={summary.weeklyComplete+'/'+summary.weeklyTotal} tone={summary.weeklyTotal&&summary.weeklyComplete===summary.weeklyTotal?'good':'accent'} emphasized={summary.weeklyTotal>0} stack={stackCells} onPress={onWeekly}/>
   <SessionCell label="NEW" value={String(summary.newUnlocks)} tone={summary.newUnlocks?'special':'muted'} emphasized={summary.newUnlocks>0} stack={stackCells} onPress={onNew}/>
  </View>
  {parts.length?<Text style={s.breakdown}>Ready now · {parts.join(' · ')}</Text>:null}
  {summary.primaryReady?<GameButton compact title={summary.primaryReady.button} onPress={()=>openReady(summary.primaryReady!.kind)}/>:null}
 </View>;
}

function SessionCell({label,value,tone,emphasized=false,stack=false,onPress}:{label:string;value:string;tone:'good'|'info'|'special'|'accent'|'muted';emphasized?:boolean;stack?:boolean;onPress?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),color=tone==='good'?C.good:tone==='info'?C.info:tone==='special'?C.special:tone==='accent'?C.accent:C.muted,surface=tone==='good'?C.goodSurface:tone==='info'?C.infoSurface:tone==='special'?C.specialSurface:tone==='accent'?C.accentSurface:C.panel2;
 const style=[s.cell,stack&&s.cellStack,emphasized&&{borderColor:color,backgroundColor:surface}];
 const body=<><Text style={s.cellLabel}>{label}</Text><Text style={[s.cellValue,{color}]}>{value}</Text>{onPress?<Text style={[s.cellArrow,{color}]}>›</Text>:null}</>;
 return onPress?<Pressable accessibilityRole="button" accessibilityLabel={label+' '+value} onPress={onPress} style={({pressed})=>[style,pressed&&s.pressed]}>{body}</Pressable>:<View style={style}>{body}</View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 readyRoot:{borderLeftWidth:4,borderLeftColor:C.good},
 head:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted,lineHeight:16},
 readyBadge:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.5},clearBadge:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.5},
 cells:{flexDirection:'row',flexWrap:'wrap',gap:5},cell:{position:'relative',flex:1,minWidth:0,minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},cellStack:{flex:0,flexBasis:'48%'},cellLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.55},cellValue:{...typography.bodyStrong,fontWeight:'900'},cellArrow:{position:'absolute',right:7,top:15,fontSize:14,fontWeight:'900'},breakdown:{fontSize:9,color:C.muted,fontWeight:'700'},pressed:{opacity:.7,transform:[{translateY:1}]}
});}
