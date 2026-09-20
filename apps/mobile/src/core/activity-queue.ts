import type {GameState,QueuedActivity} from './types';
import type {IdleStopCondition} from './idle-rules-v40';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {COMBAT_CHALLENGE_IDS,COMBAT_CHALLENGES} from './challenge-hunts';
import {COMBAT_TACTIC_IDS,COMBAT_TACTICS} from './combat-tactics';
import {HUNT_GOAL_IDS,HUNT_GOALS} from './hunt-goals';

export const MAX_ACTIVITY_QUEUE=3;

export function normalizeQueuedActivity(value:unknown):QueuedActivity|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>,kind=row.kind,targetId=typeof row.targetId==='string'?row.targetId.trim():'';
 if((kind!=='combat'&&kind!=='gathering')||!targetId||targetId.length>100)return undefined;
 if(kind==='gathering')return {kind,targetId};
 const combatChallengeId=COMBAT_CHALLENGE_IDS.includes(row.combatChallengeId as any)?row.combatChallengeId as QueuedActivity['combatChallengeId']:undefined;
 const combatTacticId=COMBAT_TACTIC_IDS.includes(row.combatTacticId as any)?row.combatTacticId as QueuedActivity['combatTacticId']:undefined;
 const huntGoalId=HUNT_GOAL_IDS.includes(row.huntGoalId as any)?row.huntGoalId as QueuedActivity['huntGoalId']:undefined;
 return {kind,targetId,...(combatChallengeId?{combatChallengeId}:{}),...(combatTacticId?{combatTacticId}:{}),...(huntGoalId?{huntGoalId}:{})};
}
export function normalizeActivityQueue(value:unknown):QueuedActivity[]{
 if(!Array.isArray(value))return [];
 return value.flatMap(row=>{const normalized=normalizeQueuedActivity(row);return normalized?[normalized]:[]}).slice(0,MAX_ACTIVITY_QUEUE);
}
export function enqueueActivity(state:GameState,activity:QueuedActivity):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const queue=normalizeActivityQueue(state.character.activityQueue),next=normalizeQueuedActivity(activity);
 if(!next)throw new Error('Invalid queued activity.');
 if(queue.length>=MAX_ACTIVITY_QUEUE)throw new Error(`Action queue is full (${MAX_ACTIVITY_QUEUE}/${MAX_ACTIVITY_QUEUE}).`);
 return {...state,character:{...state.character,activityQueue:[...queue,next],activityQueuePausedReason:undefined}};
}
export function removeQueuedActivity(state:GameState,index:number):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const queue=normalizeActivityQueue(state.character.activityQueue);
 if(!Number.isSafeInteger(index)||index<0||index>=queue.length)throw new Error('Queued action was not found.');
 return {...state,character:{...state.character,activityQueue:queue.filter((_,i)=>i!==index),activityQueuePausedReason:undefined}};
}
export function moveQueuedActivity(state:GameState,index:number,direction:'up'|'down'):GameState{
 if(!state.character)throw new Error('Create a character first.');
 const queue=normalizeActivityQueue(state.character.activityQueue);
 if(!Number.isSafeInteger(index)||index<0||index>=queue.length)throw new Error('Queued action was not found.');
 const target=direction==='up'?index-1:index+1;
 if(target<0||target>=queue.length)return state;
 const next=[...queue],[moved]=next.splice(index,1);next.splice(target,0,moved);
 return {...state,character:{...state.character,activityQueue:next,activityQueuePausedReason:undefined}};
}
export function clearActivityQueue(state:GameState):GameState{
 if(!state.character)return state;
 return {...state,character:{...state.character,activityQueue:[],activityQueuePausedReason:undefined}};
}
export function activityQueueLabel(activity:QueuedActivity){
 if(activity.kind==='combat'){
  const monster=MONSTERS.find(row=>row.id===activity.targetId),challenge=activity.combatChallengeId?COMBAT_CHALLENGES[activity.combatChallengeId]:undefined,tactic=activity.combatTacticId?COMBAT_TACTICS[activity.combatTacticId]:undefined,goal=activity.huntGoalId?HUNT_GOALS[activity.huntGoalId]:undefined;
  return [challenge?.shortName,monster?.name??activity.targetId,tactic&&tactic.id!=='balanced'?tactic.name:undefined,goal&&goal.id!=='open'?goal.label:undefined].filter(Boolean).join(' · ');
 }
 return [...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId)?.name??activity.targetId;
}


export interface ActivityQueueHandoffStatus{
 armed:boolean;
 sourceLabel?:string;
 nextLabel?:string;
 safetyEnabled:boolean;
}
function activeRegionId(state:GameState){
 const activity=state.activity;if(!activity)return undefined;
 if(activity.kind==='combat'){const monster=MONSTERS.find(row=>row.id===activity.targetId);return monster?WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id:undefined;}
 return [...GATHERING,...HERB_NODES].find(row=>row.id===activity.targetId)?.zoneId;
}
function activityCanAdvanceWeeklyOrder(state:GameState,orderId:string){
 const activity=state.activity,order=state.account.weeklyOrders?.orders.find(row=>row.id===orderId);if(!activity||!order)return false;
 if(order.progress>=order.target)return true;
 if(order.kind==='hunt')return activity.kind==='combat'&&order.targetId===activity.targetId;
 if(order.kind==='threat')return activity.kind==='combat'&&!!activity.combatChallengeId&&order.targetId===activity.targetId+':'+activity.combatChallengeId;
 if(order.kind==='profession')return activity.kind!=='combat'&&activity.kind!=='exploration'&&order.targetId===activity.targetId;
 if(order.kind==='regional')return order.targetId===activeRegionId(state)&&(activity.kind==='combat'||['mining','woodcutting','fishing','herbalism'].includes(activity.kind));
 return false;
}
function activityCanAdvanceCondition(state:GameState,condition:IdleStopCondition){
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
 const queue=normalizeActivityQueue(state.character?.activityQueue),next=queue[0],character=state.character,activity=state.activity;
 const rule=character?.activeIdleRuleIdV40?character.idleRulesV40?.find(row=>row.id===character.activeIdleRuleIdV40):undefined;
 const nonSafetyApplicable=rule?.conditions.some(condition=>condition.kind!=='food_below'&&condition.kind!=='free_slots_below'&&activityCanAdvanceCondition(state,condition))??false;
 const huntGoal=activity?.kind==='combat'?activity.huntGoal:undefined;
 const sources=[huntGoal?.label,nonSafetyApplicable?rule?.name:undefined].filter(Boolean) as string[];
 const safetyEnabled=!!rule&&(rule.stopIfOutOfFood||rule.stopIfRewardsWouldOverflow||rule.conditions.some(condition=>condition.enabled&&(condition.kind==='food_below'||condition.kind==='free_slots_below')));
 return {armed:!!activity&&!!next&&(!!huntGoal||nonSafetyApplicable),sourceLabel:sources.join(' + ')||undefined,nextLabel:next?activityQueueLabel(next):undefined,safetyEnabled};
}
