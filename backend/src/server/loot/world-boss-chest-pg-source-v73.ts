/**
 * V73 hidden private World Boss chest source SQL bridge.
 *
 * Supplies the V70 account-scoped store with V17/V27/V28 canonical proof,
 * on the EXACT same PostgreSQL client V70 has already locked. No transport,
 * admin credential, migration, RPC, reward grant or live activation.
 *
 * Mandatory write ordering: BEGIN READ COMMITTED -> event FOR UPDATE ->
 * V57 account advisory erasure fence -> shared V70 account inventory row ->
 * V69 receipt-first settlement. The V57 guard rejects SERIALIZABLE.
 */
import type {ChestSqlV70} from './chest-postgres-store-v70';
import type {WorldBossCanonicalChestReadV59} from
 '../combat/world-boss-chest-proof-v59';
import {
 readWorldBossTrustedChestSourceV72,
 type WorldBossChestSourcePortV72,
} from './world-boss-chest-source-v72';
import type {TrustedChestSourceV69} from './chest-reward-settlement-v69';

export const WORLD_BOSS_CHEST_PG_SOURCE_V73_RELEASED=false;
const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const SOURCE=new RegExp('^world-boss:('+UUID+'):('+UUID+'):'
 +'(donations_goal|three_attempts|community_damage_goal)$');
type SqlRow=Record<string,unknown>;
const bosses=['hollowroot','sunscar','frostmarch'] as const;
const statuses=['reserved','committed','voided'] as const;
const request=/^[A-Za-z0-9_-]{8,128}$/;
const safeBigint=(raw:unknown,allowZero=true):number=>{
 const value=typeof raw==='string'&&/^\d+$/.test(raw)?Number(raw):raw;
 if(typeof value!=='number'||!Number.isSafeInteger(value)||
  value<0||(!allowZero&&value===0)||value>1_000_000_000_000)
  throw Error('world_boss_v73_invalid_private_quantity');
 return value;
};
function parseSource(accountId:string,sourceKey:string){
 const parts=typeof sourceKey==='string'?SOURCE.exec(sourceKey):null;
 if(!parts||typeof accountId!=='string'||accountId!==parts[2])
  throw Error('world_boss_v73_invalid_source_identity');
 return {eventId:parts[1]!,accountId};
}
async function exactlyOne(tx:ChestSqlV70,sql:string,args:readonly unknown[],
 code:string):Promise<SqlRow>{
 const result=await tx.query(sql,args);
 if(!Array.isArray(result?.rows)||result.rows.length!==1)
  throw Error('world_boss_v73_'+code);
 return result.rows[0]!;
}
function stringField(row:SqlRow,key:string):string{
 const value=row[key];
 if(typeof value!=='string')throw Error('world_boss_v73_invalid_'+key);
 return value;
}
/**
 * Called by V70 as assertSourceWriteOpen, BEFORE the account row lock.
 * V18/V27 settle under the event lock first; this ordering avoids reversed
 * event/account locks. The V57 advisory lock is held until commit/rollback.
 */
