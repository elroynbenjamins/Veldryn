import type {GameState,QueuedActivity} from './types';
import type {ProgressionGoal,GoalProgress} from './progression-goals-v40';
import {progressionGoalView} from './progression-goals-v40';
import {progressionGoalContext,progressionGoalDestination,workingTowardDestinationAvailability,type WorkingTowardDestination} from './working-toward';
import {recipePreparationTrackingView} from './recipe-preparation-tracking';
import {activityQueueCapacity,normalizeActivityQueue,queuedActivityReadiness} from './activity-queue';
import {bestGatheringTrainingDestination} from './skill-progression-navigation';
import {weeklyOrderQueueActivity} from './weekly-order-integrations-v41';
import type {IdleRuleSet,IdleStopCondition} from './idle-rules-v40';

export type WorkingTowardExecutionState='active'|'ready'|'queued'|'travel'|'blocked'|'full'|'unsupported';

export interface WorkingTowardExecutionPlan{
 goal:ProgressionGoal;
 view:GoalProgress|ReturnType<typeof recipePreparationTrackingView>;
 destination:WorkingTowardDestination;
 executionState:WorkingTowardExecutionState;
 executionLabel:string;
 queueActivity?:QueuedActivity;
 queueBlocker?:string;
 activeNow:boolean;
 alreadyQueued:boolean;
 queueFull:boolean;
 stopRule?:IdleRuleSet;
 stopRuleActive:boolean;
}

function queueActivityForGoal(state:GameState,goal:ProgressionGoal,destination:WorkingTowardDestination):QueuedActivity|undefined{
 if(destination.kind==='combat')return {kind:'combat',targetId:destination.monsterId};
 if(destination.kind==='skills'&&destination.mode==='gathering'&&destination.actionId)return {kind:'gathering',targetId:destination.actionId};
 if(goal.kind==='skill_level'){
  const best=bestGatheringTrainingDestination(state,goal.skillId as any);
  if(best?.actionId)return {kind:'gathering',targetId:best.actionId};
 }
 if(goal.kind==='weekly_order'){
  const order=state.account.weeklyOrders?.orders.find(row=>row.id===goal.orderId);
  return order?weeklyOrderQueueActivity(order):undefined;
 }
 return undefined;
}

function isActiveGoalActivity(state:GameState,activity:QueuedActivity|undefined){
 if(!activity||!state.activity||state.activity.targetId!==activity.targetId)return false;
 if(activity.kind==='combat')return state.activity.kind==='combat'&&state.activity.combatChallengeId===activity.combatChallengeId;
 return ['mining','woodcutting','fishing','herbalism'].includes(state.activity.kind);
}

function stopCondition(goal:ProgressionGoal):IdleStopCondition|undefined{
 const id=('goal-stop:'+goal.id).slice(0,80);
 if(goal.kind==='item_quantity')return {id,kind:'item_quantity',targetId:goal.itemId,value:goal.targetQuantity,enabled:true};
 if(goal.kind==='skill_level')return {id,kind:'skill_level',targetId:goal.skillId,value:goal.targetLevel,enabled:true};
 if(goal.kind==='monster_kills')return {id,kind:'monster_kills',targetId:goal.monsterId,value:goal.targetKills,enabled:true};
 if(goal.kind==='weekly_order')return {id,kind:'weekly_order_progress',targetId:goal.orderId,value:goal.targetProgress,enabled:true};
 return undefined;
}

export function workingTowardStopRule(goal:ProgressionGoal,characterId:string):IdleRuleSet|undefined{
 const condition=stopCondition(goal);if(!condition)return undefined;
 return {
  id:('goal-rule:'+goal.id).slice(0,80),
  characterId,
  name:('Goal · '+goal.title).slice(0,40),
  conditions:[condition],
  stopIfOutOfFood:true,
  stopIfRewardsWouldOverflow:true,
  finishCurrentCycle:true,
 };
}

