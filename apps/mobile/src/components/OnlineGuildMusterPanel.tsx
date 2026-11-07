import {socialLabel,socialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useEffect,useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
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
function roleLabel(role:string){return role.replace(/_/g,' ').replace(/\b\w/g,value=>value.toUpperCase());}

export function OnlineGuildMusterPanel(){
 const language=useGameLanguage(),st=(key:string,params?:Record<string,string|number>)=>socialText(language,key as never,params);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [state,setState]=useState<OnlineGuildMusterState|null>(null),[members,setMembers]=useState<OnlineGuildMusterMember[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const snapshot=await loadOnlineGuildMuster();setState(snapshot?.state??null);setMembers(snapshot?.members??[]);}catch(reason){setError(reason instanceof Error?reason.message:st("Unable to load Guild Muster."))}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 if(loading&&!state)return <LoadingState label={st("Loading Guild Muster…")} detail={st("Checking today’s attendance and verified Guild contribution.")}/>;
 if(error&&!state)return <Panel><Text style={s.title}>{st("Guild Muster")}</Text><Text style={s.error}>{error}</Text><GameButton compact title={st("Retry")} tone="secondary" onPress={()=>load()}/></Panel>;
 if(!state)return <Panel><Text style={s.title}>{st("Guild Muster")}</Text><Text style={s.copy}>{st('Join a Guild to take part in daily Muster and the shared weekly Rally.')}</Text></Panel>;

 const dailyPct=guildMusterDailyPercent(state.dailyPoints),rallyPct=guildMusterRallyPercent(state.rallyMarks,state.rallyTarget),hallBonus=state.hallBonusBps/100,activityPct=state.activityPercent,nextActivity=guildActivityNextMilestone(activityPct);
 const visibleMembers=members.slice(0,6);
 return <View style={s.root}>
  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{st("GUILD MUSTER")}</Text><Text style={s.title}>{st("Play together. Earn rewards.")}</Text></View><StatusPill label={state.checkedIn?st("CHECKED IN"):st("NOT CHECKED IN")} tone={state.checkedIn?'good':'muted'}/></View>
   <Text style={s.copy}>{st('Check in by playing. Combat and Skilling add progress automatically.')}</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.sectionTitle}>{st("Today")}</Text><Text style={s.meta}>{st('{current}/{max} contribution',{current:state.dailyPoints,max:state.dailyCap})}</Text></View><StatusPill label={state.rallyMarkEarned?st("RALLY MARK"):st("IN PROGRESS")} tone={state.rallyMarkEarned?'good':'info'}/></View>
   <Progress value={dailyPct} C={C}/>
   <View style={s.metrics}>
    <Metric label={st("CHECK-IN")} value={String(state.checkInPoints)} C={C}/>
    <Metric label={st("COMBAT")} value={String(state.combatPoints)} C={C}/>
    <Metric label={st("SKILLING")} value={String(state.skillingPoints)} C={C}/>
   </View>
   <Text style={s.note}>{st('Earn 1 Rally Mark at {count} points today.',{count:state.rallyMarkThreshold})}</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.sectionTitle}>{st("Your week")}</Text><Text style={s.meta}>{st('{current}/{max} Rally days · {points} points',{current:state.personalQualifyingDays,max:state.personalWeeklyGoal,points:state.personalWeeklyPoints})}</Text></View><StatusPill label={state.personalQualifyingDays>=state.personalWeeklyGoal?st("READY"):st('{current} OF {goal}',{current:state.personalQualifyingDays,goal:state.personalWeeklyGoal})} tone={state.personalQualifyingDays>=state.personalWeeklyGoal?'good':'info'}/></View>
   <Text style={s.copy}>{st('Play on {days} days this week. No daily streak required.',{days:state.personalWeeklyGoal})}</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{st("WEEKLY GUILD RALLY")}</Text><Text style={s.sectionTitle}>{state.rallyMarks}/{state.rallyTarget} {st("Rally Marks")}</Text></View><StatusPill label={socialLabel(language,tierLabel(state.rallyTier))} tone={state.rallyTier>0?'good':'muted'}/></View>
   <Progress value={rallyPct} C={C}/>
   <View style={s.metrics}>
    <Metric label={st("CHECKED IN")} value={state.checkedInMembersToday+'/'+state.memberCount} C={C}/>
    <Metric label={st("MARK TODAY")} value={String(state.qualifiedMembersToday)} C={C}/>
    <Metric label={st("HALL BONUS")} value={hallBonus?'+'+hallBonus+'%':'—'} C={C}/>
   </View>
   <Text style={s.copy}>{st('Rally tiers: 35% / 70% / 100%. Guild Projects earn +5% / +10% / +15% Hall Progress.')}</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>{st("ACTIVE GUILD")}</Text><Text style={s.sectionTitle}>{st('{percent}% Guild Activity',{percent:activityPct})}</Text></View><StatusPill label={activityPct>=100?st("MAX ACTIVITY"):nextActivity?st('{percent}% NEXT',{percent:nextActivity.threshold}):st("ACTIVE")} tone={activityPct>=60?'good':'info'}/></View>
   <Progress value={activityPct} C={C}/>
   <Text style={s.copy}>{st('Complete Guild Quests, Muster and Projects to raise activity.')}</Text>
   <View style={s.activityMilestones}>{GUILD_ACTIVITY_MILESTONE_DEFS.map(row=><View key={row.threshold} style={[s.activityMilestone,activityPct>=row.threshold&&s.activityMilestoneOn]}><Text style={[s.activityPct,activityPct>=row.threshold&&s.activityPctOn]}>{row.threshold}%</Text><View style={s.flex}><Text style={s.activityName}>{socialLabel(language,row.name)}</Text><Text style={s.note}>{socialLabel(language,row.description)}</Text></View></View>)}</View>
   <Text style={s.note}>{state.activityDecayMode==='protected'?st('Activity secured today.'):state.activityDecayMode==='partial'?st('More activity helps prevent a drop.'):st('Stay active to avoid losing progress.')}</Text>
   <Text style={s.note}>{st('Bonuses: +{gather}% Gathering · +{production}% Production · +{skill}% Skill XP · +{mastery}% Mastery XP · +{rare}% Rare Materials.',{gather:state.gatheringSpeedBps/100,production:state.productionSpeedBps/100,skill:state.activitySkillXpBps/100,mastery:state.masteryXpBps/100,rare:state.rareMaterialRelativeBps/100})}</Text>
  </Panel>

  <Panel>
   <View style={s.head}><Text style={s.sectionTitle}>{st("This week’s contributors")}</Text><Text style={s.meta}>{st('{count} members',{count:members.length})}</Text></View>
   {visibleMembers.map((member,index)=><View key={member.accountId} style={s.member}>
    <Text style={s.rank}>#{index+1}</Text><View style={s.flex}><Text numberOfLines={1} style={s.memberName}>{member.displayName}</Text><Text style={s.meta}>{st('{role} · {days}/{goal} Rally days',{role:socialLabel(language,roleLabel(member.role)),days:member.qualifyingDays,goal:state.personalWeeklyGoal})}</Text></View>
    <View style={s.memberNumbers}><Text style={s.memberPoints}>{member.weeklyPoints}</Text><Text style={s.memberToday}>{st('today {count}',{count:member.todayPoints})}</Text></View>
   </View>)}
   {members.length>visibleMembers.length?<Text style={s.note}>{st('+{count} more contributors',{count:members.length-visibleMembers.length})}</Text>:null}
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
 metrics:{flexDirection:'row',gap:6},metric:{flex:1,minWidth:0,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,alignItems:'center'},metricValue:{fontSize:16,lineHeight:20,color:C.text,fontWeight:'900'},metricLabel:{fontSize:11,lineHeight:14,color:C.muted,fontWeight:'900',letterSpacing:.6,textAlign:'center'},
 activityMilestones:{gap:5,marginTop:7},activityMilestone:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,opacity:.62},activityMilestoneOn:{opacity:1,borderColor:C.good,backgroundColor:C.goodSurface},activityPct:{width:40,fontSize:13,color:C.muted,fontWeight:'900'},activityPctOn:{color:C.good},activityName:{fontSize:13,color:C.text,fontWeight:'900'},member:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},rank:{width:28,fontSize:13,color:C.muted,fontWeight:'900'},memberName:{fontSize:13,color:C.text,fontWeight:'900'},memberNumbers:{alignItems:'flex-end'},memberPoints:{fontSize:13,color:C.accent,fontWeight:'900'},memberToday:{fontSize:11,color:C.muted,fontWeight:'700'},error:{fontSize:13,color:C.bad},
});}
