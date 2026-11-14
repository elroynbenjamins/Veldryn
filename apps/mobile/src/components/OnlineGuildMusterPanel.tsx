import {socialLabel,useSocialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {LoadingState} from './LoadingState';
import {Panel} from './Panel';
import {StatusPill} from './StatusPill';
import {guildMusterDailyPercent,guildMusterRallyPercent} from '../core/guild-muster';
import {GUILD_ACTIVITY_MILESTONE_DEFS,guildActivityNextMilestone} from '../core/guild-activity';
import {loadOnlineGuildMuster,type OnlineGuildMusterMember,type OnlineGuildMusterState} from '../online/guild-muster';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function tierLabel(tier:0|1|2|3){return tier===3?'RALLY III':tier===2?'RALLY II':tier===1?'RALLY I':'BUILDING';}

export function OnlineGuildMusterPanel(){
 const st=useSocialText(),language=useGameLanguage();
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [state,setState]=useState<OnlineGuildMusterState|null>(null),[members,setMembers]=useState<OnlineGuildMusterMember[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [rosterView,setRosterView]=useState<'today'|'week'>('today'),[showAllMembers,setShowAllMembers]=useState(false),[showActivity,setShowActivity]=useState(false);
 const load=async()=>{setLoading(true);setError('');try{const snapshot=await loadOnlineGuildMuster();setState(snapshot?.state??null);setMembers(snapshot?.members??[]);}catch(reason){setError(reason instanceof Error?reason.message:st("Unable to load Guild Muster."))}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 if(loading&&!state)return <LoadingState label={st("Loading Guild Muster…")} detail={st("Checking today’s attendance and verified Guild contribution.")}/>;
 if(error&&!state)return <Panel><Text style={s.title}>{st("Guild Muster")}</Text><Text style={s.error}>{error}</Text><GameButton compact title={st("Retry")} tone="secondary" onPress={()=>load()}/></Panel>;
 if(!state)return <Panel><Text style={s.title}>{st("Guild Muster")}</Text><Text style={s.copy}>{st('Join a Guild to take part in daily Muster and the shared weekly Rally.')}</Text></Panel>;

 const dailyPct=guildMusterDailyPercent(state.dailyPoints),rallyPct=guildMusterRallyPercent(state.rallyMarks,state.rallyTarget),hallBonus=state.hallBonusBps/100,activityPct=state.activityPercent,nextActivity=guildActivityNextMilestone(activityPct);
 const remainingToday=Math.max(0,state.rallyMarkThreshold-state.dailyPoints);
 const participatingTarget=Math.max(1,Math.ceil(state.memberCount*0.60));
 const orderedMembers=[...members].sort((a,b)=>rosterView==='today'
  ? b.todayPoints-a.todayPoints||b.qualifyingDays-a.qualifyingDays||a.displayName.localeCompare(b.displayName)
  : b.qualifyingDays-a.qualifyingDays||b.weeklyPoints-a.weeklyPoints||a.displayName.localeCompare(b.displayName));
 const visibleMembers=showAllMembers?orderedMembers:orderedMembers.slice(0,6);
 const earnedToday=members.filter(member=>member.todayPoints>=state.rallyMarkThreshold).length;
 const earningToday=members.filter(member=>member.todayPoints>0&&member.todayPoints<state.rallyMarkThreshold).length;
 return <View style={s.root}>
  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{st("GUILD MUSTER")}</Text><Text style={s.title}>{st("Play together. Earn rewards.")}</Text></View><StatusPill label={state.checkedIn?st("CHECKED IN"):st("NOT CHECKED IN")} tone={state.checkedIn?'good':'muted'}/></View>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.sectionTitle}>{st("Today")}</Text><Text style={s.meta}>{st('{current}/{max} contribution',{current:state.dailyPoints.toLocaleString(language),max:state.dailyCap.toLocaleString(language)})}</Text></View><StatusPill label={state.rallyMarkEarned?st("RALLY MARK"):st("IN PROGRESS")} tone={state.rallyMarkEarned?'good':'info'}/></View>
   <Progress value={dailyPct} C={C}/>
   <View style={s.metrics}>
    <Metric label={st("CHECK-IN")} value={String(state.checkInPoints)} C={C}/>
    <Metric label={st("COMBAT")} value={String(state.combatPoints)} C={C}/>
    <Metric label={st("SKILLING")} value={String(state.skillingPoints)} C={C}/>
   </View>
   <Text style={s.note}>{state.rallyMarkEarned
    ? st('Rally Mark earned today. Your extra points still add to weekly contribution.')
    : st('{points} more points needed for today’s Rally Mark. A check-in alone is not enough.',{points:remainingToday.toLocaleString(language)})}</Text>
   <View style={s.weekSummary}>
   <View style={s.head}><View style={s.flex}><Text style={s.sectionTitle}>{st("Your week")}</Text><Text style={s.meta}>{st('{current}/{max} Rally days · {points} points',{current:state.personalQualifyingDays,max:state.personalWeeklyGoal,points:state.personalWeeklyPoints.toLocaleString(language)})}</Text></View><StatusPill label={state.personalQualifyingDays>=state.personalWeeklyGoal?st("READY"):st('{current} OF {goal}',{current:state.personalQualifyingDays,goal:state.personalWeeklyGoal})} tone={state.personalQualifyingDays>=state.personalWeeklyGoal?'good':'info'}/></View>
   <Text style={s.copy}>{state.personalQualifyingDays>=state.personalWeeklyGoal
    ? st('You have completed your {days} Rally days this week.',{days:state.personalWeeklyGoal})
    : st('Earn a Rally Mark on {days} more days this week. No daily streak required.',{days:state.personalWeeklyGoal-state.personalQualifyingDays})}</Text>
   </View>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{st("WEEKLY GUILD RALLY")}</Text><Text style={s.sectionTitle}>{state.rallyMarks}/{state.rallyTarget} {st("Rally Marks")}</Text></View><StatusPill label={socialLabel(language,tierLabel(state.rallyTier))} tone={state.rallyTier>0?'good':'muted'}/></View>
   <Progress value={rallyPct} C={C}/>
   <View style={s.metrics}>
    <Metric label={st("CHECKED IN")} value={state.checkedInMembersToday+'/'+state.memberCount} C={C}/>
    <Metric label={st("MARK TODAY")} value={String(state.qualifiedMembersToday)} C={C}/>
    <Metric label={st("HALL BONUS")} value={hallBonus?'+'+hallBonus+'%':'—'} C={C}/>
   </View>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.sectionTitle}>{st("Member contributions")}</Text><Text style={s.meta}>{st('{count} members',{count:members.length})}</Text></View></View>
   <View style={s.metrics}>
    <Metric label={st("MARK EARNED")} value={String(earnedToday)} C={C}/>
    <Metric label={st("BUILDING")} value={String(earningToday)} C={C}/>
    <Metric label={st("NO POINTS")} value={String(Math.max(0,members.length-earnedToday-earningToday))} C={C}/>
   </View>
   <View style={s.rosterControls}>
    <Pressable accessibilityRole="button" accessibilityState={{selected:rosterView==='today'}} onPress={()=>{setRosterView('today');setShowAllMembers(false)}} style={[s.rosterTab,rosterView==='today'&&s.rosterTabActive]}><Text style={[s.rosterTabText,rosterView==='today'&&s.rosterTabTextActive]}>{st('Today')}</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{selected:rosterView==='week'}} onPress={()=>{setRosterView('week');setShowAllMembers(false)}} style={[s.rosterTab,rosterView==='week'&&s.rosterTabActive]}><Text style={[s.rosterTabText,rosterView==='week'&&s.rosterTabTextActive]}>{st('This week')}</Text></Pressable>
   </View>
   {visibleMembers.map(member=>{
    const earned=member.todayPoints>=state.rallyMarkThreshold;
    const status=rosterView==='today'
     ? earned?st('RALLY MARK'):member.todayPoints>0?st('{points} TO MARK',{points:state.rallyMarkThreshold-member.todayPoints}):st('NO POINTS')
     : member.qualifyingDays>=state.personalWeeklyGoal?st('GOAL MET'):member.qualifyingDays>0?st('{days} DAYS TO GO',{days:state.personalWeeklyGoal-member.qualifyingDays}):st('NO RALLY DAYS');
    const positive=rosterView==='today'?earned:member.qualifyingDays>=state.personalWeeklyGoal;
    const pending=rosterView==='today'?member.todayPoints>0:member.qualifyingDays>0;
    return <View key={member.accountId} style={s.member}>
     <View style={s.flex}><Text numberOfLines={1} style={s.memberName}>{member.displayName}</Text>
      <Text style={s.meta}>{rosterView==='today'
       ? st('{points}/{goal} today · {days}/{weekGoal} Rally days',{points:member.todayPoints.toLocaleString(language),goal:state.rallyMarkThreshold.toLocaleString(language),days:member.qualifyingDays,weekGoal:state.personalWeeklyGoal})
       : st('{days}/{goal} Rally days · {points} weekly points',{days:member.qualifyingDays,goal:state.personalWeeklyGoal,points:member.weeklyPoints.toLocaleString(language)})}</Text>
     </View>
     <View style={[s.memberStatus,positive?s.memberStatusGood:pending?s.memberStatusPending:s.memberStatusMuted]}><Text numberOfLines={1} style={[s.memberStatusText,positive?s.memberStatusTextGood:s.memberStatusTextMuted]}>{status}</Text></View>
    </View>;
   })}
   {members.length>visibleMembers.length
    ? <Pressable accessibilityRole="button" onPress={()=>setShowAllMembers(true)} style={s.showMore}><Text style={s.showMoreText}>{st('Show all {count} members',{count:members.length})}</Text></Pressable>
    : showAllMembers&&members.length>6
     ? <Pressable accessibilityRole="button" onPress={()=>setShowAllMembers(false)} style={s.showMore}><Text style={s.showMoreText}>{st('Show fewer members')}</Text></Pressable>
     : null}
  </Panel>
  <Panel>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showActivity}} onPress={()=>setShowActivity(open=>!open)}>
    <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{st("ACTIVE GUILD")}</Text><Text style={s.sectionTitle}>{st('{percent}% Guild Activity',{percent:activityPct})}</Text></View><StatusPill label={activityPct>=100?st("MAX ACTIVITY"):nextActivity?st('{percent}% NEXT',{percent:nextActivity.threshold}):st("ACTIVE")} tone={activityPct>=60?'good':'info'}/><Text style={s.activityChevron}>{showActivity?'▴':'▾'}</Text></View>
   </Pressable>
   <Progress value={activityPct} C={C}/>
   {showActivity?<View style={s.activityMilestones}>{GUILD_ACTIVITY_MILESTONE_DEFS.map(row=><View key={row.threshold} style={[s.activityMilestone,activityPct>=row.threshold&&s.activityMilestoneOn]}><Text style={[s.activityPct,activityPct>=row.threshold&&s.activityPctOn]}>{row.threshold}%</Text><View style={s.flex}><Text style={s.activityName}>{socialLabel(language,row.name)}</Text><Text style={s.note}>{socialLabel(language,row.description)}</Text></View></View>)}</View>:null}
   <Text style={s.note}>{state.activityDecayMode==='protected'?st('Activity secured today.'):state.activityDecayMode==='partial'?st('More activity helps prevent a drop.'):st('Stay active to avoid losing progress.')}</Text>
   {showActivity?<Text style={s.note}>{st('Bonuses: +{gather}% Gathering · +{production}% Production · +{skill}% Skill XP · +{mastery}% Mastery XP · +{rare}% Rare Materials.',{gather:state.gatheringSpeedBps/100,production:state.productionSpeedBps/100,skill:state.activitySkillXpBps/100,mastery:state.masteryXpBps/100,rare:state.rareMaterialRelativeBps/100})}</Text>:null}
  </Panel>

  <GameButton compact title={loading?st("Refreshing…"):st("Refresh Muster")} tone="secondary" disabled={loading} onPress={()=>load()}/>
  {!!error&&<Text style={s.error}>{error}</Text>}
 </View>;
}

