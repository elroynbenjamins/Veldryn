import type {RewardBundle} from './types';

/** Activity bar shows unclaimed combat defeats, not all kills in the current hunt.
 * sessionKills remains cumulative for Hunt Momentum, goals and trusted settlement.
 */
export function unclaimedCombatKillCount(previewKills:number|undefined,completedCycles:number):number{
 const value=previewKills??completedCycles;
 return Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
}

function sumRows<T>(rows:T[],key:(row:T)=>string,amount:keyof T):T[]{
 const merged=new Map<string,T>();
 for(const row of rows){const id=key(row),before=merged.get(id);merged.set(id,before?{...before,[amount]:Number(before[amount])+Number(row[amount])}:{...row});}
 return [...merged.values()];
}

/** Presentation totals only; each segment is committed and credited independently. */
export function combineActivityRewards(results:NonNullable<RewardBundle['activityResults']>):RewardBundle{
 const rewards=results.map(row=>row.reward),last=rewards[rewards.length-1];
 const sum=(key:keyof RewardBundle)=>rewards.reduce((total,row)=>total+(typeof row[key]==='number'?row[key] as number:0),0);
 return {...last,xp:sum('xp'),gold:sum('gold'),kills:sum('kills'),elapsedSeconds:sum('elapsedSeconds'),qualifyingActivitySeconds:sum('qualifyingActivitySeconds'),
  items:sumRows(rewards.flatMap(row=>row.items),row=>row.itemId,'quantity'),
  foodConsumed:sum('foodConsumed'),foodConsumedById:sumRows(rewards.flatMap(row=>row.foodConsumedById??[]),row=>row.itemId,'quantity'),explorationXp:sum('explorationXp'),
  craftingActions:sum('craftingActions'),trainingActions:sum('trainingActions'),faithActions:sum('faithActions'),faithXp:sum('faithXp'),holyWaterConsumed:sum('holyWaterConsumed'),
  craftingCompletedAtMs:rewards.flatMap(row=>row.craftingCompletedAtMs??[]),
  classSkillXp:sumRows(rewards.flatMap(row=>row.classSkillXp??[]),row=>row.skillId,'xp'),
  eventDrops:sumRows(rewards.flatMap(row=>row.eventDrops??[]),row=>row.eventId+':'+row.currencyId,'quantity'),
  eventDiscoveries:sumRows(rewards.flatMap(row=>row.eventDiscoveries??[]),row=>row.eventId+':'+row.discoveryId,'quantity'),
  petDrops:rewards.flatMap(row=>row.petDrops??[]),companionUnlocks:rewards.flatMap(row=>row.companionUnlocks??[]),
  explorationDiscoveries:[...new Set(rewards.flatMap(row=>row.explorationDiscoveries??[]))],activityResults:results};
}

/** Merge earning-day rows for presentation only; settlement keeps their timestamps. */
export function eventDropTotals(drops:RewardBundle['eventDrops']){
 return sumRows(drops??[],row=>row.eventId+':'+row.currencyId,'quantity').filter(row=>row.quantity>0);
}
