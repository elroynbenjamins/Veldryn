import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useState,useMemo} from 'react';
import {GameState,RewardBundle,SkillId} from '../core/types';
import {CLASSES} from '../content/classes';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {ActivityCard} from '../components/ActivityCard';
import {StatBar} from '../components/StatBar';
import {characterProgressWithinLevel} from '../core/progression';
import {activityCycleSeconds,activityRate,campaignProgressSummary,dashboardRecommendation,DashboardDestination} from '../core/dashboard';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {CharacterPortrait} from '../components/CharacterVisual';
import {BattleStage} from '../components/BattleStage';
import {offlineCapBreakdown} from '../core/game';
import {environmentForActivity} from '../core/world-weather';
import {EnvironmentBanner} from '../components/EnvironmentBanner';
import {activeLiveEvent,eventCurrencyBalance,eventProgress} from '../core/live-events';
import {SkillDashboard} from '../components/SkillDashboard';
import {UiIcon} from '../components/UiIcon';
import {NewUnlocksPanel} from '../components/NewUnlocksPanel';
import {challengeHuntLabel} from '../core/challenge-hunts';
import {ActionQueuePanel} from '../components/ActionQueuePanel';
import {WorkingTowardSummary} from '../components/WorkingTowardSummary';
import type {WorkingTowardDestination} from '../core/working-toward';
import {ContractBoardSummary} from '../components/ContractBoardSummary';
import {weeklyOrderDestination} from '../core/weekly-order-integrations-v41';
import {DailySuppliesSummary} from '../components/DailySuppliesSummary';
import {HomeSessionOverview} from '../components/HomeSessionOverview';

