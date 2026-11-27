/** Disposable PostgreSQL (PGlite) rehearsal of the actual V102 SQL port.
 * Real V70/V102 DDL, synthetic earned-source evidence and resource legs.
 * No external DB credentials or production migrations. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {issueWorldBossGatheringMintV102}=require('../../apps/mobile/.core-build/backend/src/server/loot/world-boss-gathering-mint-v102.js');
const {worldBossChestLootTableV96,rollWorldBossGatheringSlotV96}=require('../../apps/mobile/.core-build/backend/src/server/combat/world-boss-chest-policy-v96.js');
const account='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const event='33333333-3333-4333-8333-333333333333';
const source='world-boss:'+event+':'+account+':donations_goal';
const source2='world-boss:'+event+':'+account+':three_attempts';
const source3='world-boss:'+event+':'+account+':community_damage_goal';
const table=worldBossChestLootTableV96('hollowroot','donations_goal');
const slot=table.groups[0].entries[0].id;
const makeReceipt=(key,hit=true)=>({
 rulesVersion:'chest-settlement-v69',sourceKey:key,accountId:account,
 recipientCharacterId:null,equipmentDeliveryMode:hit?'account_unclaimed':null,
 proofVersion:'qa-earned-v102',tableId:table.tableId,tableVersion:table.version,
 guaranteed:table.guarantees,groups:[{groupId:'equipment',type:'equipment',chanceBps:1000,hit,entryId:hit?slot:null,quantity:hit?1:0}],
 drops:hit?[{groupId:'equipment',type:'equipment',entryId:slot,quantity:1}]:[],committed:true,
});
const ddl=name=>{
 const s=readFileSync(new URL('../../docs/roadmap/party-events/hidden-migrations/'+name,import.meta.url),'utf8');
 return s.slice(s.indexOf('BEGIN;')+6,s.lastIndexOf('COMMIT;'));
};
// The same test can also run against a disposable native PG17 service.
const native=process.env.WB_MINT_NATIVE_PG==='1';
let client,Client;
if(native){
 if(process.env.PGHOST!=='127.0.0.1'||process.env.PGDATABASE!=='wb_mint_review'||!process.env.WB_MINT_PG_MODULE)
  throw Error('Refusing non-disposable database');
 ({Client}=require(process.env.WB_MINT_PG_MODULE));
 client=new Client();await client.connect();
 const check=await client.query("SELECT current_database() AS db,current_setting('server_version_num')::int AS version");
 assert.equal(check.rows[0].db,'wb_mint_review');assert.ok(check.rows[0].version>=170000&&check.rows[0].version<180000);
}
const db=native?{query:(s,p)=>client.query(s,p),exec:s=>client.query(s),close:()=>client.end()}:await PGlite.create();
try{
 await db.exec('CREATE SCHEMA auth;CREATE SCHEMA private;CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE TABLE auth.users(id uuid PRIMARY KEY);');
 await db.query('INSERT INTO auth.users VALUES($1),($2)',[account,foreign]);
 await db.exec(ddl('20261119104500_universal_chest_ledger_v70.sql'));
 await db.exec(ddl('20261127133000_world_boss_gathering_mint_v102_review_only.sql'));
 await db.exec('CREATE TABLE private.qa_earned_source(source_key text PRIMARY KEY,account_id uuid NOT NULL);');
 await db.query('INSERT INTO private.chest_account_fence_v70(account_id) VALUES($1)',[account]);
 for(const key of [source,source2,source3])await db.query('INSERT INTO private.qa_earned_source VALUES($1,$2)',[key,account]);
 const tx={query:(sql,params)=>db.query(sql,params),release(){}};
 const args=key=>({accountId:account,sourceKey:key,entropyVersion:'qa-v1',secret:new Uint8Array(32).fill(13),
  verifyLockedSource:async(conn,owner,key)=>(await conn.query('SELECT source_key FROM private.qa_earned_source WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE',[key,owner])).rows.length===1});
 const issue=key=>issueWorldBossGatheringMintV102(tx,args(key),true);
 const insertReceipt=async r=>db.query('INSERT INTO private.chest_reward_receipts_v70(source_key,account_id,recipient_character_id,equipment_delivery_mode,proof_version,table_id,table_version,rules_version,receipt) VALUES($1,$2,NULL,$3,$4,$5,$6,$7,$8::jsonb)',
  [r.sourceKey,r.accountId,r.equipmentDeliveryMode,r.proofVersion,r.tableId,r.tableVersion,r.rulesVersion,JSON.stringify(r)]);
 const writeLeg=async(r,kind,ordinal,rewardId,quantity,grantId,instance=null)=>db.query('INSERT INTO private.chest_reward_grant_legs_v70(source_key,account_id,leg_kind,ordinal,reward_id,quantity,grant_id,item_instance_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8::uuid)',
  [r.sourceKey,r.accountId,kind,ordinal,rewardId,quantity,grantId,instance]);
 const counts=async key=>{
  const out=[];
  for(const name of ['chest_reward_receipts_v70','world_boss_gathering_mints_v102','chest_reward_grant_legs_v70']){
   out.push((await db.query('SELECT count(*)::int AS n FROM private.'+name+' WHERE source_key=$1',[key])).rows[0].n);
  }
  out.push((await db.query('SELECT count(*)::int AS n FROM private.world_boss_gathering_custody_v102 c JOIN private.world_boss_gathering_mints_v102 m ON c.instance_id=m.id WHERE m.source_key=$1',[key])).rows[0].n);
  return out;
 };
 const stage=async key=>{
  const r=makeReceipt(key);await insertReceipt(r);
  for(const [i,g] of r.guaranteed.entries())await writeLeg(r,'guarantee',i,g.id,g.quantity,'qa-g:'+key+':'+i);
  const mint=await issue(key);
  await writeLeg(r,'drop',0,slot,1,mint.grantId,mint.itemInstanceId);
  return {r,mint};
 };
 // Deliberate failure after physical mint and grant-leg insert, before commit.
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 const abandoned=await stage(source);
 assert.deepEqual(await counts(source),[1,1,6,1]);
 await db.exec('ROLLBACK');
 assert.deepEqual(await counts(source),[0,0,0,0]);
 // Same source, same deterministic roll, new identity since old transaction never committed.
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 const {r,mint}=await stage(source);
 assert.deepEqual(mint.copy.roll,abandoned.mint.copy.roll);
 await writeLeg(r,'inbox',0,'inbox:'+source,1,'qa-inbox:'+source);
 assert.deepEqual(await counts(source),[1,1,7,1]);
 await db.exec('COMMIT');
 // Lost ACK replay with different entropy must read original row, not insert.
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 const replay=await issueWorldBossGatheringMintV102(tx,{...args(source),entropyVersion:'qa-v2',secret:new Uint8Array(32).fill(99)},true);
 assert.equal(replay.replayed,true);assert.equal(replay.itemInstanceId,mint.itemInstanceId);
 assert.deepEqual(replay.copy.roll,mint.copy.roll);
 assert.deepEqual(await counts(source),[1,1,7,1]);
 await db.exec('COMMIT');
 await assert.rejects(()=>db.query("UPDATE private.world_boss_gathering_mints_v102 SET entropy_version='edited' WHERE source_key=$1",[source]),/IMMUTABLE/);
 await assert.rejects(()=>db.query('DELETE FROM private.world_boss_gathering_mints_v102 WHERE source_key=$1',[source]),/IMMUTABLE/);
 await assert.rejects(()=>db.query('INSERT INTO private.world_boss_gathering_mints_v102(source_key,account_id,event_id,boss_id,piece_id,slot,roll,roll_digest,chest_digest,entropy_version) SELECT source_key,account_id,event_id,boss_id,piece_id,slot,roll,roll_digest,chest_digest,entropy_version FROM private.world_boss_gathering_mints_v102 WHERE source_key=$1',[source]),/duplicate key/);
 // Force a real DB error after mint insertion, then rollback all legs.
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 const second=await stage(source2);
 await assert.rejects(()=>writeLeg(second.r,'inbox',0,'wrong-inbox-id',1,'qa-invalid-inbox'),/CHEST_V70_INVALID_INBOX_LEG/);
 await db.exec('ROLLBACK');
 assert.deepEqual(await counts(source2),[0,0,0,0]);
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 await insertReceipt(makeReceipt(source3,false));
 await assert.rejects(()=>issue(source3),/no_equipment_hit/);
 await db.exec('ROLLBACK');
 assert.deepEqual(await counts(source3),[0,0,0,0]);
 await assert.rejects(()=>issueWorldBossGatheringMintV102(tx,{...args(source),accountId:foreign},true),/invalid_scope/);
 for(const role of ['anon','authenticated','service_role'])for(const name of ['world_boss_gathering_mints_v102','world_boss_gathering_custody_v102']){
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE']){
   assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) AS yes',[role,'private.'+name,privilege])).rows[0].yes,false);
  }
 }
 if(native){
  // Separate transactions against the same committed chest: both must see
  // the same copy. Verify a concurrent fresh issue as well, after a fixture
  // receipt is persisted (no reward claim is exposed by this test).
  await insertReceipt(makeReceipt(source2));
  const connections=await Promise.all([0,1].map(async()=>{const conn=new Client();await conn.connect();return conn;}));
  try{
   const concurrent=async conn=>{
    await conn.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    try{
     const result=await issueWorldBossGatheringMintV102({query:(s,p)=>conn.query(s,p),release(){}},args(source2),true);
     await conn.query('COMMIT');return result;
    }catch(error){await conn.query('ROLLBACK');throw error;}
   };
   const results=await Promise.all(connections.map(concurrent));
   assert.equal(results.filter(x=>!x.replayed).length,1);
   assert.equal(results.filter(x=>x.replayed).length,1);
   assert.equal(results[0].itemInstanceId,results[1].itemInstanceId);
   assert.deepEqual(results[0].copy.roll,results[1].copy.roll);
   assert.deepEqual(await counts(source2),[1,1,0,1]);
  }finally{await Promise.all(connections.map(conn=>conn.end()));}
  console.log('WB_GATHERING_MINT_V102_PG17_CONCURRENT: two independent transactions, exactly one physical mint');
 }
 await db.query('DELETE FROM auth.users WHERE id=$1',[account]);
 assert.deepEqual(await counts(source),[0,0,0,0]);
 assert.deepEqual(await counts(source2),[0,0,0,0]);
 console.log('WB_GATHERING_MINT_V102_PG: real DDL/port, rollback and lost-ACK replay, immutable mint, unique source, bad inbox rollback, no-hit/foreign/private grants');
}finally{await db.close();}
