/** Read-only presentation of the server-authored dungeon reward entitlement.
 * The server still settles charges, caps, and the final payout at claim time. */
export interface DungeonRewardReceipt {
  claimed_at:string|null;
  reward_json:{
    marks?:number;
    enhanced_marks?:number;
  };
}
export interface DungeonRewardPreviewBudget {
  charges:number;
  weeklyRemaining:number;
  failureConsolationRemaining?:number;
}
export interface DungeonRewardPreviewRun {
  phase:string;
  mode:string;
}
export interface DungeonRewardAmount {
  amount:number|undefined;
  estimated:boolean;
}
function safeMarks(value:unknown):number|undefined{
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:undefined;
}

/** Never mistake an absent pre-claim `marks` field for a genuine zero reward. */
export function dungeonRewardDisplayAmount(
  reward:DungeonRewardReceipt,
  run:DungeonRewardPreviewRun,
  budget?:DungeonRewardPreviewBudget,
  liveFellowshipRemaining?:number,
):DungeonRewardAmount{
  const settled=safeMarks(reward.reward_json.marks);
  if(reward.claimed_at)return {amount:settled,estimated:false};
  // Echo assistance entitlements may have a fixed `marks` value before claim.
  if(settled!==undefined)return {amount:settled,estimated:false};

  const full=safeMarks(reward.reward_json.enhanced_marks);
  if(full===undefined)return {amount:undefined,estimated:true};

  let amount=full;
  if(run.phase==='failed'){
    amount=full===0||budget?.failureConsolationRemaining===0?0:Math.min(12,Math.max(1,Math.round(full*.20)));
  }else if(run.phase==='completed'){
    if(budget&&(budget.charges<=0||budget.weeklyRemaining<=0))amount=Math.round(full*.20);
    if(run.mode==='live'&&full>0&&(liveFellowshipRemaining??0)>0)amount+=Math.max(1,Math.round(full*.25));
  }
  // The budget can change between this read and claim, especially after recharge.
  return {amount,estimated:true};
}
