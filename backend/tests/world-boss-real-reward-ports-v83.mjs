/** V83 full V69/V70 SQL settlement against existing wallet + game state
 * and legacy Inbox shapes. Synthetic PGlite ONLY; no live World Boss.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {createWorldBossRealRewardPortsV83}=require(
 '../.event-chest-tests/server/loot/world-boss-real-reward-ports-v83.js');
const {createChestPostgresStoreV70}=require(
 '../.event-chest-tests/server/loot/chest-postgres-store-v70.js');
const {createChestRewardSettlementV69,deriveChestSettlementRollsV69}=require(
 '../.event-chest-tests/server/loot/chest-reward-settlement-v69.js');
const {worldBossChestLootTableV68}=require(
 '../.event-chest-tests/server/combat/world-boss-chests-v58.js');
const schema=(path)=>{
 const s=readFileSync(new URL(path,import.meta.url),'utf8');
 const first=s.indexOf('BEGIN;'),last=s.lastIndexOf('COMMIT;');
 return s.slice(first+6,last);
};
const v70=schema('../../docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql');
const v83=schema('../../docs/roadmap/party-events/hidden-migrations/20261119200000_world_boss_real_wallet_v83_review_only.sql');
const account='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const character='33333333-3333-4333-8333-333333333333';
const event='44444444-4444-4444-8444-444444444444';
const secret=new Uint8Array(Array.from({length:32},(_,i)=>i+11));
const table=worldBossChestLootTableV68({
 bossId:'hollowroot',kind:'donations_goal',
});
const secondTable=worldBossChestLootTableV68({
 bossId:'hollowroot',kind:'three_attempts',
});
function key(kind,version=event){return 'world-boss:'+version+':'+account+':'+kind}
function noGearSource(kind,lootTable){
 for(let i=0;i<300;i++){
  const eid=(1000+i).toString(16).padStart(8,'0')+
  '-4444-4444-8444-444444444444';
  const sourceKey=key(kind,eid);
  if(deriveChestSettlementRollsV69(lootTable,sourceKey,secret)[0].hitRoll>=100)
   return sourceKey;
 }
 throw Error('fixture_needs_99_percent_miss');
}
const source=noGearSource('donations_goal',table);
const blockedSource=noGearSource('three_attempts',secondTable);
const db=await PGlite.create();
try{
 await db.exec(
  'CREATE SCHEMA auth;CREATE SCHEMA private;'+
  'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;'+
  'CREATE TABLE auth.users(id uuid PRIMARY KEY);'+
  'CREATE TABLE public.characters(id uuid PRIMARY KEY,'+
  'account_id uuid NOT NULL REFERENCES auth.users(id));'+
  'CREATE TABLE public.online_game_states('+
  'account_id uuid PRIMARY KEY REFERENCES auth.users(id),'+
  'character_id uuid NOT NULL REFERENCES public.characters(id),'+
  'state jsonb NOT NULL,revision integer NOT NULL DEFAULT 1,'+
  'updated_at timestamptz NOT NULL DEFAULT now());'+
  'CREATE TABLE public.character_wallets('+
  'character_id uuid PRIMARY KEY REFERENCES public.characters(id),'+
  'gold bigint NOT NULL CHECK(gold >= 0),updated_at timestamptz NOT NULL DEFAULT now());'+
  'CREATE TABLE private.reward_inbox_v1('+
  'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),'+
  'account_id uuid NOT NULL REFERENCES auth.users(id),'+
  'source_key text NOT NULL,source_kind text NOT NULL '+
  "CHECK(source_kind IN('party','guild','dungeon','gift')),"+
  'source_id uuid NOT NULL,title text NOT NULL,body text NOT NULL,'+
  "attachments jsonb NOT NULL DEFAULT '[]',"+
  'created_at timestamptz NOT NULL DEFAULT now(),'+
  'claimed_at timestamptz,UNIQUE(account_id,source_key));'
 );
 await db.query('INSERT INTO auth.users VALUES($1),($2)',[account,other]);
 await db.query('INSERT INTO public.characters VALUES($1,$2)',[character,account]);
 const baseline={
  character:{id:character,gold:100},account:{companionEssence:3},
  inventory:{capacity:2,stacks:[
   {itemId:'GEM_DUST',quantity:4}]},
  bank:{capacity:2,stacks:[{itemId:'TEMPERING_DUST',quantity:2}]},
  overflow:{stacks:[],expiresAtMs:null},
 };
 await db.query('INSERT INTO public.online_game_states '+
  '(account_id,character_id,state) VALUES($1,$2,$3::jsonb)',
  [account,character,JSON.stringify(baseline)]);
 await db.query('INSERT INTO public.character_wallets VALUES($1,100)',[character]);
 await db.exec(v70);
 await db.exec(v83);
 const real=createWorldBossRealRewardPortsV83(true);
 const proof=(sourceKey)=>{
  const isFirst=sourceKey===source;
  return {
   sourceKey,accountId:account,earned:true,
   proofVersion:'world-boss-proof-v59',recipientCharacterId:null,
   equipmentDeliveryMode:'account_unclaimed',
   lootTable:isFirst?table:secondTable,
  };
 };
 const ports={
  assertSourceWriteOpen:async(tx,owner,sourceKey)=>{
   assert.equal(owner,account);assert.ok(sourceKey.startsWith('world-boss:'));
   const mode=(await tx.query('SHOW transaction_isolation')).rows[0];
   assert.equal(mode.transaction_isolation,'read committed');
   // V57 event + account erasure preflight in production; this is a
   // fixture only, NOT real V57 migration/PG16 concurrency proof.
  },
  readCanonicalSource:async(_tx,owner,sourceKey)=>{
   assert.equal(owner,account);return proof(sourceKey);
  },
  readAccountOwnedDrops:async()=>[],
  isOwnedCharacter:async(tx,owner,id)=>{
   const rows=(await tx.query(
    'SELECT id FROM public.characters WHERE id=$1::uuid AND account_id=$2::uuid',
    [id,owner])).rows;
   return rows.length===1;
  },
  readApprovedEquipmentContext:async()=>({tier:1,bossId:'hollowroot'}),
  ...real,
 };
 const pool={connect:async()=>({
  query:(sql,params)=>db.query(sql,params),release() {},
 })};
 const open=createChestRewardSettlementV69(
  createChestPostgresStoreV70(pool,ports,true),{secret},true);
 const result=await open({
  authenticatedAccountId:account,sourceKey:source,
 });
 assert.equal(result.replayed,false);
 assert.equal(result.receipt.drops.length,0);
 assert.equal(result.receipt.guaranteed.length,4);
 const stored=(await db.query(
  'SELECT state FROM public.online_game_states WHERE account_id=$1',[account]
 )).rows[0].state;
 assert.equal(stored.character.gold,550);
 assert.equal(stored.account.companionEssence,9);
 assert.deepEqual(stored.inventory.stacks,
  [{itemId:'GEM_DUST',quantity:6}]);
 assert.deepEqual(stored.bank.stacks,
  [{itemId:'TEMPERING_DUST',quantity:4}]);
 assert.deepEqual(stored.overflow,baseline.overflow);
 const gold=(await db.query(
  'SELECT gold::text AS gold FROM public.character_wallets '+
  'WHERE character_id=$1',[character])).rows[0].gold;
 assert.equal(gold,'550');
 const audit=(await db.query(
  'SELECT ordinal,reward_id,quantity,custody FROM '+
  'private.world_boss_chest_resource_grants_v83 '+
  'WHERE source_key=$1 ORDER BY ordinal',[source])).rows;
 assert.deepEqual(audit.map(x=>[x.reward_id,x.quantity,x.custody]),[
  ['gold',450,'character_wallet'],['companion_essence',6,'account_state'],
  ['gem_dust',2,'inventory'],['tempering_dust',2,'bank'],
 ]);
 const inbox=(await db.query(
  'SELECT source_kind,attachments,claimed_at FROM private.reward_inbox_v1 '+
  'WHERE source_key=$1',[source])).rows;
 assert.equal(inbox.length,1);
 assert.equal(inbox[0].source_kind,'gift');
 assert.deepEqual(inbox[0].attachments,[]);
 assert.ok(inbox[0].claimed_at);
 assert.equal((await open({
  authenticatedAccountId:account,sourceKey:source,
 })).replayed,true);
 assert.equal((await db.query(
  'SELECT COUNT(*)::int n FROM private.world_boss_chest_resource_grants_v83 '+
  'WHERE source_key=$1',[source])).rows[0].n,4);
 assert.equal((await db.query(
  'SELECT COUNT(*)::int n FROM private.reward_inbox_v1 '+
  'WHERE source_key=$1',[source])).rows[0].n,1);
 // Force inventory+bank to full with no matching stacks and ensure Gold,
 // Essence and all V70 receipts roll back together.
 const original=structuredClone(stored);
 const full={
  ...original,inventory:{capacity:1,stacks:[{itemId:'OTHER',quantity:2}]},
  bank:{capacity:1,stacks:[{itemId:'OTHER_BANK',quantity:2}]},
 };
 await db.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify(full)]);
 await assert.rejects(()=>open({
  authenticatedAccountId:account,sourceKey:blockedSource,
 }),/inventory_and_bank_full/);
 assert.equal((await db.query(
  'SELECT gold::text AS gold FROM public.character_wallets '+
  'WHERE character_id=$1',[character])).rows[0].gold,'550');
 assert.equal((await db.query(
  'SELECT COUNT(*)::int n FROM private.chest_reward_receipts_v70 '+
  'WHERE source_key=$1',[blockedSource])).rows[0].n,0);
 assert.equal((await db.query(
  'SELECT COUNT(*)::int n FROM private.world_boss_chest_resource_grants_v83 '+
  'WHERE source_key=$1',[blockedSource])).rows[0].n,0);
 assert.equal((await db.query(
  'SELECT state FROM public.online_game_states WHERE account_id=$1',
  [account])).rows[0].state.account.companionEssence,9);
 await db.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify(original)]);
 // Any post-grant physical corruption invalidates immutable replay rather
 // than silently paying again or trusting the V70 journal alone.
 const tampered=structuredClone(original);
 tampered.account.companionEssence=8;
 await db.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify(tampered)]);
 await assert.rejects(()=>open({
  authenticatedAccountId:account,sourceKey:source,
 }),/physical|grant|incomplete|verify|receipt/);
 await db.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify(original)]);
 await assert.rejects(
  ()=>db.query(
   'UPDATE private.world_boss_chest_resource_grants_v83 '+
   'SET quantity=900 WHERE source_key=$1',[source]),
  /IMMUTABLE/);
 const grant=(await db.query(
  "SELECT has_table_privilege('authenticated',"+
  "'private.world_boss_chest_resource_grants_v83','INSERT') AS yes")).rows[0].yes;
 assert.equal(grant,false);
 const prev=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await assert.rejects(()=>real.creditGuaranteed(db,result.receipt,0),/unreleased/);
 }finally{process.env.NODE_ENV=prev}
 console.log('WB_REAL_REWARDS_V83_SQL_OK: real character wallet, account essence, inventory/bank dust, inert Inbox, immutable audit, retry/rollback and anti-tamper');
}finally{await db.close()}
