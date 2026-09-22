import type {GameState,GatheringSkillId,SkillId} from './types';
import type {GatherDef,Recipe} from '../content/skills';
import type {MonsterDef} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {GATHER_TIME_SCALE,COMBAT_TIME_SCALE} from './game';
import {environmentEffect,environmentForZone} from './world-weather';
import {gatheringPacing} from './gathering-tools';
import {characterPermanentMultipliers} from './permanent-boosts';
import {professionMasteryMultipliers,professionMasteryRankProgress} from './profession-mastery-v40';
import {professionMasteryActiveBonusText} from './profession-mastery-presentation';
import {characterProgressWithinLevel,characterTotalXpAtLevel,progressWithinLevel,totalXpAtLevel} from './progression';

export interface LevelPaceProjection{
  label:string;
  level:number;
  nextLevel:number;
  current:number;
  need:number;
  remainingXp:number;
  progress:number;
  xpPerHour:number;
  etaSeconds?:number;
}

export interface GatheringBalanceProjection{
  cycleSeconds:number;
  actionsPerHour:number;
  runtimeItemsPerHour:number;
  authoredMeanItemsPerHour:number;
  xpPerHour:number;
  capActions:number;
  capItems:number;
  capXp:number;
  pacing:ReturnType<typeof gatheringPacing>;
  mastery:ReturnType<typeof professionMasteryMultipliers>;
  rank:ReturnType<typeof professionMasteryRankProgress>;
  masteryBonus:string;
  levelPace:LevelPaceProjection;
}

export interface CombatBaselineProjection{
  cycleSeconds:number;
  killsPerHour:number;
  xpPerHour:number;
  goldPerHour:number;
}

export interface CraftingPaceProjection{
  cycleSeconds:number;
  craftsPerHour:number;
  xpPerCraft:number;
  xpPerHour:number;
  levelPace:LevelPaceProjection;
}

export interface DropExpectation{
  chance:number;
  oneIn:number;
  expectedQuantityPerHour:number;
  averageFindSeconds:number;
}

const safeEta=(remainingXp:number,xpPerHour:number)=>xpPerHour>0&&remainingXp>0?remainingXp/xpPerHour*3600:remainingXp<=0?0:undefined;

export function formatBalanceDuration(seconds:number|undefined){
  if(seconds===undefined||!Number.isFinite(seconds))return '—';
  const value=Math.max(0,Math.round(seconds));
  if(value<60)return '<1m';
  if(value<3600)return Math.max(1,Math.ceil(value/60))+'m';
  if(value<86400){const hours=Math.floor(value/3600),minutes=Math.ceil((value%3600)/60);return minutes?hours+'h '+minutes+'m':hours+'h';}
  const days=Math.floor(value/86400),hours=Math.floor((value%86400)/3600);return hours?days+'d '+hours+'h':days+'d';
}

export function skillLevelPace(state:GameState,skillId:SkillId,xpPerHour:number):LevelPaceProjection{
  const skill=state.skills.find(row=>row.skillId===skillId),level=skill?.level??1,totalXp=skill?.xp??0,within=progressWithinLevel(totalXp,level),remainingXp=Math.max(0,within.need-within.current);
  return {label:skillId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),level,nextLevel:Math.min(100,level+1),current:within.current,need:within.need,remainingXp,progress:within.need>0?Math.max(0,Math.min(1,within.current/within.need)):1,xpPerHour,etaSeconds:safeEta(remainingXp,xpPerHour)};
}

export function skillTargetEta(state:GameState,skillId:SkillId,targetLevel:number,xpPerHour:number){
  const skill=state.skills.find(row=>row.skillId===skillId),goal=Math.max(1,Math.min(100,Math.floor(targetLevel))),remainingXp=Math.max(0,totalXpAtLevel(goal)-(skill?.xp??0));
  return {targetLevel:goal,remainingXp,xpPerHour,etaSeconds:safeEta(remainingXp,xpPerHour)};
}

export function characterLevelPace(state:GameState,xpPerHour:number):LevelPaceProjection{
  const character=state.character,level=character?.level??1,totalXp=character?.xp??0,within=characterProgressWithinLevel(totalXp,level),remainingXp=Math.max(0,within.need-within.current);
  return {label:'Combat',level,nextLevel:Math.min(100,level+1),current:within.current,need:within.need,remainingXp,progress:within.need>0?Math.max(0,Math.min(1,within.current/within.need)):1,xpPerHour,etaSeconds:safeEta(remainingXp,xpPerHour)};
}

export function characterTargetEta(state:GameState,targetLevel:number,xpPerHour:number){
  const goal=Math.max(1,Math.min(100,Math.floor(targetLevel))),remainingXp=Math.max(0,characterTotalXpAtLevel(goal)-(state.character?.xp??0));
  return {targetLevel:goal,remainingXp,xpPerHour,etaSeconds:safeEta(remainingXp,xpPerHour)};
}

