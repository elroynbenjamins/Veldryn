import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {projectFocusLabel,projectProgressPercent,type GuildHubView} from '../core/guild-projects-v18';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function GuildProjectsPanel({guild,onVote,onStart,onOpenProject,onClaim}:{guild:GuildHubView;onVote?:Function;onStart?:Function;onOpenProject?:Function;onClaim?:Function}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 return <View style={s.panel}>
  <View style={s.sectionHead}><Text style={s.title}>ACTIVE PROJECTS</Text><Text style={s.sectionMeta}>{guild.activeProjects.length}/{guild.projectSlots} slots</Text></View>
  {guild.activeProjects.length===0?<View style={s.empty}><Text style={s.emptyTitle}>No active Guild Project</Text><Text style={s.copy}>Open the weekly board to choose the next shared goal.</Text></View>:null}
  {guild.activeProjects.map(p=><Pressable accessibilityRole="button" disabled={!onOpenProject} key={p.id} onPress={()=>onOpenProject?.(p.id)} style={({pressed})=>[s.project,p.status==='completed'&&s.projectDone,pressed&&s.pressed]}><View style={s.row}><View style={s.flex}><Text style={s.projectTitle}>{p.name}</Text><Text style={s.meta}>{projectFocusLabel(p.focus)} · Slot {p.slotIndex}</Text></View><Text style={s.percent}>{projectProgressPercent(p)}%</Text></View><View style={s.track}><View style={[s.fill,{width:(Math.min(100,projectProgressPercent(p))+'%') as any}]} /></View>{p.status==='completed'&&p.canClaimCompletionReward&&!p.completionRewardClaimed?<GameButton compact title="Claim completion reward" disabled={!onClaim} onPress={()=>onClaim?.(p.id)}/>:null}</Pressable>)}
  <View style={s.sectionHead}><Text style={s.title}>WEEKLY PROJECT BOARD</Text><Text style={s.sectionMeta}>{guild.boardCandidates.length} choices</Text></View>
  <Text style={s.copy}>Members recommend a Project. An authorized Guild role can start one; the server may auto-start the top-voted option if leadership is inactive.</Text>
  {guild.boardCandidates.map(candidate=><View key={candidate.id} style={s.candidate}><View style={s.row}><View style={s.flex}><Text style={s.projectTitle}>{candidate.name}</Text><Text style={s.meta}>{projectFocusLabel(candidate.focus)} · {candidate.rewardTier}</Text></View><View style={s.votePill}><Text style={s.votes}>{candidate.votes} vote{candidate.votes===1?'':'s'}</Text></View></View><Text style={s.copy}>{candidate.description}</Text><View style={s.actions}><View style={s.flex}><GameButton compact title={candidate.myVote?'Recommended':'Recommend'} tone="secondary" selected={candidate.myVote} disabled={!onVote} onPress={()=>onVote?.(candidate.id)}/></View><View style={s.flex}><GameButton compact title="Start" disabled={!onStart} onPress={()=>onStart?.(candidate.id)}/></View></View></View>)}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 panel:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginTop:2},
 title:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.75},sectionMeta:{fontSize:8.5,color:C.muted,fontWeight:'800'},
 copy:{fontSize:9.5,lineHeight:13,color:C.muted},
 project:{padding:8,gap:5,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},projectDone:{borderColor:C.good,backgroundColor:C.goodSurface},candidate:{padding:8,gap:6,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 row:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},projectTitle:{color:C.text,fontWeight:'900',fontSize:10.5},meta:{color:C.muted,fontSize:8.5},percent:{color:C.accent,fontWeight:'900',fontSize:10},
 votePill:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},votes:{color:C.accent,fontWeight:'900',fontSize:8},
 track:{height:7,backgroundColor:C.panel,borderRadius:4,overflow:'hidden'},fill:{height:'100%',backgroundColor:C.accent},actions:{flexDirection:'row',gap:6},pressed:{opacity:.72},
 empty:{minHeight:64,alignItems:'center',justifyContent:'center',gap:2,padding:9,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},emptyTitle:{fontSize:10,color:C.text,fontWeight:'900'},
});}
