import {useSocialText} from '../i18n/social';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {QuestBoard} from './QuestBoard';
import {QuestPosting} from './QuestPosting';
import {GuildActivityFeedPanel} from './GuildActivityFeedPanel';
import {LoadingState} from './LoadingState';
import {StatusPill} from './StatusPill';
import {projectFocusLabel} from '../core/guild-projects-v18';
import {claimOnlineGuildProjectReward,loadOnlineGuildProjectsV18,startOnlineGuildProjectCandidate,voteOnlineGuildProjectCandidate,type OnlineGuildProjectCandidate,type OnlineGuildProjectSummary,type OnlineGuildProjectsSnapshot} from '../online/guild-projects-v18';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {guildProjectArtwork} from '../theme/guild-remaster-art';
import {ActivityArtwork} from './ActivityArtwork';

function progressPercent(project:OnlineGuildProjectSummary){
 if(project.kind==='development'){
  if(!project.resourceGoals.length)return 0;
  const total=project.resourceGoals.reduce((sum,row)=>sum+(row.target>0?Math.min(1,row.current/row.target):1),0);
  return Math.round(total/project.resourceGoals.length*100);
 }
 if(project.targetPoints<=0)return 0;
 return Math.max(0,Math.min(125,Math.round(project.completionPoints/project.targetPoints*100)));
}

export function OnlineGuildProjectsPanel({onRewardsChanged,onNavigateActivity}:{onRewardsChanged?:()=>void|Promise<unknown>;onNavigateActivity?:(activity:'combat'|'gathering'|'crafting')=>void}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [snapshot,setSnapshot]=useState<OnlineGuildProjectsSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[expanded,setExpanded]=useState<string|null>(null),[busy,setBusy]=useState('');
 const mounted=useRef(true),readFlight=useRef<Promise<void>|null>(null);
 const load=(force=false):Promise<void>=>{
  if(!mounted.current)return Promise.resolve();
  // Never discard a post-claim forced refresh just because an older periodic
  // read is still in flight. Wait for that read and then revalidate.
  if(readFlight.current)return force?readFlight.current.then(()=>load(true)):readFlight.current;
  const request=(async()=>{
   setLoading(true);
   try{
    const next=await loadOnlineGuildProjectsV18(force);
    if(mounted.current){setSnapshot(next);setError('');}
   }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:st("Unable to load Guild Projects."))}
   finally{if(mounted.current)setLoading(false);}
  })();
  readFlight.current=request;
  void request.finally(()=>{if(readFlight.current===request)readFlight.current=null;});
  return request;
 };
 const act=async(kind:'vote'|'start'|'claim',candidateId:string)=>{const key=kind+':'+candidateId;setBusy(key);setError('');try{if(kind==='vote')await voteOnlineGuildProjectCandidate(candidateId);else if(kind==='start')await startOnlineGuildProjectCandidate(candidateId);else {await claimOnlineGuildProjectReward(candidateId);await onRewardsChanged?.();}await load(true)}catch(reason){setError(reason instanceof Error?reason.message:st("Guild Project action failed."))}finally{setBusy('')}};
 useEffect(()=>{
  mounted.current=true;
  if(AppState.currentState!=='background')void load();
  const listener=AppState.addEventListener('change',next=>{if(next==='active')void load()});
  // A visible board can change through other members' contributions. A short
  // cache prevents duplicate multi-query reads across navigation and resume.
  const timer=setInterval(()=>{if(AppState.currentState==='active')void load()},60_000);
  return()=>{mounted.current=false;listener.remove();clearInterval(timer);};
 },[]);
 if(loading&&!snapshot)return <LoadingState label={st("Loading Guild Projects…")} detail={st("Syncing shared Project progress and recent Guild activity.")}/>;
 if(error&&!snapshot)return <Panel><Text style={s.title}>{st("Guild Projects")}</Text><Text style={s.error}>{error}</Text><GameButton compact title={st("Retry")} tone="secondary" loading={loading} disabled={loading} onPress={()=>void load(true)}/></Panel>;
 if(!snapshot)return <Panel><Text style={s.title}>{st("Guild Projects")}</Text><Text style={s.copy}>{st("Join a Guild to view shared Projects and recent Guild activity.")}</Text></Panel>;

 const active=snapshot.projects.filter(row=>row.status==='active'),completed=snapshot.projects.filter(row=>row.status==='completed').slice(0,4);
 return <View style={s.root}>
  <QuestBoard>
   <View style={s.sectionHead}><View style={s.flex}><Text style={s.kicker}>{st("GUILD PROJECTS")}</Text><Text style={s.title}>{st("Shared Progress")}</Text></View><StatusPill label={st("LIVE")} tone="good"/></View>
   <Text style={s.copy}>One shared weekly goal · Combat, Gathering and Crafting activities all contribute. Earn the same weekly Guild rewards. Resets Monday at 00:00 UTC.</Text>
   {snapshot.candidates.length?<View style={s.board}><View style={s.sectionHead}><Text style={s.boardTitle}>{st("NEXT WEEKLY PROJECT")}</Text><Text style={s.sectionMeta}>{st("1 vote per member")}</Text></View>{snapshot.candidates.map(candidate=><CandidateCard key={candidate.id} candidate={candidate} busy={busy} onVote={()=>act('vote',candidate.id)} onStart={()=>act('start',candidate.id)}/>)}</View>:null}
   {active.length?active.map(project=><GuildProjectPosting key={project.id} project={project} onClaim={()=>act('claim',project.id)} onNavigateActivity={onNavigateActivity} busy={!!busy} expanded={expanded===project.id} onToggle={()=>setExpanded(id=>id===project.id?null:project.id)}/>):<View style={s.empty}><Text style={s.emptyTitle}>{st("No active Guild Project")}</Text><Text style={s.emptyText}>Your next weekly project will appear here automatically.</Text></View>}
  </QuestBoard>
  {completed.length?<Panel><View style={s.sectionHead}><Text style={s.title}>{st("Recent completions")}</Text><Text style={s.sectionMeta}>{completed.length} shown</Text></View>{completed.map(project=><GuildProjectPosting key={project.id} project={project} onClaim={()=>act('claim',project.id)} busy={!!busy} compact expanded={expanded===project.id} onToggle={()=>setExpanded(id=>id===project.id?null:project.id)}/>)}</Panel>:null}
  <Panel>
   <View style={s.sectionHead}><Text style={s.title}>{st("Guild Activity")}</Text><Text style={s.sectionMeta}>{snapshot.activity.length} recent</Text></View>
   <GuildActivityFeedPanel entries={snapshot.activity}/>
  </Panel>
  <GameButton compact title={loading?st("Refreshing…"):st("Refresh Projects")} tone="secondary" loading={loading} disabled={loading} onPress={()=>void load(true)}/>
  <Text style={s.safety}>Earn 20 effort per active minute, up to 2,400 per earned UTC day. In guilds with two or more members, one member can supply at most half the goal. Contribute 300 effort to qualify for 500 Gold. Claim within seven days after the week ends.</Text>
  {!!error&&<Text style={s.error}>{error}</Text>}
 </View>;
}