export function gatheringBalanceProjection(state:GameState,activity:GatherDef,offlineHours:number):GatheringBalanceProjection{
  const environment=environmentForZone(activity.zoneId),effect=environmentEffect(activity.skillId,environment),pacing=gatheringPacing(state,activity),permanent=characterPermanentMultipliers(state),mastery=professionMasteryMultipliers(activity.id,state.account.professionMasteryByAction?.[activity.id]),rank=professionMasteryRankProgress(activity.id,state.account.professionMasteryByAction?.[activity.id]);
  const cycleSeconds=activity.seconds*GATHER_TIME_SCALE*pacing.timeMultiplier*effect.actionTimeMultiplier/(permanent.gatheringSpeedMultiplier*mastery.speed),actionsPerHour=3600/Math.max(.1,cycleSeconds);
  const meanItems=(activity.min+activity.max)/2;
  // Settlement now rolls the authored min–max range deterministically per action,
  // so long-run runtime expectation and authored expectation intentionally match.
  const runtimeItemsPerHour=actionsPerHour*meanItems*effect.itemMultiplier*permanent.gatheringYieldMultiplier*mastery.yield;
  const authoredMeanItemsPerHour=runtimeItemsPerHour;
  const xpPerHour=actionsPerHour*activity.xp*effect.xpMultiplier*permanent.skillXpMultiplier*mastery.xp,capActions=Math.floor(Math.max(0,offlineHours)*3600/cycleSeconds);
  return {cycleSeconds,actionsPerHour,runtimeItemsPerHour,authoredMeanItemsPerHour,xpPerHour,capActions,capItems:Math.floor(capActions*((activity.min+activity.max)/2)*effect.itemMultiplier*permanent.gatheringYieldMultiplier*mastery.yield),capXp:Math.floor(capActions*activity.xp*effect.xpMultiplier*permanent.skillXpMultiplier*mastery.xp),pacing,mastery,rank,masteryBonus:professionMasteryActiveBonusText(state,activity.id),levelPace:skillLevelPace(state,activity.skillId,xpPerHour)};
}

export function craftingPaceProjection(state:GameState,recipe:Recipe,cycleSeconds:number,xpPerCraft:number):CraftingPaceProjection{
  const seconds=Math.max(.1,cycleSeconds),xp=Math.max(0,xpPerCraft),craftsPerHour=3600/seconds,xpPerHour=craftsPerHour*xp;
  return {cycleSeconds:seconds,craftsPerHour,xpPerCraft:xp,xpPerHour,levelPace:skillLevelPace(state,recipe.skillId,xpPerHour)};
}

export function combatBaselineProjection(monster:MonsterDef):CombatBaselineProjection{
  const cycleSeconds=Math.max(.1,monster.secondsPerKill*COMBAT_TIME_SCALE),killsPerHour=3600/cycleSeconds;
  return {cycleSeconds,killsPerHour,xpPerHour:killsPerHour*monster.xp,goldPerHour:killsPerHour*monster.gold};
}

export function dropExpectation(chance:number,min:number,max:number,killsPerHour:number):DropExpectation{
  const normalizedChance=Math.max(0,Math.min(1,chance)),oneIn=normalizedChance>0?1/normalizedChance:Number.POSITIVE_INFINITY,meanQuantity=(Math.max(0,min)+Math.max(min,max))/2,findsPerHour=killsPerHour*normalizedChance;
  return {chance:normalizedChance,oneIn,expectedQuantityPerHour:findsPerHour*meanQuantity,averageFindSeconds:findsPerHour>0?3600/findsPerHour:Number.POSITIVE_INFINITY};
}

export type DropPaceBand='frequent'|'progression'|'chase'|'long_chase';
export function dropPaceBand(averageFindSeconds:number):{band:DropPaceBand;label:string}{
  if(!Number.isFinite(averageFindSeconds)||averageFindSeconds>=12*3600)return {band:'long_chase',label:'LONG CHASE'};
  if(averageFindSeconds>=90*60)return {band:'chase',label:'CHASE'};
  if(averageFindSeconds>=10*60)return {band:'progression',label:'PROGRESSION'};
  return {band:'frequent',label:'FREQUENT'};
}

export type ActivityProgressKind='combat'|'gathering'|'crafting'|'training'|'exploration'|'faith'|'hunting';
export function activityProgressFeedback(kind:ActivityProgressKind,progress:number){
 const p=Math.max(0,Math.min(1,progress));
 if(kind==='combat')return p<.25?'Tracking the target…':p<.65?'Trading blows…':p<.92?'Pressing the advantage…':'Finishing the encounter…';
 if(kind==='crafting')return p<.25?'Preparing materials…':p<.7?'Crafting in progress…':p<.95?'Finishing the work…':'Quality check…';
 if(kind==='training')return p<.25?'Warming up…':p<.7?'Practicing technique…':p<.95?'Refining form…':'Completing the drill…';
 if(kind==='exploration')return p<.25?'Setting out…':p<.7?'Surveying the route…':p<.95?'Following the trail…':'Completing the route…';
 if(kind==='faith')return p<.25?'Beginning practice…':p<.7?'Maintaining focus…':p<.95?'Deepening devotion…':'Completing the practice…';
 if(kind==='hunting')return p<.25?'Reading tracks…':p<.7?'Following signs…':p<.95?'Closing in…':'Completing the hunt…';
 return p<.25?'Preparing tools…':p<.7?'Working the resource…':p<.95?'Finishing the action…':'Packing the yield…';
}

export function activeActivityLevelPace(state:GameState,xpPerHour:number):LevelPaceProjection|undefined{
  const activity=state.activity;if(!activity)return undefined;
  if(activity.kind==='combat')return characterLevelPace(state,xpPerHour);
  const gather=[...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId);
  if(gather)return skillLevelPace(state,gather.skillId as GatheringSkillId,xpPerHour);
  if(activity.kind==='alchemy'||activity.kind==='exploration'||activity.kind==='faith'||activity.kind==='hunting')return skillLevelPace(state,activity.kind as SkillId,xpPerHour);
  return undefined;
}
