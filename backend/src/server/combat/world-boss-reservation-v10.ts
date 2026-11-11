/**
 * Veldryn World Boss V10 — DISABLED, SERVER-ONLY reservation workflow emulator.
 *
 * Models the durable two-transaction contract without a DB or any live route:
 * (1) reserve an account-wide slot + immutable v9 authenticated roster;
 * (2) simulate OUTSIDE the event lock, then atomically clip global HP.
 * A lease can be recovered with the SAME frozen seed/roster/phase. Expired
 * reservations and explicit server failures release slots without rerolling
 * the original request ID. No wallet, scheduler, event or UI is enabled.
 *
 * This is an IN-MEMORY REFERENCE MODEL. A mutex does not protect multiple
 * workers/instances; port invariants to audited PostgreSQL before release.
 */
import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';
import {WORLD_BOSS_EVENT_PROTOTYPE_VERSION,createWorldBossEventPrototype,worldBossPhaseAtStart,type WorldBossAttemptPrototype} from './world-boss-event-prototype';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossOrder,type WorldBossPhase,type WorldBossRoundResult} from './world-boss-round-prototype';
import type {WorldBossPreparedRosterV9} from './world-boss-verified-roster-v9';
import {deriveWorldBossWarCampEffectsV11,type WorldBossWarCampSnapshotV11} from './world-boss-war-camp-v11';
import {verifyWorldBossEncounterProfileV13,type WorldBossEncounterProfileV13,type WorldBossGearBandV13} from './world-boss-encounter-profile-v13';

export const WORLD_BOSS_V10_HIDDEN=true as const;
export const WORLD_BOSS_V10_LEASE_MS=2*60_000;
export const WORLD_BOSS_V10_RECOVERY_MS=15*60_000;
type Milestone=70|30|0;
type Status='reserved'|'committed'|'voided';
const key=(accountId:string,requestId:string)=>JSON.stringify([accountId,requestId]);
const hash=(value:unknown)=>bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(value))));
const copy=<T>(value:T):T=>structuredClone(value);
const validTime=(n:number)=>Number.isSafeInteger(n)&&n>=0;

/** Reproduce the canonical v9 digest exactly; do not accept mutable client loadouts. */
export function verifyWorldBossV9PreparedRoster(eventId:string,prepared:WorldBossPreparedRosterV9):void{
 const c=prepared.command;
 if(prepared.contentVersion!=='v9-verified-roster-prototype'||prepared.persisted!==false||
  !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(eventId)||
  !/^[a-f0-9]{64}$/.test(prepared.snapshotDigest)||
  c.snapshotDigest!==prepared.snapshotDigest||c.serverSeed!==prepared.serverSeed||
  !/^[A-Za-z0-9:_-]{24,512}$/.test(prepared.serverSeed)||
  !c.accountId||!c.characterId||!c.requestId||!validTime(c.atUtcMs)||
  !['break_armor','hold_line','steady_assault'].includes(c.order)||
  !Array.isArray(c.squad)||c.squad.length!==4||
  c.squad[0].ownerAccountId!==c.accountId||Boolean(c.squad[0].npc)||
  new Set(c.squad.map(s=>s.snapshotId)).size!==4||
  new Set(c.squad.map(s=>s.resolvedCombatant.id)).size!==4||
  new Set(c.squad.filter(s=>!s.npc).map(s=>s.ownerAccountId)).size!==c.squad.filter(s=>!s.npc).length||
  c.squad.filter(s=>s.resolvedCombatant.role==='tank').length!==1||
  c.squad.filter(s=>s.resolvedCombatant.role==='damage').length!==2||
  c.squad.filter(s=>s.resolvedCombatant.role==='support').length!==1)
  throw Error('world_boss_v10_unverified_preparation');
 const actual=hash({
  version:'v9-verified-roster-prototype',
  account:c.accountId,
  request:{eventId,characterId:c.characterId,requestId:c.requestId,order:c.order},
  squad:c.squad.map(s=>({
   ownerAccountId:s.ownerAccountId,snapshotId:s.snapshotId,npc:Boolean(s.npc),actor:s.resolvedCombatant,
  })),
 });
 if(actual!==prepared.snapshotDigest)throw Error('world_boss_v10_roster_digest_mismatch');
}

