/**
 * Disposable PG integration of the actual V70 SQL adapter and V69 service.
 * Test fixtures emulate physical storage; this is NOT a deployment adapter.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {createChestPostgresStoreV70}=require(
 '../.event-chest-tests/server/loot/chest-postgres-store-v70.js');
const {createChestRewardSettlementV69}=require(
 '../.event-chest-tests/server/loot/chest-reward-settlement-v69.js');
const {defineChestLootTableV67}=require(
 '../.event-chest-tests/server/loot/chest-loot-engine-v67.js');
const {resolveTrustedPartyChestSourceV77}=require(
 '../.event-chest-tests/server/party/weekly-party-event-chest-source-v77.js');
const {createPartyChestInboxHistoryPortsV80}=require(
 '../.event-chest-tests/server/party/weekly-party-event-inbox-v80.js');
const {deriveServerChestRollsV1}=require(
 '../.event-chest-tests/server/loot/event-chest-server-roll-v1.js');
const sql=readFileSync(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql',
 import.meta.url),'utf8');
const lines=sql.split(/\r?\n/);
const begin=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
const end=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
const ddl=lines.slice(begin+1,end).join('\n');
const account='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const character='33333333-3333-4333-8333-333333333333';
const source='winter-week:2026_11_16:'+account+':first';
const second='winter-week:2026_11_16:'+account+':rollback';
const eqSource='party-event:'+Date.UTC(2026,10,16)+':'+account+':participation';
const futureTable=defineChestLootTableV67({
 tableId:'winter_weekly_chest',version:'winter_v1',
 guarantees:[{id:'gold',quantity:400},{id:'gem_dust',quantity:2}],
 groups:[{id:'materials',type:'material',chanceBps:10000,
  duplicatePolicy:'allow_duplicates',entries:[{id:'ORE',weight:1,quantity:7}]}],
});
const equipmentTable=defineChestLootTableV67({
 tableId:'party_event_chest',version:'party_event_v51_broken_caravan_participation_standard',
 guarantees:[{id:'gold',quantity:200}],
 groups:[{id:'equipment',type:'equipment',chanceBps:10000,
  duplicatePolicy:'prefer_unowned',
  entries:[{id:'PE_WAYFARERS_PACT_BOOTS',weight:1}]}],
});
const db=await PGlite.create();
try{
 await db.exec('create schema auth;create schema private;'+
  'create role anon;create role authenticated;create role service_role;'+
  'create table auth.users(id uuid primary key);'+
  'create table public.characters(id uuid primary key,account_id uuid not null references auth.users(id));');
 await db.query('insert into auth.users values($1),($2)',[account,other]);
 await db.query('insert into public.characters values($1,$2)',[character,account]);
 await db.exec(ddl);
 await db.exec(
  // Match the existing, published Inbox v1 table shape. This is a
  // disposable fixture; the actual V80 review-only port owns the writes.
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
   'unique(account_id,source_key));'+
  'create table private.v70_test_guarantees('+
  'source_key text not null,account_id uuid not null,ordinal integer not null,'+
  'reward_id text not null,quantity integer not null,grant_id text not null unique,'+
  'primary key(source_key,ordinal));'+
  'create table private.v70_test_drops('+
  'source_key text not null,account_id uuid not null,ordinal integer not null,'+
  'reward_id text not null,quantity integer not null,grant_id text not null unique,'+
  'primary key(source_key,ordinal));'+
  'create table private.v70_test_inbox('+
  'source_key text primary key,account_id uuid not null,grant_id text not null unique);'
 );
 let failDrop=false;
 const history=createPartyChestInboxHistoryPortsV80(true);
 let proof={
  sourceKey:source,accountId:account,proofVersion:'trusted-winter-v1',
  recipientCharacterId:null,equipmentDeliveryMode:null,
  earned:true,lootTable:futureTable,
 };
 const ports={
  readCanonicalSource:async(_tx,owner,key)=>{
   assert.equal(owner,account);assert.equal(key,proof.sourceKey);
   return proof;
  },
  readAccountOwnedDrops:async(tx,owner)=>{
   const r=await tx.query(
    'select reward_id from private.v70_test_drops where account_id=$1::uuid',
    [owner],
   );
   return r.rows.map(x=>x.reward_id);
  },
  isOwnedCharacter:async(tx,owner,id)=>{
   const r=await tx.query(
    'select id from public.characters where id=$1::uuid and account_id=$2::uuid',
    [id,owner],
   );
   return r.rows.length===1;
  },
  readApprovedEquipmentContext:async(_tx,receipt,index)=>{
   assert.equal(index,0,'only canonical equipment group approved');
   assert.equal(receipt.tableId,'party_event_chest');
   assert.equal(receipt.accountId,account);
   return {tier:2};
  },
  creditGuaranteed:async(tx,receipt,index)=>{
   const item=receipt.guaranteed[index];
   const grantId='g:'+receipt.sourceKey+':'+index;
   await tx.query(
    'insert into private.v70_test_guarantees '+
    '(source_key,account_id,ordinal,reward_id,quantity,grant_id) '+
    'values ($1,$2::uuid,$3,$4,$5,$6)',
    [receipt.sourceKey,receipt.accountId,index,item.id,item.quantity,grantId],
   );
   return {grantId,itemInstanceId:null};
  },
  grantDrop:async(tx,receipt,index)=>{
   const item=receipt.drops[index];
   const grantId='d:'+receipt.sourceKey+':'+index;
   await tx.query(
    'insert into private.v70_test_drops '+
    '(source_key,account_id,ordinal,reward_id,quantity,grant_id) '+
    'values ($1,$2::uuid,$3,$4,$5,$6)',
    [receipt.sourceKey,receipt.accountId,index,item.entryId,item.quantity,grantId],
   );
   if(failDrop)throw Error('fixture_after_item_insert_failure');
   return {grantId,itemInstanceId:null};
  },
  grantInbox:async(tx,receipt)=>{
   if(receipt.proofVersion==='party-event-proof-v61')
    return history.grantInbox(tx,receipt);
   const grantId='i:'+receipt.sourceKey;
   await tx.query(
    'insert into private.v70_test_inbox(source_key,account_id,grant_id) '+
    'values($1,$2::uuid,$3)',
    [receipt.sourceKey,receipt.accountId,grantId],
   );
   return {grantId,itemInstanceId:null};
  },
  verifyPhysical:async(tx,receipt,legs)=>{
   // Single physical connection: don't issue parallel queries on the
   // same SERIALIZABLE session while verifying durable grant custody.
   const gs=await tx.query(
    'select * from private.v70_test_guarantees where source_key=$1',
    [receipt.sourceKey]);
   const ds=await tx.query(
    'select * from private.v70_test_drops where source_key=$1',
    [receipt.sourceKey]);
   const isPartyHistory=receipt.proofVersion==='party-event-proof-v61';
   const ins=isPartyHistory?{rows:[]}:
    await tx.query(
     'select * from private.v70_test_inbox where source_key=$1',
     [receipt.sourceKey]);
   if(gs.rows.length!==receipt.guaranteed.length||
    ds.rows.length!==receipt.drops.length||
    (!isPartyHistory&&ins.rows.length!==1))return false;
   for(const row of [...gs.rows.map(x=>({...x,kind:'guarantee'})),
    ...ds.rows.map(x=>({...x,kind:'drop'}))]){
    if(!legs.some(leg=>leg.kind===row.kind&&leg.ordinal===row.ordinal&&
     leg.quantity===Number(row.quantity)&&leg.rewardId===row.reward_id&&
     leg.grantId===row.grant_id&&leg.accountId===row.account_id))
     return false;
   }
   if(isPartyHistory){
    const leg=legs.find(item=>item.kind==='inbox'&&item.ordinal===0&&
     item.accountId===account);
    return !!leg&&await history.verifyInbox(tx,receipt,leg.grantId);
   }
   return legs.some(leg=>leg.kind==='inbox'&&leg.ordinal===0&&
    leg.grantId===ins.rows[0].grant_id&&leg.accountId===account);
  },
 };
 const pool={connect:async()=>({
  query:(statement,args)=>db.query(statement,args),
  release:()=>{},
 })};
 const store=createChestPostgresStoreV70(pool,ports,true);
 const secret=new Uint8Array(32).fill(23);
 const open=createChestRewardSettlementV69(store,{secret},true);
 const frozen=await open({authenticatedAccountId:account,sourceKey:source});
 assert.equal(frozen.replayed,false);
 assert.equal(frozen.receipt.drops.length,1);
 assert.equal(frozen.receipt.drops[0].quantity,7);
 assert.equal((await db.query(
  'select count(*)::integer n from private.chest_reward_grant_legs_v70',
 )).rows[0].n,4);
 const reissued=await open({authenticatedAccountId:account,sourceKey:source});
 assert.equal(reissued.replayed,true);
 assert.deepEqual(reissued.receipt,frozen.receipt);
 proof={...proof,lootTable:defineChestLootTableV67({
  ...futureTable,version:'winter_v2',
  groups:futureTable.groups.map(g=>({...g,chanceBps:0})),
 })};
 const old=await open({authenticatedAccountId:account,sourceKey:source});
 assert.equal(old.replayed,true);
 assert.equal(old.receipt.tableVersion,'winter_v1');
 await assert.rejects(
  ()=>open({authenticatedAccountId:other,sourceKey:source}),
  /invalid_authenticated_source/);
 proof={...proof,sourceKey:second,lootTable:futureTable};
 failDrop=true;
 await assert.rejects(
  ()=>open({authenticatedAccountId:account,sourceKey:second}),
  /fixture_after_item_insert_failure/);
 const missing=(await db.query(
  'select count(*)::integer n from private.chest_reward_receipts_v70 where source_key=$1',
  [second],
 )).rows[0].n;
 assert.equal(missing,0,'failed payout rolls back receipt and physical rows');
 failDrop=false;
 const retry=await open({authenticatedAccountId:account,sourceKey:second});
 assert.equal(retry.replayed,false);
 proof={...proof,sourceKey:eqSource,
  recipientCharacterId:character,equipmentDeliveryMode:'character',
  lootTable:equipmentTable};
 await assert.rejects(
  ()=>open({authenticatedAccountId:account,sourceKey:eqSource}),
  /chest_v70_eq2_manifest_and_custody_not_ready/);
 const noItem=(await db.query(
  'select count(*)::integer n from private.chest_reward_receipts_v70 where source_key=$1',
  [eqSource],
 )).rows[0].n;
 assert.equal(noItem,0,'unregistered EQ2 equipment is never paid or journaled');
 const unissued=(await db.query(
  'select count(*)::integer n from private.v70_test_guarantees where source_key=$1',
  [eqSource],
 )).rows[0].n;
 const noInbox=(await db.query(
  'select count(*)::integer n from private.v70_test_inbox where source_key=$1',
  [eqSource],
 )).rows[0].n;
 assert.equal(unissued,0,'gear failure must roll back guaranteed Gold as well');
 assert.equal(noInbox,0,'gear failure must not create an Inbox claim');
 // A real V70 transaction must settle an earned Party chest whose legacy
 // equipment roll misses: grant exactly the guaranteed rewards + one Inbox,
 // no item ledger, no character custody, and a receipt that cannot be rerolled.
 const missSource='party-event:'+Date.UTC(2026,10,16)+':'+account+
  ':preparation';
 const missedGearTable=defineChestLootTableV67({
  ...equipmentTable,version:'party_event_v51_broken_caravan_preparation_standard',
  groups:equipmentTable.groups.map(g=>({...g,chanceBps:0})),
 });
 proof={...proof,sourceKey:missSource,lootTable:missedGearTable,
  recipientCharacterId:character,equipmentDeliveryMode:'character'};
 const missed=await open({
  authenticatedAccountId:account,sourceKey:missSource,
 });
 assert.equal(missed.replayed,false);
 assert.equal(missed.receipt.drops.length,0);
 assert.equal(missed.receipt.equipmentDeliveryMode,null);
 assert.equal(missed.receipt.recipientCharacterId,null);
 const physicalGuarantees=(await db.query(
  'select count(*)::integer n from private.v70_test_guarantees where source_key=$1',
  [missSource],
 )).rows[0].n;
 const physicalInbox=(await db.query(
  'select count(*)::integer n from private.v70_test_inbox where source_key=$1',
  [missSource],
 )).rows[0].n;
 const physicalItems=(await db.query(
  'select count(*)::integer n from private.v70_test_drops where source_key=$1',
  [missSource],
 )).rows[0].n;
 assert.equal(physicalGuarantees,1,'gear miss still paid canonical guarantee');
 assert.equal(physicalInbox,1,'gear miss still produced one Inbox receipt');
 assert.equal(physicalItems,0,'gear miss did not invent an item');
 proof={...proof,recipientCharacterId:other};
 const replayMissed=await open({
  authenticatedAccountId:account,sourceKey:missSource,
 });
 assert.equal(replayMissed.replayed,true);
 assert.deepEqual(replayMissed.receipt,missed.receipt);
 const foreignMissSource='party-event:'+Date.UTC(2026,10,16)+':'+account+
  ':finale';
 proof={...proof,sourceKey:foreignMissSource};
 await assert.rejects(
  ()=>open({authenticatedAccountId:account,sourceKey:foreignMissSource}),
  /chest_v69_unverified_character_destination/,
 );
 assert.equal((await db.query(
  'select count(*)::integer n from private.chest_reward_receipts_v70 where source_key=$1',
  [foreignMissSource],
 )).rows[0].n,0,'foreign character cannot claim even on a gear miss');
 // V83 integrated Party chest: authentic V77 table/proof, deterministic
 // real 12% roll MISS, V69 serializable settlement, V70 exact receipt and
 // the real legacy Inbox shape via V80. Physical wallet tables remain a
 // disposable fixture here; this does NOT validate a production grant.
 const partyId='55555555-5555-4555-8555-555555555555';
 const eventStart=Date.UTC(2026,10,16);
 const identity={partyId,accountId:account,eventStartsAtUtcMs:eventStart};
 const settled={
  source:'private_party_event_settlement_join_v61',
  week:{partyId,eventStartsAtUtcMs:eventStart,
   eventEndsAtUtcMs:eventStart+604800000,
   settledAtUtcMs:eventStart+608400000,
   status:'settled',family:'broken_caravan',difficulty:'standard'},
  roster:{...identity,rosterSize:2,frozenCharacterId:character},
  activity:{...identity,activityPoints:20,
   sourceVersion:'party_event_member_progress_v14'},
  preparation:null,finale:null,
  tier:{...identity,eligibleGearTier:2,
   sourceVersion:'server_level_snapshot_v2'},
 };
 await db.query(
  'insert into private.party_event_weeks_v11 values'+
  "($1,to_timestamp($2::double precision/1000),'broken_caravan','standard','settled')",
  [partyId,eventStart]);
 await db.query('insert into private.party_event_roster_v11 values'+
  '($1,to_timestamp($2::double precision/1000),$3)',
  [partyId,eventStart,account]);
 proof=resolveTrustedPartyChestSourceV77({
  authenticatedAccountId:account,sourceKey:eqSource,proof:settled,
 });
 assert.equal(proof.lootTable.groups[0].chanceBps,1200);
 assert.equal(proof.lootTable.guarantees.length,4);
 let missedSecret=null;
 for(let i=1;i<=255;i++){
  const candidate=new Uint8Array(32).fill(i);
  const roll=deriveServerChestRollsV1({
   domain:'party_event_v51',secret:candidate,
   committedChestKey:eqSource,
  });
  if(roll.hitRoll>=1200){missedSecret=candidate;break;}
 }
 assert.ok(missedSecret,'deterministic test vector must include a miss');
 const realMiss=createChestRewardSettlementV69(
  store,{secret:missedSecret},true);
 const integrated=await realMiss({
  authenticatedAccountId:account,sourceKey:eqSource,
 });
 assert.equal(integrated.replayed,false);
 assert.equal(integrated.receipt.drops.length,0);
 assert.equal(integrated.receipt.guaranteed.length,4);
 assert.equal(integrated.receipt.proofVersion,'party-event-proof-v61');
 const inboxHistory=(await db.query(
  'select source_kind,attachments,claimed_at from private.reward_inbox_v1 '+
  'where source_key=$1 and account_id=$2',[eqSource,account],
 )).rows;
 assert.equal(inboxHistory.length,1);
 assert.equal(inboxHistory[0].source_kind,'gift');
 assert.deepEqual(inboxHistory[0].attachments,[]);
 assert.ok(inboxHistory[0].claimed_at);
 const trueGrantCount=(await db.query(
  'select count(*)::integer n from private.v70_test_guarantees '+
  'where source_key=$1',[eqSource],
 )).rows[0].n;
 assert.equal(trueGrantCount,4,
  'all four guaranteed legs must exist in same DB transaction');
 const returned=await realMiss({
  authenticatedAccountId:account,sourceKey:eqSource,
 });
 assert.equal(returned.replayed,true);
 assert.deepEqual(returned.receipt,integrated.receipt);
 // A missing physical Inbox row makes replay fail closed. The immutable
 // receipt and four prior grants remain; no second reward is paid.
 await db.query('delete from private.reward_inbox_v1 where source_key=$1',
  [eqSource]);
 await assert.rejects(()=>realMiss({
  authenticatedAccountId:account,sourceKey:eqSource,
 }),/chest_v69_replay_missing_physical_grants/);
 assert.equal((await db.query(
  'select count(*)::integer n from private.v70_test_guarantees '+
  'where source_key=$1',[eqSource],
 )).rows[0].n,4,'corrupt Inbox replay must not double-pay');
 const current=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await assert.rejects(
   ()=>open({authenticatedAccountId:account,sourceKey:source}),
   /unreleased/);
 }finally{process.env.NODE_ENV=current;}
 console.log('CHEST_STORE_V70_PGLITE_OK: real SQL receipt/legs/Inboxes, V77-V69-V70-V80 Party chain, four guarantee legs, immutable replay, missing-Inbox denial, source ownership, physical verification, rollback, EQ2 hard-block and production fence');
}finally{await db.close()}
