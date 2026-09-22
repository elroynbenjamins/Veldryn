import {MONSTERS} from '../content/monsters';
import {QUESTS} from '../content/quests';
import {GATHERING} from '../content/skills';
import {WORLD_ZONES} from '../content/world-map';
import {HERB_NODES} from '../content/herbalism';
import {alchemyRecipeDef} from '../content/alchemy';
import {explorationRoute} from '../content/exploration';
import {GameState} from './types';
import {effectiveStats} from './game';
import {characterPermanentMultipliers} from './permanent-boosts';
import {classCombatStyle} from './class-combat';
import {environmentEffectForActivity} from './world-weather';
import {gatheringPacing} from './gathering-tools';
import {companionCombatContribution} from './combat-companions';
import {monsterMastery} from './monster-mastery';
import {dailySuppliesHomeSummary} from './daily-supplies-home';
import {contractBoardSummary} from './contract-board-summary';
import {workingTowardReadyCount} from './working-toward';
import {newlyUnlockedGameGuide} from './onboarding';
import {eventReadyClaimCount} from './live-events';
const COMBAT_SPEED_MIN=.68;
const COMBAT_SPEED_MAX=1.3;
const COMBAT_TIME_SCALE=1.16;
const COMBAT_EXPECTED_SCALE=1.3;
const GATHER_TIME_SCALE=1.45;

export type DashboardDestination='World'|'Skills'|'Inventory'|'Quests'|'Character'|'Settings';
export interface DashboardRecommendation{title:string;detail:string;button:string;destination:DashboardDestination;zoneId?:string;priority:'urgent'|'progress'|'upgrade'}
export type HomeReadyKind='quests'|'daily'|'events'|'goals';
export interface HomeSessionReadyAction{kind:HomeReadyKind;title:string;detail:string;button:string}
export interface HomeSessionSummary{
 readyTotal:number;
 storyRewards:number;
 dailyReady:boolean;
 eventRewards:number;
 goalReady:number;
 goalTotal:number;
 weeklyComplete:number;
 weeklyTotal:number;
 newUnlocks:number;
 primaryReady?:HomeSessionReadyAction;
}
export function homeSessionSummary(state:GameState,nowMs=Date.now()):HomeSessionSummary{
 const storyRewards=state.quests.filter(row=>row.status==='complete').length;
 const dailyReady=dailySuppliesHomeSummary(state,nowMs).canClaim;
 const eventRewards=eventReadyClaimCount(state,nowMs);
 const goalReady=workingTowardReadyCount(state),goalTotal=state.character?.progressionGoals?.length??0;
 const weekly=contractBoardSummary(state,nowMs),newUnlocks=newlyUnlockedGameGuide(state).length;
 const readyTotal=storyRewards+(dailyReady?1:0)+eventRewards+goalReady;
 const primaryReady:HomeSessionReadyAction|undefined=storyRewards
  ?{kind:'quests',title:storyRewards===1?'Story reward ready':storyRewards+' story rewards ready',detail:'Claim completed Asterfall chapters to unlock the next story beat.',button:'Open Journal'}
  :dailyReady
   ?{kind:'daily',title:'Daily Supplies ready',detail:"Today's account-wide supply claim is available.",button:'Open Daily Supplies'}
   :eventRewards
    ?{kind:'events',title:eventRewards===1?'Event reward ready':eventRewards+' event rewards ready',detail:'Your active event has claimable rewards or gifts.',button:'Open Event'}
    :goalReady
     ?{kind:'goals',title:goalReady===1?'Pinned goal complete':goalReady+' pinned goals complete',detail:'Review completed Working Toward goals and choose what to pursue next.',button:'Open Goals'}
     :undefined;
 return {readyTotal,storyRewards,dailyReady,eventRewards,goalReady,goalTotal,weeklyComplete:weekly.complete,weeklyTotal:weekly.total,newUnlocks,primaryReady};
}

