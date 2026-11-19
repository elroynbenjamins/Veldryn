/** V84 isolated SQL custody, NOT a first live World Boss gameplay rehearsal.
 * V70 remains unable to pay gear hits; this verifies source-linked immutable
 * account-unclaimed EQ2 row and exact stats only. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {issueQuarantinedWorldBossGearV84}=require(
 '../.event-chest-tests/server/loot/world-boss-eq2-unclaimed-v84.js');
const {worldBossChestLootTableV68}=require(
 '../.event-chest-tests/server/combat/world-boss-chests-v58.js');
const {worldBossGatheringPiecesV64}=require(
 '../.event-chest-tests/server/combat/world-boss-gathering-loot-v64.js');
const ddl=p=>{
 const s=readFileSync(new URL(p,import.meta.url),'utf8');
 return s.slice(s.indexOf('BEGIN;')+6,s.lastIndexOf('COMMIT;'));
};
const account='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const event='33333333-3333-4333-8333-333333333333';
const source='world-boss:'+event+':'+account+':donations_goal';
const table=worldBossChestLootTableV68({
 bossId:'hollowroot',kind:'donations_goal',
});
const piece=worldBossGatheringPiecesV64('hollowroot')[0];
assert.ok(piece);
const slot=piece.slot;
const group={
 groupId:'equipment',type:'equipment',chanceBps:100,hit:true,
 entryId:slot,quantity:1,
};
const receipt={
 rulesVersion:'chest-settlement-v69',sourceKey:source,accountId:account,
 recipientCharacterId:null,equipmentDeliveryMode:'account_unclaimed',
 proofVersion:'world-boss-proof-v59',tableId:table.tableId,
 tableVersion:table.version,guaranteed:table.guarantees,
 groups:[group],drops:[{
  groupId:'equipment',type:'equipment',entryId:slot,quantity:1,
 }],committed:true,
};
const db=await PGlite.create();
try{
 await db.exec('CREATE SCHEMA auth;CREATE SCHEMA private;'+
  'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;'+
  'CREATE TABLE auth.users(id uuid PRIMARY KEY);');
 await db.query('INSERT INTO auth.users VALUES($1),($2)',[account,foreign]);
 await db.exec(ddl('../../docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql'));
 await db.exec(ddl('../../docs/roadmap/party-events/hidden-migrations/20261119172000_chest_earned_entitlements_v80_review_only.sql'));
 await db.exec(ddl('../../docs/roadmap/party-events/hidden-migrations/20261119201000_world_boss_eq2_quarantine_v84_review_only.sql'));
 await db.query('INSERT INTO private.chest_reward_receipts_v70 '+
  '(source_key,account_id,recipient_character_id,equipment_delivery_mode,'+
  'proof_version,table_id,table_version,rules_version,receipt) '+
  'VALUES($1,$2::uuid,NULL,$3,$4,$5,$6,$7,$8::jsonb)',
  [source,account,'account_unclaimed',receipt.proofVersion,
   receipt.tableId,receipt.tableVersion,receipt.rulesVersion,
   JSON.stringify(receipt)]);
 await db.query('INSERT INTO private.chest_earned_entitlements_v80 '+
  '(source_key,account_id,family,tier,boss_id,proof_version,'+
  'table_id,table_version,frozen_loot_table) '+
  'VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9::jsonb)',
  [source,account,'world_boss',3,'hollowroot',receipt.proofVersion,
   table.tableId,table.version,JSON.stringify(table)]);
 const tx={query:(s,p)=>db.query(s,p),release(){}};
 const nextInt=max=>0;
 await assert.rejects(
  ()=>issueQuarantinedWorldBossGearV84(
   tx,account,source,0,nextInt,true),
  /manifest_not_verified/);
 await db.query('INSERT INTO private.world_boss_eq2_event_manifest_v84 '+
  '(template_key,piece_id,set_id,boss_id,slot,tier,enabled) '+
  'VALUES($1,$2,$3,$4,$5,3,true)',
  [piece.itemId+':T3',piece.itemId,piece.setId,'hollowroot',slot]);
 await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
 const first=await issueQuarantinedWorldBossGearV84(
  tx,account,source,0,nextInt,true);
 assert.equal(first.tier,3);
 assert.equal(first.pieceId,piece.itemId);
 assert.equal(first.roll.primaryStat,'gathering_speed');
 assert.equal(first.roll.combatPowerBonus,0);
 assert.equal(first.custody,'quarantined_unclaimed');
 assert.equal(first.claimEnabled,false);
 assert.equal(first.wearable,false);
 assert.equal(first.alreadyIssued,false);
 const replay=await issueQuarantinedWorldBossGearV84(
  tx,account,source,0,()=>{throw Error('REROLL_ON_REPLAY')},true);
 assert.equal(replay.alreadyIssued,true);
 assert.equal(replay.itemInstanceId,first.itemInstanceId);
 assert.deepEqual(replay.roll,first.roll);
 assert.equal((await db.query(
  'SELECT COUNT(*)::int n FROM private.world_boss_eq2_unclaimed_items_v84'
 )).rows[0].n,1);
 await db.exec('COMMIT');
 await assert.rejects(
  ()=>issueQuarantinedWorldBossGearV84(tx,foreign,source,0,nextInt,true),
  /untrusted_sql_source/);
 await assert.rejects(
  ()=>issueQuarantinedWorldBossGearV84(tx,account,source,1,nextInt,true),
  /invalid_drop_index/);
 await assert.rejects(
  ()=>db.query('UPDATE private.world_boss_eq2_unclaimed_items_v84 '+
   'SET quality=100 WHERE source_key=$1',[source]),
  /IMMUTABLE/);
 assert.equal((await db.query(
  "SELECT has_table_privilege('authenticated',"+
  "'private.world_boss_eq2_unclaimed_items_v84','INSERT') AS yes"
 )).rows[0].yes,false);
 assert.equal((await db.query(
  'SELECT COUNT(*)::int n FROM private.chest_reward_grant_legs_v70 '+
  'WHERE source_key=$1',[source])).rows[0].n,0,
  'unclaimed quarantine is not a paid V70 grant');
 const prev=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await assert.rejects(
   ()=>issueQuarantinedWorldBossGearV84(
    tx,account,source,0,nextInt,true),/unreleased/);
 }finally{process.env.NODE_ENV=prev}
 console.log('WB_EQ2_V84_SQL_OK: canonical manifest, frozen T3, exact gathering roll, account-unclaimed unique UUID, replay, immutable/private and no live claim');
}finally{await db.close()}
