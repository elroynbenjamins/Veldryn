import React,{useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GuildHubView} from '../core/guild-projects-v18';
import {GuildProjectsPanel} from './GuildProjectsPanel';
import {GuildMemberRosterPanel} from './GuildMemberRosterPanel';
import {GuildActivityFeedPanel} from './GuildActivityFeedPanel';
import {GuildDecreePanel} from './GuildDecreePanel';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

type Tab='overview'|'projects'|'members'|'activity'|'decrees';

export function GuildHubPanel({guild,callbacks={}}:{guild:GuildHubView;callbacks?:Record<string,(...args:any[])=>void>}){
 const C=useGameTheme(),s=React.useMemo(()=>makeStyles(C),[C]);
 const [tab,setTab]=useState<Tab>('overview');
 return <View style={s.wrap}>
  <View style={s.header}><View style={s.flex}><Text style={s.eyebrow}>GUILD · LEVEL {guild.level}</Text><Text style={s.title}>{guild.name}</Text><Text style={s.meta}>{guild.memberCount}/{guild.memberCap} members · {guild.projectSlots} Project slot{guild.projectSlots===1?'':'s'}</Text></View><View style={s.level}><Text style={s.levelText}>{guild.level}</Text></View></View>
  <View style={s.bulletin}><Text style={s.bulletinLabel}>GUILD BULLETIN</Text><Text style={s.bulletinBody}>{guild.bulletin||'No bulletin posted.'}</Text></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{(['overview','projects','members','activity','decrees'] as Tab[]).map(value=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===value}} key={value} onPress={()=>setTab(value)} style={({pressed})=>[s.tab,tab===value&&s.active,pressed&&s.pressed]}><Text style={[s.tabText,tab===value&&s.tabTextActive]}>{value}</Text></Pressable>)}</ScrollView>
  {tab==='overview'?<View style={s.panel}><View style={s.sectionHead}><Text style={s.section}>CURRENT PRIORITIES</Text><Text style={s.sectionMeta}>{guild.activeProjects.length} active</Text></View>{guild.activeProjects.length===0?<Text style={s.copy}>No active Guild Projects. Open Projects to review the next shared goal.</Text>:guild.activeProjects.slice(0,3).map(project=><Pressable accessibilityRole="button" disabled={!callbacks.onOpenProject} key={project.id} onPress={()=>{setTab('projects');callbacks.onOpenProject?.(project.id)}} style={({pressed})=>[s.card,pressed&&s.pressed]}><Text style={s.cardTitle}>{project.name}</Text><Text style={s.copy}>{project.kind==='development'?'Development Project':project.completionPoints.toLocaleString()+' / '+project.targetPoints.toLocaleString()+' effort points'}</Text></Pressable>)}<View style={s.sectionHead}><Text style={s.section}>YOUR ROLE</Text><View style={s.rolePill}><Text style={s.role}>{guild.myRole.replace(/_/g,' ')}</Text></View></View></View>:null}
  {tab==='projects'?<GuildProjectsPanel guild={guild} onVote={callbacks.onVoteProject} onStart={callbacks.onStartProject} onOpenProject={callbacks.onOpenProject} onClaim={callbacks.onClaimProject}/>:null}
  {tab==='members'?<GuildMemberRosterPanel members={guild.members} onOpenMember={callbacks.onOpenMember} onManageRole={callbacks.onManageRole}/>:null}
  {tab==='activity'?<GuildActivityFeedPanel entries={guild.activity}/>:null}
  {tab==='decrees'?<GuildDecreePanel decrees={guild.decrees} onVote={callbacks.onVoteDecree}/>:null}
 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 wrap:{gap:8},header:{minHeight:68,flexDirection:'row',alignItems:'center',gap:9,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},flex:{flex:1,minWidth:0},
 eyebrow:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},meta:{fontSize:9.5,color:C.muted,marginTop:2},
 level:{width:44,height:44,borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.warningSurface,alignItems:'center',justifyContent:'center'},levelText:{color:C.accent,fontSize:17,fontWeight:'900'},
 bulletin:{padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},bulletinLabel:{fontSize:8,color:C.info,fontWeight:'900',letterSpacing:.65},bulletinBody:{color:C.text,fontSize:10.5,lineHeight:14,marginTop:2},
 tabs:{gap:5},tab:{minHeight:36,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},active:{backgroundColor:C.selection,borderColor:C.selectionLine},tabText:{color:C.muted,fontSize:9.5,fontWeight:'800',textTransform:'capitalize'},tabTextActive:{color:C.text},pressed:{opacity:.72},
 panel:{padding:9,gap:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},section:{fontSize:8.5,color:C.accent,fontWeight:'900',letterSpacing:.7},sectionMeta:{fontSize:8.5,color:C.muted,fontWeight:'800'},copy:{color:C.muted,fontSize:9.5,lineHeight:13},
 card:{padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},cardTitle:{color:C.text,fontWeight:'900',fontSize:10.5},
 rolePill:{paddingHorizontal:7,paddingVertical:3,borderWidth:1,borderColor:C.lineStrong,borderRadius:99,backgroundColor:C.warningSurface},role:{color:C.accent,fontSize:8.5,fontWeight:'900',textTransform:'capitalize'},
});}