/** A single, deterministic next-step recommendation for the home screen. */
export function dashboardRecommendation(state:GameState):DashboardRecommendation{
  const c=state.character;
  if(!c)return {title:'Create your hero',detail:'Choose a class to begin.',button:'Create character',destination:'Character',priority:'progress'};
  if(state.overflow.stacks.length)return {title:'Overflow needs attention',detail:`${state.overflow.stacks.length} reward stack${state.overflow.stacks.length===1?' is':'s are'} waiting. Move them before the 72-hour hold expires.`,button:'Manage rewards',destination:'Inventory',priority:'urgent'};
  if(c.currentHp<=Math.max(5,Math.floor(c.hp*.35)))return {title:'Recover before hunting',detail:'Your health is low. Eat food or equip a stronger ration before continuing combat.',button:'Open food & gear',destination:'Inventory',priority:'urgent'};
  const ready=state.quests.find(q=>q.status==='complete');
  if(ready){const def=QUESTS.find(q=>q.id===ready.questId);return {title:'Chapter reward ready',detail:def?`${def.name} is complete. Claim it to unlock the next chapter.`:'A journal reward is ready.',button:'Claim reward',destination:'Quests',priority:'progress'}}
  const active=state.quests.find(q=>q.status==='active'),def=QUESTS.find(q=>q.id===active?.questId);
  if(def?.kind==='kills'&&def.targetId){const monster=MONSTERS.find(m=>m.id===def.targetId);if(monster&&state.unlockedMonsterIds.includes(monster.id)){const zoneId=WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id;return {title:`Continue: ${def.name}`,detail:`Hunt ${monster.name} in ${monster.zone} · ${Math.max(0,def.required-(active?.progress??0))} remaining.`,button:'Open hunting ground',destination:'World',zoneId,priority:'progress'}}}
  if(def?.kind==='item')return {title:`Continue: ${def.name}`,detail:def.description,button:'Gather materials',destination:'Skills',priority:'progress'};
  if(def?.kind==='skillLevel')return {title:`Continue: ${def.name}`,detail:def.description,button:'Train a skill',destination:'Skills',priority:'progress'};
  if(def?.kind==='equip')return {title:`Continue: ${def.name}`,detail:def.description,button:'Review equipment',destination:'Inventory',priority:'upgrade'};
  if(def?.kind==='level'){const remaining=Math.max(0,def.required-c.level);return {title:`Continue: ${def.name}`,detail:`Reach character level ${def.required}${remaining?` · ${remaining} level${remaining===1?'':'s'} remaining`:''}. Keep collecting combat rewards and improving your gear.`,button:'Choose a hunt',destination:'World',priority:'progress'}}
  if(def?.kind==='boss')return {title:'Prepare for the Fallen Knight',detail:'Improve your equipment, food, and mastery before the milestone battle.',button:'Review character',destination:'Character',priority:'upgrade'};
  const next=MONSTERS.filter(m=>!m.boss&&state.unlockedMonsterIds.includes(m.id)).sort((a,b)=>b.level-a.level)[0];
  return next?{title:'Push your combat level',detail:`${next.name} is your strongest unlocked target in ${next.zone}.`,button:'Choose a hunt',destination:'World',zoneId:next.zone,priority:'progress'}:{title:'Build your first supplies',detail:'Gather materials and craft your first upgrade.',button:'Open skills',destination:'Skills',priority:'upgrade'};
}

