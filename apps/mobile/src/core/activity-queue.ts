import type {ActivityQueueGoal,GameState,GatheringSkillId,QueuedActivity} from './types';
import type {IdleStopCondition} from './idle-rules-v40';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {COMBAT_TACTIC_IDS,COMBAT_TACTICS} from './combat-tactics';
import {HUNT_GOAL_IDS,HUNT_GOALS} from './hunt-goals';
import {accountEntitlementBenefits} from './account-entitlements';

export const BASE_ACTIVITY_QUEUE=2;
export const MAX_ACTIVITY_QUEUE=3;
export function normalizeQueueCombatRecovery(value:unknown):{needsHealing:boolean;minimumFood:number}|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>;
 if(typeof row.needsHealing!=='boolean'||!Number.isSafeInteger(row.minimumFood)||Number(row.minimumFood)<0||Number(row.minimumFood)>1_000_000)return undefined;
 return {needsHealing:row.needsHealing,minimumFood:Number(row.minimumFood)};
}
export function normalizeActivityQueueGoal(value:unknown):ActivityQueueGoal|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>;
 if(!['duration_seconds','item_quantity','skill_level','session_kills'].includes(String(row.kind))||!Number.isSafeInteger(row.value)||Number(row.value)<1)return undefined;
 const kind=row.kind as ActivityQueueGoal['kind'],maximum=kind==='skill_level'?100:kind==='duration_seconds'?30*3600:1_000_000;
 return Number(row.value)<=maximum?{kind,value:Number(row.value)}:undefined;
}
export function activityQueueGoalLabel(goal:ActivityQueueGoal){
 return goal.kind==='duration_seconds'?`${goal.value/60} min`:goal.kind==='skill_level'?`Level ${goal.value}`:goal.kind==='session_kills'?`${goal.value.toLocaleString()} defeats`:`${goal.value.toLocaleString()} in storage`;
}
export function activityQueueCapacity(state:GameState){return Math.min(MAX_ACTIVITY_QUEUE,BASE_ACTIVITY_QUEUE+accountEntitlementBenefits(state).actionQueueSlots);}

export function normalizeQueuedActivity(value:unknown):QueuedActivity|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,kind=row.kind,targetId=typeof row.targetId==='string'?row.targetId.trim():'';
 if((kind!=='combat'&&kind!=='gathering')||!targetId||targetId.length>100)return undefined;
 const goal=normalizeActivityQueueGoal(row.goal);
 if(row.goal!==undefined&&(!goal||(kind==='combat'&&!['duration_seconds','session_kills'].includes(goal.kind))||(kind==='gathering'&&goal.kind==='session_kills')))return undefined;
 if(kind==='gathering')return {kind,targetId,...(goal?{goal}:{})};
 const combatTacticId=COMBAT_TACTIC_IDS.includes(row.combatTacticId as any)?row.combatTacticId as QueuedActivity['combatTacticId']:undefined;
 const huntGoalId=HUNT_GOAL_IDS.includes(row.huntGoalId as any)?row.huntGoalId as QueuedActivity['huntGoalId']:undefined;
 return {kind,targetId,...(combatTacticId?{combatTacticId}:{}),...(huntGoalId?{huntGoalId}:{}),...(goal?{goal}:{})};
}
export function normalizeActivityQueue(value:unknown,limit=BASE_ACTIVITY_QUEUE):QueuedActivity[]{
 if(!Array.isArray(value))return [];
 return value.flatMap(row=>{const normalized=normalizeQueuedActivity(row);return normalized?[normalized]:[]}).slice(0,Math.max(BASE_ACTIVITY_QUEUE,Math.min(MAX_ACTIVITY_QUEUE,limit)));
}
export function enqueueActivity(state:GameState,activity:QueuedActivity):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character.activityQueue,capacity),next=normalizeQueuedActivity(activity);
 if(!next)throw new Error('Invalid queued activity.');
 if(queue.length>=capacity)throw new Error(`Action queue is full (${capacity}/${capacity}).`);
 return {...state,character:{...state.character,activityQueue:[...queue,next],activityQueuePausedReason:undefined}};
}
export function removeQueuedActivity(state:GameState,index:number):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const queue=normalizeActivityQueue(state.character.activityQueue,activityQueueCapacity(state));
 if(!Number.isSafeInteger(index)||index<0||index>=queue.length)throw new Error('Queued action was not found.');
 return {...state,character:{...state.character,activityQueue:queue.filter((_,i)=>i!==index),activityQueuePausedReason:undefined}};
}
export function moveQueuedActivity(state:GameState,index:number,direction:'up'|'down'):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const queue=normalizeActivityQueue(state.character.activityQueue,activityQueueCapacity(state));
 if(!Number.isSafeInteger(index)||index<0||index>=queue.length)throw new Error('Queued action was not found.');
 const target=direction==='up'?index-1:index+1;
 if(target<0||target>=queue.length)return state;
 const next=[...queue],[moved]=next.splice(index,1);next.splice(target,0,moved);
 return {...state,character:{...state.character,activityQueue:next,activityQueuePausedReason:undefined}};
}
export function clearActivityQueue(state:GameState):GameState{
 if(!state.character)return state;
 return {...state,character:{...state.character,activityQueue:[],activityQueuePausedReason:undefined,activityQueueCombatRecovery:undefined}};
}
export function activityQueueLabel(activity:QueuedActivity){
 if(activity.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===activity.targetId),tactic=activity.combatTacticId?COMBAT_TACTICS[activity.combatTacticId]:undefined,goal=activity.huntGoalId?HUNT_GOALS[activity.huntGoalId]:undefined;
  return [monster?.name??activity.targetId,tactic&&tactic.id!=='balanced'?tactic.name:undefined,activity.goal?activityQueueGoalLabel(activity.goal):goal&&goal.id!=='open'?goal.label:undefined].filter(Boolean).join(' · ');
 }
 return [[...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId)?.name??activity.targetId,activity.goal?activityQueueGoalLabel(activity.goal):undefined].filter(Boolean).join(' · ');
}


