export function expectedScore(a:number,b:number){return 1/(1+Math.pow(10,(b-a)/400));}
export function ratingDelta(a:number,b:number,resultA:0|0.5|1,k=24){return Math.round(k*(resultA-expectedScore(a,b)));}
export interface NormalizedStat{raw:number;floor:number;cap:number}
export function normalizeStat(x:NormalizedStat){return Math.max(x.floor,Math.min(x.cap,x.raw));}
export function raidPityChance(pity:number,base=0.08,hardPity=40){if(pity>=hardPity-1)return 1;return Math.min(0.5,base+pity*0.012);}
export function weeklyRaidEligible(claimed:boolean){return !claimed;}
