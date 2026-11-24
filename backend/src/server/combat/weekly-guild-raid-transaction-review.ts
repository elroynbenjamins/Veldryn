/** PRIVATE REVIEW ONLY. Synchronous in-memory reference transaction.
 * No auth adapter, DB, RPC, timer, deployment, live HP, currency or claims.
 * The host must eventually authenticate the principal and load membership,
 * roster and exact saved actor within a serialized durable transaction.
 */
import {createHash,createHmac} from 'node:crypto';
import type {CombatantDefinition} from './types';
import {previewWeeklyGuildCombat,reviewWeeklyContribution,weeklyGuildBossProfile,WEEKLY_GUILD_ATTEMPT_MS,type WeeklyGuildBoss,type WeeklyGuildReference} from './weekly-guild-boss-review';

export const WEEKLY_RAID_TRANSACTION_RELEASED=false as const;
const VERSION='weekly-shared-review-v1';
const WEEK=7*24*60*60*1000,MONDAY=Date.UTC(2026,10,2);
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const key=(s:string)=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(s);
const clone=<T>(v:T):T=>structuredClone(v);
export interface WeeklyReviewEncounter{
 id:string;guildId:string;boss:WeeklyGuildBoss;startMs:number;endMs:number;
 maxHp:number;reference:WeeklyGuildReference;roster:string[];
}
export interface WeeklyReviewPrincipal{accountId:string;guildId:string}
export interface WeeklyReviewActor{accountId:string;characterId:string;revision:number;player:CombatantDefinition}
export interface WeeklyReviewAuthority{
 // Injected test trust boundary, not an authenticated production principal.
 currentMember(principal:WeeklyReviewPrincipal):boolean;
 loadActor(principal:WeeklyReviewPrincipal,characterId:string):WeeklyReviewActor;
}
interface Receipt{
 version:string;accountId:string;characterId:string;actorRevision:number;nonce:string;
 attemptNumber:number;startedMs:number;resolvesMs:number;actorDigest:string;encounterDigest:string;
 seed:string;replay:ReturnType<typeof previewWeeklyGuildCombat>;
 settledMs?:number;sharedHpCredit?:number;performanceScore?:number;
}
export class WeeklyRaidReviewStore{
 private encounter:WeeklyReviewEncounter;
 private encounterDigest:string;
 private attempts:Receipt[]=[];
 private remaining:number;
 private revision=0;
 private activeTransaction=false;
 constructor(encounter:WeeklyReviewEncounter,private readonly authority:WeeklyReviewAuthority,private readonly seedKey:string){
  if(!key(encounter.id)||!key(encounter.guildId)||!Number.isSafeInteger(encounter.startMs)||encounter.startMs<MONDAY||
    (encounter.startMs-MONDAY)%WEEK!==0||encounter.endMs!==encounter.startMs+WEEK||
    !Number.isSafeInteger(encounter.maxHp)||encounter.maxHp<=0||
    !Array.isArray(encounter.roster)||!encounter.roster.length||encounter.roster.some(a=>!key(a))||
    new Set(encounter.roster).size!==encounter.roster.length||typeof seedKey!=='string'||seedKey.length<32)
   throw Error('invalid_review_encounter');
  weeklyGuildBossProfile(encounter.boss,encounter.reference);
  this.encounter=clone(encounter);this.encounterDigest=digest(this.encounter);this.remaining=encounter.maxHp;
 }
 private atomic<T>(fn:()=>T):T{
  if(this.activeTransaction)throw Error('review_transaction_reentry');
  this.activeTransaction=true;
  const before=clone(this.attempts),remaining=this.remaining,revision=this.revision;
  try{return fn()}catch(e){this.attempts=before;this.remaining=remaining;this.revision=revision;throw e}
  finally{this.activeTransaction=false}
 }
 private member(p:WeeklyReviewPrincipal){
  if(!key(p.accountId)||p.guildId!==this.encounter.guildId||!this.encounter.roster.includes(p.accountId)||!this.authority.currentMember(p))
   throw Error('weekly_review_membership_required');
 }
 private personal(accountId:string){return this.attempts.filter(a=>a.accountId===accountId)}
 private totalCredit(accountId:string){return this.personal(accountId).reduce((n,a)=>n+(a.sharedHpCredit??0),0)}
 start(p:WeeklyReviewPrincipal,cmd:{characterId:string;nonce:string},now:number){
  return this.atomic(()=>{
   this.member(p);
   if(!key(cmd.characterId)||!key(cmd.nonce)||cmd.nonce.length<8||!Number.isSafeInteger(now))throw Error('invalid_review_command');
   const owned=this.personal(p.accountId),prior=owned.find(a=>a.nonce===cmd.nonce);
   if(prior){
    if(prior.characterId!==cmd.characterId)throw Error('weekly_review_nonce_conflict');
    return this.view(prior);
   }
   if(now<this.encounter.startMs||now>=this.encounter.endMs||this.remaining===0)throw Error('weekly_review_closed');
   if(owned.some(a=>a.settledMs===undefined))throw Error('weekly_review_pending');
   if(owned.length>=3)throw Error('weekly_review_attempt_cap');
   if(this.totalCredit(p.accountId)>=Math.ceil(this.encounter.maxHp*.28))throw Error('weekly_review_personal_cap');
   const actor=clone(this.authority.loadActor(p,cmd.characterId));
   if(actor.accountId!==p.accountId||actor.characterId!==cmd.characterId||actor.player.id!==cmd.characterId||!Number.isSafeInteger(actor.revision)||actor.revision<1)
    throw Error('weekly_review_actor_mismatch');
   const attemptNumber=owned.length+1;
   // Nonce is deliberately excluded from seed, to avoid nonce reroll fishing.
   const seed=createHmac('sha256',this.seedKey).update(JSON.stringify([VERSION,this.encounterDigest,p.accountId,attemptNumber])).digest('hex');
   const replay=previewWeeklyGuildCombat({boss:this.encounter.boss,reference:this.encounter.reference,player:actor.player,seed,tuning:'candidate'});
   const row:Receipt={version:VERSION,accountId:p.accountId,characterId:cmd.characterId,nonce:cmd.nonce,actorRevision:actor.revision,actorDigest:digest(actor),encounterDigest:this.encounterDigest,attemptNumber,startedMs:now,resolvesMs:now+WEEKLY_GUILD_ATTEMPT_MS,seed,replay};
   this.attempts.push(row);this.revision++;
   return this.view(row);
  });
 }
 // Internal worker review entrypoint, NOT a player RPC. Pending reservations
 // can settle after the week closes; they never carry into another encounter.
 settleDue(now:number){
  return this.atomic(()=>{
   if(!Number.isSafeInteger(now))throw Error('invalid_review_clock');
   const due=this.attempts.filter(a=>a.settledMs===undefined&&a.resolvesMs<=now)
    .sort((a,b)=>a.resolvesMs-b.resolvesMs||a.accountId.localeCompare(b.accountId)||a.attemptNumber-b.attemptNumber);
   for(const row of due){
    const score=reviewWeeklyContribution({result:row.replay,reference:this.encounter.reference,sharedMaxHp:this.encounter.maxHp,sharedRemainingHp:this.remaining,personalAlready:this.totalCredit(row.accountId)});
    row.sharedHpCredit=score.sharedHpCredit;row.performanceScore=score.score;row.settledMs=now;
    this.remaining-=score.sharedHpCredit;this.revision++;
   }
   return {settled:due.length,...this.snapshot()};
  });
 }
 read(p:WeeklyReviewPrincipal,nonce:string){this.member(p);const row=this.personal(p.accountId).find(a=>a.nonce===nonce);return row?this.view(row):null}
 private view(row:Receipt){
  // Keep precomputed damage, internal seed and performance private until settlement.
  const {replay,seed,...receipt}=row;
  return clone({...receipt,replay:row.settledMs===undefined?null:replay,
   rewardGranted:false as const,claimable:false as const,liveEnabled:false as const});
 }
 snapshot(){return {encounterId:this.encounter.id,revision:this.revision,remainingHp:this.remaining,reservedAttempts:this.attempts.length,settledAttempts:this.attempts.filter(a=>a.settledMs!==undefined).length,liveEnabled:false as const}}
}
