/** Presentation-only schedule from the authenticated Guild PvE attempt RPC.
 * Events are deterministic partitions of the precommitted server damage total.
 * They do not represent independently resolved server combat hits. */
export interface GuildPveAttemptHit{
 id:string;
 atMs:number;
 actor:'character'|'companion';
 amount:number;
}
export interface GuildPveAttemptTimeline{
 encounterId:string;
 attemptNumber:number;
 startedAt:string;
 resolvesAt:string;
 resolved:boolean;
 characterDamage:number;
 companionDamage:number;
 events:GuildPveAttemptHit[];
}

/** Never show past cues as newly landed attacks after the app resumes. */
export function currentGuildPveAttemptHit(timeline:GuildPveAttemptTimeline|undefined,now:number,windowMs=1700){
 if(!timeline||timeline.resolved)return undefined;
 const start=Date.parse(timeline.startedAt),end=Date.parse(timeline.resolvesAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||now<start||now>=end)return undefined;
 const elapsed=now-start;
 for(let i=timeline.events.length-1;i>=0;i--){
  const hit=timeline.events[i];
  if(!Number.isFinite(hit.atMs)||!Number.isFinite(hit.amount)||hit.amount<=0)continue;
  if(elapsed>=hit.atMs)return elapsed-hit.atMs<=windowMs?hit:undefined;
 }
 return undefined;
}

/** Own-attempt bar only: cumulative display damage, never shared boss HP. */
export function guildPveTimelineContribution(timeline:GuildPveAttemptTimeline|undefined,now:number){
 if(!timeline)return 0;
 const start=Date.parse(timeline.startedAt);
 if(!Number.isFinite(start))return 0;
 const elapsed=Math.max(0,now-start);
 return timeline.events.reduce((total,event)=>total+(event.atMs<=elapsed?Math.max(0,event.amount):0),0);
}
