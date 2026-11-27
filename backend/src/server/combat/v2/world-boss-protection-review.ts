/** Private observational trace only. FIFO is an explicit accounting convention
 * for the pooled shield, not an alteration of shield/reflect mechanics. No payout. */
export type ProtectionTraceV2=
 |{kind:'grant';atMs:number;ownerId:string;targetId:string;amount:number;before:number;after:number}
 |{kind:'absorb';atMs:number;sourceId:string;targetId:string;amount:number;before:number;after:number;hpBefore:number;raw:number}
 |{kind:'reactive_reduction';atMs:number;targetId:string;amount:number};
const valid=(n:number)=>Number.isFinite(n)&&n>=0;
const close=(a:number,b:number)=>Math.abs(a-b)<=1e-6*Math.max(1,a,b);
export function reviewWorldBossProtectionV2(trace:readonly ProtectionTraceV2[],playerIds:readonly string[],finalPools:Readonly<Record<string,number>>){
 const ids=new Set(playerIds);
 if(ids.size!==playerIds.length||!ids.size||ids.size>3)throw Error('world_boss_protection_invalid_roster');
 const pools=new Map<string,{ownerId:string;left:number}[]>();
 const rows=new Map(playerIds.map(id=>[id,{actorId:id,shieldGranted:0,shieldConsumed:0,
  effectiveHpProtected:0,selfReactiveReduction:0}]));
 let last=0;
 for(const e of trace){
  if(!e||!valid(e.atMs)||e.atMs<last||!valid(e.amount)||!Object.prototype.hasOwnProperty.call(finalPools,e.targetId))
   throw Error('world_boss_protection_invalid_trace');
  last=e.atMs;
  if(e.kind==='reactive_reduction'){
   const row=rows.get(e.targetId);if(row)row.selfReactiveReduction+=e.amount;
   continue;
  }
  const queue=pools.get(e.targetId)??[];
  const total=()=>queue.reduce((s,x)=>s+x.left,0);
  if(!valid(e.before)||!valid(e.after)||!close(total(),e.before))
   throw Error('world_boss_protection_pool_mismatch');
  if(e.kind==='grant'){
   if(!close(e.before+e.amount,e.after))throw Error('world_boss_protection_grant_mismatch');
   if(e.amount>0)queue.push({ownerId:e.ownerId,left:e.amount});
   if(ids.has(e.targetId)){const owner=rows.get(e.ownerId);if(owner)owner.shieldGranted+=e.amount;}
  }else if(e.kind==='absorb'){
   if(!valid(e.hpBefore)||!valid(e.raw)||e.amount>e.raw+1e-6||
    !close(e.before-e.amount,e.after))throw Error('world_boss_protection_absorb_mismatch');
   let remaining=e.amount;
   // Actual HP saved, excluding absorbed damage which would have overkilled
   // the recipient anyway. Assign only the marginal saved HP in FIFO order.
   let unshielded=e.raw;
   for(const entry of queue){
    const used=Math.min(entry.left,remaining);
    if(used<=0)continue;
    const saved=Math.min(e.hpBefore,unshielded)-Math.min(e.hpBefore,Math.max(0,unshielded-used));
    if(ids.has(e.targetId)&&!ids.has(e.sourceId)){
     const owner=rows.get(entry.ownerId);
     if(owner){owner.shieldConsumed+=used;owner.effectiveHpProtected+=saved;}
    }
    entry.left-=used;remaining-=used;unshielded-=used;
   }
   if(!close(remaining,0))throw Error('world_boss_protection_unattributed_absorption');
  }else throw Error('world_boss_protection_unknown_trace');
  if(!close(total(),e.after))throw Error('world_boss_protection_pool_mismatch');
  pools.set(e.targetId,queue.filter(x=>x.left>0));
 }
 for(const [id,value] of Object.entries(finalPools)){
  if(!valid(value)||!close(value,(pools.get(id)??[]).reduce((s,x)=>s+x.left,0)))
   throw Error('world_boss_protection_final_pool_mismatch');
 }
 return {characters:[...rows.values()],allocationPolicy:'fifo-pooled-shield-review-only' as const,
  mitigationPolicy:'self-reactive-hp-saved-only' as const,
  generalMitigationAttribution:false as const,rewardGranted:false as const,releaseReady:false as const};
}
