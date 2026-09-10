import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useState} from 'react';
import {GameState,RewardBundle,SkillId} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {ActivityCard} from '../components/ActivityCard';
import {StatBar} from '../components/StatBar';
import {characterProgressWithinLevel} from '../core/progression';
import {activityCycleSeconds,activityRate,dashboardRecommendation,DashboardDestination} from '../core/dashboard';
import {C,radii,spacing,typography} from '../theme/theme';
import {CharacterVisual} from '../components/CharacterVisual';
import {BattleStage} from '../components/BattleStage';
import {offlineCapBreakdown} from '../core/game';
import {environmentForActivity} from '../core/world-weather';
import {EnvironmentBanner} from '../components/EnvironmentBanner';
import {formatGameNumber} from '../core/number-format';
import {activeLiveEvent,eventCurrencyBalance,eventProgress} from '../core/live-events';
import {SkillDashboard} from '../components/SkillDashboard';

export function HomeScreen({state,preview,onClaim,onStop,onNavigate,onOpenCombat,onOpenSkill}:{state:GameState;preview:RewardBundle;onClaim:()=>void;onStop:()=>void;onNavigate:(tab:DashboardDestination|'Events',zoneId?:string)=>void;onOpenCombat:()=>void;onOpenSkill:(skillId:SkillId)=>void}){
  const [showAfkSources,setShowAfkSources]=useState(false);
  const c=state.character!,p=characterProgressWithinLevel(c.xp,c.level);
  const activityName=MONSTERS.find(x=>x.id===state.activity?.targetId)?.name||GATHERING.find(x=>x.id===state.activity?.targetId)?.name;
  const activityCycle=activityCycleSeconds(state);
  const completed=state.quests.filter(q=>q.status==='complete').length;
  const guide=dashboardRecommendation(state),rate=activityRate(state);
  const afk=offlineCapBreakdown(state);
  const activeMonster=state.activity?.kind==='combat'?MONSTERS.find(x=>x.id===state.activity?.targetId):undefined;
  const activeEnvironment=state.activity?environmentForActivity(state.activity):undefined;
  const event=activeLiveEvent(state),pendingEventMarks=preview.eventDrops?.reduce((sum,drop)=>sum+drop.quantity,0)??0;
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>SKILLS & ACTIVITIES</Text><SkillDashboard state={state} onCombat={onOpenCombat} onSkill={onOpenSkill}/><Text style={s.realmSection}>REALM OVERVIEW</Text><View style={s.hero}><View style={s.flex}><Text style={s.name}>{c.name}</Text><Text style={s.small}>{c.classId.replace('_',' ')} · Level {c.level}</Text></View><Text style={s.gold}>◈ {formatGameNumber(c.gold,state.settings.numberMode)}</Text></View><StatBar label="Experience" current={p.current} max={p.need}/>
    {event?<View style={[s.eventBanner,{borderColor:event.definition.accent}]}><View style={s.flex}><Text style={s.eventKicker}>LIVE EVENT</Text><Text style={s.eventName}>{event.definition.name}</Text><Text style={s.small}>{eventProgress(state,event.definition.id).toLocaleString()} reputation · {eventCurrencyBalance(state,event.definition.id).toLocaleString()} marks{pendingEventMarks?` · +${pendingEventMarks} ready`:''}</Text></View><View style={s.eventAction}><GameButton title="Open" onPress={()=>onNavigate('Events')}/></View></View>:null}
    <CharacterVisual state={state} compact/>
    {activeEnvironment&&state.activity&&<EnvironmentBanner environment={activeEnvironment} kind={state.activity.kind} nowMs={Date.now()} locked/>}
    {activeMonster&&<BattleStage state={state} monster={activeMonster} elapsedSeconds={preview.elapsedSeconds} cycleSeconds={activityCycle}/>} 
    {state.activity&&activityName?<ActivityCard title={activityName} kind={state.activity.kind==='combat'?'combat':'gathering'} cycleSeconds={activityCycle} capHours={afk.hours} preview={preview} rates={rate} reduceMotion={state.settings.reduceMotion} numberMode={state.settings.numberMode} onClaim={onClaim} onStop={onStop}/>:<Panel><Text style={s.title}>Choose your next activity</Text><Text style={s.small}>Explore an unlocked region or gather materials for your next upgrade.</Text></Panel>}
    <Panel><Pressable accessibilityRole="button" accessibilityState={{expanded:showAfkSources}} onPress={()=>setShowAfkSources(value=>!value)} style={s.disclosure}><View style={s.flex}><Text style={s.guideLabel}>AFK RESERVE · {afk.hours}/{afk.maxHours} HOURS</Text><Text style={s.small}>Base {afk.baseHours}h · {afk.sources.filter(source=>source.earned).length}/{afk.sources.length} free upgrades earned</Text></View><Text style={s.disclosureMark}>{showAfkSources?'−':'+'}</Text></Pressable>{showAfkSources&&<View style={s.afkSources}>{afk.sources.map(source=><Text key={source.id} style={source.earned?s.afkEarned:s.afkLocked}>{source.earned?'✓':'○'} {source.name} · +2h</Text>)}</View>}</Panel>
    <Panel><Text style={s.guideLabel}>{guide.priority==='urgent'?'ATTENTION':'ADVENTURE GUIDE'}</Text><Text style={s.title}>{guide.title}</Text><Text style={s.small}>{guide.detail}</Text><GameButton title={guide.button} tone={guide.priority==='urgent'?'primary':'secondary'} onPress={()=>onNavigate(guide.destination,guide.zoneId)}/></Panel>
    <View style={s.resourceRow}><View style={s.resource}><Text style={s.resourceValue}>{state.inventory.stacks.length}/{state.inventory.capacity}</Text><Text style={s.resourceLabel}>BAG SLOTS</Text></View><View style={s.resource}><Text style={s.resourceValue}>{state.bank.stacks.length}/{state.bank.capacity}</Text><Text style={s.resourceLabel}>BANK</Text></View><View style={s.resource}><Text style={s.resourceValue}>{state.unlockedMonsterIds.length}/{MONSTERS.filter(m=>!m.boss).length}</Text><Text style={s.resourceLabel}>BESTIARY</Text></View></View>
    <View style={s.top}><View style={s.flex}><GameButton title="Explore world" onPress={()=>onNavigate('World')}/></View><View style={s.flex}><GameButton title="Gather & craft" onPress={()=>onNavigate('Skills')}/></View></View>
    <GameButton title={preview.stoppedReason?'Recover & equip food':'Manage equipment & food'} tone="secondary" onPress={()=>onNavigate('Inventory')}/>
    {completed>0&&<GameButton title={`Claim ${completed} completed quest${completed===1?'':'s'}`} onPress={()=>onNavigate('Quests')}/>}
    <Panel><Text style={s.title}>Milestone: The Fallen Knight</Text><Text style={s.small}>{state.defeatedBossIds.includes('FALLEN_KNIGHT')?'The Fallen Knight is defeated. Asterfall milestone complete.':'Reach level 25, prepare your gear, then challenge the Fallen Knight.'}</Text><Text style={s.progress}>Current level: {c.level} / 25</Text></Panel>
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},kicker:{...typography.caption,color:C.accent,fontWeight:'800',letterSpacing:1},realmSection:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1.1,marginTop:spacing.sm},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.md},hero:{minHeight:72,flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:12,padding:spacing.md},eventBanner:{flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,backgroundColor:'#251c11',borderWidth:1,borderRadius:radii.lg},eventKicker:{...typography.caption,color:'#efbd69',fontWeight:'900',letterSpacing:1},eventName:{...typography.title,color:C.text},eventAction:{width:90},flex:{flex:1},name:{fontSize:25,lineHeight:32,color:C.text,fontWeight:'900'},small:{...typography.body,color:C.muted},gold:{color:C.accent,fontSize:18,fontWeight:'900'},title:{...typography.title,color:C.text},progress:{...typography.bodyStrong,color:C.accent},guideLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},disclosure:{minHeight:44,flexDirection:'row',alignItems:'center',gap:spacing.sm},disclosureMark:{width:28,color:C.accent,fontSize:25,textAlign:'center'},afkSources:{gap:spacing.xs,paddingTop:spacing.xs},afkEarned:{...typography.caption,color:C.good},afkLocked:{...typography.caption,color:C.muted},resourceRow:{flexDirection:'row',gap:spacing.sm},resource:{flex:1,alignItems:'center',backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:10,padding:spacing.sm},resourceValue:{...typography.title,color:C.text},resourceLabel:{...typography.caption,color:C.muted,fontWeight:'800'}});
