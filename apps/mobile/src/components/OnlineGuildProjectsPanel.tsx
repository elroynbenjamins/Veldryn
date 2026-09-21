import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {GuildActivityFeedPanel} from './GuildActivityFeedPanel';
import {projectFocusLabel} from '../core/guild-projects-v18';
import {loadOnlineGuildProjectsV18,type OnlineGuildProjectSummary,type OnlineGuildProjectsSnapshot} from '../online/guild-projects-v18';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function progressPercent(project:OnlineGuildProjectSummary){
 if(project.kind==='development'){
  if(!project.resourceGoals.length)return 0;
  const total=project.resourceGoals.reduce((sum,row)=>sum+(row.target>0?Math.min(1,row.current/row.target):1),0);
  return Math.round(total/project.resourceGoals.length*100);
 }
 if(project.targetPoints<=0)return 0;
 return Math.max(0,Math.min(125,Math.round(project.completionPoints/project.targetPoints*100)));
}

export function OnlineGuildProjectsPanel(){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [snapshot,setSnapshot]=useState<OnlineGuildProjectsSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[expanded,setExpanded]=useState<string|null>(null);
 const load=async()=>{setLoading(true);setError('');try{setSnapshot(await loadOnlineGuildProjectsV18())}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load Guild Projects.')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 if(loading&&!snapshot)return <Panel><Text style={s.title}>Guild Projects</Text><ActivityIndicator color={C.accent}/></Panel>;
 if(error&&!snapshot)return <Panel><Text style={s.title}>Guild Projects</Text><Text style={s.error}>{error}</Text><GameButton compact title="Retry" tone="secondary" onPress={()=>void load()}/></Panel>;
 if(!snapshot)return <Panel><Text style={s.title}>Guild Projects</Text><Text style={s.copy}>Join a Guild to view shared Projects and recent Guild activity.</Text></Panel>;

 const active=snapshot.projects.filter(row=>row.status==='active'),completed=snapshot.projects.filter(row=>row.status==='completed').slice(0,4);
 return <View style={s.root}>
  <Panel>
   <View style={s.sectionHead}><View style={s.flex}><Text style={s.kicker}>GUILD PROJECTS</Text><Text style={s.title}>Shared Progress</Text></View><View style={s.livePill}><Text style={s.liveText}>LIVE</Text></View></View>
   <Text style={s.copy}>Verified gameplay updates weekly Projects automatically. This view is read-only; management actions remain server-authoritative.</Text>
   {active.length?active.map(project=><ProjectCard key={project.id} project={project} expanded={expanded===project.id} onToggle={()=>setExpanded(id=>id===project.id?null:project.id)}/>):<View style={s.empty}><Text style={s.emptyTitle}>No active Guild Project</Text><Text style={s.emptyText}>The next authored Project will appear here when the Guild starts one.</Text></View>}
  </Panel>
  {completed.length?<Panel><View style={s.sectionHead}><Text style={s.title}>Recent completions</Text><Text style={s.sectionMeta}>{completed.length} shown</Text></View>{completed.map(project=><ProjectCard key={project.id} project={project} compact expanded={expanded===project.id} onToggle={()=>setExpanded(id=>id===project.id?null:project.id)}/>)}</Panel>:null}
  <Panel>
   <View style={s.sectionHead}><Text style={s.title}>Guild Activity</Text><Text style={s.sectionMeta}>{snapshot.activity.length} recent</Text></View>
   <GuildActivityFeedPanel entries={snapshot.activity}/>
  </Panel>
  <GameButton compact title={loading?'Refreshing…':'Refresh Projects'} tone="secondary" disabled={loading} onPress={()=>void load()}/>
  {!!error&&<Text style={s.error}>{error}</Text>}
 </View>;
}

function ProjectCard({project,expanded,compact=false,onToggle}:{project:OnlineGuildProjectSummary;expanded:boolean;compact?:boolean;onToggle:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),pct=progressPercent(project);
 const thresholdMet=project.personalRewardThreshold>0&&project.personalPoints>=project.personalRewardThreshold;
 return <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={onToggle} style={({pressed})=>[s.project,compact&&s.projectCompact,project.status==='completed'&&s.projectDone,pressed&&s.pressed]}>
  <View style={s.projectHead}><View style={s.flex}><Text numberOfLines={1} style={s.projectTitle}>{project.name}</Text><Text style={s.meta}>{projectFocusLabel(project.focus)} · {project.kind==='weekly_campaign'?'Weekly':project.kind==='development'?'Development':'Event'} · Slot {project.slotIndex}</Text></View><View style={[s.statusPill,project.status==='completed'&&s.statusDone]}><Text style={[s.statusText,project.status==='completed'&&s.statusDoneText]}>{project.status.toUpperCase()}</Text></View></View>
  <View style={s.progressRow}><Text style={s.percent}>{pct}%</Text><View style={s.track}><View style={[s.fill,{width:(Math.min(100,pct)+'%') as any}]}/></View></View>
  {project.kind!=='development'?<Text style={s.meta}>{project.completionPoints.toLocaleString()} / {project.targetPoints.toLocaleString()} effort · {project.meaningfulContributors}/{project.minimumMeaningfulContributors} meaningful contributors</Text>:<Text style={s.meta}>{project.resourceGoals.length} resource goal{project.resourceGoals.length===1?'':'s'}</Text>}
  {!compact?<View style={s.personal}><Text style={s.personalLabel}>YOUR CONTRIBUTION</Text><Text style={[s.personalValue,thresholdMet&&s.personalMet]}>{project.personalPoints.toLocaleString()}{project.personalRewardThreshold>0?' / '+project.personalRewardThreshold.toLocaleString()+' threshold':''}</Text></View>:null}
  {expanded?<View style={s.detail}>
   <Text style={s.description}>{project.description}</Text>
   {project.kind!=='development'?<View style={s.breakdown}><Text style={s.combat}>Combat {project.combatPoints.toLocaleString()}</Text><Text style={s.skilling}>Skilling {project.skillingPoints.toLocaleString()}</Text></View>:project.resourceGoals.map(goal=><View key={goal.resourceKind+':'+goal.resourceId} style={s.goal}><Text style={s.goalName}>{goal.label}</Text><Text style={s.goalValue}>{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</Text></View>)}
   {project.endsAt?<Text style={s.meta}>Ends {new Date(project.endsAt).toLocaleString()}</Text>:null}
  </View>:<Text style={s.expandHint}>View details ›</Text>}
 </Pressable>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},flex:{flex:1,minWidth:0},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},sectionMeta:{fontSize:8.5,color:C.muted,fontWeight:'800'},copy:{fontSize:10,lineHeight:14,color:C.muted},
 livePill:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderColor:C.good,borderRadius:99,backgroundColor:C.goodSurface},liveText:{fontSize:7.5,color:C.good,fontWeight:'900',letterSpacing:.6},
 project:{gap:5,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,marginTop:7},projectCompact:{paddingVertical:7},projectDone:{borderColor:C.good,backgroundColor:C.goodSurface},pressed:{opacity:.72},
 projectHead:{flexDirection:'row',alignItems:'center',gap:8},projectTitle:{fontSize:11,color:C.text,fontWeight:'900'},meta:{fontSize:8.5,lineHeight:12,color:C.muted},statusPill:{paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},statusText:{fontSize:7,color:C.info,fontWeight:'900',letterSpacing:.4},statusDone:{borderColor:C.good,backgroundColor:C.goodSurface},statusDoneText:{color:C.good},
 progressRow:{flexDirection:'row',alignItems:'center',gap:7},percent:{width:34,fontSize:10,color:C.accent,fontWeight:'900'},track:{flex:1,height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.panel},fill:{height:'100%',backgroundColor:C.accent},
 personal:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:2},personalLabel:{fontSize:7.5,color:C.muted,fontWeight:'900',letterSpacing:.5},personalValue:{fontSize:8.5,color:C.info,fontWeight:'900'},personalMet:{color:C.good},
 detail:{gap:5,paddingTop:5,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},description:{fontSize:9.5,lineHeight:13,color:C.text},breakdown:{flexDirection:'row',justifyContent:'space-between',gap:8},combat:{fontSize:8.5,color:C.bad,fontWeight:'900'},skilling:{fontSize:8.5,color:C.good,fontWeight:'900'},goal:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},goalName:{flex:1,fontSize:9,color:C.text,fontWeight:'800'},goalValue:{fontSize:8.5,color:C.muted,fontWeight:'800'},expandHint:{fontSize:8,color:C.info,fontWeight:'800',textAlign:'right'},
 empty:{minHeight:72,alignItems:'center',justifyContent:'center',gap:3,padding:10,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,marginTop:7},emptyTitle:{fontSize:10.5,color:C.text,fontWeight:'900'},emptyText:{fontSize:9,lineHeight:13,color:C.muted,textAlign:'center'},error:{fontSize:9.5,color:C.bad},
});}
