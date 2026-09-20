import type {GameState} from './types';
import type {WeeklyOrder} from './weekly-orders-v41';
import {weeklyOrderBoardForState} from './long-term-progression-runtime';

export interface ContractBoardSummary{
 weekKey:string;
 endsAtMs:number;
 total:number;
 complete:number;
 pendingRewards:number;
 completionRewardQueued:boolean;
 nextOrder?:WeeklyOrder;
}

function progressRatio(order:WeeklyOrder){return order.target>0?Math.max(0,Math.min(1,order.progress/order.target)):1}

export function contractBoardSummary(state:GameState,nowMs=Date.now()):ContractBoardSummary{
 const board=weeklyOrderBoardForState(state,nowMs);
 const pending=(state.account.weeklyOrderPendingRewards??[]).filter(row=>row.weekKey===board.weekKey);
 const incomplete=board.orders.filter(order=>order.progress<order.target);
 const nextOrder=[...incomplete].sort((a,b)=>{
  const currentA=a.regionId&&a.regionId===state.currentRegionId?0:1,currentB=b.regionId&&b.regionId===state.currentRegionId?0:1;
  return currentA-currentB||progressRatio(b)-progressRatio(a)||a.slot-b.slot;
 })[0];
 return {
  weekKey:board.weekKey,
  endsAtMs:board.endsAtMs,
  total:board.orders.length,
  complete:board.orders.filter(order=>order.progress>=order.target).length,
  pendingRewards:pending.length,
  completionRewardQueued:board.completionClaimed,
  nextOrder,
 };
}
