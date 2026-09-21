import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {projectFocusLabel,projectProgressPercent,type GuildProjectView} from '../core/guild-projects-v18';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildProjectDetailPanel({project,onDonate,onClaim}:{project:GuildProjectView;onDonate?:Function;onClaim?:Function}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]),pct=projectProgressPercent(project);
 const personalMet=project.personalRewardThreshold>0&&project.personalPoints>=project.personalRewardThreshold;
 return <View style={s.panel}>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>GUILD PROJECT · {projectFocusLabel(project.focus).toUpperCase()}</Text><Text style={s.title}>{project.name}</Text></View><View style={[s.status,project.status==='completed'&&s.statusDone]}><Text style={[s.statusText,project.status==='completed'&&s.statusDoneText]}>{project.status.toUpperCase()}</Text></View></View>
  <Text style={s.copy}>{project.description}</Text>
  <View style={s.progressHead}><Text style={s.stat}>{pct}%</Text><Text style={s.meta}>{project.meaningfulContributors}/{project.minimumMeaningfulContributors} meaningful contributors</Text></View>
  {project.kind!=='development'?<><View style={s.track}><View style={[s.fill,{width:(Math.min(100,pct)+'%') as any}]} /></View><View style={s.split}><Text style={s.combat}>Combat {project.combatPoints.toLocaleString()}</Text><Text style={s.skill}>Skilling {project.skillingPoints.toLocaleString()}</Text></View><View style={[s.personal,personalMet&&s.personalMet]}><Text style={s.personalLabel}>YOUR CONTRIBUTION</Text><Text style={[s.personalValue,personalMet&&s.personalValueMet]}>{project.personalPoints.toLocaleString()} · Today {project.dailyPoints.toLocaleString()}/{project.dailyCap.toLocaleString()}</Text></View></>:null}
  {project.resourceGoals.length?<View style={s.resources}><Text style={s.section}>RESOURCE GOALS</Text>{project.resourceGoals.map(goal=><View key={goal.resourceKind+':'+goal.resourceId} style={s.goal}><View style={s.flex}><Text style={s.goalTitle}>{goal.label}</Text><Text style={s.meta}>{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</Text></View><GameButton compact title="Donate" tone="secondary" disabled={!onDonate} onPress={()=>onDonate?.(project.id,goal)}/></View>)}</View>:null}
  <View style={s.sectionHead}><Text style={s.section}>CONTRIBUTORS</Text><Text style={s.sectionMeta}>{project.members.length} tracked</Text></View>
  {project.members.slice(0,12).map(member=><View key={member.accountId} style={s.member}><View style={s.flex}><Text style={s.memberName}>{member.displayName}</Text><Text style={s.meta}>{member.role}{member.rewardEligible?' · reward eligible':''}</Text></View><Text style={s.points}>{member.points.toLocaleString()}</Text></View>)}
  {!project.members.length?<Text style={s.meta}>No contributor rows yet.</Text>:null}
  {project.status==='completed'&&project.canClaimCompletionReward&&!project.completionRewardClaimed?<GameButton title="Claim completion reward" disabled={!onClaim} onPress={()=>onClaim?.(project.id)}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{padding:10,gap:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 head:{flexDirection:'row',alignItems:'flex-start',gap:8},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},copy:{fontSize:10,lineHeight:14,color:C.muted},
 status:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},statusText:{fontSize:7,color:C.info,fontWeight:'900',letterSpacing:.45},statusDone:{borderColor:C.good,backgroundColor:C.goodSurface},statusDoneText:{color:C.good},
 progressHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},stat:{color:C.accent,fontWeight:'900',fontSize:18},meta:{color:C.muted,fontSize:8.5,lineHeight:12},
 track:{height:8,backgroundColor:C.panel2,borderRadius:4,overflow:'hidden'},fill:{height:'100%',backgroundColor:C.accent},split:{flexDirection:'row',justifyContent:'space-between',gap:8},combat:{color:C.bad,fontSize:9,fontWeight:'900'},skill:{color:C.good,fontSize:9,fontWeight:'900'},
 personal:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,padding:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},personalMet:{borderColor:C.good,backgroundColor:C.goodSurface},personalLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.45},personalValue:{fontSize:8.5,color:C.info,fontWeight:'900'},personalValueMet:{color:C.good},
 resources:{gap:5},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.7},sectionMeta:{fontSize:8.5,color:C.muted,fontWeight:'800'},
 goal:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},goalTitle:{color:C.text,fontWeight:'900',fontSize:9.5},
 member:{minHeight:42,flexDirection:'row',alignItems:'center',paddingVertical:5,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},memberName:{color:C.text,fontWeight:'900',fontSize:9.5},points:{color:C.accent,fontWeight:'900',fontSize:9.5},
});}
