import React from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState,RewardBundle} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {ActivityCard} from '../components/ActivityCard';
import {StatBar} from '../components/StatBar';
import {characterProgressWithinLevel} from '../core/progression';
import {activityCycleSeconds,activityRate,dashboardRecommendation,DashboardDestination} from '../core/dashboard';
import {C,spacing,typography} from '../theme/theme';
import {CharacterVisual} from '../components/CharacterVisual';
import {CharacterAvatar} from '../components/CustomizationControls';
import {DEFAULT_CUSTOMIZATION} from '../core/customization';
import {BattleStage} from '../components/BattleStage';
import {offlineCapBreakdown} from '../core/game';

export function HomeScreen({state,preview,onClaim,onStop,onNavigate}:{state:GameState;preview:RewardBundle;onClaim:()=>void;onStop:()=>void;onNavigate:(tab:DashboardDestination,zoneId?:string)=>void}){
  const c=state.character!,p=characterProgressWithinLevel(c.xp,c.level);
  const activityName=MONSTERS.find(x=>x.id===state.activity?.targetId)?.name||GATHERING.find(x=>x.id===state.activity?.targetId)?.name;
  const activityCycle=activityCycleSeconds(state);
  const completed=state.quests.filter(q=>q.status==='complete').length;
  const guide=dashboardRecommendation(state),rate=activityRate(state);
  const afk=offlineCapBreakdown(state);
  const activeMonster=state.activity?.kind==='combat'?MONSTERS.find(x=>x.id===state.activity?.targetId):undefined;
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>ASTERFALL · LOCAL SAVE</Text><View style={s.hero}><CharacterAvatar body={c.bodyPresentation??'male'} view="front" value={c.customization??DEFAULT_CUSTOMIZATION} compact/><View style={s.flex}><Text style={s.name}>{c.name}</Text><Text style={s.small}>{c.classId.replace('_',' ')} · Level {c.level}</Text><Text style={s.gold}>◈ {c.gold}</Text></View></View><StatBar label="Experience" current={p.current} max={p.need}/>
    <CharacterVisual state={state} compact/>
    {activeMonster&&<BattleStage state={state} monster={activeMonster} elapsedSeconds={preview.elapsedSeconds} cycleSeconds={activityCycle}/>} 
    {state.activity&&activityName?<ActivityCard title={activityName} kind={state.activity.kind==='combat'?'combat':'gathering'} cycleSeconds={activityCycle} capHours={afk.hours} preview={preview} rates={rate} onClaim={onClaim} onStop={onStop}/>:<Panel><Text style={s.title}>Choose your next activity</Text><Text style={s.small}>Explore an unlocked region or gather materials for your next upgrade.</Text></Panel>}
    <Panel><Text style={s.guideLabel}>AFK RESERVE · {afk.hours}/{afk.maxHours} HOURS</Text><Text style={s.small}>Base {afk.baseHours}h. Earn free +2h upgrades through your class set, campaign milestones, additional characters, guild membership, and your first boss.</Text><View style={s.afkSources}>{afk.sources.map(source=><Text key={source.id} style={source.earned?s.afkEarned:s.afkLocked}>{source.earned?'✓':'○'} {source.name} · +2h</Text>)}</View></Panel>
    <Panel><Text style={s.guideLabel}>{guide.priority==='urgent'?'ATTENTION':'ADVENTURE GUIDE'}</Text><Text style={s.title}>{guide.title}</Text><Text style={s.small}>{guide.detail}</Text><GameButton title={guide.button} tone={guide.priority==='urgent'?'primary':'secondary'} onPress={()=>onNavigate(guide.destination,guide.zoneId)}/></Panel>
    <View style={s.resourceRow}><View style={s.resource}><Text style={s.resourceValue}>{state.inventory.stacks.length}/{state.inventory.capacity}</Text><Text style={s.resourceLabel}>BAG SLOTS</Text></View><View style={s.resource}><Text style={s.resourceValue}>{state.bank.stacks.length}/{state.bank.capacity}</Text><Text style={s.resourceLabel}>BANK</Text></View><View style={s.resource}><Text style={s.resourceValue}>{state.unlockedMonsterIds.length}/{MONSTERS.filter(m=>!m.boss).length}</Text><Text style={s.resourceLabel}>BESTIARY</Text></View></View>
    <View style={s.top}><View style={s.flex}><GameButton title="Explore world" onPress={()=>onNavigate('World')}/></View><View style={s.flex}><GameButton title="Gather & craft" onPress={()=>onNavigate('Skills')}/></View></View>
    <GameButton title={preview.stoppedReason?'Recover & equip food':'Manage equipment & food'} tone="secondary" onPress={()=>onNavigate('Inventory')}/>
    {completed>0&&<GameButton title={`Claim ${completed} completed quest${completed===1?'':'s'}`} onPress={()=>onNavigate('Quests')}/>}
    <Panel><Text style={s.title}>Milestone: The Fallen Knight</Text><Text style={s.small}>{state.defeatedBossIds.includes('FALLEN_KNIGHT')?'The Fallen Knight is defeated. Asterfall milestone complete.':'Reach level 25, prepare your gear, then challenge the Fallen Knight.'}</Text><Text style={s.progress}>Current level: {c.level} / 25</Text></Panel>
  </ScrollView>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},kicker:{...typography.caption,color:C.accent,fontWeight:'800',letterSpacing:1},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.md},hero:{flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:12,padding:spacing.sm},flex:{flex:1},name:{fontSize:25,lineHeight:32,color:C.text,fontWeight:'900'},small:{...typography.body,color:C.muted},gold:{color:C.accent,fontSize:18,fontWeight:'900'},title:{...typography.title,color:C.text},progress:{...typography.bodyStrong,color:C.accent},guideLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},afkSources:{gap:spacing.xs},afkEarned:{...typography.caption,color:C.good},afkLocked:{...typography.caption,color:C.muted},resourceRow:{flexDirection:'row',gap:spacing.sm},resource:{flex:1,alignItems:'center',backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:10,padding:spacing.sm},resourceValue:{...typography.title,color:C.text},resourceLabel:{...typography.caption,color:C.muted,fontWeight:'800'}});
