import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {progressionGoalView} from '../core/progression-goals-v40';
import {progressionGoalContext,progressionGoalDestination,type WorkingTowardDestination} from '../core/working-toward';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

export function WorkingTowardSummary({state,onOpen,onNavigate}:{state:GameState;onOpen:()=>void;onNavigate:(destination:WorkingTowardDestination)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const goals=state.character?.progressionGoals??[];
 if(!goals.length)return <View style={s.empty}><View style={s.flex}><Text style={s.kicker}>WORKING TOWARD</Text><Text style={s.title}>Set a progression goal</Text><Text style={s.copy}>Pin up to three targets so Home can show what to do next.</Text></View><View style={s.open}><GameButton compact title="Set goal" tone="secondary" onPress={onOpen}/></View></View>;
 const context=progressionGoalContext(state),views=goals.map(goal=>({goal,view:progressionGoalView(goal,context),destination:progressionGoalDestination(state,goal)}));
 const ready=views.filter(row=>row.view.status==='complete').length;
 return <View style={s.card}>
  <View style={s.header}><View style={s.flex}><Text style={s.kicker}>WORKING TOWARD</Text><Text style={s.title}>{ready?ready+' goal'+(ready===1?'':'s')+' complete':'Your pinned progression'}</Text></View><Pressable accessibilityRole="button" onPress={onOpen} style={s.manage}><Text style={s.manageText}>MANAGE</Text></Pressable></View>
  {views.map(({goal,view,destination})=><View key={goal.id} style={[s.goal,view.status==='complete'&&s.goalDone,view.status==='blocked'&&s.goalBlocked]}><View style={s.goalTop}><View style={s.flex}><Text numberOfLines={1} style={s.goalName}>{goal.title}</Text><Text style={s.meta}>{Math.floor(view.current).toLocaleString()} / {Math.floor(view.target).toLocaleString()} · {Math.round(view.progress*100)}%</Text></View><Text style={view.status==='complete'?s.done:view.status==='blocked'?s.blocked:s.active}>{view.status==='complete'?'DONE':view.status==='blocked'?'BLOCKED':'ACTIVE'}</Text></View><View style={s.track}><View style={[s.fill,view.status==='complete'&&s.fillDone,{width:(Math.max(2,view.progress*100)+'%') as any}]}/></View>{view.status!=='complete'&&destination.kind!=='info'?<Pressable accessibilityRole="button" onPress={()=>onNavigate(destination)} style={s.continue}><Text numberOfLines={1} style={s.continueText}>{destination.button}</Text><Text style={s.arrow}>→</Text></Pressable>:view.status==='complete'?<Text style={s.reward}>Goal reached · clear or replace it in Working Toward.</Text>:<Text style={s.reward}>{view.blocker??destination.detail}</Text>}</View>)}
 </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 card:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},
 empty:{minHeight:72,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},
 header:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.bodyStrong,color:C.text},copy:{...typography.caption,color:C.muted},open:{width:92},manage:{minHeight:36,justifyContent:'center',paddingHorizontal:8},manageText:{fontSize:10,color:C.info,fontWeight:'900',letterSpacing:.7},
 goal:{gap:4,paddingTop:6,borderTopWidth:1,borderTopColor:C.line},goalDone:{borderLeftWidth:3,borderLeftColor:C.good,paddingLeft:7},goalBlocked:{borderLeftWidth:3,borderLeftColor:C.warning,paddingLeft:7},goalTop:{flexDirection:'row',alignItems:'flex-start',gap:8},goalName:{...typography.bodyStrong,color:C.text},meta:{fontSize:9,color:C.muted,fontWeight:'800'},active:{fontSize:9,color:C.info,fontWeight:'900'},done:{fontSize:9,color:C.good,fontWeight:'900'},blocked:{fontSize:9,color:C.warning,fontWeight:'900'},track:{height:5,borderRadius:3,overflow:'hidden',backgroundColor:C.bg},fill:{height:'100%',backgroundColor:C.accent},fillDone:{backgroundColor:C.good},continue:{minHeight:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingHorizontal:8,borderRadius:radii.sm,backgroundColor:C.infoSurface},continueText:{flex:1,fontSize:10,color:C.info,fontWeight:'900'},arrow:{fontSize:14,color:C.info,fontWeight:'900'},reward:{...typography.caption,color:C.muted},});}
