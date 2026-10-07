export const PARTY_WEEKLY_TIERS = [
  {tier:'bronze',label:'Bronze',targetPoints:4000,minimumPersonalPoints:320,gold:250,cumulativeGold:250},
  {tier:'silver',label:'Silver',targetPoints:16000,minimumPersonalPoints:1280,gold:500,cumulativeGold:750},
  {tier:'gold',label:'Gold',targetPoints:40000,minimumPersonalPoints:3200,gold:1000,cumulativeGold:1750},
  {tier:'platinum',label:'Platinum',targetPoints:80000,minimumPersonalPoints:6400,gold:2250,cumulativeGold:4000},
] as const;
export type PartyWeeklyTier = typeof PARTY_WEEKLY_TIERS[number]['tier'];
export interface PartyContractTierView {
  tier:PartyWeeklyTier; targetPoints:number; minimumPersonalPoints:number;
  gold:number; cumulativeGold:number; reached:boolean; qualified:boolean;
  rewardId?:string|null; claimed:boolean;
}
export function parsePartyWeeklyTier(value:unknown):PartyWeeklyTier|undefined {
  return PARTY_WEEKLY_TIERS.find(row=>row.tier===value)?.tier;
}
export function weeklyTierLabel(tier:PartyWeeklyTier) {
  return PARTY_WEEKLY_TIERS.find(row=>row.tier===tier)?.label??'Bronze';
}
export function weeklyLadderSummary(tiers:readonly PartyContractTierView[]) {
  const ordered=[...tiers].sort((a,b)=>a.targetPoints-b.targetPoints);
  return {
    earned:ordered.filter(t=>t.reached).at(-1),
    next:ordered.find(t=>!t.reached),
    personalNext:ordered.find(t=>!t.qualified),
    claimable:ordered.filter(t=>t.rewardId&&!t.claimed&&t.reached&&t.qualified),
  };
}
/** Presentation fixture only. Live eligibility and grant IDs always come from the server. */
export function previewWeeklyTiers(totalPoints:number,personalPoints:number):PartyContractTierView[] {
  return PARTY_WEEKLY_TIERS.map(t=>({...t,reached:totalPoints>=t.targetPoints,qualified:personalPoints>=t.minimumPersonalPoints,claimed:false}));
}
