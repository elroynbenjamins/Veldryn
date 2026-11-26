/**
 * The Guild Project ledger counts 3,000 ms per base effort point
 * (20 effort per active minute), with a two-hour daily UTC cap.
 * Guild efficiency boosts the awarded points, not this activity allowance.
 */
export type GuildProjectDailyEffort={
 earnedDay:string;
 creditedMs:number;
 capMs:number;
};

export function guildProjectDailyEffortStatus(progress:GuildProjectDailyEffort|undefined,nowMs=Date.now()){
 if(!progress||!Number.isFinite(nowMs)||progress.earnedDay!==new Date(nowMs).toISOString().slice(0,10))return null;
 if(!Number.isFinite(progress.creditedMs)||!Number.isFinite(progress.capMs)||progress.capMs<=0)return null;
 const capEffort=Math.floor(progress.capMs/3000);
 if(capEffort<=0)return null;
 const creditedMs=Math.max(0,Math.min(progress.creditedMs,progress.capMs));
 return {creditedEffort:Math.floor(creditedMs/3000),capEffort,complete:creditedMs>=progress.capMs};
}
