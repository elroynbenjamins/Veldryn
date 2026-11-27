/** Test actual V73/V104 SQL reads against a disposable schema fixture.
 * V57 function is a synthetic fence, not production V57 or V2 producer. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {createWorldBossChestSourceV104}=require('../../apps/mobile/.core-build/backend/src/server/loot/world-boss-chest-source-v104.js');
const event='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',foreign='33333333-3333-4333-8333-333333333333';
const source=kind=>'world-boss:'+event+':'+owner+':'+kind;
const db=await PGlite.create();
try{
 await db.exec(`
 CREATE SCHEMA private;
 CREATE TABLE private.world_boss_events_v17(id uuid PRIMARY KEY,status text,boss_id text,max_hp bigint,remaining_hp bigint);
 CREATE TABLE private.world_boss_war_camps_v27(event_id uuid PRIMARY KEY,fortifications int,field_provisions int,siegecraft int,fort_tier1 int,fort_tier2 int,field_tier1 int,field_tier2 int,siege_tier1 int,siege_tier2 int);
 CREATE TABLE private.world_boss_war_donations_v27(event_id uuid,account_id uuid,request_id text,ordinal int);
 CREATE TABLE private.world_boss_attempts_v17(event_id uuid,account_id uuid,request_id text,ordinal int,status text,engine_version text,replay_digest text,credited_hp bigint);
 CREATE TABLE private.world_boss_replay_proofs_v28(event_id uuid,account_id uuid,request_id text,replay_digest text);
 CREATE TABLE private.world_boss_chest_receipts_v61(source_key text,account_id uuid);
 CREATE TABLE private.chest_earned_entitlements_v80(source_key text,account_id uuid);
 CREATE TABLE private.chest_reward_receipts_v70(source_key text,account_id uuid,receipt jsonb);
 CREATE TABLE private.qa_fenced(account_id uuid PRIMARY KEY);
 CREATE FUNCTION private.world_boss_v57_assert_write_open(uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM private.qa_fenced WHERE account_id=$1) THEN RAISE EXCEPTION 'QA_ACCOUNT_FENCED'; END IF; END $$;
 `);
 await db.query("INSERT INTO private.world_boss_events_v17 VALUES($1,'active','hollowroot',1000,300)",[event]);
 await db.query('INSERT INTO private.world_boss_war_camps_v27 VALUES($1,2,3,0,1,3,2,4,3,5)',[event]);
 await db.query("INSERT INTO private.world_boss_war_donations_v27 VALUES($1,$2,'donate_00001',1)",[event,owner]);
 const receipts=[1,2,3].map(ordinal=>({eventId:event,accountId:owner,requestId:'attack_0000'+ordinal,ordinal,bossId:'hollowroot',
 engineVersion:'canonical-combat-v2',settlementStatus:'committed',bindingDigest:'a'.repeat(64),replayDigest:String(ordinal).repeat(64),
 settlementReceiptDigest:String(ordinal+3).repeat(64),localHpDamage:250,committedGlobalHpDamage:200}));
 for(const row of receipts){
  await db.query("INSERT INTO private.world_boss_attempts_v17 VALUES($1,$2,$3,$4,'committed',$5,$6,$7)",[event,owner,row.requestId,row.ordinal,row.engineVersion,row.replayDigest,row.committedGlobalHpDamage]);
  await db.query('INSERT INTO private.world_boss_replay_proofs_v28 VALUES($1,$2,$3,$4)',[event,owner,row.requestId,row.replayDigest]);
 }
 const tx={query:(sql,p)=>db.query(sql,p),release(){}};
 const bare=createWorldBossChestSourceV104({},true);
 const ports=createWorldBossChestSourceV104({readVerifiedCanonicalAttempts:async()=>structuredClone(receipts)},true);
 async function read(kind,p=ports){
  await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
  try{await p.assertSourceWriteOpen(tx,owner,source(kind));const r=await p.readCanonicalSource(tx,owner,source(kind));await db.exec('COMMIT');return r;}
  catch(error){await db.exec('ROLLBACK');throw error;}
 }
 for(const kind of ['donations_goal','three_attempts','community_damage_goal']){
  const earned=await read(kind);
  assert.equal(earned.earned,true);assert.equal(earned.lootTable.version,'world_boss_v98_unified_hollowroot');
  assert.equal(earned.lootTable.groups[0].chanceBps,1000);assert.equal(earned.lootTable.guarantees.length,5);
 }
 await assert.rejects(()=>read('three_attempts',bare),/canonical_attempts_not_ready/);
 await assert.rejects(()=>read('damage:1'),/damage_producer_not_ready/);
 await assert.rejects(()=>ports.readCanonicalSource(tx,foreign,source('donations_goal')),/invalid_identity/);
 await db.query('INSERT INTO private.chest_earned_entitlements_v80 VALUES($1,$2)',[source('donations_goal'),owner]);
 await assert.rejects(()=>read('donations_goal'),/legacy_source_requires_reconciliation/);
 await db.exec('DELETE FROM private.chest_earned_entitlements_v80');
 await db.query("UPDATE private.world_boss_attempts_v17 SET credited_hp=199 WHERE request_id='attack_00001'");
 await assert.rejects(()=>read('three_attempts'),/unverified_settlement/);
 await db.query("UPDATE private.world_boss_attempts_v17 SET credited_hp=200 WHERE request_id='attack_00001'");
 await db.query("UPDATE private.world_boss_events_v17 SET remaining_hp=301 WHERE id=$1",[event]);
 await assert.rejects(()=>read('community_damage_goal'),/unearned_chest/);
 await db.query('INSERT INTO private.qa_fenced VALUES($1)',[owner]);
 await assert.rejects(()=>read('donations_goal'),/QA_ACCOUNT_FENCED/);
 console.log('WB_CHEST_SOURCE_V104_PG: actual V73 reads and V104 checks, 3 milestone proofs, canonical credited HP match, legacy/foreign/erasure/damage gate');
}finally{await db.close();}
