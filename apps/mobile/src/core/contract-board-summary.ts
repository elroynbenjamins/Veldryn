/** Read-only Home projection for the current Contract Board. */
import type {GameState} from './types';
import type {WeeklyOrder} from './weekly-orders-v41';
import {weeklyOrderBoardForState} from './long-term-progression-runtime';
import {earlyFeatureUnlocked} from './feature-unlocks';

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
 if(!earlyFeatureUnlocked(state,'contracts'))return {weekKey:'locked',endsAtMs:0,total:0,complete:0,pendingRewards:0,completionRewardQueued:false};
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


export interface ContractBoardRegionFocus{
 regionId:string;
 total:number;
 complete:number;
 nextOrder?:WeeklyOrder;
}

/** Contextual Contract Board projection for the World screen current-region hub. */
export function contractBoardRegionFocus(state:GameState,regionId:string,nowMs=Date.now()):ContractBoardRegionFocus{
 if(!earlyFeatureUnlocked(state,'contracts'))return {regionId,total:0,complete:0};
 const board=weeklyOrderBoardForState(state,nowMs);
 const local=board.orders.filter(order=>order.regionId===regionId);
 const incomplete=local.filter(order=>order.progress<order.target);
 const nextOrder=[...incomplete].sort((a,b)=>progressRatio(b)-progressRatio(a)||a.slot-b.slot)[0];
 return {regionId,total:local.length,complete:local.filter(order=>order.progress>=order.target).length,nextOrder};
}