export interface ActivityQueueHandoffStatus{
 armed:boolean;
 sourceLabel?:string;
 nextLabel?:string;
 safetyEnabled:boolean;
 nextReady:boolean;
 nextBlocker?:string;
}
export interface QueuedActivityReadiness{ready:boolean;blocker?:string}
export function queueSkillReadiness(state:GameState,skillId:GatheringSkillId|'combat'):QueuedActivityReadiness{
 if(!state.character)return {ready:false,blocker:'Create a character first.'};
 const region=WORLD_ZONES.find(zone=>zone.id===state.currentRegionId),regionName=region?.name??state.currentRegionId;
 if(skillId==='combat'){
  const monsters=MONSTERS.filter(row=>!row.boss&&row.zone===region?.name);
  if(!monsters.length)return {ready:false,blocker:`Not available in ${regionName}.`};
  return monsters.some(row=>state.unlockedMonsterIds.includes(row.id))?{ready:true}:{ready:false,blocker:`No enemies unlocked in ${regionName}.`};
 }
 const nodes=[...GATHERING,...HERB_NODES].filter(row=>row.skillId===skillId&&row.zoneId===state.currentRegionId);
 if(!nodes.length)return {ready:false,blocker:`Not available in ${regionName}.`};
 const required=Math.min(...nodes.map(row=>row.unlockLevel)),level=state.skills.find(row=>row.skillId===skillId)?.level??1;
 return level>=required?{ready:true}:{ready:false,blocker:`Requires ${skillId} level ${required} in ${regionName}.`};
}
export function queuedActivityReadiness(state:GameState,activity:QueuedActivity|undefined):QueuedActivityReadiness{
 if(!activity)return {ready:false,blocker:undefined as string|undefined};
 if(!state.character)return {ready:false,blocker:'Create a character first.'};
 if(activity.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===activity.targetId);
  if(!monster)return {ready:false,blocker:'Queued monster is no longer available.'};
  if(!state.unlockedMonsterIds.includes(monster.id))return {ready:false,blocker:`${monster.name} is not unlocked yet.`};
  const region=WORLD_ZONES.find(zone=>zone.name===monster.zone);
  if(region?.id&&region.id!==state.currentRegionId)return {ready:false,blocker:`Travel to ${monster.zone} before ${monster.name}.`};
  const recovery=state.character.activityQueueCombatRecovery;
  if(recovery?.needsHealing&&state.character.currentHp<=1)return {ready:false,blocker:'Heal before resuming queued combat.'};
  if(recovery&&recovery.minimumFood>0){
   const food=state.inventory.stacks.find(row=>row.itemId===state.character?.equippedFoodId)?.quantity??0;
   if(food<recovery.minimumFood)return {ready:false,blocker:`Restock equipped food (${recovery.minimumFood} required) before queued combat.`};
  }
  return {ready:true,blocker:undefined};
 }
 const gather=[...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId);
 if(!gather)return {ready:false,blocker:'Queued gathering activity is no longer available.'};
 const region=WORLD_ZONES.find(zone=>zone.id===gather.zoneId);
 if(gather.zoneId!==state.currentRegionId)return {ready:false,blocker:`Travel to ${region?.name??gather.zoneId} before ${gather.name}.`};
 const level=state.skills.find(skill=>skill.skillId===gather.skillId)?.level??1;
 if(level<gather.unlockLevel)return {ready:false,blocker:`Requires ${gather.skillId} level ${gather.unlockLevel} for ${gather.name}.`};
 return {ready:true,blocker:undefined};
}
function activeRegionId(state:GameState){
 const activity=state.activity;if(!activity)return undefined;
 if(activity.kind==='combat'){const monster=MONSTERS.find(row=>row.id===activity.targetId);return monster?WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id:undefined;}
 return [...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId)?.zoneId;
}
function activityCanAdvanceWeeklyOrder(state:GameState,orderId:string){
 const activity=state.activity,order=state.account.weeklyOrders?.orders.find(row=>row.id===orderId);if(!activity||!order)return false;
 if(order.kind==='hunt')return activity.kind==='combat'&&order.targetId===activity.targetId;
 if(order.kind==='profession')return activity.kind!=='combat'&&activity.kind!=='exploration'&&order.targetId===activity.targetId;
 if(order.kind==='regional')return order.targetId===activeRegionId(state)&&(activity.kind==='combat'||['mining','woodcutting','fishing','herbalism'].includes(activity.kind));
 return false;
}
export function activityCanAdvanceCondition(state:GameState,condition:IdleStopCondition){
 if(!condition.enabled)return false;
 const activity=state.activity;if(!activity)return false;
 if(condition.kind==='duration_seconds')return true;
 if(condition.kind==='session_kills'||condition.kind==='champion_defeats')return activity.kind==='combat';
 if(condition.kind==='monster_kills')return activity.kind==='combat'&&condition.targetId===activity.targetId;
 if(condition.kind==='weekly_order_progress')return !!condition.targetId&&activityCanAdvanceWeeklyOrder(state,condition.targetId);
 if(condition.kind==='skill_level'){
  if(activity.kind==='combat'||activity.kind==='exploration')return false;
  return [...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId)?.skillId===condition.targetId;
 }
 if(condition.kind==='item_quantity'){
  if(activity.kind==='combat')return MONSTERS.find(row=>row.id===activity.targetId)?.drops.some(drop=>drop.itemId===condition.targetId)??false;
  if(activity.kind==='exploration')return false;
  return [...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId)?.itemId===condition.targetId;
 }
 return false;
}
export function activityQueueHandoffStatus(state:GameState):ActivityQueueHandoffStatus{
 const queue=normalizeActivityQueue(state.character?.activityQueue,activityQueueCapacity(state)),next=queue[0],character=state.character,activity=state.activity;
 const rule=character?.activeIdleRuleIdV40?character.idleRulesV40?.find(row=>row.id===character.activeIdleRuleIdV40):undefined;
 const nonSafetyApplicable=rule?.conditions.some(condition=>condition.kind!=='food_below'&&condition.kind!=='free_slots_below'&&activityCanAdvanceCondition(state,condition))??false;
 const completed=activity?.queueGoalCompletedAtMs!==undefined;
 const huntGoal=!completed&&activity?.kind==='combat'?activity.huntGoal:undefined;
 const queueGoal=!completed?activity?.queueGoal:undefined;
 const sources=[queueGoal?activityQueueGoalLabel(queueGoal):undefined,huntGoal?.label,!completed&&nonSafetyApplicable?rule?.name:undefined].filter(Boolean) as string[];
 const safetyEnabled=!!rule&&(rule.stopIfOutOfFood||rule.stopIfRewardsWouldOverflow||rule.conditions.some(condition=>condition.enabled&&(condition.kind==='food_below'||condition.kind==='free_slots_below')));
 const readiness=queuedActivityReadiness(state,next);
 return {armed:!!activity&&!!next&&!completed&&(!!queueGoal||!!huntGoal||nonSafetyApplicable),sourceLabel:sources.join(' + ')||undefined,nextLabel:next?activityQueueLabel(next):undefined,safetyEnabled,nextReady:readiness.ready,nextBlocker:readiness.blocker};
}
