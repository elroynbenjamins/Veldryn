/**
 * In-memory PostgreSQL integration tests for the DRAFT v29 migration.
 *
 * Runs on PGlite, not staging or production. Creates only a throwaway DB.
 * Exercises real deferred SQL FKs, unique keys, RLS grants and rollback.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {
 PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31,
 inspectPrivatePartyEventReceiptV31,
}=require('../dist/online/backend/online/party-event-receipt-recovery-v31.js');

const SQL=fileURLToPath(new URL('../../docs/roadmap/party-events/hidden-migrations/20261115173500_party_event_paid_receipt_inbox_v29.sql',import.meta.url));
const migration=readFileSync(SQL,'utf8');
const db=await PGlite.create();

const account='11111111-1111-4111-8111-111111111111';
const outsider='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const character='22222222-2222-4222-8222-222222222222';
const altCharacter='88888888-8888-4888-8888-888888888888';
const offer='33333333-3333-4333-8333-333333333333';
const otherOffer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const receipt='66666666-6666-4666-8666-666666666666';
const inbox='77777777-7777-4777-8777-777777777777';
const reservation='55555555-5555-4555-8555-555555555555';
const otherReservation='99999999-9999-4999-8999-999999999999';
const startsAt='2026-11-01T00:00:00Z';
const requestId='party-v29-integration-0001';
const stateHash='a'.repeat(64);
const reward={
 version:'party-event-rewards-v2',kind:'participation',
 performanceBand:1,personalPoints:5,gold:420,combatXp:0,skillXp:0,
 companionEssence:0,bondstones:0,partyRenown:0,materials:{},
};
const json=JSON.stringify(reward);

function assert(ok,label){if(!ok)throw new Error('party_v29_sql_integration: '+label);}
async function q(sql,params=[],handle=db){return handle.query(sql,params);}
async function expectFailure(fn,label){
 let error=null;
 try { await db.transaction(async tx=>fn(tx)); }
 catch(e){error=e;}
 if(!error) throw new Error('party_v29_sql_integration: unexpectedly committed '+label);
 assert(/constraint|foreign key|violates|immutable|duplicate|permission|aborted|failed/i.test(String(error)),
   'unexpected rejection for '+label+': '+String(error));
}
const receiptSql=`
insert into private.party_event_paid_claim_receipts_v29 (
 id,inbox_id,offer_id,account_id,character_id,reservation_id,
 event_starts_at,request_id,reward_model,reward_kind,reward_hash,
 reward_json,source_revision,settled_revision,gold_delta,
 combat_xp_delta,profession_xp_delta,companion_essence_delta,
 bondstones_delta,party_renown_delta,gem_dust_delta,state_after_hash
) values (
 $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,
 $7::timestamptz,$8,'party-event-rewards-v2','participation',$9,
 $10::jsonb,5,6,$12::bigint,0,0,0,0,0,0,$11
)`;
const inboxSql=`
insert into private.party_event_paid_claim_inbox_v29 (
 id,receipt_id,offer_id,account_id,character_id,event_starts_at,
 title,reward_json,reward_hash
) values (
 $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::timestamptz,
 'Party Event Rewards',$7::jsonb,$8
)`;
async function writeReceipt(options={},handle=db){
 return q(receiptSql,[
  options.receipt??receipt,options.inbox??inbox,
  options.offer??offer,options.account??account,options.character??character,
  options.reservation??reservation,options.start??startsAt,options.request??requestId,
  options.hash??rewardHash,options.json??json,stateHash,options.goldDelta??420,
 ],handle);
}
async function writeInbox(options={},handle=db){
 return q(inboxSql,[
  options.inbox??inbox,options.receipt??receipt,
  options.offer??offer,options.account??account,options.character??character,
  options.start??startsAt,options.json??json,
  options.hash??rewardHash,
 ],handle);
}
let rewardHash='';

async function run(){
 await db.exec(`
  create schema auth;
  create schema private;
  create role anon;
  create role authenticated;
  create role service_role;
  create table auth.users(id uuid primary key);
  create table public.characters(
   id uuid not null,account_id uuid not null,
   primary key(id,account_id)
  );
  create table private.party_event_reward_claim_quotes_v25(
   offer_id uuid primary key,account_id uuid not null,
   character_id uuid not null,event_starts_at timestamptz not null,
   reward_hash text not null
  );
  create table private.party_event_reward_offers_v24(
   id uuid primary key,reservation_id uuid not null,
   event_starts_at timestamptz not null,account_id uuid not null,
   unique(event_starts_at,account_id)
  );
  create function private.party_event_progress_immutable_v14()
  returns trigger language plpgsql as $body$
  begin raise exception 'party_event_progress_immutable';end;$body$;
 `);
 await db.exec(migration);
 const hash=await q(`select encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') as h`,[json]);
 rewardHash=hash.rows[0].h;
 assert(/^[a-f0-9]{64}$/.test(rewardHash),'canonical hash from PostgreSQL jsonb');
 await q('insert into auth.users(id) values($1::uuid),($2::uuid)',[account,outsider]);
 await q('insert into public.characters(id,account_id) values($1::uuid,$2::uuid),($3::uuid,$2::uuid)',[character,account,altCharacter]);
 await q('insert into private.party_event_reward_offers_v24(id,reservation_id,event_starts_at,account_id) values($1::uuid,$2::uuid,$3::timestamptz,$4::uuid)',[offer,reservation,startsAt,account]);
 await q('insert into private.party_event_reward_offers_v24(id,reservation_id,event_starts_at,account_id) values($1::uuid,$2::uuid,$3::timestamptz,$4::uuid)',[otherOffer,otherReservation,'2026-11-22T00:00:00Z',account]);

 await q('insert into private.party_event_reward_claim_quotes_v25(offer_id,account_id,character_id,event_starts_at,reward_hash) values($1::uuid,$2::uuid,$3::uuid,$4::timestamptz,$5),($6::uuid,$2::uuid,$3::uuid,$7::timestamptz,$5)',[offer,account,character,startsAt,rewardHash,otherOffer,'2026-11-22T00:00:00Z']);

 // In either direction the cyclic deferred FKs reject orphan records at COMMIT.
 await expectFailure(tx=>writeReceipt({},tx),'receipt without Inbox must rollback');
 assert((await q('select count(*)::int as n from private.party_event_paid_claim_receipts_v29')).rows[0].n===0,
   'orphan receipt rolled back');
 await expectFailure(tx=>writeInbox({},tx),'Inbox without receipt must rollback');
 assert((await q('select count(*)::int as n from private.party_event_paid_claim_inbox_v29')).rows[0].n===0,
   'orphan Inbox rolled back');

 // The ONLY successful insertion is a linked pair in the same SQL transaction.
 await db.transaction(async tx=>{
  await writeReceipt({},tx);
  await writeInbox({},tx);
 });
 assert((await q('select count(*)::int as n from private.party_event_paid_claim_receipts_v29')).rows[0].n===1,
   'one durable receipt after paired commit');
 assert((await q('select count(*)::int as n from private.party_event_paid_claim_inbox_v29')).rows[0].n===1,
   'one durable Inbox delivery after paired commit');
 const response=await q('select private.read_party_event_paid_inbox_v29($1::uuid) as value',[account]);
 assert(response.rows[0].value.items?.length===1
  &&response.rows[0].value.items[0].receiptId===receipt
  &&response.rows[0].value.items[0].inboxId===inbox
  &&response.rows[0].value.claimEndpointEnabled===false
  &&response.rows[0].value.payoutWriterInstalled===false
  &&response.rows[0].value.economyReconciled===false
  &&response.rows[0].value.items[0].receiptRecorded===true
  &&response.rows[0].value.items[0].inboxRecordPresent===true
  &&response.rows[0].value.items[0].claimed===false
  &&response.rows[0].value.items[0].economyApplied===false
  &&response.rows[0].value.items[0].inboxDelivered===false
  &&response.rows[0].value.items[0].status==='receipt_requires_economy_verification',
  'read-only account mailbox reflects exactly one paid pair');
 const other=await q('select private.read_party_event_paid_inbox_v29($1::uuid) as value',[outsider]);
 assert(other.rows[0].value.items.length===0,
  'other account cannot read unrelated Inbox messages');

 // v31 must recover the *stored* paired receipt after a lost response, but
 // must NOT allow a client success or an automatic second grant. This exercises
 // the REAL parameterized query against the v29 tables, not a mock SQL result.
 const recoveryDb={queryOne:async(sql,params)=>{
  assert(sql===PARTY_EVENT_RECEIPT_RECOVERY_QUERY_V31,
   'v31 uses only approved account/offer/request SQL');
  const rows=await q(sql,params);
  return rows.rows[0]??null;
 }};
 const inspect=(accountId,offerId,requestKey)=>
  inspectPrivatePartyEventReceiptV31({
   gateEnabled:true,trustedAccountId:accountId,offerId,requestId:requestKey,
   db:recoveryDb,
  });
 const afterCommit=await inspect(account,offer,requestId);
 assert(afterCommit.status==='paired_receipt_present'
  &&afterCommit.receiptId===receipt
  &&afterCommit.retryAuthorized===false
  &&afterCommit.clientSuccessAllowed===false
  &&afterCommit.economyIndependentlyVerified===false,
  'receipt + Inbox pair is visible but does not certify economy transfer');
 const unrelated=await inspect(outsider,offer,requestId);
 assert(unrelated.status==='not_recorded'&&unrelated.receiptId===null
  &&!unrelated.retryAuthorized,
  'another account cannot discover or replay this receipt');
 const genuinelyAbsent=await inspect(account,otherOffer,'party-v31-new-req-0002');
 assert(genuinelyAbsent.status==='not_recorded'
  &&!genuinelyAbsent.retryAuthorized,
  'no recorded receipt never automatically authorizes a payout retry');
 for(const [offerId,requestKey] of [
   [otherOffer,requestId],[offer,'party-v31-changed-key-0003'],
 ]){
  let rejected=false;
  try{await inspect(account,offerId,requestKey);}
  catch(e){rejected=String(e).includes('receipt_request_conflict');}
  assert(rejected,'changed offer or reused request must fail closed');
 }

 // The SQL uniqueness constraints deny replay/double-credit even with new UUIDs.
 await expectFailure(tx=>writeReceipt({
  receipt:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  inbox:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  offer:otherOffer,reservation:otherReservation,start:'2026-11-22T00:00:00Z',
  request:requestId,
 },tx), 'same account/request across weeks');
 await expectFailure(tx=>writeReceipt({
  receipt:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  inbox:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  offer,start:startsAt,request:'another-v29-idempotency-key',
 },tx), 'same event/account across requests');
 await expectFailure(tx=>writeReceipt({
  receipt:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  inbox:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  offer:otherOffer,reservation:otherReservation,start:'2026-11-22T00:00:00Z',
  request:'another-v29-key-0001',hash:'f'.repeat(64),
 },tx), 'receipt quote hash cannot diverge from reward JSON');

 // Even two individually valid reward hashes must match across the pair.
 const changedJson=JSON.stringify({...reward,gold:421});
 const changed=await q("select encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') as h",[changedJson]);
 await expectFailure(async tx=>{
  await writeReceipt({
   receipt:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   inbox:'ffffffff-ffff-4fff-8fff-ffffffffffff',
   offer:otherOffer,reservation:otherReservation,start:'2026-11-22T00:00:00Z',
   request:'party-v29-quote-drift-0001',
  },tx);
  await writeInbox({
   receipt:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   inbox:'ffffffff-ffff-4fff-8fff-ffffffffffff',
   offer:otherOffer,reservation:otherReservation,start:'2026-11-22T00:00:00Z',
   json:changedJson,hash:changed.rows[0].h,
  },tx);
 },'Inbox/receipt mismatched reward hashes must rollback');
 assert((await q('select count(*)::int as n from private.party_event_paid_claim_inbox_v29')).rows[0].n===1,
  'mismatched pair never writes a second Inbox record');
 await expectFailure(tx=>writeReceipt({
  receipt:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  inbox:'ffffffff-ffff-4fff-8fff-ffffffffffff',
  offer:otherOffer,reservation:otherReservation,account:outsider,start:'2026-11-22T00:00:00Z',
  request:'party-v29-foreign-owner-0001',
 },tx),'account/offer mismatch is rejected');

 await expectFailure(tx=>writeReceipt({
  receipt:'12121212-1212-4121-8121-121212121212',
  inbox:'13131313-1313-4131-8131-131313131313',
  offer:otherOffer,reservation:otherReservation,start:'2026-11-22T00:00:00Z',
  request:'party-v29-wrong-gold-0001',goldDelta:421,
 },tx),'Gold delta differs from recorded quote');
 await expectFailure(async tx=>{
  const receiptId='14141414-1414-4141-8141-141414141414';
  const inboxId='15151515-1515-4151-8151-151515151515';
  await writeReceipt({receipt:receiptId,inbox:inboxId,
   offer:otherOffer,reservation:otherReservation,start:'2026-11-22T00:00:00Z',
   request:'party-v29-wrong-character-0001'},tx);
  await writeInbox({receipt:receiptId,inbox:inboxId,character:altCharacter,
   offer:otherOffer,start:'2026-11-22T00:00:00Z'},tx);
 },'paired Inbox targets wrong character');

 // Edits to paid records are forbidden; cascade deletion remains possible
 // for legitimate account erasure by the owner.
 await expectFailure(tx=>q(`update private.party_event_paid_claim_receipts_v29
  set gold_delta=gold_delta+1 where id=$1::uuid`,[receipt],tx),
  'immutable receipt');
 await expectFailure(tx=>q(`update private.party_event_paid_claim_inbox_v29
  set title='Changed' where id=$1::uuid`,[inbox],tx),
  'immutable Inbox');

 const perms=await q(`select
  has_table_privilege('anon','private.party_event_paid_claim_receipts_v29','SELECT') as anon_read,
  has_table_privilege('authenticated','private.party_event_paid_claim_inbox_v29','SELECT') as player_read,
  has_table_privilege('service_role','private.party_event_paid_claim_receipts_v29','INSERT') as service_write,
  has_table_privilege('service_role','private.party_event_paid_claim_inbox_v29','INSERT') as service_mail_write,
  has_table_privilege('service_role','private.party_event_paid_claim_inbox_v29','SELECT') as service_mail_read`);
 assert(!perms.rows[0].anon_read&&!perms.rows[0].player_read
  &&!perms.rows[0].service_write&&!perms.rows[0].service_mail_write
  &&perms.rows[0].service_mail_read,
  'public/player/ordinary service users cannot create paid claims');
 const noWriter=await q(`select count(*)::int as n from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='private' and p.proname like '%claim%v29'
     and p.prokind='f' and p.proname not like 'read_%'`);
 assert(noWriter.rows[0].n===0,'v29 has no payout function');
 console.log('Party Events v29 PGlite: migrated schema, 2 deferred FK rollback directions, exactly-one linked pair, immutable receipts, unique requests/weeks, owner-only Inbox, no pay writer');
}
run().then(()=>db.close()).catch(async e=>{
 console.error(e);try{await db.close();}catch{}
 process.exitCode=1;
});
