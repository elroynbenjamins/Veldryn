/**
 * WORLD BOSS V23 — PRIVATE, UNMOUNTED PostgreSQL account-raids adapter.
 * This is not an HTTP endpoint, public RPC, deployed schema or live feature.
 * The connection MUST be a private trusted server connection. All queries
 * use parameters; never inject account, roster, damage or worker from JSON.
 */
import type {GameState} from '../../apps/mobile/src/core/types';
import type {WorldBossOrder,WorldBossId} from '../src/server/combat/world-boss-round-prototype';
import {
 createWorldBossPrivatePgV19,
 type WorldBossPrivateRepositoryV19,type WorldBossPgExecutorV19,
 type WorldBossAttemptViewV19,type WorldBossLeaseV19,
 type WorldBossSettlePayloadV19,type WorldBossSettlementViewV19,
} from './world-boss-private-pg-v19';
import {WORLD_BOSS_V22_ENGINE_VERSION} from '../src/server/combat/world-boss-account-raid-v22';

export const WORLD_BOSS_V23_PRIVATE_PG_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeUuid=(v:unknown):v is string=>typeof v==='string'&&UUID.test(v);
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const MINIMUM=1,MAXIMUM=5;
export interface WorldBossAccountOwnedStateV23 {
 characterId:string;ownerAccountId:string;gameVersion:number;
 updatedAtUtcMs:number;serverState:GameState;
}
export interface WorldBossEventViewV23{
 boss:WorldBossId;status:'draft'|'active'|'closed';
 rulesVersion:string;startsAtUtcMs:number;endsAtUtcMs:number;
}
export interface WorldBossReserveAccountV23 {
 eventId:string;accountId:string;leaderCharacterId:string;
 requestId:string;order:WorldBossOrder;
 seed:string;rosterDigest:string;frozenPacket:object;
 engineVersion:typeof WORLD_BOSS_V22_ENGINE_VERSION;
 workerId:string;warCampDigest:string;
}
export interface WorldBossRepositoryV23 {
 readAttempt(eventId:string,accountId:string,requestId:string):
  Promise<WorldBossAttemptViewV19|undefined>;
 listOwnedStates(accountId:string):Promise<readonly WorldBossAccountOwnedStateV23[]>;
 loadEvent(eventId:string):Promise<WorldBossEventViewV23>;
 reserveAccount(input:WorldBossReserveAccountV23):Promise<WorldBossLeaseV19>;
 checkout:WorldBossPrivateRepositoryV19['checkout'];
 settle(input:WorldBossSettlePayloadV19):Promise<WorldBossSettlementViewV19>;
}
const one=<T extends object>(rows:readonly T[],code:string):T=>{
 if(rows.length!==1)throw Error(code);
 return rows[0];
};
export function createWorldBossPrivatePgV23(pg:WorldBossPgExecutorV19):WorldBossRepositoryV23{
 const previous=createWorldBossPrivatePgV19(pg);
 return {
  readAttempt:previous.readAttempt,checkout:previous.checkout,settle:previous.settle,
  async listOwnedStates(accountId){
   if(!safeUuid(accountId))throw Error('world_boss_v23_invalid_owner');
   // LEFT JOIN is deliberate: missing game state must NOT silently drop an
   // unlocked character from the account's complete five-character raid.
   // LIMIT 6 catches corrupt/unexpected extra slots instead of truncating.
   const result=await pg.query<{
    characterId:string;ownerAccountId:string;revisionText:string|null;
    updatedText:string|null;serverState:GameState|null;
   }>(
    'SELECT c.id::text AS "characterId",c.account_id::text AS "ownerAccountId",'+
    's.revision::text AS "revisionText",'+
    'floor(extract(epoch from s.updated_at)*1000)::text AS "updatedText",'+
    's.state AS "serverState" FROM public.characters AS c '+
    'LEFT JOIN public.online_game_states AS s ON s.account_id=c.account_id '+
    'AND s.character_id=c.id WHERE c.account_id=$1::uuid '+
    'ORDER BY c.id LIMIT 6',[accountId]);
   if(result.rows.length<MINIMUM||result.rows.length>MAXIMUM)
    throw Error('world_boss_v23_account_character_count_invalid');
   const seen=new Set<string>();
   return result.rows.map(row=>{
    const gameVersion=Number(row.revisionText);
    const updatedAtUtcMs=Number(row.updatedText);
    if(!safeUuid(row.characterId)||row.ownerAccountId!==accountId||
     seen.has(row.characterId)||row.revisionText==null||row.updatedText==null||
     !Number.isSafeInteger(gameVersion)||gameVersion<1||
     !Number.isSafeInteger(updatedAtUtcMs)||updatedAtUtcMs<=0||
     !row.serverState||typeof row.serverState!=='object')
     throw Error('world_boss_v23_missing_or_foreign_game_state');
    seen.add(row.characterId);
    return {characterId:row.characterId,ownerAccountId:accountId,
     gameVersion,updatedAtUtcMs,serverState:structuredClone(row.serverState)};
   });
  },
  async loadEvent(eventId){
   if(!safeUuid(eventId))throw Error('world_boss_v23_invalid_event_id');
   const q=await pg.query<{
    boss:WorldBossId;status:'draft'|'active'|'closed';
    rulesVersion:string;startsText:string;endsText:string;
   }>(
    'SELECT boss_id AS "boss",status,rules_version AS "rulesVersion",'+
    'floor(extract(epoch from starts_at)*1000)::text AS "startsText",'+
    'floor(extract(epoch from ends_at)*1000)::text AS "endsText" '+
    'FROM private.world_boss_events_v17 WHERE id=$1::uuid',[eventId]);
   const row=one(q.rows,'world_boss_v23_event_not_found');
   const startsAtUtcMs=Number(row.startsText),endsAtUtcMs=Number(row.endsText);
   if(!Number.isSafeInteger(startsAtUtcMs)||!Number.isSafeInteger(endsAtUtcMs)||
    !['hollowroot','sunscar','frostmarch'].includes(row.boss)||
    !['draft','active','closed'].includes(row.status)||
    typeof row.rulesVersion!=='string'||row.rulesVersion.length<3)
    throw Error('world_boss_v23_invalid_event_row');
   return {...row,startsAtUtcMs,endsAtUtcMs};
  },
  async reserveAccount(input){
   if(!safeUuid(input.eventId)||!safeUuid(input.accountId)||
    !safeUuid(input.leaderCharacterId)||!REQUEST.test(input.requestId)||
    input.engineVersion!==WORLD_BOSS_V22_ENGINE_VERSION)
    throw Error('world_boss_v23_invalid_reservation_identity');
   const q=await pg.query<{receipt:WorldBossLeaseV19}>(
    'SELECT private.world_boss_v23_reserve_account('+
    '$1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,'+
    '$7::text,$8::jsonb,$9::text,$10::text,$11::text) AS receipt',
    [input.eventId,input.accountId,input.leaderCharacterId,input.requestId,
     input.order,input.seed,input.rosterDigest,JSON.stringify(input.frozenPacket),
     input.engineVersion,input.workerId,input.warCampDigest]);
   return one(q.rows,'world_boss_v23_reserve_empty').receipt;
  },
 };
}
