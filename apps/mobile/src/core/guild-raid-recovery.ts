import type {GuildPveEncounter} from './guild-pve-encounters';

export type RaidStartReceipt={attemptsUsed:number;attemptCap:number;resolvesAt:string};
export function validRaidStartReceipt(value:unknown):value is RaidStartReceipt{
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<RaidStartReceipt>;
 return typeof v.attemptsUsed==='number'&&Number.isSafeInteger(v.attemptsUsed)&&v.attemptsUsed>0&&typeof v.attemptCap==='number'&&Number.isSafeInteger(v.attemptCap)&&v.attemptCap>=v.attemptsUsed&&typeof v.resolvesAt==='string'&&Number.isFinite(Date.parse(v.resolvesAt));
}
/** Reconcile only server-confirmed receipts; never change HP or damage from local data. */
export function reconcileRaidRow(row:GuildPveEncounter,start: RaidStartReceipt|undefined,claims:readonly number[]){
 const claimed=[...new Set([...row.claimed,...claims])];
 const startPending=Boolean(start&&(row.attemptsUsed??0)<start.attemptsUsed);
 const next=start&&startPending?{...row,claimed,attemptsUsed:start.attemptsUsed,attemptCap:start.attemptCap,pendingAttempts:1,nextAttemptResolvesAt:start.resolvesAt}:{...row,claimed};
 return {row:next,startPending,claimsPending:claims.some(percent=>!row.claimed.includes(percent))};
}
/** A lost acknowledgement must retry the same nonce, even after a screen remount.
 * A newer authoritative attempt count retires it; a different viewer/character never shares it.
 * Memory only: process restarts still rely on the fresh server board.
 */
export class RaidAttemptRetryKeys{
 private entries=new Map<string,{key:string;baseline:number;expiresAt:number}>();
 constructor(private readonly createKey:()=>string,private readonly limit=64){}
 private id(scope:string,encounter:string){return JSON.stringify([scope,encounter])}
 get(scope:string,row:GuildPveEncounter,now=Date.now()){
  const id=this.id(scope,row.id),baseline=row.attemptsUsed??0,existing=this.entries.get(id);
  if(existing&&existing.baseline===baseline&&now<existing.expiresAt)return existing.key;
  const key=this.createKey();this.entries.delete(id);this.entries.set(id,{key,baseline,expiresAt:Date.parse(row.endsAt)});
  while(this.entries.size>this.limit)this.entries.delete(this.entries.keys().next().value!);
  return key;
 }
 observe(scope:string,row:GuildPveEncounter){const id=this.id(scope,row.id),existing=this.entries.get(id);if(existing&&(row.attemptsUsed??0)>existing.baseline)this.entries.delete(id);}
 confirm(scope:string,encounter:string,key:string){const id=this.id(scope,encounter);if(this.entries.get(id)?.key===key)this.entries.delete(id);}
}
