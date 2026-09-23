import type {ProgressionGoal} from './progression-goals-v40';
import type {IdleRuleSet,IdleStopCondition} from './idle-rules-v40';
import type {WeeklyOrder,WeeklyOrdersState} from './weekly-orders-v41';
import type {QueuedActivity,SkillId} from './types';
import type {WorkingTowardDestination} from './working-toward';
import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {WORLD_ZONES} from '../content/world-map';

export function weeklyOrderGoal(order:WeeklyOrder,characterId:string,nowMs:number):ProgressionGoal{
 return {id:`goal:${order.id}`,characterId,kind:'weekly_order',title:order.title,createdAtMs:nowMs,pinnedAtMs:nowMs,orderId:order.id,targetProgress:order.target};
}
export function weeklyOrderIdleCondition(order:WeeklyOrder,id=`weekly:${order.id}`):IdleStopCondition{
 return {id,kind:'weekly_order_progress',targetId:order.id,value:order.target,enabled:true};
}
export function weeklyOrderIdleRuleId(order:WeeklyOrder){return `contract:${order.id}`.slice(0,80)}
export function weeklyOrderIdleRule(order:WeeklyOrder,characterId:string):IdleRuleSet{
 const id=weeklyOrderIdleRuleId(order);
 return {id,characterId,name:(`Stop · ${order.title}`).slice(0,40),conditions:[weeklyOrderIdleCondition(order,`${id}:done`.slice(0,80))],stopIfOutOfFood:true,stopIfRewardsWouldOverflow:true,finishCurrentCycle:true};
}
export function weeklyOrderProgressMap(state:WeeklyOrdersState){return Object.fromEntries(state.orders.map(order=>[order.id,order.progress]))}
export function weeklyOrderPriority(input:{regionCompletionPercent?:number;masteryRank?:number;recentlyTargeted?:boolean}){
 let score=50;if(input.regionCompletionPercent!==undefined)score-=Math.max(0,Math.min(100,100-input.regionCompletionPercent))*.2;
 if(input.masteryRank!==undefined)score-=Math.max(0,50-Math.max(0,Math.min(50,input.masteryRank)))*.25;
 if(input.recentlyTargeted)score+=30;return Math.max(0,Math.round(score));
}
/** Weekly-order links are projections. They never modify permanent Region Completion percentages. */
export function regionWeeklyOrderRows(regionId:string,state:WeeklyOrdersState){return state.orders.filter(order=>order.regionId===regionId).map(order=>({orderId:order.id,title:order.title,current:order.progress,target:order.target,complete:order.progress>=order.target}))}

function monsterIdForOrder(order:WeeklyOrder){
 if(order.kind==='hunt')return order.targetId;
 if(order.kind==='threat')return order.targetId.split(':')[0]||order.source.id;
 return undefined;
}

/** Exact player-facing destination for a Contract Board job. */
export function weeklyOrderDestination(order:WeeklyOrder):WorkingTowardDestination{
 if(order.kind==='hunt'||order.kind==='threat'){
  const monsterId=monsterIdForOrder(order)!,monster=MONSTERS.find(row=>row.id===monsterId),region=WORLD_ZONES.find(row=>row.id===order.regionId),boss=order.kind==='hunt'&&!!monster?.boss;
  return {kind:'combat',monsterId,zoneName:monster?.zone??region?.name??order.source.label,regionId:order.regionId,button:boss?'Open weekly boss':order.kind==='threat'?'Open Challenge Hunt':`Hunt ${monster?.name??order.source.label}`,detail:boss?'Defeat the Fallen Knight once this UTC week to complete the Oathglass Bounty. Up to three rewarded rematches are available; only the first is required for this Contract.':order.kind==='threat'?`Use the exact ${order.challengeId??'required'} Challenge Hunt. Normal hunts do not count.`:`Open ${monster?.name??order.source.label} in ${monster?.zone??region?.name??'its region'}.`};
 }
 if(order.kind==='profession'){
  const gather=[...GATHERING,...HERB_NODES].find(row=>row.id===order.targetId);
  if(gather)return {kind:'skills',skillId:gather.skillId as SkillId,mode:'gathering',actionId:gather.id,regionId:gather.zoneId,button:`Work ${gather.name}`,detail:`Open the exact ${gather.name} activity for this Work Order.`};
  const recipe=RECIPES.find(row=>row.id===order.targetId);
  if(recipe)return {kind:'skills',skillId:recipe.skillId as SkillId,mode:'crafting',recipeId:recipe.id,button:`Craft ${recipe.name}`,detail:`Open the exact ${recipe.name} recipe for this Work Order.`};
  return {kind:'skills',button:'Open Skills',detail:`Open Skills and continue ${order.source.label}.`};
 }
 return {kind:'world',regionId:order.regionId??order.targetId,button:'Open region',detail:`Combat and gathering in ${WORLD_ZONES.find(row=>row.id===order.regionId)?.name??order.source.label} advance this Regional Problem.`};
}

/** Queueable portion of a Contract Board job. Recipes and broad regional jobs stay manual. */
export function weeklyOrderQueueActivity(order:WeeklyOrder):QueuedActivity|undefined{
 if(order.kind==='hunt'){const monster=MONSTERS.find(row=>row.id===order.targetId);return monster?.boss?undefined:{kind:'combat',targetId:order.targetId};}
 if(order.kind==='threat'){
  const monsterId=monsterIdForOrder(order);
  return monsterId&&order.challengeId?{kind:'combat',targetId:monsterId,combatChallengeId:order.challengeId}:undefined;
 }
 if(order.kind==='profession'&&[...GATHERING,...HERB_NODES].some(row=>row.id===order.targetId))return {kind:'gathering',targetId:order.targetId};
 return undefined;
}