function CandidateCard({candidate,busy,onVote,onStart}:{candidate:OnlineGuildProjectCandidate;busy:string;onVote:()=>void;onStart:()=>void}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),voteBusy=busy==='vote:'+candidate.id,startBusy=busy==='start:'+candidate.id;
 return <QuestPosting style={candidate.myVote?s.candidateVoted:undefined}>
  <View style={s.projectHead}>{guildProjectArtwork(candidate.templateId)?<Image source={guildProjectArtwork(candidate.templateId)} resizeMode="contain" style={{width:44,height:44}}/>:null}<View style={s.flex}><Text style={s.projectTitle}>{candidate.name}</Text><Text style={s.meta}>{projectFocusLabel(candidate.focus)} · {candidate.voteCount} vote{candidate.voteCount===1?'':'s'}</Text></View>{candidate.myVote?<StatusPill label={st("YOUR VOTE")} tone="good"/>:null}</View>
  <Text style={s.description}>{candidate.description}</Text>
  <Text style={s.meta}>Board closes {new Date(candidate.expiresAt).toLocaleString()}</Text>
  <View style={s.actions}><GameButton compact title={voteBusy?st("Voting…"):candidate.myVote?st("Voted"):st("Vote")} tone="secondary" disabled={!!busy||candidate.myVote} onPress={onVote}/>{candidate.canStart?<GameButton compact title={startBusy?st("Starting…"):st("Start Project")} disabled={!!busy} onPress={onStart}/>:null}</View>
 </QuestPosting>;
}