export async function assertWorldBossChestWriteOpenV73(
 tx:ChestSqlV70,accountId:string,sourceKey:string,
):Promise<void>{
 if(WORLD_BOSS_CHEST_PG_SOURCE_V73_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('world_boss_v73_unreleased');
 if(!tx||typeof tx.query!=='function')
  throw Error('world_boss_v73_pinned_sql_required');
 const identity=parseSource(accountId,sourceKey);
 const event=await exactlyOne(tx,
  'SELECT id::text AS event_id,status FROM private.world_boss_events_v17 '+
  'WHERE id=$1::uuid FOR UPDATE',
  [identity.eventId],'event_missing');
 if(event.event_id!==identity.eventId||
  !['active','closed'].includes(event.status as string))
  throw Error('world_boss_v73_event_not_claimable');
 // Must execute AFTER event lock and inside the same READ COMMITTED
 // transaction. Never replace this with an unfenced Auth/JWT lookup.
 await tx.query('SELECT private.world_boss_v57_assert_write_open($1::uuid)',
  [identity.accountId]);
}
/** Private V59 model reconstructed from committed SQL sources.
 * Caller must already have taken V73 event lock and V57 guard above. */
export async function readCanonicalWorldBossChestV73(
 tx:ChestSqlV70,eventId:string,accountId:string,
):Promise<WorldBossCanonicalChestReadV59>{
 if(WORLD_BOSS_CHEST_PG_SOURCE_V73_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('world_boss_v73_unreleased');
 if(!tx||typeof tx.query!=='function')
  throw Error('world_boss_v73_pinned_sql_required');
 parseSource(accountId,'world-boss:'+eventId+':'+accountId+':donations_goal');
 const event=await exactlyOne(tx,
  'SELECT id::text AS event_id,boss_id,status,'+
  'max_hp::text AS initial_hp,remaining_hp::text AS remaining_hp '+
  'FROM private.world_boss_events_v17 WHERE id=$1::uuid FOR SHARE',
  [eventId],'event_missing');
 const boss=event.boss_id;
 if(event.event_id!==eventId||
  !bosses.includes(boss as typeof bosses[number])||
  !['active','closed'].includes(event.status as string))
  throw Error('world_boss_v73_untrusted_event');
 const max=safeBigint(event.initial_hp,false);
 const remaining=safeBigint(event.remaining_hp);
 if(remaining>max)throw Error('world_boss_v73_bad_hp');
 const camp=await exactlyOne(tx,
  'SELECT event_id::text AS event_id,fortifications,'+
  'field_provisions AS field_provisions,siegecraft,fort_tier1,'+
  'fort_tier2,field_tier1,field_tier2,siege_tier1,siege_tier2 '+
  'FROM private.world_boss_war_camps_v27 '+
  'WHERE event_id=$1::uuid FOR SHARE',
  [eventId],'camp_missing');
 if(camp.event_id!==eventId)throw Error('world_boss_v73_foreign_camp');
 const tiers=[['fortifications','fort_tier1','fort_tier2'],
  ['field_provisions','field_tier1','field_tier2'],
  ['siegecraft','siege_tier1','siege_tier2']] as const;
 const values=tiers.map(([value,first,second])=>{
  const v=safeBigint(camp[value]);
  const one=safeBigint(camp[first],false);
  const two=safeBigint(camp[second],false);
  if(two<=one)throw Error('world_boss_v73_invalid_camp_goals');
  return v>=two?2:v>=one?1:0;
 });
 const donations=(await tx.query(
  'SELECT event_id::text AS event_id,account_id::text AS account_id,'+
  'request_id FROM private.world_boss_war_donations_v27 '+
  'WHERE event_id=$1::uuid AND account_id=$2::uuid ORDER BY ordinal',
  [eventId,accountId])).rows;
 if(!Array.isArray(donations)||donations.length>2)
  throw Error('world_boss_v73_invalid_donation_count');
 const donationReceipts=donations.map(d=>{
  if(d.event_id!==eventId||d.account_id!==accountId||
   !request.test(stringField(d,'request_id')))
   throw Error('world_boss_v73_foreign_donation');
  return {eventId,accountId,requestId:stringField(d,'request_id'),
   status:'committed' as const};
 });
 const attempts=(await tx.query(
  'SELECT a.event_id::text AS event_id,a.account_id::text AS account_id,'+
  'a.request_id,a.ordinal,a.status, '+
  "CASE WHEN p.replay_digest IS NOT NULL THEN 'verified' "+
  "ELSE 'absent' END AS replay_proof "+
  'FROM private.world_boss_attempts_v17 a '+
  'LEFT JOIN private.world_boss_replay_proofs_v28 p '+
  'ON p.event_id=a.event_id AND p.account_id=a.account_id '+
  'AND p.request_id=a.request_id AND p.replay_digest=a.replay_digest '+
  "AND a.status='committed' "+
  'WHERE a.event_id=$1::uuid AND a.account_id=$2::uuid '+
  'ORDER BY a.ordinal,a.request_id',
  [eventId,accountId])).rows;
 if(!Array.isArray(attempts)||attempts.length>12)
  throw Error('world_boss_v73_invalid_attempt_count');
 const attackReceipts=attempts.map(a=>{
  const ordinal=safeBigint(a.ordinal);
  if(a.event_id!==eventId||a.account_id!==accountId||
   !request.test(stringField(a,'request_id'))||
   !statuses.includes(a.status as typeof statuses[number])||
   !['verified','absent'].includes(a.replay_proof as string)||
   ordinal<1||ordinal>3||
   (a.status!=='committed'&&a.replay_proof==='verified'))
   throw Error('world_boss_v73_foreign_or_unproven_attempt');
  return {eventId,accountId,requestId:stringField(a,'request_id'),
   ordinal,status:a.status as typeof statuses[number],
   replayProof:a.replay_proof as 'verified'|'absent'};
 });
 return {
  eventId,accountId,
  event:{bossId:boss as typeof bosses[number],
   initialHp:max,remainingHp:remaining},
  warCamp:{eventId,trackTiers:{
   fortifications:values[0]!,fieldProvisions:values[1]!,
   siegecraft:values[2]!,
  },ownDonationReceipts:donationReceipts},
  attacks:attackReceipts,
 };
}
/** Plug only these two functions into an audited V70 physical-ports object.
 * That object remains incomplete until real wallet, Inbox and EQ2 ports land.
 * V70 requires the preflight on EVERY World Boss source, even receipt replays.
 */
export function createWorldBossChestSourcePortsV73(){
 const canonical:WorldBossChestSourcePortV72={
  readCanonicalInLockedTransaction:readCanonicalWorldBossChestV73,
 };
 return {
  assertSourceWriteOpen:assertWorldBossChestWriteOpenV73,
  readCanonicalSource:(tx:ChestSqlV70,accountId:string,sourceKey:string):
   Promise<TrustedChestSourceV69>=>
    readWorldBossTrustedChestSourceV72(
     {authenticatedAccountId:accountId,sourceKey},
     tx,canonical,true),
 };
}