export function HomeScreen({state,preview,nowMs,onClaim,onStop,onQueueRemove,onQueueMove,onQueueClear,onQueueStart,onNavigate,onOpenCombat,onOpenSkill,onOpenPlanner,onNavigateGoal}:{state:GameState;preview:RewardBundle;nowMs:number;onClaim:()=>void;onStop:()=>void;onQueueRemove:(index:number)=>void;onQueueMove:(index:number,direction:'up'|'down')=>void;onQueueClear:()=>void;onQueueStart:()=>void;onNavigate:(tab:DashboardDestination|'Events'|'DailySupplies',zoneId?:string)=>void;onOpenCombat:()=>void;onOpenSkill:(skillId:SkillId)=>void;onOpenPlanner:()=>void;onNavigateGoal:(destination:WorkingTowardDestination)=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [showAfkSources,setShowAfkSources]=useState(false),[showEncounter,setShowEncounter]=useState(false),[showProgress,setShowProgress]=useState(false),[showLedger,setShowLedger]=useState(false);
 const c=state.character!,p=characterProgressWithinLevel(c.xp,c.level),className=CLASSES.find(x=>x.id===c.classId)?.name??c.classId;
 const activityMonster=MONSTERS.find(x=>x.id===state.activity?.targetId),activityName=activityMonster&&state.activity?.kind==='combat'?challengeHuntLabel(state.activity.combatChallengeId,activityMonster.name,state.activity.combatAffixId):activityMonster?.name||GATHERING.find(x=>x.id===state.activity?.targetId)?.name;
 const cycle=activityCycleSeconds(state),guide=dashboardRecommendation(state),campaign=campaignProgressSummary(state),rate=activityRate(state),afk=offlineCapBreakdown(state);
 const completed=state.quests.filter(q=>q.status==='complete').length,monster=state.activity?.kind==='combat'?MONSTERS.find(x=>x.id===state.activity?.targetId):undefined;
 const environment=state.activity?environmentForActivity(state.activity):undefined;
 const event=activeLiveEvent(state),pendingMarks=preview.eventDrops?.reduce((sum,drop)=>sum+drop.quantity,0)??0;
 return <ScrollView contentContainerStyle={s.root}>
  <View style={s.identity}><CharacterPortrait state={state} style={s.portrait}/><View style={s.flex}><Text accessibilityRole="header" style={s.name}>{c.name}</Text><Text style={s.small}>{className} · Level {c.level}</Text></View></View>
  <StatBar reduceMotion={state.settings.reduceMotion} label="Experience" current={p.current} max={p.need}/>
  {state.activity&&activityName?<ActivityCard title={activityName} kind={state.activity.kind==='combat'?'combat':'gathering'} activity={state.activity} cycleSeconds={cycle} capHours={afk.hours} preview={preview} rates={rate} reduceMotion={state.settings.reduceMotion} numberMode={state.settings.numberMode} onClaim={onClaim} onStop={onStop}/>:<Panel><Text style={s.title}>Your next adventure</Text><Text style={s.small}>Choose a hunt or gathering activity to start earning.</Text><GameButton title="Explore activities" onPress={onOpenCombat}/></Panel>}
  <View style={[s.guide,guide.priority==='urgent'&&s.urgent]}><Text style={s.kicker}>{guide.priority==='urgent'?'ATTENTION':'NEXT STEP'}</Text><Text style={s.title}>{guide.title}</Text><Text style={s.small}>{guide.detail}</Text><GameButton title={guide.button} tone={guide.priority==='urgent'?'primary':'secondary'} onPress={()=>onNavigate(guide.destination,guide.zoneId)}/></View>
  <HomeSessionOverview state={state} nowMs={nowMs} onQuests={()=>onNavigate('Quests')} onDaily={()=>onNavigate('DailySupplies')} onEvents={()=>onNavigate('Events')} onGoals={onOpenPlanner} onWeekly={()=>onNavigate('Quests')} onNew={()=>onNavigate('Settings')}/>
  <View style={s.campaignStrip}><View style={s.flex}><Text style={s.kicker}>ASTERFALL CAMPAIGN · CHAPTER {campaign.chapter}/{campaign.total}</Text><Text numberOfLines={1} style={s.campaignTitle}>{campaign.currentTitle}</Text><View style={s.campaignTrack}><View style={[s.campaignFill,{width:`${Math.max(2,campaign.campaignPct)}%`}]}/></View><Text style={s.campaignMeta}>{campaign.claimed}/{campaign.total} claimed{campaign.ready?` · ${campaign.ready} reward${campaign.ready===1?'':'s'} ready`:''} · Fallen Knight {campaign.bossDefeated?'defeated':`Lv. ${campaign.level}/25`}</Text></View><GameButton compact title={completed>0?`Claim ${completed}`:'Journal'} tone={completed>0?'primary':'secondary'} onPress={()=>onNavigate('Quests')}/></View>
  <ActionQueuePanel state={state} onRemove={onQueueRemove} onMove={onQueueMove} onClear={onQueueClear} onStartNext={onQueueStart}/>
  {state.activity&&environment&&<View><Pressable accessibilityRole="button" accessibilityState={{expanded:showEncounter}} onPress={()=>setShowEncounter(v=>!v)} style={s.disclosure}><Text style={s.link}>{monster?'Encounter preview':'Activity conditions'}</Text><UiIcon name={showEncounter?'close':'next'} size={24}/></Pressable>{showEncounter&&<View style={s.expanded}><EnvironmentBanner environment={environment} kind={state.activity.kind} nowMs={Date.now()} locked/>{monster&&<BattleStage state={state} monster={monster} elapsedSeconds={preview.elapsedSeconds} cycleSeconds={cycle}/>}</View>}</View>}
  {event&&<View style={[s.event,{borderLeftColor:event.definition.accent}]}><View style={s.row}><UiIcon name="events" size={32}/><View style={s.flex}><Text style={s.kicker}>LIVE EVENT</Text><Text style={s.title}>{event.definition.name}</Text></View></View><Text style={s.small}>{eventProgress(state,event.definition.id).toLocaleString()} reputation · {eventCurrencyBalance(state,event.definition.id).toLocaleString()} marks{pendingMarks?` · +${pendingMarks} ready`:''}</Text><GameButton title="Open event" tone="secondary" onPress={()=>onNavigate('Events')}/></View>}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showProgress}} onPress={()=>setShowProgress(v=>!v)} style={s.disclosure}><View style={s.flex}><Text style={s.link}>Goals, daily & skill progress</Text><Text style={s.disclosureMeta}>Working Toward · Contract Board · Daily Supplies · skill snapshot</Text></View><UiIcon name={showProgress?'close':'next'} size={24}/></Pressable>
  {showProgress&&<View style={s.expanded}><WorkingTowardSummary state={state} onOpen={onOpenPlanner} onNavigate={onNavigateGoal}/><ContractBoardSummary state={state} nowMs={nowMs} onOpen={()=>onNavigate('Quests')} onContinue={order=>onNavigateGoal(weeklyOrderDestination(order))}/><DailySuppliesSummary state={state} nowMs={nowMs} onOpen={()=>onNavigate('DailySupplies')}/><NewUnlocksPanel state={state} onOpen={()=>onNavigate('Settings')}/><SkillDashboard state={state} onCombat={onOpenCombat} onSkill={onOpenSkill}/></View>}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showLedger}} onPress={()=>setShowLedger(v=>!v)} style={s.disclosure}><Text style={s.link}>Storage, AFK reserve & milestones</Text><UiIcon name={showLedger?'close':'next'} size={24}/></Pressable>
  {showLedger&&<View style={s.expanded}><View style={s.row}><Text style={s.small}>Bag {state.inventory.stacks.length}/{state.inventory.capacity}</Text><Text style={s.small}>Bank {state.bank.stacks.length}/{state.bank.capacity}</Text><Text style={s.small}>Bestiary {state.unlockedMonsterIds.length}/{MONSTERS.filter(m=>!m.boss).length}</Text></View>
   <Panel><Pressable accessibilityRole="button" accessibilityState={{expanded:showAfkSources}} onPress={()=>setShowAfkSources(v=>!v)} style={s.disclosure}><View style={s.flex}><Text style={s.title}>AFK reserve · {afk.hours}/{afk.maxHours} hours</Text><Text style={s.small}>Base {afk.baseHours}h · {afk.sources.filter(x=>x.earned).length}/{afk.sources.length} upgrades earned</Text></View><UiIcon name="next" size={24}/></Pressable>{showAfkSources&&afk.sources.map(source=><Text key={source.id} style={source.earned?s.earned:s.small}>{source.earned?'✓':'○'} {source.name} · +2h</Text>)}</Panel>
   <Panel><Text style={s.title}>The Fallen Knight</Text><Text style={s.small}>{state.defeatedBossIds.includes('FALLEN_KNIGHT')?'Asterfall milestone complete.':'Reach level 25, prepare your gear, then challenge the Fallen Knight.'}</Text><Text style={s.small}>Level {c.level} / 25</Text></Panel>
  </View>}
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{padding:spacing.md,gap:10,paddingBottom:spacing.xl},identity:{flexDirection:'row',alignItems:'center',gap:9,padding:7,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:C.panel},portrait:{width:50,height:64},flex:{flex:1,minWidth:0},name:{...typography.hero,color:C.text,fontSize:22,lineHeight:28},small:{...typography.body,color:C.muted},title:{...typography.title,color:C.text},kicker:{...typography.caption,color:C.accent,letterSpacing:.8,fontWeight:'600'},guide:{gap:6,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panelRaised},urgent:{borderLeftWidth:4,borderLeftColor:C.warning,paddingLeft:spacing.md},row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12},disclosure:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingVertical:8},link:{...typography.bodyStrong,color:C.info,flex:1},disclosureMeta:{...typography.caption,color:C.muted},expanded:{gap:12},event:{padding:12,gap:7,backgroundColor:C.panel,borderRadius:radii.md,borderLeftWidth:3},campaignStrip:{flexDirection:'row',alignItems:'center',gap:8,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},campaignTitle:{...typography.bodyStrong,color:C.text},campaignTrack:{height:7,marginVertical:5,borderRadius:4,overflow:'hidden',backgroundColor:C.bg},campaignFill:{height:'100%',backgroundColor:C.accent},campaignMeta:{fontSize:10,lineHeight:14,color:C.muted},earned:{...typography.body,color:C.good}});}
