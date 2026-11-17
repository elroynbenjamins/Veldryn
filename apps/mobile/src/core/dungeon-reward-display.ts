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


/** Ledger-backed, account-scoped combat Marks already credited during this run. */
export interface DungeonCombatMarks {
  total:number;
  normal:number;
  elite:number;
}

/** Ignore partial/invalid receipts rather than showing an invented total. */
export function parseDungeonCombatMarks(value:unknown):DungeonCombatMarks|undefined{
  if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
  const row=value as Record<string,unknown>;
  const total=safeMarks(row.total),normal=safeMarks(row.normal),elite=safeMarks(row.elite);
  if(total===undefined||normal===undefined||elite===undefined||total!==normal*3+elite*5)return undefined;
  return {total,normal,elite};
}

export function dungeonRunMarksBreakdown(
  rewards:readonly DungeonRewardReceipt[],
  run:DungeonRewardPreviewRun,
  combat?:DungeonCombatMarks,
  budget?:DungeonRewardPreviewBudget,
  liveFellowshipRemaining?:number,
):{completion:number|undefined;total:number|undefined;estimated:boolean}{
  const amounts=rewards.map(reward=>dungeonRewardDisplayAmount(reward,run,budget,liveFellowshipRemaining));
  const completion=rewards.length>0&&amounts.every(reward=>reward.amount!==undefined)
    ? amounts.reduce((sum,reward)=>sum+(reward.amount??0),0)
    : undefined;
  return {completion,total:combat&&completion!==undefined?combat.total+completion:undefined,estimated:amounts.some(reward=>reward.estimated)};
}
