/** Test actual V73/V104 SQL reads against a disposable schema fixture.
 * V57 function is a synthetic fence, not production V57 or V2 producer. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {createWorldBossChestSourceV104}=require('../../apps/mobile/.core-build/backend/src/server/loot/world-boss-chest-source-v104.js');
const {accrueWorldBossDamageChestsV105}=require('../../apps/mobile/.core-build/backend/src/server/loot/world-boss-damage-chest-store-v105.js');
const {createWorldBossChestSourceV106}=require('../../apps/mobile/.core-build/backend/src/server/loot/world-boss-chest-source-v106.js');
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
 // V105 uses actual review-only DDL and persisted V17/V28 readback;
 // fixture policy is deliberately not a gameplay balancing decision.
 await db.exec('DELETE FROM private.qa_fenced; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE private.chest_account_fence_v70(account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);');
 await db.query('INSERT INTO auth.users VALUES($1)',[owner]);
 const ddl=readFileSync(new URL('../../docs/roadmap/party-events/hidden-migrations/20261127135000_world_boss_damage_chest_v105_review_only.sql',import.meta.url),'utf8');
 await db.exec(ddl.slice(ddl.indexOf('BEGIN;')+6,ddl.lastIndexOf('COMMIT;')));
 const args={accountId:owner,eventId:event,readVerifiedCanonicalAttempts:async()=>structuredClone(receipts),
 readVersionedSecret:version=>{assert.equal(version,'qa-v1');return new Uint8Array(32).fill(13);}};
 const accrue=async(input=args,commit=true)=>{
  await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
  try{const result=await accrueWorldBossDamageChestsV105(tx,input,true);await db.exec(commit?'COMMIT':'ROLLBACK');return result;}
  catch(error){await db.exec('ROLLBACK');throw error;}
 };
 const historyCount=async()=>(await db.query('SELECT count(*)::int AS n FROM private.world_boss_damage_rolls_v105')).rows[0].n;
 await assert.rejects(()=>accrue(),/policy_not_frozen/);
 await db.query("INSERT INTO private.world_boss_damage_policy_v105 VALUES($1,$2,'hollowroot','qa-bracket',1,1,'qa-v1')",[event,owner]);
 const rolledBack=await accrue(args,false);
 assert.equal(rolledBack.earnedChestCount,3);
 assert.equal(rolledBack.cumulativeDamage,600);
 assert.equal(await historyCount(),0);
 // Opening cannot create an earned source from a rolled-back winning roll.
 await db.query('INSERT INTO private.chest_account_fence_v70(account_id) VALUES($1) ON CONFLICT DO NOTHING',[owner]);
 const damagePorts=createWorldBossChestSourceV106({readVerifiedCanonicalAttempts:args.readVerifiedCanonicalAttempts,readVersionedSecret:args.readVersionedSecret},true);
 const earnedKind=rolledBack.earnedSourceKeys[0].split(':').slice(3).join(':');
 await assert.rejects(()=>read(earnedKind,damagePorts),/unearned_damage_chest/);
 assert.equal(await historyCount(),0);
 const fresh=await accrue();
 assert.deepEqual(fresh.rolls,rolledBack.rolls);
 assert.equal(fresh.earnedSourceKeys.length,3);
 assert.equal(fresh.claimEnabled,false);
 assert.equal(await historyCount(),fresh.rolls.length);
 const replay=await accrue();
 assert.equal(replay.newRolls.length,0);
 assert.deepEqual(replay.earnedSourceKeys,fresh.earnedSourceKeys);
 for(const key of fresh.earnedSourceKeys){
  const kind=key.split(':').slice(3).join(':');
  const proof=await read(kind,damagePorts);
  assert.equal(proof.sourceKey,key);assert.equal(proof.lootTable.version,'world_boss_v98_unified_hollowroot');
  assert.equal(proof.proofVersion,'world-boss-v106-persisted-damage');
  assert.equal(proof.lootTable.groups[0].chanceBps,1000);
  assert.equal(await damagePorts.verifyLockedSource(tx,owner,key),true);
 }
 const miss=fresh.rolls.find(x=>!x.hit);
 assert.ok(miss);
 await assert.rejects(()=>read('damage:'+miss.ordinal,damagePorts),/unearned_damage_chest/);
 await assert.rejects(()=>read('damage:'+(fresh.rolls.length+1),damagePorts),/unearned_damage_chest/);
 await assert.rejects(()=>damagePorts.readCanonicalSource(tx,foreign,fresh.earnedSourceKeys[0]),/invalid_damage_source/);
 // Existing receipt must bind the same persisted winner, V106 proof and table.
 const key=fresh.earnedSourceKeys[0];
 const proof=await read(earnedKind,damagePorts);
 const receipt={accountId:owner,sourceKey:key,committed:true,proofVersion:proof.proofVersion,tableId:proof.lootTable.tableId,tableVersion:proof.lootTable.version,guaranteed:proof.lootTable.guarantees};
 await db.query('INSERT INTO private.chest_reward_receipts_v70 VALUES($1,$2,$3::jsonb)',[key,owner,JSON.stringify(receipt)]);
 assert.equal(await damagePorts.verifyLockedSource(tx,owner,key),true);
 await db.query("UPDATE private.chest_reward_receipts_v70 SET receipt=jsonb_set(receipt,'{proofVersion}',to_jsonb('wrong-proof'::text)) WHERE source_key=$1",[key]);
 assert.equal(await damagePorts.verifyLockedSource(tx,owner,key),false);
 assert.equal(await historyCount(),fresh.rolls.length);
 console.log('WB_DAMAGE_SOURCE_V106_PG: rolled-back and missed rolls cannot open, 3 persisted hits use unified table, receipt binding and no new accrual');

 await assert.rejects(()=>accrue({...args,readVersionedSecret:()=>new Uint8Array(32).fill(99)}),/history_mismatch/);
 await assert.rejects(()=>db.query("UPDATE private.world_boss_damage_policy_v105 SET damage_per_roll=2"),/IMMUTABLE/);
 await assert.rejects(()=>db.query('DELETE FROM private.world_boss_damage_rolls_v105'),/IMMUTABLE/);
 const n=fresh.rolls.length+1;
 await assert.rejects(()=>db.query('INSERT INTO private.world_boss_damage_rolls_v105 VALUES($1,$2,$3::integer,$4::bigint,0,true,$5)',[event,owner,n,n,source('damage:'+n)]),/INVALID_APPEND/);
 assert.equal(await historyCount(),fresh.rolls.length);
 console.log('WB_DAMAGE_CHEST_V105_PG: frozen policy, actual credited HP, persisted hit/miss history, rollback/replay, entropy drift rejection, cap');
 console.log('WB_CHEST_SOURCE_V104_PG: actual V73 reads and V104 checks, 3 milestone proofs, canonical credited HP match, legacy/foreign/erasure/damage gate');
}finally{await db.close();}
