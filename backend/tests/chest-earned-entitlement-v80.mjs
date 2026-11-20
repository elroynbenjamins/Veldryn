/** V80 disabled, disposable SQL integration. NO live reward grants. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {recordEarnedChestEntitlementV80}=require(
 '../.event-chest-tests/server/loot/chest-earned-entitlement-v80.js');
const {worldBossChestLootTableV68}=require(
 '../.event-chest-tests/server/combat/world-boss-chests-v58.js');
const {partyChestLootTableV68}=require(
 '../.event-chest-tests/server/party/weekly-party-event-chests-v51.js');
const sourceSql=readFileSync(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261119172000_chest_earned_entitlements_v80_review_only.sql',
 import.meta.url),'utf8');
const sql=sourceSql.slice(sourceSql.indexOf('BEGIN;')+6,
 sourceSql.lastIndexOf('COMMIT;'));
const account='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const event='33333333-3333-4333-8333-333333333333';
const worldKey='world-boss:'+event+':'+account+':donations_goal';
const partyKey='party-event:'+Date.UTC(2026,10,16)+':'+account+
 ':participation';
const worldTable=worldBossChestLootTableV68({
 bossId:'hollowroot',kind:'donations_goal',
});
const partyTable=partyChestLootTableV68({
 family:'broken_caravan',difficulty:'standard',kind:'participation',
});
const db=await PGlite.create();
let queries=[];
const tx={
 async query(sql,params=[]){
  queries.push({sql,params});
  return db.query(sql,params);
 },
 release(){throw Error('V80 never owns a new transaction or connection')},
};
async function earned(key,context,changes={}){
 let canonicalReads=0,privacyChecks=0,tierReads=0;
 const ports={
  async assertWorldBossWriteOpen(same,owner,source){
   assert.equal(same,tx);
   assert.equal(owner,account);assert.equal(source,worldKey);
   privacyChecks++;
   const mode=(await same.query('show transaction_isolation')).rows[0];
   assert.equal(mode.transaction_isolation,'read committed');
   await same.query('SELECT pg_advisory_xact_lock($1::bigint)',[757575]);
  },
  async readCanonicalSource(same,owner,source){
   assert.equal(same,tx);assert.equal(owner,account);
   assert.equal(source,key);
   canonicalReads++;
   return {sourceKey:key,accountId:account,earned:true,
    proofVersion:'verified-v80',equipmentDeliveryMode:
     key===worldKey?'account_unclaimed':'character',
    recipientCharacterId:null,
    lootTable:key===worldKey?worldTable:partyTable,
    ...changes,
   };
  },
  async readApprovedEquipmentContext(same,source){
   assert.equal(same,tx);
   assert.equal(source.sourceKey,key);tierReads++;
   return context;
  },
 };
 const result=await recordEarnedChestEntitlementV80({
  authenticatedAccountId:account,sourceKey:key,
 },tx,ports,true);
 return {result,ports,counts:()=>({canonicalReads,privacyChecks,tierReads})};
}
try{
 await db.exec('CREATE SCHEMA auth;CREATE SCHEMA private;'+
  'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;'+
  'CREATE TABLE auth.users(id uuid PRIMARY KEY);'+
  'CREATE TABLE private.chest_account_fence_v70('+
  'account_id uuid PRIMARY KEY REFERENCES auth.users(id));');
 await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[account,other]);
 await db.exec(sql);
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 const first=await earned(worldKey,{tier:9,bossId:'hollowroot'});
 assert.equal(first.result.alreadyEarned,false);
 assert.equal(first.result.tier,9,'do not silently downgrade future T9');
 assert.equal(first.result.family,'world_boss');
 assert.equal(first.result.frozenLootTable.groups[0].chanceBps,100);
 assert.equal(first.result.paid,false);
 assert.equal(first.result.opened,false);
 assert.equal(first.result.equipmentRolled,false);
 assert.equal(first.result.claimEnabled,false);
 assert.deepEqual(first.counts(),{canonicalReads:1,privacyChecks:1,tierReads:1});
 const repeated=await earned(worldKey,{tier:1,bossId:'hollowroot'});
 assert.equal(repeated.result.alreadyEarned,true);
 assert.equal(repeated.result.tier,9,'repeat freeze does not rewrite tier');
 assert.equal(repeated.result.tableVersion,first.result.tableVersion);
 assert.deepEqual(repeated.counts(),{canonicalReads:0,privacyChecks:1,tierReads:0},
  'existing entitlement remains frozen without reopening source proof');
 assert.equal((await db.query('SELECT COUNT(*)::int n '+
  'FROM private.chest_earned_entitlements_v80')).rows[0].n,1);
 await db.exec('COMMIT');
 await db.exec('BEGIN ISOLATION LEVEL SERIALIZABLE');
 const party=await earned(partyKey,{tier:3});
 assert.equal(party.result.family,'party_event');
 assert.equal(party.result.bossId,null);
 assert.equal(party.result.frozenLootTable.guarantees.length,4);
 assert.equal(party.result.claimEnabled,false);
 assert.equal(party.counts().privacyChecks,0);
 assert.equal((await db.query('SELECT COUNT(*)::int n FROM '+
  'private.chest_earned_entitlements_v80')).rows[0].n,2);
 // V80 deliberately creates no V70 payouts, Inbox or physical item tables.
 const noPayoutTables=(await db.query(
  "SELECT COUNT(*)::int n FROM information_schema.tables "+
  "WHERE table_schema='private' AND table_name IN "+
  "('chest_reward_receipts_v70','chest_reward_grant_legs_v70')"
 )).rows[0].n;
 assert.equal(noPayoutTables,0);
 await db.exec('COMMIT');
 // Forged source/account must fail before any SQL call or proof read.
 const previous=queries.length;
 await assert.rejects(
  ()=>recordEarnedChestEntitlementV80({
   authenticatedAccountId:other,sourceKey:worldKey,
  },tx,first.ports,true),/cross_account_or_invalid_source/);
 assert.equal(queries.length,previous);
 const badWorld='world-boss:'+event+':'+other+':donations_goal';
 await assert.rejects(
  ()=>recordEarnedChestEntitlementV80({
   authenticatedAccountId:other,sourceKey:badWorld,
  },tx,{...first.ports,assertWorldBossWriteOpen:undefined},true),
  /v57_erasure_gate_required/);
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 const badKey='world-boss:'+event+':'+account+':three_attempts';
 let attempted=false;
 await assert.rejects(
  ()=>recordEarnedChestEntitlementV80({
   authenticatedAccountId:account,sourceKey:badKey,
  },tx,{
   ...first.ports,
   assertWorldBossWriteOpen:async()=>{},
   readCanonicalSource:async()=>{attempted=true;return {
    sourceKey:badKey,accountId:other,earned:true,
    proofVersion:'bad',lootTable:worldTable,
   }},
  },true),/unearned_source/);
 assert.equal(attempted,true);
 const badTierKey='world-boss:'+event+':'+account+
  ':community_damage_goal';
 await assert.rejects(
  ()=>recordEarnedChestEntitlementV80({
   authenticatedAccountId:account,sourceKey:badTierKey,
  },tx,{
   ...first.ports,
   assertWorldBossWriteOpen:async()=>{},
   readCanonicalSource:async()=>({
    sourceKey:badTierKey,accountId:account,earned:true,
    proofVersion:'trusted',lootTable:worldTable,
   }),
   readApprovedEquipmentContext:async()=>({
    tier:10,bossId:'hollowroot',
   }),
  },true),/unverified_tier/);
 assert.equal((await db.query('SELECT COUNT(*)::int n FROM '+
  'private.chest_earned_entitlements_v80')).rows[0].n,2,
  'rejected forged entitlements never stored');
 await db.exec('ROLLBACK');
 const original=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await assert.rejects(
   ()=>recordEarnedChestEntitlementV80({
    authenticatedAccountId:account,sourceKey:partyKey,
   },tx,first.ports,true),/unreleased/);
 }finally{process.env.NODE_ENV=original;}
 await assert.rejects(
  ()=>db.query('UPDATE private.chest_earned_entitlements_v80 '+
   'SET tier=1 WHERE source_key=$1',[worldKey]),/IMMUTABLE/);
 const priv=(await db.query(
  "SELECT has_table_privilege('authenticated',"+
  "'private.chest_earned_entitlements_v80','INSERT') AS allowed")).rows[0];
 assert.equal(priv.allowed,false);
 console.log('CHEST_EARNED_V80_PGLITE_OK: frozen source, no odds/tier downgrades, immutable account-bound record, zero reward writes, unsupported claims and production denial');
}finally{await db.close()}
