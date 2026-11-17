/**
 * Hidden V26 private PostgreSQL adapter for the authored V25 engine.
 * NO API route, live migration or client credentials. V27 adds the private
 * Saturday-frozen War Camp gate BEFORE the V22 account reservation.
 * SQL names are server-fixed, every value parameterized. Database principal
 * MUST be the trusted service role; keep private schema out of Data API.
 */
import {createWorldBossPrivatePgV19,
 type WorldBossPgExecutorV19,type WorldBossLeaseV19} from './world-boss-private-pg-v19';
import {expandOwnedWorldBossAccountSaveV33,
 type WorldBossAccountSaveRowV33} from './world-boss-account-state-v33';
import type {WorldBossRepositoryV26,WorldBossEventV26} from './world-boss-account-service-v26';

export const WORLD_BOSS_V26_PRIVATE_PG_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const uuid=(value:unknown):value is string=>
 typeof value==='string'&&UUID.test(value);
const check=(event:string,account:string,request:string)=>{
 if(!uuid(event)||!uuid(account)||!REQUEST.test(request))
  throw Error('world_boss_v26_pg_identity_invalid');
};
function sole<T extends object>(rows:readonly T[],error:string):T{
 if(rows.length!==1)throw Error(error);
 return rows[0];
}
export function createWorldBossAccountPgV26(pg:WorldBossPgExecutorV19):
 WorldBossRepositoryV26{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v26_private_pg_required');
 const v19=createWorldBossPrivatePgV19(pg);
 return {
  readAttempt:v19.readAttempt,
  checkout:v19.checkout,
  settle:v19.settle,
  async loadEvent(eventId){
   if(!uuid(eventId))throw Error('world_boss_v26_pg_event_invalid');
   const r=await pg.query<{
    boss:WorldBossEventV26['boss'];status:WorldBossEventV26['status'];
    rulesVersion:string;startsText:string;endsText:string;
   }>(
    'SELECT boss_id AS "boss",status,rules_version AS "rulesVersion",'+
    'floor(extract(epoch from starts_at)*1000)::text AS "startsText",'+
    'floor(extract(epoch from ends_at)*1000)::text AS "endsText" '+
    'FROM private.world_boss_events_v17 WHERE id=$1::uuid',[eventId]);
   const row=sole(r.rows,'world_boss_v26_event_not_found');
   return {boss:row.boss,status:row.status,rulesVersion:row.rulesVersion,
    startsAtUtcMs:Number(row.startsText),endsAtUtcMs:Number(row.endsText)};
  },
  async listOwnedStates(accountId){
   if(!uuid(accountId))throw Error('world_boss_v26_pg_owner_invalid');
   // public.online_game_states has PRIMARY KEY(account_id), not one row per
   // character. Read one authoritative save and all relational owner IDs in
   // ONE statement snapshot. LIMIT 6 catches forged/overfull rosters rather
   // than silently dropping the sixth fighter.
   const r=await pg.query<WorldBossAccountSaveRowV33>(
    'SELECT s.account_id::text AS "ownerAccountId",'+
    's.character_id::text AS "activeCharacterId",'+
    's.revision::text AS "revisionText",'+
    'floor(extract(epoch from s.updated_at)*1000)::text AS "updatedText",'+
    's.state AS "serverState",'+
    'coalesce((SELECT jsonb_agg(jsonb_build_object('+
      '\'characterId\',owned.id::text,\'classId\',owned.class_id) '+
      'ORDER BY owned.id) FROM ('+
      'SELECT c.id,c.class_id FROM public.characters c '+
      'WHERE c.account_id=$1::uuid ORDER BY c.id LIMIT 6'+
    ') owned),\'[]\'::jsonb) AS "ownedCharacters" '+
    'FROM public.online_game_states s WHERE s.account_id=$1::uuid',
    [accountId]);
   return expandOwnedWorldBossAccountSaveV33(
    accountId,sole(r.rows,'world_boss_v33_account_save_missing'));
  },
  async reserve(input){
   check(input.eventId,input.accountId,input.requestId);
   if(!uuid(input.characterId)||
    input.frozenPacket?.schema!=='world-boss-v26-authored-account-packet'||
    input.frozenPacket.accountId!==input.accountId)
    throw Error('world_boss_v26_pg_invalid_reservation_packet');
   const r=await pg.query<{receipt:WorldBossLeaseV19}>(
    'SELECT private.world_boss_v27_reserve_frozen('+ 
    '$1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,'+
    '$7::text,$8::jsonb,$9::text,$10::text,$11::text,$12::text) AS receipt',
    [input.eventId,input.accountId,input.characterId,input.requestId,
     input.order,input.seed,input.digest,JSON.stringify(input.frozenPacket),
     input.engineVersion,input.workerId,input.warCampDigest,null]);
   return sole(r.rows,'world_boss_v26_pg_reserve_empty').receipt;
  },
 };
}
