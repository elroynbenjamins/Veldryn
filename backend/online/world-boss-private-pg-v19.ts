/**
 * PRIVATE ONLY — World Boss V19 parameterized Postgres boundary.
 *
 * This is a direct server-to-Postgres adapter; NOT a PostgREST / public RPC.
 * The database executor must use a private connection with approved privileges.
 * V17/V18 are still review-only DDL under docs/, not deployed migrations.
 * Callers MUST authenticate players and verify source state + combat outcomes.
 */
import type {GameState} from '../../apps/mobile/src/core/types';
import type {WorldBossOrder,WorldBossPhase,WorldBossId} from '../src/server/combat/world-boss-round-prototype';

export const WORLD_BOSS_V19_PRIVATE_PG_LIVE=false as const;
export interface WorldBossPgExecutorV19{
 query<T extends object>(statement:string,parameters:readonly unknown[]):Promise<{rows:T[]}>;
}
export type WorldBossAttemptStatusV19='reserved'|'committed'|'voided';
export interface WorldBossAttemptViewV19 {
 characterId:string;order:WorldBossOrder;status:WorldBossAttemptStatusV19;ordinal:number;
}
export interface WorldBossEventViewV19 {
 boss:WorldBossId;status:'draft'|'active'|'closed';rulesVersion:string;
}
export interface WorldBossOwnerStateV19 {
 ownerAccountId:string;characterId:string;gameVersion:number;
 updatedAtUtcMs:number;serverState:GameState;
}
export interface WorldBossReservePayloadV19 {
 eventId:string;accountId:string;characterId:string;requestId:string;
 order:WorldBossOrder;seed:string;digest:string;frozenPacket:object;
 engineVersion:string;workerId:string;
}
export interface WorldBossLeaseV19 {
 status:WorldBossAttemptStatusV19;ordinal:number;generation:number;repeated:boolean;
 seed?:string;squad?:unknown;digest?:string;order?:WorldBossOrder;
 phase?:WorldBossPhase;engine?:string;warCampDigest?:string|null;
 encounterDigest?:string|null;
}
export interface WorldBossSettlePayloadV19 {
 eventId:string;accountId:string;requestId:string;workerId:string;generation:number;
 digest:string;engineVersion:string;replayDigest:string;replayKey:string;
 rawDamage:number;guardDamage:number;
}
export interface WorldBossSettlementViewV19{
 status:'committed';ordinal:number;repeated:boolean;
 creditedHp:number;hpAfter:number;residualEcho:boolean;
}
export interface WorldBossPrivateRepositoryV19 {
 readAttempt(eventId:string,accountId:string,requestId:string):Promise<WorldBossAttemptViewV19|undefined>;
 loadOwnedState(accountId:string,characterId:string):Promise<WorldBossOwnerStateV19>;
 loadEvent(eventId:string):Promise<WorldBossEventViewV19>;
 reserve(input:WorldBossReservePayloadV19):Promise<WorldBossLeaseV19>;
 checkout(eventId:string,accountId:string,requestId:string,workerId:string):Promise<WorldBossLeaseV19>;
 settle(input:WorldBossSettlePayloadV19):Promise<WorldBossSettlementViewV19>;
}