export function workingTowardExecutionPlan(state:GameState,goal:ProgressionGoal):WorkingTowardExecutionPlan{
 const context=progressionGoalContext(state);
 const tracked=goal.kind==='recipe_preparation'?recipePreparationTrackingView(state,goal):undefined;
 const view=tracked??progressionGoalView(goal,context);
 const destination=tracked?.destination??progressionGoalDestination(state,goal);
 const availability=workingTowardDestinationAvailability(state,destination);
 const queueActivity=queueActivityForGoal(state,goal,destination);
 const capacity=activityQueueCapacity(state),queue=normalizeActivityQueue(state.character?.activityQueue,capacity);
 const activeNow=isActiveGoalActivity(state,queueActivity);
 const alreadyQueued=!!queueActivity&&queue.some(row=>row.kind===queueActivity.kind&&row.targetId===queueActivity.targetId&&row.combatChallengeId===queueActivity.combatChallengeId);
 const queueFull=queue.length>=capacity;
 const readiness=queueActivity?queuedActivityReadiness(state,queueActivity):undefined;
 let executionState:WorkingTowardExecutionState='unsupported',executionLabel='Open next step',queueBlocker:string|undefined;
 if(view.status==='complete'){executionState='unsupported';executionLabel='Goal complete';}
 else if(activeNow){executionState='active';executionLabel='Active now';}
 else if(alreadyQueued){executionState='queued';executionLabel='Queued';}
 else if(queueActivity&&availability.status==='travel'){executionState='travel';executionLabel='Travel first';queueBlocker=availability.detail;}
 else if(queueActivity&&!readiness?.ready&&readiness?.blocker?.startsWith('Travel to ')){executionState='travel';executionLabel='Travel first';queueBlocker=readiness.blocker;}
 else if(queueActivity&&(!readiness?.ready||availability.status==='locked')){executionState='blocked';executionLabel='Resolve blocker';queueBlocker=readiness?.blocker??availability.detail;}
 else if(queueActivity&&queueFull){executionState='full';executionLabel='Queue full';queueBlocker=`Action queue is full (${capacity}/${capacity}).`;}
 else if(queueActivity&&readiness?.ready){executionState='ready';executionLabel='Queue next action';}
 else if(availability.status==='travel'){executionState='travel';executionLabel='Travel first';queueBlocker=availability.detail;}
 else if(view.status==='blocked'||availability.status==='locked'){executionState='blocked';executionLabel='Resolve blocker';queueBlocker=(view as any).blocker??availability.detail;}
 const stopRule=state.character?workingTowardStopRule(goal,state.character.id):undefined;
 const stopRuleActive=!!stopRule&&state.character?.activeIdleRuleIdV40===stopRule.id;
 return {goal,view,destination,executionState,executionLabel,queueActivity,queueBlocker,activeNow,alreadyQueued,queueFull,stopRule,stopRuleActive};
}

export interface WorkingTowardExecutionOverview{
 plans:WorkingTowardExecutionPlan[];
 focus?:WorkingTowardExecutionPlan;
 complete:number;
 active:number;
 blocked:number;
 queueable:number;
}

export function workingTowardExecutionOverview(state:GameState):WorkingTowardExecutionOverview{
 const plans=(state.character?.progressionGoals??[]).map(goal=>workingTowardExecutionPlan(state,goal));
 const complete=plans.filter(row=>row.view.status==='complete').length;
 const active=plans.filter(row=>row.view.status==='active').length;
 const blocked=plans.filter(row=>row.view.status==='blocked').length;
 const queueable=plans.filter(row=>row.executionState==='ready'||row.executionState==='queued'||row.executionState==='active').length;
 const focus=[...plans].sort((a,b)=>{
  const priority=(row:WorkingTowardExecutionPlan)=>row.executionState==='active'?0:row.view.status==='complete'?1:row.executionState==='ready'?2:row.executionState==='queued'?3:row.view.status==='active'?4:5;
  return priority(a)-priority(b)||b.view.progress-a.view.progress||a.goal.pinnedAtMs-b.goal.pinnedAtMs;
 })[0];
 return {plans,focus,complete,active,blocked,queueable};
}
