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
const {createChestRewardSettlementV69,deriveChestSettlementRollsV69}=require(
 '../.event-chest-tests/server/loot/chest-reward-settlement-v69.js');
const {defineChestLootTableV67}=require(
 '../.event-chest-tests/server/loot/chest-loot-engine-v67.js');
const {createWorldBossChestSourcePortsV73}=require(
 '../.event-chest-tests/server/loot/world-boss-chest-pg-source-v73.js');
const {worldBossChestLootTableV68}=require(
 '../.event-chest-tests/server/combat/world-boss-chests-v58.js');
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
   // same pinned SQL session while verifying durable grant custody.
   const gs=await tx.query(
    'select * from private.v70_test_guarantees where source_key=$1',
    [receipt.sourceKey]);
   const ds=await tx.query(
    'select * from private.v70_test_drops where source_key=$1',
    [receipt.sourceKey]);
   const ins=await tx.query(
    'select * from private.v70_test_inbox where source_key=$1',
    [receipt.sourceKey]);
   if(gs.rows.length!==receipt.guaranteed.length||
    ds.rows.length!==receipt.drops.length||ins.rows.length!==1)return false;
   for(const row of [...gs.rows.map(x=>({...x,kind:'guarantee'})),
    ...ds.rows.map(x=>({...x,kind:'drop'}))]){
    if(!legs.some(leg=>leg.kind===row.kind&&leg.ordinal===row.ordinal&&
     leg.quantity===Number(row.quantity)&&leg.rewardId===row.reward_id&&
     leg.grantId===row.grant_id&&leg.accountId===row.account_id))
     return false;
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
 // World Boss V73: execute the *actual* parameterized source SQL against
 // disposable PostgreSQL tables on the SAME V70 connection. This is NOT a
 // battle rehearsal or an actual V57 migration.
 const bossTable=worldBossChestLootTableV68({
  bossId:'hollowroot',kind:'donations_goal',
 });
 let bossEvent='';
 let bossSource='';
 for(let i=1;i<=250&&!bossSource;i++){
  const candidate='44444444-4444-4444-8444-'+
   i.toString(16).padStart(12,'0');
  const key='world-boss:'+candidate+':'+account+':donations_goal';
  if(deriveChestSettlementRollsV69(
   bossTable,key,secret,
  )[0].hitRoll>=100){bossEvent=candidate;bossSource=key}
 }
 assert.ok(bossSource,'deterministic 99-percent no-gear World Boss draw');
 await assert.rejects(
  ()=>open({authenticatedAccountId:account,sourceKey:bossSource}),
  /world_boss_privacy_gate_required/,
  'World Boss claim cannot use a generic, unfenced V70 store',
 );
 await db.exec(
  'create table private.world_boss_events_v17('+
  'id uuid primary key,boss_id text not null,status text not null,'+
  'max_hp bigint not null,remaining_hp bigint not null);'+
  'create table private.world_boss_war_camps_v27('+
  'event_id uuid primary key,fortifications integer not null,'+
  'field_provisions integer not null,siegecraft integer not null,'+
  'fort_tier1 integer not null,fort_tier2 integer not null,'+
  'field_tier1 integer not null,field_tier2 integer not null,'+
  'siege_tier1 integer not null,siege_tier2 integer not null);'+
  'create table private.world_boss_war_donations_v27('+
  'event_id uuid not null,account_id uuid not null,request_id text not null,'+
  'ordinal smallint not null);'+
  'create table private.world_boss_attempts_v17('+
  'event_id uuid not null,account_id uuid not null,request_id text not null,'+
  'ordinal smallint not null,status text not null,replay_digest text);'+
  'create table private.world_boss_replay_proofs_v28('+
  'event_id uuid not null,account_id uuid not null,request_id text not null,'+
  'replay_digest text not null);'+
  'create table private.wb_v73_erasure_test_fences('+
  'account_id uuid primary key);'
 );
 await db.exec(`
  CREATE FUNCTION private.world_boss_v57_assert_write_open(p_account uuid)
  RETURNS void LANGUAGE plpgsql AS $
  BEGIN
   IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'WB57_READ_COMMITTED_REQUIRED';
   END IF;
   PERFORM pg_advisory_xact_lock(
    hashtextextended(p_account::text,570057::bigint));
   IF EXISTS(SELECT 1 FROM private.wb_v73_erasure_test_fences
    WHERE account_id=p_account) THEN
    RAISE EXCEPTION 'WB57_ACCOUNT_ERASURE_FENCED';
   END IF;
  END $;
 `);
 await db.query(
  'insert into private.world_boss_events_v17 '+
  '(id,boss_id,status,max_hp,remaining_hp) values($1,$2,$3,$4,$5)',
  [bossEvent,'hollowroot','closed',1000,300],
 );
 await db.query(
  'insert into private.world_boss_war_camps_v27 '+
  '(event_id,fortifications,field_provisions,siegecraft,'+
  'fort_tier1,fort_tier2,field_tier1,field_tier2,siege_tier1,siege_tier2) '+
  'values ($1,2,2,0,1,3,1,3,1,3)',[bossEvent],
 );
 await db.query(
  'insert into private.world_boss_war_donations_v27 '+
  '(event_id,account_id,request_id,ordinal) values($1,$2,$3,1)',
  [bossEvent,account,'donation_0001'],
 );
 for(let ordinal=1;ordinal<=3;ordinal++){
  const id='attack_000'+ordinal;
  const digest=ordinal.toString(16).padStart(64,'0');
  await db.query(
   'insert into private.world_boss_attempts_v17 '+
   '(event_id,account_id,request_id,ordinal,status,replay_digest) '+
   'values ($1,$2,$3,$4,$5,$6)',
   [bossEvent,account,id,ordinal,'committed',digest],
  );
  await db.query(
   'insert into private.world_boss_replay_proofs_v28 '+
   '(event_id,account_id,request_id,replay_digest) values ($1,$2,$3,$4)',
   [bossEvent,account,id,digest],
  );
 }
 const bossStore=createChestPostgresStoreV70(pool,{
  ...ports,...createWorldBossChestSourcePortsV73(),
 },true);
 const bossOpen=createChestRewardSettlementV69(
  bossStore,{secret},true);
 const noGear=await bossOpen({
  authenticatedAccountId:account,sourceKey:bossSource,
 });
 assert.equal(noGear.replayed,false);
 assert.equal(noGear.receipt.tableId,'world_boss_chest');
 assert.equal(noGear.receipt.drops.length,0);
 assert.equal(noGear.receipt.guaranteed.length,4);
 assert.equal(noGear.receipt.equipmentDeliveryMode,null);
 assert.equal(noGear.receipt.recipientCharacterId,null);
 const earnedGold=(await db.query(
  'select quantity from private.v70_test_guarantees '+
  'where source_key=$1 and reward_id=$2',[bossSource,'gold'],
 )).rows;
 assert.deepEqual(earnedGold.map(r=>r.quantity),[450]);
 const earnedInbox=(await db.query(
  'select count(*)::int n from private.v70_test_inbox where source_key=$1',
  [bossSource],
 )).rows[0].n;
 assert.equal(earnedInbox,1,
  'exactly one durable World Boss Inbox and four guarantees on gear miss');
 const repeatedBoss=await bossOpen({
  authenticatedAccountId:account,sourceKey:bossSource,
 });
 assert.equal(repeatedBoss.replayed,true);
 assert.deepEqual(repeatedBoss.receipt,noGear.receipt,
  'retries do not reroll after no-gear receipt');
 const attemptsSource='world-boss:'+bossEvent+':'+account+
  ':three_attempts';
 const damageSource='world-boss:'+bossEvent+':'+account+
  ':community_damage_goal';
 // A committed attempt without the independently matching V28 digest
 // cannot earn the three-attack milestone or any payout.
 await db.query(
  'update private.world_boss_replay_proofs_v28 '+
  'set replay_digest=$4 where event_id=$1 and account_id=$2 '+
  'and request_id=$3',
  [bossEvent,account,'attack_0003','f'.repeat(64)],
 );
 await assert.rejects(
  ()=>bossOpen({authenticatedAccountId:account,sourceKey:attemptsSource}),
  /unearned_chest/,
  'tampered V28 replay digest invalidates chest entitlement',
 );
 const missingAttackReceipt=(await db.query(
  'select count(*)::int n from private.chest_reward_receipts_v70 '+
  'where source_key=$1',[attemptsSource],
 )).rows[0].n;
 assert.equal(missingAttackReceipt,0,'unproven source cannot receive gold');
 await db.query(
  'update private.world_boss_replay_proofs_v28 '+
  'set replay_digest=$4 where event_id=$1 and account_id=$2 '+
  'and request_id=$3',
  [bossEvent,account,'attack_0003','3'.padStart(64,'0')],
 );
 // Exact 70% damage passes; 69.9% must not unlock the final chest.
 await db.query(
  'update private.world_boss_events_v17 set remaining_hp=301 where id=$1',
  [bossEvent],
 );
 await assert.rejects(
  ()=>bossOpen({authenticatedAccountId:account,sourceKey:damageSource}),
  /unearned_chest/,
  'the global HP threshold is checked from current authoritative DB',
 );
 await db.query(
  'update private.world_boss_events_v17 set remaining_hp=300 where id=$1',
  [bossEvent],
 );
 await db.query(
  'insert into private.wb_v73_erasure_test_fences values ($1)',
  [account],
 );
 await assert.rejects(
  ()=>bossOpen({authenticatedAccountId:account,sourceKey:bossSource}),
  /WB57_ACCOUNT_ERASURE_FENCED/,
  'even replay reads cannot bypass current account-erasure fence',
 );
 const noDuplicateInbox=(await db.query(
  'select count(*)::int n from private.v70_test_inbox where source_key=$1',
  [bossSource],
 )).rows[0].n;
 assert.equal(noDuplicateInbox,1);
 const current=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await assert.rejects(
   ()=>open({authenticatedAccountId:account,sourceKey:source}),
   /unreleased/);
 }finally{process.env.NODE_ENV=current;}
 console.log('CHEST_STORE_V70_PGLITE_OK: real SQL receipt/legs/Inboxes, replay, source ownership, physical verification, full rollback, EQ2 hard-block and production fence');
}finally{await db.close()}
