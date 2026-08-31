export interface ArenaCandidate{accountId:string;rating:number;recentOpponents:string[];powerBand:number;}
export interface ArenaMatchChoice{accountId:string;distance:number;repeatPenalty:number;}
export function chooseArenaOpponent(self:ArenaCandidate,pool:ArenaCandidate[]):ArenaMatchChoice|null{
 const eligible=pool.filter(x=>x.accountId!==self.accountId&&Math.abs(x.powerBand-self.powerBand)<=2);
 if(!eligible.length)return null;
 return eligible.map(x=>({accountId:x.accountId,distance:Math.abs(x.rating-self.rating),repeatPenalty:self.recentOpponents.includes(x.accountId)?500:0}))
   .sort((a,b)=>(a.distance+a.repeatPenalty)-(b.distance+b.repeatPenalty))[0];
}
export function seasonRewardTier(rating:number){return rating>=2000?6:rating>=1750?5:rating>=1500?4:rating>=1250?3:rating>=1000?2:1;}
export function defenseRewardEligible(defensesToday:number){return defensesToday<10;}
export const SQUAD_SEASON_REWARD_RULES={paidPower:0,rankedBonusWinsDaily:5,rankedBonusWinsWeekly:25,defenseRewardDaily:10,seasonLengthDays:28};