export interface WorldBossV10Settlement{
 eventId:string;accountId:string;requestId:string;ordinal:number;
 phase:WorldBossPhase;engineVersion:string;replayDigest:string;warCampDigest?:string;encounterProfileDigest?:string;
 hpBefore:number;hpAfter:number;worldHpCredited:number;residualEcho:boolean;
 rawCombatDamage:number;guardDamage:number;roundsCompleted:number;survived:boolean;
 /** Demonstration only; these fields do NOT mint rewards. */
 rewardsGranted:false;
}
export interface WorldBossV10Reservation{
 eventId:string;accountId:string;characterId:string;requestId:string;ordinal:number;
 status:Status;order:WorldBossOrder;phase:WorldBossPhase;
 serverSeed:string;snapshotDigest:string;command:WorldBossAttemptPrototype;
 serverWarCamp?:WorldBossWarCampSnapshotV11;
 serverEncounterProfile?:WorldBossEncounterProfileV13;
 reservedAtUtcMs:number;leaseExpiresAtUtcMs:number;hardExpiresAtUtcMs:number;
 generation:number;settlement?:WorldBossV10Settlement;
}
export interface WorldBossV10Job{
 eventId:string;accountId:string;requestId:string;generation:number;
 boss:WorldBossId;phase:WorldBossPhase;command:WorldBossAttemptPrototype;
 serverWarCamp?:WorldBossWarCampSnapshotV11;
 serverEncounterProfile?:WorldBossEncounterProfileV13;
}
export interface WorldBossV10Result{settlement:WorldBossV10Settlement;repeated:boolean;}
export interface WorldBossV10Snapshot{
 eventId:string;boss:WorldBossId;startsAtUtcMs:number;endsAtUtcMs:number;
 maxHp:number;remainingHp:number;revision:number;
 crossedThresholds:Milestone[];
 reservations:Record<string,WorldBossV10Reservation>;
}

