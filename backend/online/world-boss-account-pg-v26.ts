/**
 * Hidden V26 private PostgreSQL adapter for the authored V25 engine.
 * NO API route, live migration or client credentials.
 * SQL names are server-fixed, every value parameterized. Database principal
 * MUST be the trusted service role; keep private schema out of Data API.
 */
import {createWorldBossPrivatePgV19,
 type WorldBossPgExecutorV19,type WorldBossOwnerStateV19,
 type WorldBossLeaseV19} from './world-boss-private-pg-v19';
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
   const r=await pg.query<{
    ownerAccountId:string;characterId:string;revisionText:string;
    updatedText:string;serverState:WorldBossOwnerStateV19['serverState'];
   }>(
    'SELECT s.account_id::text AS "ownerAccountId",'+
    's.character_id::text AS "characterId",'+
    's.revision::text AS "revisionText",'+
    'floor(extract(epoch from s.updated_at)*1000)::text AS "updatedText",'+
    's.state AS "serverState" FROM public.online_game_states s '+
    'JOIN public.characters c ON c.id=s.character_id '+
    'AND c.account_id=s.account_id '+
    'WHERE s.account_id=$1::uuid ORDER BY s.character_id LIMIT 6',[accountId]);
   // LIMIT 6 is intentional: reject overfull accounts instead of silently
   // skipping a sixth fighter. DB access and ownership are server-only.
   return r.rows.map(row=>{
    const gameVersion=Number(row.revisionText);
    const updatedAtUtcMs=Number(row.updatedText);
    if(row.ownerAccountId!==accountId||!uuid(row.characterId)||
     !Number.isSafeInteger(gameVersion)||gameVersion<1||
     !Number.isSafeInteger(updatedAtUtcMs)||updatedAtUtcMs<=0||
     !row.serverState||typeof row.serverState!=='object')
     throw Error('world_boss_v26_pg_untrusted_owned_save');
    return {ownerAccountId:row.ownerAccountId,characterId:row.characterId,
     gameVersion,updatedAtUtcMs,serverState:row.serverState};
   });
  },
  async reserve(input){
   check(input.eventId,input.accountId,input.requestId);
   if(!uuid(input.characterId)||
    input.frozenPacket?.schema!=='world-boss-v26-authored-account-packet'||
    input.frozenPacket.accountId!==input.accountId)
    throw Error('world_boss_v26_pg_invalid_reservation_packet');
   const r=await pg.query<{receipt:WorldBossLeaseV19}>(
    'SELECT private.world_boss_v22_reserve_account('+ 
    '$1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,$6::text,'+
    '$7::text,$8::jsonb,$9::text,$10::text,$11::text,$12::text) AS receipt',
    [input.eventId,input.accountId,input.characterId,input.requestId,
     input.order,input.seed,input.digest,JSON.stringify(input.frozenPacket),
     input.engineVersion,input.workerId,input.warCampDigest,null]);
   return sole(r.rows,'world_boss_v26_pg_reserve_empty').receipt;
  },
 };
}
