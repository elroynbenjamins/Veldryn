import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState,SkillId} from '../core/types';
import type {WorkingTowardDestination} from '../core/working-toward';
import {skillMilestoneOverview,type SkillMilestone} from '../core/skill-milestones';
import {Panel} from './Panel';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function MilestoneRow({row,tone,onNavigate}:{row:SkillMilestone;tone:'latest'|'next';onNavigate?:(destination:WorkingTowardDestination)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),canOpen=!!row.destination&&!!onNavigate;
 const body=<><View style={s.rowTop}><Text style={[s.category,tone==='latest'?s.categoryLatest:s.categoryNext]}>{row.category}</Text><Text style={s.rowLevel}>LV {row.level}</Text></View><Text numberOfLines={1} style={s.name}>{row.title}</Text><Text numberOfLines={2} style={s.detail}>{row.detail}{canOpen?' · Open ›':''}</Text></>;
 return canOpen?<Pressable accessibilityRole="button" accessibilityLabel={'Open '+row.title} onPress={()=>onNavigate(row.destination!)} style={({pressed})=>[s.row,pressed&&s.pressed]}>{body}</Pressable>:<View style={s.row}>{body}</View>;
}
export function SkillMilestoneStrip({state,skillId,onNavigate}:{state:GameState;skillId:SkillId;onNavigate?:(destination:WorkingTowardDestination)=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),view=skillMilestoneOverview(state,skillId);
 if(!view.latest.length&&!view.next.length)return null;
 const latest=view.latest.slice(0,2),next=view.next.slice(0,2);
 return <Panel>
  <View style={s.header}><View style={s.flex}><Text style={s.kicker}>SKILL MILESTONES</Text><Text style={s.summary}>{view.nextLevel?'Next unlocks at level '+view.nextLevel:'All configured milestones reached'}</Text></View><Text style={s.current}>LV {view.currentLevel}</Text></View>
  {latest.length?<View style={s.section}><Text style={s.sectionLabel}>{view.latestLevel===view.currentLevel?'JUST REACHED':'LATEST'} · LV {view.latestLevel}</Text>{latest.map(row=><MilestoneRow key={row.id} row={row} tone="latest" onNavigate={onNavigate}/>)}{view.latest.length>latest.length?<Text style={s.more}>+{view.latest.length-latest.length} more at this level</Text>:null}</View>:null}
  {next.length?<View style={s.section}><Text style={s.sectionLabel}>NEXT · LV {view.nextLevel}</Text>{next.map(row=><MilestoneRow key={row.id} row={row} tone="next" onNavigate={onNavigate}/>)}{view.next.length>next.length?<Text style={s.more}>+{view.next.length-next.length} more at level {view.nextLevel}</Text>:null}</View>:null}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},summary:{...typography.caption,color:C.muted},current:{...typography.bodyStrong,color:C.accent},section:{gap:5,paddingTop:6,borderTopWidth:1,borderTopColor:C.line},sectionLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.75},
 row:{minHeight:52,gap:2,padding:7,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},rowTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},category:{fontSize:8.5,fontWeight:'900',letterSpacing:.7},categoryLatest:{color:C.good},categoryNext:{color:C.info},rowLevel:{fontSize:8.5,color:C.muted,fontWeight:'900'},name:{...typography.bodyStrong,color:C.text},detail:{...typography.caption,color:C.muted},more:{...typography.caption,color:C.muted,fontStyle:'italic'},pressed:{opacity:.72}
});}