export type SecuritySignal='duplicate_claim'|'impossible_elapsed'|'market_spam'|'chat_spam'|'seed_mismatch'|'state_version_conflict'|'rate_limit';
const weight:Record<SecuritySignal,number>={duplicate_claim:2,impossible_elapsed:8,market_spam:3,chat_spam:2,seed_mismatch:10,state_version_conflict:1,rate_limit:1};
export function riskScore(signals:SecuritySignal[]){return Math.min(100,signals.reduce((s,x)=>s+weight[x],0));}
export function restrictionLevel(score:number){return score>=80?3:score>=50?2:score>=25?1:0;}
export function shouldFlagEconomy(generated:number,sunk:number,traded:number,baseline:number){const net=generated-sunk;return net>Math.max(baseline*5,1000000)||traded>Math.max(baseline*10,5000000);}
