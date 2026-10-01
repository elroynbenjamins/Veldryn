export interface GuildPveEncounter {
 id:string;kind:'weekly'|'event';name:string;startsAt:string;endsAt:string;claimEndsAt:string;
 maxHp:number;damage:number;personalDamage:number;allowanceUsed:number;contributors:number;claimed:number[];
 rosterSize:number;personalCap:number;dailyCap:number;dailyUsed:number;eligible:boolean;
}
export const GUILD_PVE_ALLOWANCE=30000;
export const GUILD_PVE_DAILY_CAP=6000;
export const GUILD_PVE_DAMAGE_PER_MINUTE=200;
export const GUILD_PVE_MIN_CONTRIBUTION=1000;
export const GUILD_PVE_MILESTONES=[{percent:25,gold:250},{percent:50,gold:500},{percent:100,gold:1000}] as const;
export function guildPveBalance(members:number,durationDays=7){
 const rosterSize=members<=5?5:members<=8?8:members<=12?12:members<=16?16:20;
 const weeks=Math.max(1,Math.min(4,durationDays/7));
 return {rosterSize,maxHp:Math.ceil(rosterSize*15000*weeks),personalCap:Math.ceil(GUILD_PVE_ALLOWANCE*weeks),dailyCap:GUILD_PVE_DAILY_CAP};
}
export function guildPveView(row:GuildPveEncounter,now=Date.now()){
 const defeated=row.damage>=row.maxHp,expired=now>=Date.parse(row.claimEndsAt),ended=now>=Date.parse(row.endsAt),started=now>=Date.parse(row.startsAt);
 const allowance=Math.max(0,row.personalCap-row.allowanceUsed),dailyAllowance=Math.max(0,Math.min(allowance,row.dailyCap-row.dailyUsed));
 return {percent:Math.min(100,Math.max(0,row.damage/Math.max(1,row.maxHp)*100)),remaining:Math.max(0,row.maxHp-row.damage),allowance,dailyAllowance,
  active:started&&!ended&&!defeated,open:started&&!ended,canContribute:row.eligible&&started&&!ended&&dailyAllowance>0,
  status:(expired?'Expired':defeated?'Defeated':ended?'Claim rewards':!started?'Upcoming':'In progress') as 'Expired'|'Defeated'|'Claim rewards'|'Upcoming'|'In progress',
  milestones:GUILD_PVE_MILESTONES.map(m=>({...m,eventCurrency:row.kind==='event'?(m.percent===25?100:m.percent===50?200:400):0,candy:row.kind==='event'?(m.percent===100?2:1):0,candyKind:m.percent===25?'Skill' as const:m.percent===50?'Battle' as const:'Bond' as const,claimed:row.claimed.includes(m.percent),ready:row.eligible&&started&&!expired&&row.damage*100>=row.maxHp*m.percent&&row.personalDamage>=GUILD_PVE_MIN_CONTRIBUTION&&!row.claimed.includes(m.percent)}))};
}