const one=<T extends object>(rows:readonly T[],code:string):T=>{
 if(rows.length!==1)throw Error(code);
 return rows[0];
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid=(id:string)=>typeof id==='string'&&uuid.test(id);
const key=/^[A-Za-z0-9_-]{8,128}$/;
const validKey=(id:string)=>typeof id==='string'&&key.test(id);
const requireIdentity=(eventId:string,accountId:string,requestId:string)=>{
 if(!validUuid(eventId)||!validUuid(accountId)||!validKey(requestId))
  throw Error('world_boss_v19_private_db_identity_invalid');
};

/**
 * Explicit parameter binds prevent SQL injection. The "private" schema must
 * stay OUT of Supabase Data API schemas, with no authenticated/anon grants.
 */
export function createWorldBossPrivatePgV19(pg:WorldBossPgExecutorV19):WorldBossPrivateRepositoryV19{
 return {
  async readAttempt(eventId,accountId,requestId){
   requireIdentity(eventId,accountId,requestId);
   const r=await pg.query<WorldBossAttemptViewV19>(
    'SELECT character_id::text AS "characterId",war_order AS "order",status,ordinal FROM private.world_boss_attempts_v17 WHERE event_id=$1::uuid AND account_id=$2::uuid AND request_id=$3',
    [eventId,accountId,requestId]);
   if(r.rows.length>1)throw Error('world_boss_v19_duplicate_attempt_rows');
   return r.rows[0];
  },
  async loadOwnedState(accountId,characterId){
   if(!validUuid(accountId)||!validUuid(characterId))
    throw Error('world_boss_v19_owned_state_identity_invalid');
   const r=await pg.query<{
    ownerAccountId:string;characterId:string;revisionText:string;updatedText:string;serverState:GameState;
   }>(
    'SELECT account_id::text AS "ownerAccountId",character_id::text AS "characterId",revision::text AS "revisionText",floor(extract(epoch from updated_at)*1000)::text AS "updatedText",state AS "serverState" FROM public.online_game_states WHERE account_id=$1::uuid AND character_id=$2::uuid',
    [accountId,characterId]);
   const row=one(r.rows,'world_boss_v19_character_state_not_found');
   const gameVersion=Number(row.revisionText),updatedAtUtcMs=Number(row.updatedText);
   if(row.ownerAccountId!==accountId||row.characterId!==characterId||
    !Number.isSafeInteger(gameVersion)||gameVersion<1||
    !Number.isSafeInteger(updatedAtUtcMs)||updatedAtUtcMs<=0||
    !row.serverState||typeof row.serverState!=='object')
    throw Error('world_boss_v19_untrusted_state_row');
   return {...row,gameVersion,updatedAtUtcMs};
  },
  async loadEvent(eventId){
   if(!validUuid(eventId))throw Error('world_boss_v19_invalid_event');
   const r=await pg.query<WorldBossEventViewV19>(
    'SELECT boss_id AS "boss",status,rules_version AS "rulesVersion" FROM private.world_boss_events_v17 WHERE id=$1::uuid',
    [eventId]);
   return one(r.rows,'world_boss_v19_event_not_found');
  },
  async reserve(input){
   requireIdentity(input.eventId,input.accountId,input.requestId);
   const r=await pg.query<{receipt:WorldBossLeaseV19}>(
    'SELECT private.world_boss_v18_reserve($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,$7::text,$8::jsonb,$9::text,$10::text,$11::text,$12::text) AS receipt',
    [input.eventId,input.accountId,input.characterId,input.requestId,input.order,
     input.seed,input.digest,JSON.stringify(input.frozenPacket),input.engineVersion,input.workerId,null,null]);
   return one(r.rows,'world_boss_v19_reserve_empty').receipt;
  },
  async checkout(eventId,accountId,requestId,workerId){
   requireIdentity(eventId,accountId,requestId);
   const r=await pg.query<{receipt:WorldBossLeaseV19}>(
    'SELECT private.world_boss_v18_checkout($1::uuid,$2::uuid,$3::text,$4::text) AS receipt',
    [eventId,accountId,requestId,workerId]);
   return one(r.rows,'world_boss_v19_checkout_empty').receipt;
  },
  async settle(input){
   requireIdentity(input.eventId,input.accountId,input.requestId);
   const r=await pg.query<{receipt:WorldBossSettlementViewV19}>(
    'SELECT private.world_boss_v18_settle($1::uuid,$2::uuid,$3::text,$4::text,$5::bigint,$6::text,$7::text,$8::text,$9::text,$10::numeric,$11::numeric) AS receipt',
    [input.eventId,input.accountId,input.requestId,input.workerId,input.generation,
     input.digest,input.engineVersion,input.replayDigest,input.replayKey,
     input.rawDamage,input.guardDamage]);
   return one(r.rows,'world_boss_v19_settle_empty').receipt;
  },
 };
}
