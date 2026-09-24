import {useEffect,useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {LoadingState} from './LoadingState';
import {Panel} from './Panel';
import {StatusPill} from './StatusPill';
import {guildMusterDailyPercent,guildMusterRallyPercent} from '../core/guild-muster';
import {GUILD_ACTIVITY_DAILY_DECAY_PERCENT,GUILD_ACTIVITY_MILESTONE_DEFS,guildActivityNextMilestone} from '../core/guild-activity';
import {loadOnlineGuildMuster,type OnlineGuildMusterMember,type OnlineGuildMusterState} from '../online/guild-muster';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

function tierLabel(tier:0|1|2|3){return tier===3?'RALLY III':tier===2?'RALLY II':tier===1?'RALLY I':'BUILDING';}
function roleLabel(role:string){return role.replace(/_/g,' ').replace(/\b\w/g,value=>value.toUpperCase());}

export function OnlineGuildMusterPanel(){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [state,setState]=useState<OnlineGuildMusterState|null>(null),[members,setMembers]=useState<OnlineGuildMusterMember[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const snapshot=await loadOnlineGuildMuster();setState(snapshot?.state??null);setMembers(snapshot?.members??[]);}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load Guild Muster.')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 if(loading&&!state)return <LoadingState label="Loading Guild Muster…" detail="Checking today’s attendance and verified Guild contribution."/>;
 if(error&&!state)return <Panel><Text style={s.title}>Guild Muster</Text><Text style={s.error}>{error}</Text><GameButton compact title="Retry" tone="secondary" onPress={()=>void load()}/></Panel>;
 if(!state)return <Panel><Text style={s.title}>Guild Muster</Text><Text style={s.copy}>Join a Guild to take part in daily Muster and the shared weekly Rally.</Text></Panel>;

 const dailyPct=guildMusterDailyPercent(state.dailyPoints),rallyPct=guildMusterRallyPercent(state.rallyMarks,state.rallyTarget),hallBonus=state.hallBonusBps/100,activityPct=state.activityPercent,nextActivity=guildActivityNextMilestone(activityPct);
 const visibleMembers=members.slice(0,6);
 return <View style={s.root}>
  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>GUILD MUSTER</Text><Text style={s.title}>Show up. Play normally. Help together.</Text></View><StatusPill label={state.checkedIn?'CHECKED IN':'NOT CHECKED IN'} tone={state.checkedIn?'good':'muted'}/></View>
   <Text style={s.copy}>Your first authenticated session records today’s attendance. Verified Combat and Skilling then add capped Muster contribution automatically—there is no manual point button to spam.</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.sectionTitle}>Today</Text><Text style={s.meta}>{state.dailyPoints}/{state.dailyCap} contribution</Text></View><StatusPill label={state.rallyMarkEarned?'RALLY MARK':'IN PROGRESS'} tone={state.rallyMarkEarned?'good':'info'}/></View>
   <Progress value={dailyPct} C={C}/>
   <View style={s.metrics}>
    <Metric label="CHECK-IN" value={String(state.checkInPoints)} C={C}/>
    <Metric label="COMBAT" value={String(state.combatPoints)} C={C}/>
    <Metric label="SKILLING" value={String(state.skillingPoints)} C={C}/>
   </View>
   <Text style={s.note}>Reach {state.rallyMarkThreshold}/{state.dailyCap} today to earn one Rally Mark. Extra play can fill your daily contribution, but never creates more than one Mark per day.</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.sectionTitle}>Your weekly cadence</Text><Text style={s.meta}>{state.personalQualifyingDays}/{state.personalWeeklyGoal} Rally days · {state.personalWeeklyPoints} points</Text></View><StatusPill label={state.personalQualifyingDays>=state.personalWeeklyGoal?'READY':'4 OF 7'} tone={state.personalQualifyingDays>=state.personalWeeklyGoal?'good':'info'}/></View>
   <Text style={s.copy}>This is intentionally not a consecutive login streak. Four meaningful days in a week is enough, so missing a day does not reset anything.</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>WEEKLY GUILD RALLY</Text><Text style={s.sectionTitle}>{state.rallyMarks}/{state.rallyTarget} Rally Marks</Text></View><StatusPill label={tierLabel(state.rallyTier)} tone={state.rallyTier>0?'good':'muted'}/></View>
   <Progress value={activityPct} C={C}/>
   <View style={s.metrics}>
    <Metric label="CHECKED IN" value={state.checkedInMembersToday+'/'+state.memberCount} C={C}/>
    <Metric label="MARK TODAY" value={String(state.qualifiedMembersToday)} C={C}/>
    <Metric label="HALL BONUS" value={hallBonus?'+'+hallBonus+'%':'—'} C={C}/>
   </View>
   <Text style={s.copy}>Rally I / II / III unlock at 35% / 70% / 100% of the weekly target. They add +5% / +10% / +15% Hall Progress when a Guild Project completes that week. No new currency, no loot race, and no single member can carry the Rally alone.</Text>
   <Text style={s.note}>The target scales to roughly 60% of the current roster completing four meaningful days, so launch-size Guilds are not balanced around a full 20-player roster.</Text>
  </Panel>

  <Panel>
   <View style={s.head}><View style={s.flex}><Text style={s.kicker}>ACTIVE GUILD</Text><Text style={s.sectionTitle}>{activityPct}% Guild Activity</Text></View><StatusPill label={activityPct>=100?'MAX ACTIVITY':nextActivity?nextActivity.threshold+'% NEXT':'ACTIVE'} tone={activityPct>=60?'good':'info'}/></View>
   <Progress value={activityPct} C={C}/>
   <Text style={s.copy}>Guild Activity is sustained through Guild Quests, Muster and completed shared Projects. Its requirement scales from members active in the trailing 14 days, so dormant roster slots do not permanently inflate the target.</Text>
   <View style={s.activityMilestones}>{GUILD_ACTIVITY_MILESTONE_DEFS.map(row=><View key={row.threshold} style={[s.activityMilestone,activityPct>=row.threshold&&s.activityMilestoneOn]}><Text style={[s.activityPct,activityPct>=row.threshold&&s.activityPctOn]}>{row.threshold}%</Text><View style={s.flex}><Text style={s.activityName}>{row.name}</Text><Text style={s.note}>{row.description}</Text></View></View>)}</View>
   <Text style={s.note}>{state.activityDecayMode==='protected'?'Today is protected: enough Guild activity has been recorded to avoid decay.':state.activityDecayMode==='partial'?'Some activity is recorded today: if the day ends here, the meter loses only '+state.activityPartialDecayPercent+' percentage points.':'No meaningful Guild activity is recorded today yet: an inactive day loses '+(state.activityDailyDecayPercent||GUILD_ACTIVITY_DAILY_DECAY_PERCENT)+' percentage points.'} There is no weekly hard reset.</Text>
   <Text style={s.note}>Current unlocked effects: +{state.gatheringSpeedBps/100}% gathering · +{state.productionSpeedBps/100}% production · +{state.activitySkillXpBps/100}% Skill XP · +{state.masteryXpBps/100}% Mastery XP · +{state.rareMaterialRelativeBps/100}% relative rare materials. Today: {state.activityTodayUnits}/{state.activityTargetUnits} activity units from {state.activityActiveMemberCount} recently active member{state.activityActiveMemberCount===1?'':'s'}.</Text>
  </Panel>

  <Panel>
   <View style={s.head}><Text style={s.sectionTitle}>This week’s contributors</Text><Text style={s.meta}>{members.length} members</Text></View>
   {visibleMembers.map((member,index)=><View key={member.accountId} style={s.member}>
    <Text style={s.rank}>#{index+1}</Text><View style={s.flex}><Text numberOfLines={1} style={s.memberName}>{member.displayName}</Text><Text style={s.meta}>{roleLabel(member.role)} · {member.qualifyingDays}/{state.personalWeeklyGoal} Rally days</Text></View>
    <View style={s.memberNumbers}><Text style={s.memberPoints}>{member.weeklyPoints}</Text><Text style={s.memberToday}>today {member.todayPoints}</Text></View>
   </View>)}
   {members.length>visibleMembers.length?<Text style={s.note}>+{members.length-visibleMembers.length} more members contribute to the Rally.</Text>:null}
  </Panel>
  <GameButton compact title={loading?'Refreshing…':'Refresh Muster'} tone="secondary" disabled={loading} onPress={()=>void load()}/>
  {!!error&&<Text style={s.error}>{error}</Text>}
 </View>;
}

