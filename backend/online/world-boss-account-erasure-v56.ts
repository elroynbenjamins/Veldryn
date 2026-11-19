/**
 * World Boss V56 — DISABLED and UNMOUNTED account erasure orchestration contract.
 *
 * The caller supplies an opaque INTERNAL privacy-service ticket, never an
 * account ID from the client. All durable writes live behind injected,
 * privately authorized dependencies. This module imports no Supabase client,
 * launches no jobs, deletes no auth users and has no public route.
 *
 * Erasure/retention policy, shared transaction locks, storage replay purge,
 * idempotent Admin Auth deletion and durable ticket state remain unapproved.
 */
export const WORLD_BOSS_V56_ERASURE_LIVE=false as const;

export type WorldBossErasureStageV56=
 'fenced'|'replays_purged'|'rows_purged'|'auth_deleted'|'complete';

export type WorldBossErasureResumeV56=
 {kind:'busy'}|
 {kind:'acquired';leaseId:string;stage:WorldBossErasureStageV56};

export interface WorldBossErasureDepsV56{
 /**
  * Validate the opaque INTERNAL erasure ticket in a trusted backend service.
  * It must establish the account owner/erasure authorization independently
  * of the current, potentially deleted user's JWT. No user_metadata.
  */
 authorizeTicket(ticket:string):Promise<{accountId:string}|null>;
 /**
  * Atomic durable BEGIN/RESUME: fence World Boss writes before any returns,
  * acquire a single-account lease, and reject other concurrent executors.
  * V57 requires the account fence INSERT to COMMIT in its OWN short
  * transaction using the same advisory key as all V57 account triggers.
  * Never hold that advisory lock while acquiring event-row locks or
  * purging receipts, or event-first gameplay writers can deadlock.
  * The real service must also fence other cross-feature write paths.
  */
 beginOrResume(accountId:string):Promise<WorldBossErasureResumeV56>;
 /** Read only keys owned by the verified account; never return to client. */
 replayKeys(accountId:string,leaseId:string):Promise<readonly string[]>;
 /** Idempotent deletion of the PRIVATE external replay object. */
 deleteReplayObject(key:string):Promise<void>;
 /** Durable confirmation AFTER all replay objects have been deleted. */
 recordReplayPurge(accountId:string,leaseId:string):Promise<void>;
 /**
  * One atomic private PG transaction: verify purge ack + account fence,
  * delete all personal World Boss rows in FK-safe order, anonymize shared
  * milestones under approved retention rules, and verify V36 preflight=0.
  * MUST NOT edit global HP, camp totals, or another account's rewards.
  */
 purgeRowsAndVerify(accountId:string,leaseId:string):Promise<void>;
 /**
  * Approved Supabase Admin Auth deletion. A missing user after a lost ACK
  * must be treated as idempotent success only when the ticket/lease proves
  * this same deletion was previously authorized.
  */
 deleteAuthUser(accountId:string,leaseId:string):Promise<void>;
 /** Finalize/remove ticket with approved privacy retention, no replay keys. */
 finalize(accountId:string,leaseId:string):Promise<void>;
 /** Release only this worker's lease; account write fence MUST remain. */
 releaseLease(accountId:string,leaseId:string):Promise<void>;
}

export type WorldBossErasureOutcomeV56=
 {status:'completed'|'in_progress';stage?:WorldBossErasureStageV56};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validId=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
const stages:readonly WorldBossErasureStageV56[]=[
 'fenced','replays_purged','rows_purged','auth_deleted','complete',
];

/**
 * Not an Auth/DB adapter. Only call from a separately reviewed internal
 * privacy worker after actual erasure and replay-retention policy approval.
 * A failed step is never silently advanced; a durable fence stays active.
 */
export async function runWorldBossErasureV56(
 input:{ticket:string},deps:WorldBossErasureDepsV56,
):Promise<WorldBossErasureOutcomeV56>{
 // This is the ONLY candidate production entry point. Remain fail-closed
 // even if a future developer accidentally imports and calls this module.
 if(!WORLD_BOSS_V56_ERASURE_LIVE)
  throw Error('world_boss_v56_runtime_disabled');
 return simulateWorldBossErasureV56ForTests(input,deps);
}

/**
 * TEST-ONLY executor. This is deliberately separate from the always-disabled
 * runtime entry point so all regression scenarios can run against injected
 * *synthetic* adapters without authorizing real deletion.
 * Do not import from routes, workers, Supabase Edge or production services.
 */
export async function simulateWorldBossErasureV56ForTests(
 input:{ticket:string},deps:WorldBossErasureDepsV56,
):Promise<WorldBossErasureOutcomeV56>{
 if(!deps||typeof input?.ticket!=='string'||
  input.ticket.length<24||input.ticket.length>4096||
  typeof deps.authorizeTicket!=='function'||
  typeof deps.beginOrResume!=='function'||
  typeof deps.replayKeys!=='function'||
  typeof deps.deleteReplayObject!=='function'||
  typeof deps.recordReplayPurge!=='function'||
  typeof deps.purgeRowsAndVerify!=='function'||
  typeof deps.deleteAuthUser!=='function'||
  typeof deps.finalize!=='function'||
  typeof deps.releaseLease!=='function')
  throw Error('world_boss_v56_invalid_private_eraser');

 const authorized=await deps.authorizeTicket(input.ticket);
 if(!authorized||!validId(authorized.accountId))
  throw Error('world_boss_v56_private_authorization_required');

 const accountId=authorized.accountId;
 const lease=await deps.beginOrResume(accountId);
 if(!lease||!('kind'in lease)||
  (lease.kind!=='busy'&&lease.kind!=='acquired'))
  throw Error('world_boss_v56_invalid_private_lease');
 if(lease.kind==='busy')return {status:'in_progress'};
 if(typeof lease.leaseId!=='string'||
  !/^[A-Za-z0-9_-]{8,128}$/.test(lease.leaseId)||
  !stages.includes(lease.stage))
  throw Error('world_boss_v56_invalid_private_lease');

 const {leaseId}=lease;
 try{
  switch(lease.stage){
   case 'fenced':{
    const keys=await deps.replayKeys(accountId,leaseId);
    if(!Array.isArray(keys)||keys.length>5000||
     keys.some(key=>typeof key!=='string'||key.length<8||key.length>512))
     throw Error('world_boss_v56_invalid_replay_manifest');
    // No retry or downstream DB cleanup until EVERY object deletion succeeds.
    // A lost-ACK retry must be safe at the external storage adapter.
    for(const key of [...new Set(keys)].sort()){
     await deps.deleteReplayObject(key);
    }
    await deps.recordReplayPurge(accountId,leaseId);
   }
   // fallthrough: the store MUST commit each stage before the next call.
   case 'replays_purged':
    await deps.purgeRowsAndVerify(accountId,leaseId);
   // fallthrough: the store MUST validate the irreversible purge state.
   case 'rows_purged':
    await deps.deleteAuthUser(accountId,leaseId);
   // fallthrough: only an approved Admin Auth deletion may be finalized.
   case 'auth_deleted':
    await deps.finalize(accountId,leaseId);
   // fallthrough
   case 'complete':
    return {status:'completed'};
  }
 }finally{
  // Releasing a worker lease must never remove the deletion/erasure fence.
  await deps.releaseLease(accountId,leaseId);
 }
 throw Error('world_boss_v56_unreachable_stage');
}
