import type {RewardBundle} from './types';

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
  foodConsumed:sum('foodConsumed'),explorationXp:sum('explorationXp'),
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
