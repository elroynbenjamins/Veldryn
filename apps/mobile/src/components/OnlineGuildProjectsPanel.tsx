import {useSocialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {guildProjectAuthoredCopy} from '../i18n/guild-project-authored';
import {guildFlowFocusText,guildFlowUiText} from '../i18n/guild-flow-ui';
import {useOnlineGuildProjectUiText} from '../i18n/online-guild-project-ui';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {QuestBoard} from './QuestBoard';
import {GuildActivityFeedPanel} from './GuildActivityFeedPanel';
import {GuildProjectSupplyDonationPanel} from './GuildProjectSupplyDonationPanel';
import {gameAlert} from '../core/game-alerts';
import {donateOnlineGuildProjectSupplies,pendingGuildProjectSupplyDonation,discardPendingGuildProjectSupplyDonation,type PendingGuildProjectSupplyDonation} from '../online/guild-project-supply-donations';
import {LoadingState} from './LoadingState';
import {StatusPill} from './StatusPill';
import {ActivityArtwork} from './ActivityArtwork';
import {claimOnlineGuildProjectReward,loadOnlineGuildProjectsV18,voteOnlineGuildProjectCandidate,type OnlineGuildProjectCandidate,type OnlineGuildProjectSummary,type OnlineGuildProjectsSnapshot,type OnlineGuildProjectSupplyItem} from '../online/guild-projects-v18';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {guildProjectArtwork} from '../theme/guild-remaster-art';
import {guildUpgradeComponentArtwork} from '../theme/guild-upgrade-component-art';

function progressPercent(project:OnlineGuildProjectSummary){
 if(project.kind==='development'){
  if(!project.resourceGoals.length)return 0;
  return Math.round(project.resourceGoals.reduce((sum,row)=>sum+(row.target>0?Math.min(1,row.current/row.target):1),0)/project.resourceGoals.length*100);
 }
 if(project.targetPoints<=0)return 0;
 return Math.max(0,Math.min(125,Math.round(project.completionPoints/project.targetPoints*100)));
}
const effortActivities=[
 {source:'combat',title:'Combat',art:'combat',action:'Hunt',rule:'20 / active minute'},
 {source:'gathering',title:'Gather',art:'herbalism',action:'Gather',rule:'20 / active minute'},
 {source:'crafting',title:'Craft',art:'smithing',action:'Craft',rule:'5 / crafted item'},
] as const;
type Activity='combat'|'gathering'|'crafting';

export function OnlineGuildProjectsPanel({onRewardsChanged,onNavigateActivity}:{
 onRewardsChanged?:()=>void|Promise<unknown>;
 onNavigateActivity?:(activity:Activity)=>void;
}){
 const st=useSocialText(),ui=useOnlineGuildProjectUiText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [snapshot,setSnapshot]=useState<OnlineGuildProjectsSnapshot|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [expanded,setExpanded]=useState<string|null>(null),[showHistory,setShowHistory]=useState(false),[busy,setBusy]=useState('');
 const [pendingDonation,setPendingDonation]=useState<PendingGuildProjectSupplyDonation|null>(null);
 const mounted=useRef(true),readFlight=useRef<Promise<void>|null>(null);
 const load=(force=false):Promise<void>=>{
  if(!mounted.current)return Promise.resolve();
  // Never allow a stale in-flight refresh to suppress a post-claim read.
  if(readFlight.current)return force?readFlight.current.then(()=>load(true)):readFlight.current;
  const request=(async()=>{
   setLoading(true);
   try{
    const next=await loadOnlineGuildProjectsV18(force);
    if(mounted.current){setSnapshot(next);setError('');}
   }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:st('Unable to load Guild Projects.'));}
   finally{if(mounted.current)setLoading(false);}
  })();
  readFlight.current=request;
  void request.finally(()=>{if(readFlight.current===request)readFlight.current=null;});
  return request;
 };
 const act=async(kind:'vote'|'claim',id:string)=>{
  if(busy)return;
  setBusy(kind+':'+id);setError('');
  try{
   if(kind==='vote')await voteOnlineGuildProjectCandidate(id);
   else{await claimOnlineGuildProjectReward(id);await onRewardsChanged?.();}
   await load(true);
  }catch(reason){if(mounted.current)setError(reason instanceof Error?reason.message:st('Guild Project action failed.'));}
  finally{if(mounted.current)setBusy('');}
 };
 const donate=async(input:{projectId:string;itemId:string;quantity:number})=>{
  if(busy)return;
  setBusy('donate:'+input.itemId);setError('');
  try{
   await donateOnlineGuildProjectSupplies(input);
   setPendingDonation(null);
   await load(true);
  }catch(reason){
   if(mounted.current)setError(reason instanceof Error?reason.message:st('Guild Project action failed.'));
   try{const pending=await pendingGuildProjectSupplyDonation();if(mounted.current)setPendingDonation(pending)}catch{}
  }finally{if(mounted.current)setBusy('');}
 };
 const discard=()=>gameAlert.alert(ui('Discard saved Guild donation?'),
  ui('Discard only after checking the project. A new donation may consume additional items.'),
  [{text:ui('Keep receipt'),style:'cancel'},
   {text:ui('Discard retry'),style:'destructive',onPress:()=>void discardPendingGuildProjectSupplyDonation()
    .then(()=>setPendingDonation(null)).catch(reason=>setError(String(reason)))}]);
 useEffect(()=>{
  mounted.current=true;
  void pendingGuildProjectSupplyDonation().then(value=>{if(mounted.current)setPendingDonation(value)})
   .catch(reason=>{if(mounted.current)setError(String(reason))});
  if(AppState.currentState!=='background')void load();
  const listener=AppState.addEventListener('change',next=>{if(next==='active')void load();});
  const timer=setInterval(()=>{if(AppState.currentState==='active')void load();},60_000);
  return()=>{mounted.current=false;listener.remove();clearInterval(timer);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 if(loading&&!snapshot)return <LoadingState label={st('Loading Guild Projects…')} detail={st('Syncing shared Project progress and recent Guild activity.')}/>;
 if(error&&!snapshot)return <Panel><Text style={s.title}>{ui("Guild Projects")}</Text><Text style={s.error}>{error}</Text><GameButton title={st("Retry")} tone="secondary" disabled={loading} loading={loading} onPress={()=>void load(true)}/></Panel>;
 if(!snapshot)return <Panel><Text style={s.title}>{ui("Guild Projects")}</Text><Text style={s.copy}>{ui("Join a Guild to view shared weekly progress.")}</Text></Panel>;
 const active=snapshot.projects.filter(row=>row.status==='active');
 const completed=snapshot.projects.filter(row=>row.status==='completed').slice(0,4);
 return <View style={s.root}>
  <QuestBoard>
   <View style={s.sectionHead}>
    <View style={s.flex}><Text style={s.kicker}>{ui("GUILD COOPERATION")}</Text><Text style={s.title}>{ui("Weekly Projects")}</Text></View>
    <StatusPill label={ui("SHARED")} tone="good"/>
   </View>
   {active.length?active.map(project=><GuildProjectPosting
     key={project.id} project={project} busy={!!busy}
     supplyInventory={snapshot.supplyInventory??[]}
     onDonate={(itemId,quantity)=>void donate({projectId:project.id,itemId,quantity})}
     donationBlocked={!!pendingDonation}
     onClaim={()=>void act('claim',project.id)}
     onNavigateActivity={onNavigateActivity}
     expanded={expanded===project.id}
     onToggle={()=>setExpanded(old=>old===project.id?null:project.id)}
   />):<View style={s.empty}><Text style={s.emptyTitle}>{ui("No active Guild Project")}</Text><Text style={s.copy}>{ui('Weekly projects start automatically every Monday. No vote is needed.')}</Text></View>}
  </QuestBoard>
  {pendingDonation?<Panel>
   <Text style={s.sectionTitle}>{ui('Saved Guild donation')}</Text>
   <Text style={s.copy}>{ui('Retry the saved request before donating anything else.')}</Text>
   <Text style={s.meta}>{pendingDonation.itemId} · {pendingDonation.quantity.toLocaleString()}</Text>
   <View style={s.actions}>
    <View style={s.flex}><GameButton compact disabled={!!busy} loading={!!busy} title={ui('Retry saved donation')}
      onPress={()=>void donate({projectId:pendingDonation.projectId,itemId:pendingDonation.itemId,quantity:pendingDonation.quantity})}/></View>
    <View style={s.flex}><GameButton compact disabled={!!busy} tone="secondary" title={ui('Discard retry')} onPress={discard}/></View>
   </View>
  </Panel>:null}
  {snapshot.candidates.length?<Panel>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>{ui("Vote for next week's project")}</Text><Text style={s.meta}>{ui("One vote per member")}</Text></View>
   {snapshot.candidates.map(candidate=><CandidateCard key={candidate.id} candidate={candidate} busy={busy}
    onVote={()=>void act('vote',candidate.id)}/>)}
  </Panel>:null}
  {completed.length||snapshot.activity.length?<Panel>
   <Pressable accessibilityRole="button" accessibilityLabel={ui("Recent Guild progress")} accessibilityState={{expanded:showHistory}}
    onPress={()=>setShowHistory(v=>!v)} style={({pressed})=>[s.accordion,pressed&&s.pressed]}>
    <View style={s.flex}><Text style={s.sectionTitle}>{ui("Recent Guild activity")}</Text><Text style={s.copy}>{ui("{completed} completed · {events} events",{completed:completed.length,events:snapshot.activity.length})}</Text></View>
    {completed.some(p=>p.launchWeekly&&!p.completionRewardClaimed&&p.personalRewardThreshold>0&&p.personalPoints>=p.personalRewardThreshold&&!!p.endsAt&&Date.now()<Date.parse(p.endsAt)+7*86400000)?<StatusPill label={ui("REWARD")} tone="good"/>:null}
    <Text style={s.chevron}>{showHistory?'▴':'▾'}</Text>
   </Pressable>
   {showHistory?<View style={s.history}>
    {completed.map(project=><GuildProjectPosting key={project.id} project={project} compact
     busy={!!busy} onClaim={()=>void act('claim',project.id)}
     expanded={expanded===project.id}
     onToggle={()=>setExpanded(old=>old===project.id?null:project.id)}/>)}
    <GuildActivityFeedPanel entries={snapshot.activity}/>
   </View>:null}
  </Panel>:null}
  <GameButton compact title={ui(loading?'Refreshing…':'Refresh Projects')} tone="secondary" loading={loading} disabled={loading||!!busy} onPress={()=>void load(true)}/>
  {!!error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
 </View>;
}

function CandidateCard({candidate,busy,onVote}:{candidate:OnlineGuildProjectCandidate;busy:string;onVote:()=>void}){
 const language=useGameLanguage(),ui=useOnlineGuildProjectUiText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const authored=guildProjectAuthoredCopy(language,candidate.templateId,candidate.name,candidate.description);
 return <View style={s.candidate}>
  <View style={s.sectionHead}><View style={s.flex}><Text style={s.projectTitle}>{authored.name}</Text><Text style={s.meta}>{guildFlowFocusText(language,candidate.focus)} · {guildFlowUiText(language,candidate.voteCount===1?'{count} vote':'{count} votes',{count:candidate.voteCount})}</Text></View>{candidate.myVote?<StatusPill label={ui("VOTED")} tone="good"/>:null}</View>
  <Text style={s.copy}>{authored.description}</Text>
  <Text style={s.rewardTitle}>{ui('{xp} Guild XP · {gold} Bank Gold per qualifying member',{xp:candidate.guildXpReward.toLocaleString(),gold:candidate.rewardGold.toLocaleString()})}</Text>
  <Text style={s.meta}>{ui('Voting closes {date}',{date:new Date(candidate.expiresAt).toLocaleString(language)})}</Text>
  <View style={s.actions}><View style={s.flex}><GameButton compact title={ui(candidate.myVote?'Your vote':'Vote')} tone="secondary" disabled={!!busy||candidate.myVote} onPress={onVote}/></View>
  </View>
 </View>;
}

export function GuildProjectPosting({project,expanded,compact=false,onToggle,onClaim,onNavigateActivity,onDonate,supplyInventory=[],donationBlocked=false,busy}:{
 onClaim:()=>void;
 onNavigateActivity?:(activity:Activity)=>void;
 onDonate?:(itemId:string,quantity:number)=>void;
 supplyInventory?:OnlineGuildProjectSupplyItem[];
 donationBlocked?:boolean;
 busy:boolean;
 project:OnlineGuildProjectSummary;
 expanded:boolean;
 compact?:boolean;
 onToggle:()=>void;
}){
 const language=useGameLanguage(),ui=useOnlineGuildProjectUiText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const authored=guildProjectAuthoredCopy(language,project.templateId,project.name,project.description);
 const pct=progressPercent(project);
 const weekly=project.launchWeekly===true;
 const qualifying=project.personalRewardThreshold>0&&project.personalPoints>=project.personalRewardThreshold;
 const claimDeadline=project.endsAt?Date.parse(project.endsAt)+7*86400000:NaN;
 const claimOpen=project.status==='completed'&&!project.completionRewardClaimed&&qualifying
  &&Number.isFinite(claimDeadline)&&Date.now()<claimDeadline;
 const projectArtwork=guildProjectArtwork(project.templateId);
 const readyToClaim=weekly&&claimOpen;
 const personalShortfall=Math.max(0,project.personalRewardThreshold-project.personalPoints);
 const rewardStatus=project.completionRewardClaimed?ui('Already claimed')
  :project.status!=='completed'?ui('Available after Guild completion')
  :Number.isFinite(claimDeadline)&&Date.now()>=claimDeadline?ui('Reward claim period ended')
  :!Number.isFinite(claimDeadline)?ui('Reward claim timing unavailable')
  :qualifying?ui('Ready to claim')
  :project.personalRewardThreshold>0?ui('{count} personal effort short of reward eligibility',{count:personalShortfall.toLocaleString()})
  :ui('Not eligible for this reward');
 return <View style={[s.project,project.status==='completed'&&s.complete]}>
  <Pressable accessibilityRole="button" accessibilityLabel={ui('Project contributions: {name}',{name:authored.name})} accessibilityHint={ui('Show or hide contributions from Guild members')} accessibilityState={{expanded}}
   onPress={onToggle} style={({pressed})=>[s.projectPress,pressed&&s.pressed]}>
   <View style={s.sectionHead}>
    {projectArtwork?<Image source={projectArtwork} resizeMode="contain" style={s.projectIcon}/>:<ActivityArtwork id="combat" size={42}/>}
    <View style={s.flex}><Text numberOfLines={2} style={s.projectTitle}>{authored.name}</Text><Text style={s.meta}>{guildFlowFocusText(language,project.focus)} · {ui(weekly?'Weekly':project.kind==='development'?'Development':'Event')}</Text></View>
    <StatusPill label={ui(project.status==='completed'?'DONE':'ACTIVE')} tone={project.status==='completed'?'good':'info'}/>
   </View>
   <View style={s.progressHead}><Text style={s.percent}>{pct}%</Text><View style={s.progressNumbers}><Text style={s.progressAmount}>{project.kind==='development'?ui('Resource goals'):`${project.completionPoints.toLocaleString()} / ${project.targetPoints.toLocaleString()}`}</Text><Text style={s.meta}>{ui('Guild progress')}</Text></View></View>
   <View style={s.track}><View style={[s.fill,{width:`${Math.min(100,pct)}%` as any}]}/></View>
   <View style={s.sectionHead}><Text style={[s.meta,s.flex]}>{ui('{count}/{minimum} contributors',{count:project.meaningfulContributors,minimum:project.minimumMeaningfulContributors})}</Text><Text style={s.expandHint}>{ui(expanded?'Hide contribution ▴':'Contribution ▾')}</Text></View>
   {weekly&&project.status==='active'?<Text style={s.meta}>{ui('Weekly reset: Monday at 00:00 UTC')}</Text>:null}
  </Pressable>
  {!compact?<View style={s.personal}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>{ui('Your contribution')}</Text>
    {qualifying&&project.personalRewardThreshold>0?<StatusPill label={ui("QUALIFIED")} tone="good"/>:null}
   </View>
   <View style={s.sectionHead}><Text style={s.personalPoints}>{project.personalPoints.toLocaleString()}</Text>
    <Text style={s.meta}>{project.personalRewardThreshold>0?ui('/ {count} needed',{count:project.personalRewardThreshold.toLocaleString()}):ui('Shared contribution')}</Text></View>
   {weekly&&project.status==='active'&&personalShortfall>0?<Text style={s.meta}>{ui('{count} more personal effort to qualify for the reward',{count:personalShortfall.toLocaleString()})}</Text>:null}
   {project.personalRewardThreshold>0?<View style={s.smallTrack}><View style={[s.fill,{width:`${Math.min(100,project.personalPoints/project.personalRewardThreshold*100)}%` as any}]}/></View>:null}
   {weekly?<View style={s.reward}>
    <Text style={s.rewardIcon}>🪙</Text>
    <View style={s.flex}><Text style={s.rewardTitle}>{project.rewardDestination==='guild_bank'?ui('{amount} Gold · Guild Bank reward',{amount:project.rewardGold.toLocaleString()}):ui('500 Gold · Personal reward')}</Text><Text style={s.meta}>{rewardStatus}</Text></View>
   </View>:null}
   {weekly?<View style={s.sectionHead}><Text style={s.meta}>{ui('Guild receives')}</Text>
     <View style={s.flex}>
      <Text style={s.hallReward}>{ui('{count} Hall progress',{count:project.hallProgress??200})}</Text>
      {(project.guildXpReward??0)>0?<Text style={s.hallReward}>{ui('{count} Guild XP',{count:project.guildXpReward??0})}</Text>:null}
     </View>
    </View>:null}
  </View>:null}
  {weekly&&project.status==='active'&&!compact&&project.resourceGoals.length>0?
    <GuildProjectSupplyDonationPanel goals={project.resourceGoals} inventory={supplyInventory}
     busy={busy||donationBlocked||!onDonate} onDonate={(itemId,quantity)=>onDonate?.(itemId,quantity)}/>:null}
  {weekly&&project.status==='active'&&!compact&&project.projectMode!=='donation'?<View style={s.activities}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>{ui('Contribute now')}</Text><StatusPill label={ui(project.templateId==='guild_weekly_shared_effort'?'ANY ACTIVITY':'Activity requirements')} tone="info"/></View>
   <View style={s.activityGrid}>{effortActivities.filter(a=>project.focus==='combat'?a.source==='combat':project.focus==='skilling'?a.source!=='combat':true).map(a=><Pressable key={a.source}
    accessibilityRole="button" accessibilityLabel={ui('Open {title} to contribute',{title:ui(a.title)})}
    disabled={!onNavigateActivity} onPress={()=>onNavigateActivity?.(a.source)}
    style={({pressed})=>[s.activityTile,{borderColor:C.line,backgroundColor:C.panelRaised},pressed&&s.pressed,!onNavigateActivity&&s.disabled]}>
    <ActivityArtwork id={a.art} size={38}/>
    <Text style={s.activityName}>{ui(a.title)}</Text>
    <Text numberOfLines={2} style={s.activityRule}>{ui(a.rule)}</Text>
   </Pressable>)}</View>
   <Text style={s.meta}>{ui('Combat/Gathering: 20 effort/min · Crafting: 5/item.')}</Text>
  </View>:null}
  {readyToClaim?<GameButton title={ui(busy?'Claiming…':project.rewardDestination==='guild_bank'?'Claim Guild Bank Gold':'Claim 500 Gold')} disabled={busy} onPress={onClaim}/>:null}
  {project.status==='completed'&&weekly&&!readyToClaim&&compact?<Text style={s.meta}>{rewardStatus}</Text>:null}
  {expanded?<View style={s.details}>
   <Text style={s.copy}>{authored.description}</Text>
   {project.kind!=='development'?<View style={s.breakdown}>
    <Text style={s.meta}>{ui('Combat: {count}',{count:project.combatPoints.toLocaleString()})}</Text><Text style={s.meta}>{ui('Skilling: {count}',{count:project.skillingPoints.toLocaleString()})}</Text>
   </View>:null}
   {project.resourceGoals.map(goal=><View key={goal.resourceKind+':'+goal.resourceId} style={s.resource}>
    {guildUpgradeComponentArtwork(goal.resourceId)?<Image source={guildUpgradeComponentArtwork(goal.resourceId)} style={s.resourceIcon} resizeMode="contain" accessible={false}/>:null}
    <Text style={[s.copy,s.flex]}>{goal.label}</Text><Text style={s.resourceAmount}>{goal.current.toLocaleString()} / {goal.target.toLocaleString()}</Text>
   </View>)}
   {weekly?<View style={s.detailsRules}><Text style={s.meta}>{ui(project.projectMode==='donation'?'Donate eligible supplies · Each member may cover up to 50% · Claim within 7 days.':project.rewardDestination==='guild_bank'?'Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for Guild Bank reward · Claim within 7 days.':'Daily cap: 2,400 effort · Max 50% per member (Guilds of 2+) · 300 effort for 500 Gold · Claim within 7 days.')}</Text></View>:null}
   <View style={s.contributionHead}><Text style={s.sectionTitle}>{ui('Member contribution')}</Text><Text style={s.meta}>{ui('{count} members',{count:project.memberContributions.length})}</Text></View>
   {project.memberContributions.map((member,index)=>{
    const sources=[member.combatPoints?ui('Combat: {count}',{count:member.combatPoints.toLocaleString()}):'',member.gatheringPoints?ui('Gather {count}',{count:member.gatheringPoints.toLocaleString()}):'',member.craftingPoints?ui('Craft {count}',{count:member.craftingPoints.toLocaleString()}):'',member.donationPoints?ui('Donate {count}',{count:member.donationPoints.toLocaleString()}):''].filter(Boolean).join(' · ');
    return <View key={member.accountId} style={s.member}><Text style={s.memberRank}>#{index+1}</Text><View style={s.flex}><Text numberOfLines={1} style={s.memberName}>{member.displayName}</Text><Text style={s.meta}>{sources||ui('No effort yet')}{member.meaningful?' · '+ui('Counts toward contributor minimum'):member.points>0?' · '+ui('Below contributor minimum'):''}</Text></View><Text style={s.memberPoints}>{ui('{count} effort',{count:member.points.toLocaleString()})}</Text></View>;
   })}
   {!project.memberContributions.length?<Text style={s.meta}>{ui('No Guild members found.')}</Text>:null}
   {project.endsAt?<Text style={s.meta}>{ui('Ends {date}',{date:new Date(project.endsAt).toLocaleString(language)})}</Text>:null}
  </View>:null}

 </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:12,minWidth:0},flex:{flex:1,minWidth:0},
 kicker:{...typography.caption,fontWeight:'800',color:C.accent,letterSpacing:.8},
 title:{fontSize:19,lineHeight:25,fontWeight:'800',color:C.text},sectionTitle:{fontSize:14,lineHeight:19,fontWeight:'800',color:C.text},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 copy:{fontSize:12,lineHeight:18,color:C.muted},meta:{fontSize:11,lineHeight:16,color:C.muted},
 project:{gap:11,padding:11,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panelRaised},
 complete:{borderColor:C.good},projectPress:{minHeight:44,gap:9},
 projectIcon:{width:42,height:42},
 projectTitle:{fontSize:15,lineHeight:20,fontWeight:'800',color:C.text},
 progressHead:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:8},
 percent:{fontSize:28,lineHeight:33,fontWeight:'900',color:C.accent},
 progressNumbers:{alignItems:'flex-end'},progressAmount:{fontSize:13,lineHeight:19,fontWeight:'800',color:C.text},
 track:{height:10,overflow:'hidden',backgroundColor:C.panel2,borderRadius:5,borderWidth:1,borderColor:C.line},
 fill:{height:'100%',backgroundColor:C.good},expandHint:{fontSize:11,lineHeight:16,fontWeight:'800',color:C.info},
 personal:{gap:8,padding:10,borderWidth:1,borderRadius:9,borderColor:C.good,backgroundColor:C.goodSurface},
 personalPoints:{fontSize:21,lineHeight:27,fontWeight:'800',color:C.text},
 smallTrack:{height:6,overflow:'hidden',backgroundColor:C.panel2,borderRadius:3},
 reward:{flexDirection:'row',alignItems:'center',gap:9,padding:10,borderWidth:1,borderRadius:7,borderColor:C.line,backgroundColor:C.panel},
 rewardIcon:{fontSize:24},rewardTitle:{fontSize:12,lineHeight:17,fontWeight:'800',color:C.text},
 hallReward:{fontSize:12,lineHeight:17,fontWeight:'800',color:C.accent},
 activities:{gap:9},activityGrid:{flexDirection:'row',gap:7},
 activityTile:{flex:1,minWidth:0,minHeight:107,alignItems:'center',justifyContent:'center',paddingVertical:9,paddingHorizontal:4,gap:4,borderWidth:1,borderRadius:8},
 activityName:{fontSize:12,lineHeight:16,fontWeight:'800',color:C.text},
 activityRule:{fontSize:10,lineHeight:14,textAlign:'center',color:C.muted},
 disabled:{opacity:.6},pressed:{opacity:.74},
 details:{gap:9,borderTopWidth:1,borderTopColor:C.line,paddingTop:11},
 contributionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:2},
 member:{minHeight:42,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},memberRank:{width:25,fontSize:11,lineHeight:16,fontWeight:'800',color:C.muted},memberName:{fontSize:12,lineHeight:17,fontWeight:'800',color:C.text},memberPoints:{fontSize:12,lineHeight:17,fontWeight:'900',color:C.accent},
 breakdown:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:7},detailsRules:{padding:9,borderRadius:7,backgroundColor:C.panel2},
 resource:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6},
 resourceIcon:{width:28,height:28},resourceAmount:{fontSize:11,color:C.accent,fontWeight:'800'},
 candidate:{gap:8,padding:10,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},
 actions:{flexDirection:'row',gap:8},accordion:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8},
 chevron:{fontSize:18,fontWeight:'800',color:C.accent},history:{gap:10,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},
 empty:{alignItems:'center',justifyContent:'center',minHeight:100,padding:13,borderWidth:1,borderStyle:'dashed',borderColor:C.line,borderRadius:9},
 emptyTitle:{fontSize:13,fontWeight:'800',color:C.text},error:{fontSize:12,lineHeight:18,color:C.bad},
});}