function Progress({value,C}:{value:number;C:ThemeColors}){const s=useMemo(()=>makeStyles(C),[C]);return <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:value}} style={s.track}><View style={[s.fill,{width:(value+'%') as any}]}/></View>}
function Metric({label,value,C}:{label:string;value:string;C:ThemeColors}){const s=useMemo(()=>makeStyles(C),[C]);return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},sectionTitle:{fontSize:12,color:C.text,fontWeight:'900'},copy:{fontSize:9.5,lineHeight:14,color:C.muted},meta:{fontSize:8.5,lineHeight:12,color:C.muted,fontWeight:'700'},note:{fontSize:8.5,lineHeight:12,color:C.muted},
 track:{height:8,borderRadius:4,overflow:'hidden',backgroundColor:C.panel2,marginVertical:8},fill:{height:'100%',backgroundColor:C.accent},
 metrics:{flexDirection:'row',gap:6},metric:{flex:1,minWidth:0,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,alignItems:'center'},metricValue:{fontSize:11,color:C.text,fontWeight:'900'},metricLabel:{fontSize:7,color:C.muted,fontWeight:'900',letterSpacing:.45,textAlign:'center'},
 activityMilestones:{gap:5,marginTop:7},activityMilestone:{minHeight:46,flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,opacity:.62},activityMilestoneOn:{opacity:1,borderColor:C.good,backgroundColor:C.goodSurface},activityPct:{width:36,fontSize:10,color:C.muted,fontWeight:'900'},activityPctOn:{color:C.good},activityName:{fontSize:9.5,color:C.text,fontWeight:'900'},member:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},rank:{width:24,fontSize:8.5,color:C.muted,fontWeight:'900'},memberName:{fontSize:10,color:C.text,fontWeight:'900'},memberNumbers:{alignItems:'flex-end'},memberPoints:{fontSize:10,color:C.accent,fontWeight:'900'},memberToday:{fontSize:7.5,color:C.muted,fontWeight:'700'},error:{fontSize:9.5,color:C.bad},
});}
