/** Disabled World Boss V28 private PostgreSQL boundary.
 * All SQL identifiers are fixed and values parameterized. No public RPC.
 */
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';
import type {WorldBossRewardRepositoryV28,
 WorldBossRewardProofReceiptV28,WorldBossSigilClaimReceiptV28,
 WorldBossRewardViewV28,WorldBossReplayProofSourceV28}
 from './world-boss-rewards-v28';

export const WORLD_BOSS_V28_PRIVATE_PG_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^[A-Za-z0-9_-]{8,128}$/;
const identity=(eventId:string,accountId:string,requestId?:string)=>{
 if(!UUID.test(eventId)||!UUID.test(accountId)||
  (requestId!==undefined&&!KEY.test(requestId)))
  throw Error('world_boss_v28_private_pg_identity_invalid');
};
const sole=<T extends object>(rows:readonly T[],message:string):T=>{
 if(rows.length!==1)throw Error(message);
 return rows[0];
};
export function createWorldBossRewardPgV28(
 pg:WorldBossPgExecutorV19,
):WorldBossRewardRepositoryV28{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v28_private_pg_required');
 return {
  async committedReplay(eventId,accountId,requestId){
   identity(eventId,accountId,requestId);
   const r=await pg.query<{
    eventId:string;accountId:string;requestId:string;
    status:WorldBossReplayProofSourceV28['status'];
    engineVersion:string;replayDigest:string;replayKey:string;
   }>('SELECT event_id::text AS "eventId",account_id::text AS "accountId",'+
    'request_id AS "requestId",status,engine_version AS "engineVersion",'+
    'replay_digest AS "replayDigest",'+
    'replay_object_key AS "replayKey" FROM private.world_boss_attempts_v17 '+
    'WHERE event_id=$1::uuid AND account_id=$2::uuid '+
    'AND request_id=$3::text AND status=\'committed\'',
    [eventId,accountId,requestId]);
   return sole(r.rows,'world_boss_v28_committed_attempt_missing');
  },
  async recordReplay(eventId,accountId,requestId,content){
   identity(eventId,accountId,requestId);
   if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>1048576)
    throw Error('world_boss_v28_invalid_replay_payload');
   const r=await pg.query<{receipt:WorldBossRewardProofReceiptV28}>(
    'SELECT private.world_boss_v28_record_replay('+
    '$1::uuid,$2::uuid,$3::text,$4::text) AS receipt',
    [eventId,accountId,requestId,content]);
   return sole(r.rows,'world_boss_v28_proof_receipt_missing').receipt;
  },
  async claim(eventId,accountId,requestId){
   identity(eventId,accountId,requestId);
   const r=await pg.query<{receipt:WorldBossSigilClaimReceiptV28}>(
    'SELECT private.world_boss_v28_claim('+
    '$1::uuid,$2::uuid,$3::text) AS receipt',
    [eventId,accountId,requestId]);
   return sole(r.rows,'world_boss_v28_claim_receipt_missing').receipt;
  },
  async view(accountId,eventId){
   identity(eventId,accountId);
   const r=await pg.query<{state:WorldBossRewardViewV28}>(
    'SELECT private.world_boss_v28_view('+
    '$1::uuid,$2::uuid) AS state',[accountId,eventId]);
   return sole(r.rows,'world_boss_v28_view_missing').state;
  },
 };
}