export function GuildProjectPosting({project,expanded,compact=false,onToggle,onClaim,onNavigateActivity,busy}:{onClaim:()=>void;onNavigateActivity?:(activity:'combat'|'gathering'|'crafting')=>void;busy:boolean;project:OnlineGuildProjectSummary;expanded:boolean;compact?:boolean;onToggle:()=>void}){
 const st=useSocialText();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),pct=progressPercent(project);
 const thresholdMet=project.personalRewardThreshold>0&&project.personalPoints>=project.personalRewardThreshold;
 return <QuestPosting style={project.status==='completed'?s.projectDone:undefined}><Pressable accessibilityRole="button" accessibilityLabel={`Project details · ${project.name}`} aria-expanded={expanded} accessibilityState={{expanded}} onPress={onToggle} style={({pressed})=>[s.projectButton,pressed&&s.pressed]}>
  <View style={s.projectHead}>{guildProjectArtwork(project.templateId)?<Image source={guildProjectArtwork(project.templateId)} resizeMode="contain" style={{width:44,height:44}}/>:null}<View style={s.flex}><Text numberOfLines={1} style={s.projectTitle}>{project.name}</Text><Text style={s.meta}>{projectFocusLabel(project.focus)} · {project.kind==='weekly_campaign'?st("Weekly"):project.kind==='development'?st("Development"):st("Event")} · Slot {project.slotIndex}</Text></View><StatusPill label={project.status.toUpperCase()} tone={project.status==='completed'?'good':'info'}/></View>
  <View style={s.progressRow}><Text style={s.percent}>{pct}%</Text><View style={s.track}><View style={[s.fill,{width:(Math.min(100,pct)+'%') as any}]}/></View></View>
  {project.kind!=='development'?<Text style={s.meta}>{project.completionPoints.toLocaleString()} / {project.targetPoints.toLocaleString()} effort · {project.meaningfulContributors}/{project.minimumMeaningfulContributors} meaningful contributors</Text>:<Text style={s.meta}>{project.resourceGoals.length} resource goal{project.resourceGoals.length===1?'':'s'}</Text>}
  {!compact?<View style={s.personal}><Text style={s.personalLabel}>{st("YOUR CONTRIBUTION")}</Text><Text style={[s.personalValue,thresholdMet&&s.personalMet]}>{project.personalPoints.toLocaleString()}{project.personalRewardThreshold>0?' / '+project.personalRewardThreshold.toLocaleString()+' threshold':''}</Text></View>:null}
  </Pressable>
  {project.launchWeekly&&project.status==='active'?<View style={s.activityBoard}>
   <Text style={s.activityHeading}>WEEKLY ACTIVITIES · SHARED EFFORT</Text>
   {([
    {source:'combat',title:'Hunt & battle',desc:'Fight enemies and bosses · 20 effort per active minute',art:'combat'},
    {source:'gathering',title:'Gather resources',desc:'Mine, chop, fish or gather · 20 effort per active minute',art:'herbalism'},
    {source:'crafting',title:'Craft supplies',desc:'Complete verified recipes · 5 effort per crafted item',art:'smithing'},
   ] as const).map(activity=><View key={activity.source} style={s.activityRow}>
    <ActivityArtwork id={activity.art} size={38}/>
    <View style={s.flex}><Text style={s.activityTitle}>{activity.title}</Text><Text style={s.activityCopy}>{activity.desc}</Text></View>
    <View style={s.activityScore}><Text style={s.activityPoints}>{project.activityTotals[activity.source].toLocaleString()}</Text><Text style={s.activitySmall}>effort</Text></View>
    {onNavigateActivity?<GameButton compact title={activity.source==='combat'?'Hunt':activity.source==='gathering'?'Gather':'Craft'} tone="secondary" onPress={()=>onNavigateActivity(activity.source)}/>:null}
   </View>)}
   <Text style={s.activityFoot}>All three activities fill the one Guild progress bar above. You can focus on any combination; the daily limit and completion rewards are unchanged.</Text>
  </View>:null}
  {project.launchWeekly?<View style={{gap:6}}><Text style={s.description}>Guild reward: 200 Hall progress · Member reward: 500 Gold</Text>{project.status==='completed'?<GameButton compact title={project.completionRewardClaimed?'Reward claimed':'Claim 500 Gold'} disabled={busy||project.completionRewardClaimed||!thresholdMet||Date.now()>=Date.parse(project.endsAt??'')+7*86400000} onPress={onClaim}/>:null}</View>:null}
  {expanded?<View style={s.detail}>
   <Text style={s.description}>{project.description}</Text>
   {project.kind!=='development'?<View style={s.breakdown}><Text style={s.combat}>{st("Combat")} {project.combatPoints.toLocaleString()}</Text><Text style={s.skilling}>{st("Skilling")} {project.skillingPoints.toLocaleString()}</Text></View>:project.resourceGoals.map(goal=><View key={goal.resourceKind+':'+goal.resourceId} style={s.goal}><Text style={s.goalName}>{goal.label}</Text><Text style={s.goalValue}>{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</Text></View>)}
   {project.endsAt?<Text style={s.meta}>Ends {new Date(project.endsAt).toLocaleString()}</Text>:null}
  </View>:<Text style={s.expandHint}>{st("View details ›")}</Text>}
 </QuestPosting>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({projectButton:{gap:10,minHeight:44},
 root:{gap:14},flex:{flex:1,minWidth:0},activityBoard:{gap:7,padding:9,backgroundColor:C.panel2,borderColor:C.line,borderWidth:1,borderRadius:10},activityHeading:{fontSize:10,fontWeight:'900',color:C.accent,letterSpacing:.9},activityRow:{flexDirection:'row',alignItems:'center',gap:9,minHeight:52,paddingVertical:3,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},activityTitle:{fontSize:12,fontWeight:'800',color:C.text},activityCopy:{fontSize:11,lineHeight:15,color:C.muted,marginTop:2},activityScore:{alignItems:'flex-end',minWidth:58},activityPoints:{fontSize:14,fontWeight:'900',color:C.info},activitySmall:{fontSize:10,color:C.muted},activityFoot:{fontSize:11,lineHeight:15,color:C.muted},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},sectionMeta:{fontSize:12,color:C.muted,fontWeight:'800'},copy:{fontSize:13,lineHeight:19,color:C.muted},board:{gap:6,paddingTop:8,marginTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},boardTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},candidate:{gap:5,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},candidateVoted:{borderColor:C.good},actions:{flexDirection:'row',flexWrap:'wrap',gap:6},safety:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center'},
 project:{gap:5,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,marginTop:7},projectCompact:{paddingVertical:7},projectDone:{borderColor:C.good,backgroundColor:C.goodSurface},pressed:{opacity:.72},
 projectHead:{flexDirection:'row',alignItems:'center',gap:8},projectTitle:{fontSize:15,color:C.text,fontWeight:'900'},meta:{fontSize:12,lineHeight:17,color:C.muted},statusPill:{paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},statusText:{fontSize:10,color:C.info,fontWeight:'900',letterSpacing:.6},statusDone:{borderColor:C.good,backgroundColor:C.goodSurface},statusDoneText:{color:C.good},
 progressRow:{flexDirection:'row',alignItems:'center',gap:7},percent:{width:34,fontSize:13,color:C.accent,fontWeight:'900'},track:{flex:1,height:7,borderRadius:4,overflow:'hidden',backgroundColor:C.panel},fill:{height:'100%',backgroundColor:C.good},
 personal:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:2},personalLabel:{fontSize:13,color:C.muted,fontWeight:'900',letterSpacing:.5},personalValue:{fontSize:12,color:C.info,fontWeight:'900'},personalMet:{color:C.good},
 detail:{gap:5,paddingTop:5,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},description:{fontSize:13,lineHeight:18,color:C.text},breakdown:{flexDirection:'row',justifyContent:'space-between',gap:8},combat:{fontSize:12,color:C.bad,fontWeight:'900'},skilling:{fontSize:12,color:C.good,fontWeight:'900'},goal:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},goalName:{flex:1,fontSize:12,color:C.text,fontWeight:'800'},goalValue:{fontSize:12,color:C.muted,fontWeight:'800'},expandHint:{fontSize:11,color:C.info,fontWeight:'800',textAlign:'right'},
 empty:{minHeight:96,alignItems:'center',justifyContent:'center',gap:6,padding:14,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,marginTop:7},emptyTitle:{...typography.bodyStrong,color:C.text},emptyText:{fontSize:12,lineHeight:17,color:C.muted,textAlign:'center'},error:{fontSize:13,color:C.bad},
});}
