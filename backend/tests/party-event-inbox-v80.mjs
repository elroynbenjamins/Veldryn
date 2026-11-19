/**
 * V80 QA ONLY: PGlite proves that existing Inbox shape can store a paid
 * historical Party Event receipt without accidentally entering the legacy
 * Party Contract claim route or delivering duplicate attachments.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {createPartyChestInboxHistoryPortsV80}=require(
 '../.event-chest-tests/server/party/weekly-party-event-inbox-v80.js');
const v70=readFileSync(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql',
 import.meta.url),'utf8');
const lines=v70.split(/\\r?\\n/);
const start=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
const end=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
const sql=lines.slice(start+1,end).join('\\n');
const account='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const party='33333333-3333-4333-8333-333333333333';
const week=Date.UTC(2026,10,16);
const source='party-event:'+week+':'+account+':participation';
const receipt={
 rulesVersion:'chest-settlement-v69',sourceKey:source,accountId:account,
 recipientCharacterId:null,equipmentDeliveryMode:null,
 proofVersion:'party-event-proof-v61',tableId:'party_event_chest',
 tableVersion:'party_event_v51_broken_caravan_participation_standard',
 guaranteed:[{id:'party_sigils',quantity:8},{id:'gold',quantity:200},
  {id:'gem_dust',quantity:2},{id:'companion_essence',quantity:4}],
 groups:[{groupId:'equipment',type:'equipment',chanceBps:1200,
  hit:false,entryId:null,quantity:0}],drops:[],committed:true,
};
const db=await PGlite.create();
const tx={query:(q,args)=>db.query(q,args),release:()=>{}};
const ports=createPartyChestInboxHistoryPortsV80(true);
try{
 await db.exec('create schema auth;create schema private;'+
  'create role anon;create role authenticated;create role service_role;'+
  'create table auth.users(id uuid primary key);');
 await db.query('insert into auth.users(id) values($1),($2)',[account,other]);
 await db.exec(sql);
 // The following fixture preserves all columns/constraints of the actual
 // 20261003202408_reward_inbox.sql Inbox v1 table, but is not that migration.
 await db.exec(
  'create table private.party_event_weeks_v11('+
   'party_id uuid not null,event_starts_at timestamptz not null,'+
   'family text not null,difficulty text not null,status text not null,'+
   'primary key(party_id,event_starts_at));'+
  'create table private.party_event_roster_v11('+
   'party_id uuid not null,event_starts_at timestamptz not null,'+
   'account_id uuid not null,'+
   'primary key(party_id,event_starts_at,account_id));'+
  'create table private.reward_inbox_v1('+
   'id uuid primary key default gen_random_uuid(),'+
   'account_id uuid not null references auth.users(id) on delete cascade,'+
   'source_key text not null,'+
   "source_kind text not null check(source_kind in ('party','guild','dungeon','gift')),"+
   "source_id uuid not null,title text not null,body text not null default '',"+
   "attachments jsonb not null default '[]',"+
   'created_at timestamptz not null default now(),claimed_at timestamptz,'+
   'unique(account_id,source_key));'
 );
 await db.query('insert into private.party_event_weeks_v11 values'+
  "($1,to_timestamp($2::double precision/1000),'broken_caravan','standard','settled')",
  [party,week]);
 await db.query('insert into private.party_event_roster_v11 values'+
  '($1,to_timestamp($2::double precision/1000),$3)',[party,week,account]);
 await db.query('insert into private.chest_reward_receipts_v70 '+
  '(source_key,account_id,recipient_character_id,equipment_delivery_mode,'+
  'proof_version,table_id,table_version,rules_version,receipt) '+
  'values($1,$2::uuid,null,null,$3,$4,$5,$6,$7::jsonb)',
  [source,account,receipt.proofVersion,receipt.tableId,receipt.tableVersion,
   receipt.rulesVersion,JSON.stringify(receipt)]);
 const missing=createPartyChestInboxHistoryPortsV80();
 await assert.rejects(()=>missing.grantInbox(tx,receipt),/unreleased/);
 const forged={...receipt,sourceKey:source.replace(account,other)};
 await assert.rejects(()=>ports.grantInbox(tx,forged),/foreign_or_invalid_source/);
 await assert.rejects(()=>ports.grantInbox(tx,{
  ...receipt,guaranteed:[{id:'gold',quantity:200}],
 }),/noncanonical_guarantees/);
 await assert.rejects(()=>ports.grantInbox(tx,{
  ...receipt,drops:[{groupId:'equipment',type:'equipment',
   entryId:'PE_ITEM',quantity:1}],
 }),/unverified_paid_receipt/);
 await db.exec('begin');
 const history=await ports.grantInbox(tx,receipt);
 assert.match(history.grantId,/^inbox:[a-f0-9-]{36}$/);
 assert.equal(history.itemInstanceId,null);
 assert.equal(await ports.verifyInbox(tx,receipt,history.grantId),true);
 const row=(await db.query(
  'select source_kind,claimed_at,attachments from private.reward_inbox_v1 '+
  'where account_id=$1',[account])).rows[0];
 assert.equal(row.source_kind,'gift','must never dispatch Party Contract claim');
 assert.ok(row.claimed_at,'never appear as claimable Inbox reward');
 assert.deepEqual(row.attachments,[],'never dispatch attachments again');
 await db.exec('rollback');
 assert.equal((await db.query(
  'select count(*)::integer n from private.reward_inbox_v1',
 )).rows[0].n,0,'failed settlement must roll back Inbox history');
 await db.exec('begin');
 const committed=await ports.grantInbox(tx,receipt);
 await db.exec('commit');
 assert.equal(await ports.verifyInbox(tx,receipt,committed.grantId),true);
 await assert.rejects(()=>ports.grantInbox(tx,receipt),
  /duplicate key/);
 assert.equal(await ports.verifyInbox(tx,receipt,'inbox:'+party),false);
 // Any new pending claimable rows, with Party source kind, are unsafe under
 // the old public.reward_inbox_claim_v1 function: do not issue them here.
 const previous=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await assert.rejects(()=>ports.grantInbox(tx,receipt),/unreleased/);
 }finally{process.env.NODE_ENV=previous;}
 console.log('PARTY_EVENT_INBOX_V80_PGLITE_OK: existing Inbox shape, history-only, duplicate/source guards, no second claim, rollback, production fence');
}finally{await db.close()}
