export interface ArenaCandidate{accountId:string;rating:number;recentOpponents:string[];powerBand:number;}
export interface ArenaMatchChoice{accountId:string;distance:number;repeatPenalty:number;}
export function chooseArenaOpponent(self:ArenaCandidate,pool:ArenaCandidate[]):ArenaMatchChoice|null{
 const eligible=pool.filter(x=>x.accountId!==self.accountId&&Math.abs(x.powerBand-self.powerBand)<=2);
 if(!eligible.length)return null;
 return eligible.map(x=>({accountId:x.accountId,distance:Math.abs(x.rating-self.rating),repeatPenalty:self.recentOpponents.includes(x.accountId)?500:0}))
   .sort((a,b)=>(a.distance+a.repeatPenalty)-(b.distance+b.repeatPenalty))[0];
}
export function chooseArenaOpponents(self:ArenaCandidate,pool:ArenaCandidate[],limit=3):ArenaMatchChoice[]{
 return pool.filter(candidate=>candidate.accountId!==self.accountId&&Math.abs(candidate.powerBand-self.powerBand)<=2)
  .map(candidate=>({accountId:candidate.accountId,distance:Math.abs(candidate.rating-self.rating),repeatPenalty:self.recentOpponents.includes(candidate.accountId)?500:0}))
  .sort((a,b)=>(a.distance+a.repeatPenalty)-(b.distance+b.repeatPenalty)).slice(0,Math.max(1,Math.min(5,limit)));
}
export function seasonRewardTier(rating:number){return rating>=2000?6:rating>=1750?5:rating>=1500?4:rating>=1250?3:rating>=1000?2:1;}
export function defenseRewardEligible(defensesToday:number){return defensesToday<10;}
export const SQUAD_SEASON_REWARD_RULES={paidPower:0,rankedBonusWinsDaily:5,rankedBonusWinsWeekly:25,defenseRewardDaily:10,seasonLengthDays:28};
export interface ArenaSeasonWindow{id:string;startsAtMs:number;endsAtMs:number;}
const ARENA_ANCHOR=Date.UTC(2026,8,1);
export function arenaSeasonWindow(nowMs:number):ArenaSeasonWindow{const span=28*24*60*60*1000,index=Math.max(0,Math.floor((nowMs-ARENA_ANCHOR)/span)),startsAtMs=ARENA_ANCHOR+index*span;return{id:`ARENA_S${String(index+1).padStart(3,'0')}`,startsAtMs,endsAtMs:startsAtMs+span};}
export function rankedBonusEligible(winsToday:number,winsWeek:number){return winsToday<5&&winsWeek<25;}