/** All writes below are serialized ONLY inside this one test process. */
export class WorldBossReservationEmulatorV10{
 private state:WorldBossV10Snapshot;
 private queue:Promise<void>=Promise.resolve();
 constructor(input:{eventId:string;boss:WorldBossId;startsAtUtcMs:number;endsAtUtcMs:number;maxHp:number}){
  const e=createWorldBossEventPrototype(input);
  this.state={eventId:e.eventId,boss:e.boss,startsAtUtcMs:e.startsAtUtcMs,endsAtUtcMs:e.endsAtUtcMs,
   maxHp:e.maxHp,remainingHp:e.remainingHp,revision:0,crossedThresholds:[],reservations:{}};
 }
 snapshot():WorldBossV10Snapshot{return copy(this.state);}
 private async lock<T>(fn:()=>T):Promise<T>{
  let release!:()=>void;
  const next=new Promise<void>(resolve=>{release=resolve;});
  const previous=this.queue;this.queue=next;
  await previous;
  try{return fn();}finally{release();}
 }
 private expire(now:number):void{
  for(const r of Object.values(this.state.reservations))
   if(r.status==='reserved'&&now>r.hardExpiresAtUtcMs)r.status='voided';
 }
 private find(accountId:string,requestId:string):WorldBossV10Reservation{
  const r=this.state.reservations[key(accountId,requestId)];
  if(!r)throw Error('world_boss_v10_reservation_not_found');
  return r;
 }
 /** Retry must READ the existing record first; never rebuild a new RNG seed. */
 async read(accountId:string,requestId:string):Promise<WorldBossV10Reservation|undefined>{
  return this.lock(()=>{const r=this.state.reservations[key(accountId,requestId)];return r?copy(r):undefined;});
 }
 async reserve(prepared:WorldBossPreparedRosterV9,now:number,serverWarCamp?:WorldBossWarCampSnapshotV11,serverEncounterProfile?:WorldBossEncounterProfileV13,serverVerifiedGearBand?:WorldBossGearBandV13):Promise<{reservation:WorldBossV10Reservation;repeated:boolean}>{
  return this.lock(()=>{
   const e=this.state,c=prepared.command;
   if(!validTime(now))throw Error('world_boss_v10_invalid_clock');
   verifyWorldBossV9PreparedRoster(e.eventId,prepared);
   const prior=e.reservations[key(c.accountId,c.requestId)];
   if(prior){
    if(prior.characterId!==c.characterId||prior.order!==c.order||
     prior.serverSeed!==prepared.serverSeed||prior.snapshotDigest!==prepared.snapshotDigest)
     throw Error('world_boss_v10_idempotency_payload_mismatch');
    return {reservation:copy(prior),repeated:true};
   }
   // Never update a previously frozen War Camp on retry; its historical revision is part of the receipt.
   if(serverWarCamp){
    deriveWorldBossWarCampEffectsV11(serverWarCamp);
    if(serverWarCamp.eventId!==e.eventId)throw Error('world_boss_v11_foreign_war_camp');
   }
   if(now<e.startsAtUtcMs||now>=e.endsAtUtcMs||Math.abs(c.atUtcMs-now)>60_000)
    throw Error('world_boss_v10_event_not_accepting_reservations');
   this.expire(now);
   const used=new Set(Object.values(e.reservations)
    .filter(r=>r.accountId===c.accountId&&r.status!=='voided').map(r=>r.ordinal));
   const ordinal=([1,2,3] as const).find(n=>!used.has(n));
   if(!ordinal)throw Error('world_boss_v10_account_attempt_limit');
   const phase=worldBossPhaseAtStart({...e,receipts:{}}); // frozen at reservation
   if(serverEncounterProfile){
    verifyWorldBossEncounterProfileV13(serverEncounterProfile,e.boss,phase,e.eventId);
    // The caller must independently prove the initiator's equipment band from
    // a trusted server-resolved loadout, never the player's request payload.
    if(serverVerifiedGearBand!==serverEncounterProfile.gearBand)
     throw Error('world_boss_v13_unverified_encounter_band');
   }
   const hardExpiresAtUtcMs=Math.min(now+WORLD_BOSS_V10_RECOVERY_MS,e.endsAtUtcMs+WORLD_BOSS_V10_RECOVERY_MS);
   const r:WorldBossV10Reservation={eventId:e.eventId,accountId:c.accountId,characterId:c.characterId,
    requestId:c.requestId,ordinal,status:'reserved',order:c.order,phase,
    serverSeed:prepared.serverSeed,snapshotDigest:prepared.snapshotDigest,command:copy(c),
    serverWarCamp:serverWarCamp?copy(serverWarCamp):undefined,
    serverEncounterProfile:serverEncounterProfile?copy(serverEncounterProfile):undefined,
    reservedAtUtcMs:now,hardExpiresAtUtcMs,
    leaseExpiresAtUtcMs:Math.min(now+WORLD_BOSS_V10_LEASE_MS,hardExpiresAtUtcMs),generation:1};
   e.reservations[key(c.accountId,c.requestId)]=r;
   return {reservation:copy(r),repeated:false};
  });
 }
 /** Recovery rotates the worker generation, NEVER the seed, actor IDs or phase. */
 async checkout(accountId:string,requestId:string,now:number):Promise<WorldBossV10Job>{
  return this.lock(()=>{
   if(!validTime(now))throw Error('world_boss_v10_invalid_clock');
   const r=this.find(accountId,requestId);
   if(r.status==='committed')throw Error('world_boss_v10_already_committed');
   if(r.status==='voided')throw Error('world_boss_v10_request_voided');
   if(now>r.hardExpiresAtUtcMs){r.status='voided';throw Error('world_boss_v10_reservation_expired');}
   if(now>r.leaseExpiresAtUtcMs){
    r.generation++;
    r.leaseExpiresAtUtcMs=Math.min(now+WORLD_BOSS_V10_LEASE_MS,r.hardExpiresAtUtcMs);
   }
   return copy({eventId:r.eventId,accountId:r.accountId,requestId:r.requestId,
    generation:r.generation,boss:this.state.boss,phase:r.phase,command:r.command,
    serverWarCamp:r.serverWarCamp,serverEncounterProfile:r.serverEncounterProfile});
  });
 }
 /**
  * Server simulation runs outside lock. Settlement verifies the original
  * immutable inputs and generation, then clips global HP under a short lock.
  * Never expose this method or the job payload to mobile/network callers.
  */
 async settleJob(job:WorldBossV10Job,now:number):Promise<WorldBossV10Result>{
  const c=job.command;
  const replay=simulateWorldBossRounds({
   boss:job.boss,phase:job.phase,order:c.order,
   seed:[WORLD_BOSS_EVENT_PROTOTYPE_VERSION,job.eventId,job.accountId,c.serverSeed].join(':'),
   players:c.squad.map(x=>x.resolvedCombatant),serverWarCamp:job.serverWarCamp,
   serverEncounterProfile:job.serverEncounterProfile,
  });
  const replayDigest=hash({version:WORLD_BOSS_EVENT_PROTOTYPE_VERSION,seed:c.serverSeed,
   warCampDigest:job.serverWarCamp?.digest,
   encounterProfileDigest:job.serverEncounterProfile?.digest,replay});
  return this.lock(()=>{
   if(!validTime(now))throw Error('world_boss_v10_invalid_clock');
   const e=this.state,r=this.find(job.accountId,job.requestId);
   if(r.status==='committed'){
    if(r.generation!==job.generation||!r.settlement||r.settlement.replayDigest!==replayDigest)
     throw Error('world_boss_v10_settlement_conflict');
    return {settlement:copy(r.settlement),repeated:true};
   }
   if(r.status==='voided')throw Error('world_boss_v10_request_voided');
   if(now>r.hardExpiresAtUtcMs){r.status='voided';throw Error('world_boss_v10_reservation_expired');}
   if(now>r.leaseExpiresAtUtcMs)throw Error('world_boss_v10_lease_expired');
   if(r.generation!==job.generation||r.eventId!==job.eventId||r.phase!==job.phase||
    e.boss!==job.boss||r.serverSeed!==c.serverSeed||
    r.snapshotDigest!==c.snapshotDigest||r.order!==c.order||
    r.serverWarCamp?.digest!==job.serverWarCamp?.digest||
    JSON.stringify(r.serverWarCamp)!==JSON.stringify(job.serverWarCamp)||
    r.serverEncounterProfile?.digest!==job.serverEncounterProfile?.digest||
    JSON.stringify(r.serverEncounterProfile)!==JSON.stringify(job.serverEncounterProfile)||
    r.accountId!==c.accountId||r.characterId!==c.characterId||
    JSON.stringify(r.command)!==JSON.stringify(c))
    throw Error('world_boss_v10_stale_or_altered_job');
   if(!Number.isFinite(replay.bossHpDamage)||replay.bossHpDamage<0||
    !Number.isFinite(replay.localGuardDamage)||replay.localGuardDamage<0)
    throw Error('world_boss_v10_invalid_combat');
   const before=e.remainingHp,credit=Math.min(before,Math.floor(replay.bossHpDamage));
   const after=before-credit;
   const settlement:WorldBossV10Settlement={
    eventId:e.eventId,accountId:r.accountId,requestId:r.requestId,ordinal:r.ordinal,
    phase:r.phase,engineVersion:WORLD_BOSS_EVENT_PROTOTYPE_VERSION,replayDigest,
    warCampDigest:r.serverWarCamp?.digest,
    encounterProfileDigest:r.serverEncounterProfile?.digest,
    hpBefore:before,hpAfter:after,worldHpCredited:credit,residualEcho:before===0,
    rawCombatDamage:replay.bossHpDamage,guardDamage:replay.localGuardDamage,
    roundsCompleted:replay.roundsCompleted,survived:replay.survived,rewardsGranted:false,
   };
   for(const [pct,ratio] of [[70,.7],[30,.3],[0,0]] as const)
    if(before/e.maxHp>ratio&&after/e.maxHp<=ratio&&!e.crossedThresholds.includes(pct))
     e.crossedThresholds.push(pct);
   e.remainingHp=after;e.revision++;r.status='committed';r.settlement=settlement;
   return {settlement:copy(settlement),repeated:false};
  });
 }
 /** Convenience test helper. No battle simulation is performed inside a lock. */
 async run(accountId:string,requestId:string,now:number):Promise<WorldBossV10Result>{
  const existing=await this.read(accountId,requestId);
  if(existing?.status==='committed'&&existing.settlement)
   return {settlement:existing.settlement,repeated:true};
  const job=await this.checkout(accountId,requestId,now);
  return this.settleJob(job,now);
 }
 /** Only internal unrecoverable/server-failure cancellation releases a slot. */
 async voidFailed(accountId:string,requestId:string):Promise<void>{
  await this.lock(()=>{
   const r=this.find(accountId,requestId);
   if(r.status==='committed')throw Error('world_boss_v10_cannot_void_committed');
   r.status='voided';
  });
 }
}

export type {WorldBossRoundResult};