export function activityCycleSeconds(state:GameState){
  const target=state.activity?.targetId;
  const monster=MONSTERS.find(m=>m.id===target),gathering=[...GATHERING,...HERB_NODES].find(g=>g.id===target);
  const brew=state.activity?.kind==='alchemy'?alchemyRecipeDef(target??''):undefined;
  const route=state.activity?.kind==='exploration'?explorationRoute(target??''):undefined;
  if(brew)return brew.seconds;
  if(route)return route.seconds;
  const modifiers=characterPermanentMultipliers(state);
  const environmentMultiplier=state.activity?environmentEffectForActivity(state.activity).effect.actionTimeMultiplier:1;
  if(!monster){const specialty=gathering?.skillId==='fishing'?modifiers.fishingSpeedMultiplier:gathering?.skillId==='herbalism'?modifiers.herbalismSpeedMultiplier:1;return ((gathering?.seconds??1)*GATHER_TIME_SCALE*(gathering?gatheringPacing(state,gathering).timeMultiplier:1)*environmentMultiplier)/(modifiers.gatheringSpeedMultiplier*specialty);}
  const stats=effectiveStats(state),expected=monster.attack*1.2+monster.defense*.8+monster.level*2.2;
  const boostedPower=Math.max(1,Math.round(stats.power*modifiers.combatPowerMultiplier));
  const adjustedExpected=(expected*COMBAT_EXPECTED_SCALE);
  const speed=Math.max(COMBAT_SPEED_MIN,Math.min(COMBAT_SPEED_MAX,boostedPower/Math.max(1,adjustedExpected)))*classCombatStyle(state.character!.classId).speedMultiplier*modifiers.combatSpeedMultiplier;
  return monster.secondsPerKill*COMBAT_TIME_SCALE*environmentMultiplier/(speed*companionCombatContribution(state).outputMultiplier*(1+monsterMastery(state,monster.id).damageBonus));
}
export function activityRate(state:GameState){
  const target=state.activity?.targetId;
  const monster=MONSTERS.find(m=>m.id===target),gathering=[...GATHERING,...HERB_NODES].find(g=>g.id===target);
  const brew=state.activity?.kind==='alchemy'?alchemyRecipeDef(target??''):undefined;
  const multipliers=characterPermanentMultipliers(state);
  const effect=state.activity?environmentEffectForActivity(state.activity).effect:undefined;
  const seconds=activityCycleSeconds(state);
  const actions=Math.floor(3600/seconds);
  const baseXp = monster?.xp ?? gathering?.xp ?? brew?.xp ?? 0;
  const baseGold = monster?monster.gold:0;
  const xpMultiplier = (effect?.xpMultiplier??1)*(monster?multipliers.characterXpMultiplier:multipliers.skillXpMultiplier);
  const goldMultiplier = (effect?.goldMultiplier??1)*(monster?multipliers.goldMultiplier:1);
  return {actionsPerHour:actions,xpPerHour:Math.floor(actions*baseXp*xpMultiplier),goldPerHour:monster?Math.floor(actions*baseGold*goldMultiplier):0};
}


export function campaignProgressSummary(state:GameState){
  const claimed=state.quests.filter(row=>row.status==='claimed').length;
  const ready=state.quests.filter(row=>row.status==='complete').length;
  const current=state.quests.find(row=>row.status==='active'||row.status==='complete');
  const currentIndex=current?QUESTS.findIndex(def=>def.id===current.questId):-1;
  const currentDef=currentIndex>=0?QUESTS[currentIndex]:undefined;
  const fallenKnightDef=QUESTS.find(def=>def.id==='QST_014');
  const fallenKnightIndex=fallenKnightDef?QUESTS.indexOf(fallenKnightDef):-1;
  const bossDefeated=state.defeatedBossIds.includes('FALLEN_KNIGHT');
  const chapter=currentIndex>=0?currentIndex+1:Math.min(QUESTS.length,claimed+1);
  const campaignPct=Math.round(Math.min(1,claimed/Math.max(1,QUESTS.length))*100);
  return {
    claimed,
    total:QUESTS.length,
    ready,
    chapter,
    currentTitle:currentDef?.name??(claimed>=QUESTS.length?'Asterfall complete':'Next chapter'),
    campaignPct,
    fallenKnightChapter:fallenKnightIndex>=0?fallenKnightIndex+1:14,
    bossDefeated,
    bossReady:!!state.character&&state.character.level>=25,
    level:state.character?.level??0,
  };
}
