export type SharedWorldState='scheduled'|'active'|'secured'|'defeated'|'failed'|'expired'|'finalized';
export interface CrisisSummary {instanceId:string;name:string;regionId:string;state:SharedWorldState;endsAt:string;targetPoints:number;creditedPoints:number;currentStageName:string;yourPoints:number;partyPoints?:number;guildPoints?:number;}
export interface WorldBossSummary {instanceId:string;name:string;regionId:string;state:SharedWorldState;endsAt:string;maxHp:number;remainingHp:number;phaseName:string;attemptsToday:number;dailyAttemptCap:number;yourRaidImpact:number;yourAppliedDamage:number;}
export function fraction(current:number,total:number):number{return total<=0?0:Math.max(0,Math.min(1,current/total));}
export function formatCompact(value:number):string{if(value>=1_000_000_000)return `${(value/1_000_000_000).toFixed(1)}B`;if(value>=1_000_000)return `${(value/1_000_000).toFixed(1)}M`;if(value>=1000)return `${(value/1000).toFixed(1)}K`;return String(Math.floor(value));}
export function bossAttemptsRemaining(boss:WorldBossSummary):number{return Math.max(0,boss.dailyAttemptCap-boss.attemptsToday);}
export function crisisStatusLabel(crisis:CrisisSummary):string{if(crisis.state==='secured')return 'Region Secured';if(crisis.state==='failed')return 'Crisis Ended';return crisis.currentStageName;}