function Progress({value,C}:{value:number;C:ThemeColors}){const s=useMemo(()=>makeStyles(C),[C]);return <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:value}} style={s.track}><View style={[s.fill,{width:(value+'%') as any}]}/></View>}
function Metric({label,value,C}:{label:string;value:string;C:ThemeColors}){const s=useMemo(()=>makeStyles(C),[C]);return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},sectionTitle:{...typography.title,color:C.text},copy:{fontSize:13,lineHeight:20,color:C.muted},meta:{fontSize:12,lineHeight:18,color:C.muted,fontWeight:'700'},note:{fontSize:12,lineHeight:18,color:C.muted},
 track:{height:8,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2,marginVertical:8},fill:{height:'100%',backgroundColor:C.accent},
 weekSummary:{marginTop:12,paddingTop:12,borderTopWidth:1,borderTopColor:C.line,gap:6},activityChevron:{fontSize:17,fontWeight:'800',color:C.accent},
 metrics:{flexDirection:'row',gap:6},metric:{flex:1,minWidth:0,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,alignItems:'center'},metricValue:{fontSize:16,lineHeight:20,color:C.text,fontWeight:'900'},metricLabel:{fontSize:11,lineHeight:14,color:C.muted,fontWeight:'900',letterSpacing:.6,textAlign:'center'},
 activityMilestones:{gap:5,marginTop:7},activityMilestone:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,opacity:.62},activityMilestoneOn:{opacity:1,borderColor:C.good,backgroundColor:C.goodSurface},activityPct:{width:40,fontSize:13,color:C.muted,fontWeight:'900'},activityPctOn:{color:C.good},activityName:{fontSize:13,color:C.text,fontWeight:'900'},member:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},rank:{width:28,fontSize:13,color:C.muted,fontWeight:'900'},memberName:{fontSize:13,color:C.text,fontWeight:'900'},memberNumbers:{alignItems:'flex-end'},memberPoints:{fontSize:13,color:C.accent,fontWeight:'900'},memberToday:{fontSize:11,color:C.muted,fontWeight:'700'},rosterControls:{flexDirection:'row',gap:6,marginTop:10},rosterTab:{flex:1,paddingVertical:8,borderWidth:1,borderRadius:radii.md,borderColor:C.line,alignItems:'center',backgroundColor:C.panel2},rosterTabActive:{borderColor:C.accent,backgroundColor:C.panel},rosterTabText:{fontSize:12,fontWeight:'800',color:C.muted},rosterTabTextActive:{color:C.text},memberStatus:{borderWidth:1,borderRadius:radii.md,paddingHorizontal:7,paddingVertical:5,maxWidth:118},memberStatusGood:{borderColor:C.good,backgroundColor:C.goodSurface},memberStatusPending:{borderColor:C.accent,backgroundColor:C.panel2},memberStatusMuted:{borderColor:C.line,backgroundColor:C.panel2},memberStatusText:{fontSize:10,fontWeight:'900',textAlign:'center'},memberStatusTextGood:{color:C.good},memberStatusTextMuted:{color:C.muted},showMore:{alignItems:'center',paddingVertical:12},showMoreText:{fontSize:13,fontWeight:'900',color:C.accent},error:{fontSize:13,color:C.bad},
});}
