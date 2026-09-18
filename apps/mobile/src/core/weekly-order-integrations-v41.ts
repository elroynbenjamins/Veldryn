import type {ProgressionGoal} from './progression-goals-v40';
import type {IdleStopCondition} from './idle-rules-v40';
import type {WeeklyOrder,WeeklyOrdersState} from './weekly-orders-v41';

export function weeklyOrderGoal(order:WeeklyOrder,characterId:string,nowMs:number):ProgressionGoal{
 return {id:`goal:${order.id}`,characterId,kind:'weekly_order',title:order.title,createdAtMs:nowMs,pinnedAtMs:nowMs,orderId:order.id,targetProgress:order.target};
}
export function weeklyOrderIdleCondition(order:WeeklyOrder,id=`weekly:${order.id}`):IdleStopCondition{
 return {id,kind:'weekly_order_progress',targetId:order.id,value:order.target,enabled:true};
}
export function weeklyOrderProgressMap(state:WeeklyOrdersState){return Object.fromEntries(state.orders.map(order=>[order.id,order.progress]))}
export function weeklyOrderPriority(input:{regionCompletionPercent?:number;masteryRank?:number;recentlyTargeted?:boolean}){
 let score=50;if(input.regionCompletionPercent!==undefined)score-=Math.max(0,Math.min(100,100-input.regionCompletionPercent))*.2;
 if(input.masteryRank!==undefined)score-=Math.max(0,50-Math.max(0,Math.min(50,input.masteryRank)))*.25;
 if(input.recentlyTargeted)score+=30;return Math.max(0,Math.round(score));
}
/** Weekly-order links are projections. They never modify permanent Region Completion percentages. */
export function regionWeeklyOrderRows(regionId:string,state:WeeklyOrdersState){return state.orders.filter(order=>order.regionId===regionId).map(order=>({orderId:order.id,title:order.title,current:order.progress,target:order.target,complete:order.progress>=order.target}))}
