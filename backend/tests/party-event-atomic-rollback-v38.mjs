/**
 * Hidden Party Events V38 — transaction FAILURE-ATOMICITY exercise.
 *
 * This fixture deliberately models a proposed future account-locked writer
 * inside an EPHEMERAL PGlite database. It is NOT a production SQL migration,
 * payout implementation, Edge endpoint, authenticated API, or authorization.
 * Real canonical Gold / online GameState / XP / Renown / Inventory / Inbox
 * parity remains blocked until independently reviewed and tested.
 */
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const OFFER1='33333333-3333-4333-8333-333333333333';
const OFFER2='44444444-4444-4444-8444-444444444444';
const OFFER3='55555555-5555-4555-8555-555555555555';
const START='2026-11-09T00:00:00Z';
const NEXT='2026-11-30T00:00:00Z';
const REC1='66666666-6666-4666-8666-666666666666';
const MAIL1='77777777-7777-4777-8777-777777777777';
const REC2='88888888-8888-4888-8888-888888888888';
const MAIL2='99999999-9999-4999-8999-999999999999';
const REC3='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MAIL3='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const db=await PGlite.create();
async function query(sql,params=[],tx=db){return tx.query(sql,params);}
function plain(rows){return JSON.stringify(rows);}
async function snapshot(){
 const [wallet,receipts,inbox]=await Promise.all([
  query('select account_id,revision::text as revision,gold::text as gold from private.fixture_wallet_v38 order by account_id'),
  query('select id,offer_id,account_id,request_id from private.fixture_paid_receipt_v38 order by id'),
  query('select id,offer_id,account_id from private.fixture_paid_inbox_v38 order by id'),
 ]);
 return plain([wallet.rows,receipts.rows,inbox.rows]);
}
async function rejectAtomic(action,label){
 const before=await snapshot();
 let error=null;
 try{await action();}
 catch(e){error=e;}
 assert.ok(error,'failure injection unexpectedly committed: '+label);
 assert.equal(await snapshot(),before,'rollback was incomplete: '+label);
}
const payout=async ({
 account=A,offer=OFFER1,expectedRevision=7,
 requestId='party-event-v38-request-0001',
 receipt=REC1,inbox=MAIL1,gold=100,
 failAt='none',
}={})=>{
 return db.transaction(async tx=>{
  // Serialized owner lock, recomputed canonical evidence and auth are still
  // required in a future real writer. This tests the SQL ordering ONLY.
  const owner=await query('select revision,gold from private.fixture_wallet_v38 where account_id=$1::uuid for update',[account],tx);
  if(owner.rows.length!==1||Number(owner.rows[0].revision)!==expectedRevision)
   throw Error('v38_stale_revision_or_owner');
  const offerRow=await query('select event_starts_at from private.fixture_offer_v38 where id=$1::uuid and account_id=$2::uuid',[offer,account],tx);
  if(offerRow.rows.length!==1)throw Error('v38_offer_not_owned');
  const eventStartsAt=offerRow.rows[0].event_starts_at;
  const updated=await query('update private.fixture_wallet_v38 set revision=revision+1,gold=gold+$3::bigint where account_id=$1::uuid and revision=$2::bigint returning revision',[account,expectedRevision,gold],tx);
  if(updated.rows.length!==1)throw Error('v38_compare_and_swap_conflict');
  if(failAt==='after-wallet')throw Error('v38_injected_after_wallet');
  await query(`insert into private.fixture_paid_receipt_v38
   (id,inbox_id,offer_id,account_id,event_starts_at,request_id,gold_delta)
   values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::timestamptz,$6,$7::bigint)`,
   [receipt,inbox,offer,account,eventStartsAt,requestId,gold],tx);
  if(failAt==='after-receipt')throw Error('v38_injected_after_receipt');
  if(failAt!=='omit-inbox'){
   await query(`insert into private.fixture_paid_inbox_v38
    (id,receipt_id,offer_id,account_id,event_starts_at)
    values ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::timestamptz)`,
    [inbox,receipt,offer,account,eventStartsAt],tx);
  }
  if(failAt==='after-inbox')throw Error('v38_injected_after_inbox');
  // Deferred FK on COMMIT rejects omit-inbox even if this block returns.
  return {previewSimulation:true,receipt,inbox};
 });
};
try{
 await db.exec(`
 create schema private;
 create table private.fixture_wallet_v38(
  account_id uuid primary key,
  revision bigint not null check(revision>=0),
  gold bigint not null check(gold>=0));
 create table private.fixture_offer_v38(
  id uuid primary key,account_id uuid not null,
  event_starts_at timestamptz not null,
  unique(id,account_id));
 create table private.fixture_paid_receipt_v38(
  id uuid primary key,inbox_id uuid not null unique,
  offer_id uuid not null unique,account_id uuid not null,
  event_starts_at timestamptz not null,request_id text not null,
  gold_delta bigint not null check(gold_delta>=0),
  unique(id,offer_id,account_id),
  unique(event_starts_at,account_id),unique(account_id,request_id),
  foreign key(offer_id,account_id) references private.fixture_offer_v38(id,account_id));
 create table private.fixture_paid_inbox_v38(
  id uuid primary key,receipt_id uuid not null unique,
  offer_id uuid not null unique,account_id uuid not null,
  event_starts_at timestamptz not null,
  unique(id,offer_id,account_id),
  unique(event_starts_at,account_id),
  foreign key(offer_id,account_id) references private.fixture_offer_v38(id,account_id));
 alter table private.fixture_paid_receipt_v38
  add constraint fixture_v38_receipt_paired
  foreign key(inbox_id,offer_id,account_id)
   references private.fixture_paid_inbox_v38(id,offer_id,account_id)
   deferrable initially deferred;
 alter table private.fixture_paid_inbox_v38
  add constraint fixture_v38_inbox_paired
  foreign key(receipt_id,offer_id,account_id)
   references private.fixture_paid_receipt_v38(id,offer_id,account_id)
   deferrable initially deferred;
 `);
 await query('insert into private.fixture_wallet_v38 values ($1::uuid,7,1000),($2::uuid,4,900)',[A,B]);
 await query(`insert into private.fixture_offer_v38 values
 ($1::uuid,$4::uuid,$5::timestamptz),
 ($2::uuid,$4::uuid,$5::timestamptz),
 ($3::uuid,$4::uuid,$6::timestamptz)`,[OFFER1,OFFER2,OFFER3,A,START,NEXT]);
 await rejectAtomic(()=>payout({failAt:'after-wallet'}),'wallet_failure');
 await rejectAtomic(()=>payout({failAt:'after-receipt'}),'receipt_failure');
 await rejectAtomic(()=>payout({failAt:'after-inbox'}),'inbox_failure');
 await rejectAtomic(()=>payout({failAt:'omit-inbox'}),'deferred_fk_commit_failure');
 await rejectAtomic(()=>payout({account:B,expectedRevision:4}),'wrong_account');
 await rejectAtomic(()=>payout({expectedRevision:6}),'stale_revision');
 const success=await payout();
 assert.equal(success.previewSimulation,true);
 const afterSuccess=await snapshot();
 const a=await query('select revision,gold from private.fixture_wallet_v38 where account_id=$1::uuid',[A]);
 assert.equal(Number(a.rows[0].revision),8);
 assert.equal(Number(a.rows[0].gold),1100);
 await rejectAtomic(()=>payout({expectedRevision:8}),'same_offer_new_revision');
 await rejectAtomic(()=>payout({offer:OFFER2,expectedRevision:8,receipt:REC2,inbox:MAIL2,requestId:'party-event-v38-new-key-0002'}),'same_event_alternate_offer');
 await rejectAtomic(()=>payout({offer:OFFER3,expectedRevision:8,receipt:REC3,inbox:MAIL3}),'same_request_next_event');
 assert.equal(await snapshot(),afterSuccess,'lost-response replay must never double-credit');
 const newEvent=await payout({offer:OFFER3,expectedRevision:8,
  receipt:REC3,inbox:MAIL3,requestId:'party-event-v38-new-week-0003'});
 assert.equal(newEvent.previewSimulation,true);
 const last=await query('select gold,revision from private.fixture_wallet_v38 where account_id=$1::uuid',[A]);
 assert.equal(Number(last.rows[0].gold),1200);
 assert.equal(Number(last.rows[0].revision),9);
 const counts=await query(`select
  (select count(*)::int from private.fixture_paid_receipt_v38) as receipts,
  (select count(*)::int from private.fixture_paid_inbox_v38) as inbox`);
 assert.deepEqual([counts.rows[0].receipts,counts.rows[0].inbox],[2,2]);
 console.log('PARTY_EVENTS_V38_ATOMIC_ROLLBACK_OK: 4 injected failures, stale owner, lost-response replay, duplicate week/request and 2 simulated paired commits in disposable PGlite');
}finally{
 await db.close();
}
