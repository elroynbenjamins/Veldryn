/**
 * V86 disposable PGlite smoke test: genuine V69/V70 Party chest -> review
 * V61/V65 receipt/currency + existing character wallet/game state + V80 Inbox.
 * V88 tests the V87 SQL proof AND V86 physical grants on the same V70 connection.
 * Independent PG17.6 concurrency and certificate producers remain unverified.
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
const {resolveTrustedPartyChestSourceV77}=require(
 '../.event-chest-tests/server/party/weekly-party-event-chest-source-v77.js');
const {createPartyEventAtomicPortsV88}=require(
 '../.event-chest-tests/server/party/weekly-party-event-atomic-ports-v88.js');
const account='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const character='33333333-3333-4333-8333-333333333333';
const party='44444444-4444-4444-8444-444444444444';
const proofId='55555555-5555-4555-8555-555555555555';
const week=Date.UTC(2026,10,2);
const otherHero='77777777-7777-4777-8777-777777777777';
const orderId='66666666-6666-4666-8666-666666666666';
const digest='a'.repeat(64),snapshot='b'.repeat(64);
const weekEnds=week+604800000,attested=weekEnds+3600000,issued=weekEnds+7200000;
const kindKey=kind=>'party-event:'+week+':'+account+':'+kind;
function extract(path){
 const sql=readFileSync(new URL(path,import.meta.url),'utf8');
 const lines=sql.split(/\r?\n/);
 const begin=lines.findIndex(s=>s.trim().toLowerCase()==='begin;');
 const end=lines.findLastIndex(s=>s.trim().toLowerCase()==='commit;');
 assert.ok(begin>=0&&end>begin,path);
 return lines.slice(begin+1,end).join('\n');
}
const v70=extract('../../docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql');
const v61=extract('../../docs/roadmap/party-events/hidden-migrations/20261119070000_party_event_reward_ledger_v61.sql');
const v65=extract('../../docs/roadmap/party-events/hidden-migrations/20261119094500_party_sigils_account_ledger_v65.sql');
const v86=extract('../../docs/roadmap/party-events/hidden-migrations/20261121144000_party_event_real_rewards_v86_REVIEW_ONLY.sql');
const v87=extract('../../docs/roadmap/party-events/hidden-migrations/20261121161500_party_event_authoritative_settlement_v87_REVIEW_ONLY.sql');
const identity={partyId:party,accountId:account,eventStartsAtUtcMs:week};
const proof={
 source:'private_party_event_settlement_join_v61',
 week:{partyId:party,eventStartsAtUtcMs:week,eventEndsAtUtcMs:week+604800000,
  settledAtUtcMs:week+608400000,status:'settled',
  family:'broken_caravan',difficulty:'standard'},
 roster:{...identity,rosterSize:2,frozenCharacterId:character},
 activity:{...identity,activityPoints:25,
  sourceVersion:'party_event_member_progress_v14'},
 preparation:{...identity,committedDonationId:proofId,
  optionalSupplyGoalReceiptId:proofId,optionalGoalFrozen:true},
 finale:{partyId:party,eventStartsAtUtcMs:week,
  canonicalFinaleReceiptId:proofId,serverVerifiedVictory:true},
 tier:{...identity,eligibleGearTier:2,sourceVersion:'server_level_snapshot_v2'},
};
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
  'state jsonb NOT NULL,revision bigint NOT NULL DEFAULT 0,'+
  'updated_at timestamptz NOT NULL DEFAULT now());'+
  'CREATE TABLE public.character_wallets('+
  'character_id uuid PRIMARY KEY REFERENCES public.characters(id),'+
  'gold bigint NOT NULL CHECK(gold>=0),'+
  'updated_at timestamptz NOT NULL DEFAULT now());'+
  'CREATE TABLE private.party_event_weeks_v11('+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'family text NOT NULL,difficulty text NOT NULL,status text NOT NULL,'+
  'PRIMARY KEY(party_id,event_starts_at));'+
  'CREATE TABLE private.party_event_roster_v11('+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'account_id uuid NOT NULL,'+
  'PRIMARY KEY(party_id,event_starts_at,account_id));'+
  'CREATE TABLE private.reward_inbox_v1('+
  'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),'+
  'account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,'+
  'source_key text NOT NULL,'+
  "source_kind text NOT NULL CHECK(source_kind IN ('party','guild','dungeon','gift')),"+
  'source_id uuid NOT NULL,title text NOT NULL,body text NOT NULL DEFAULT \x27\x27,'+
  "attachments jsonb NOT NULL DEFAULT '[]',"+
  'claimed_at timestamptz,UNIQUE(account_id,source_key));'
 );
 await db.query('INSERT INTO auth.users VALUES($1),($2)',[account,foreign]);
 await db.query('INSERT INTO public.characters VALUES($1,$2)',[character,account]);
 await db.query('INSERT INTO private.party_event_weeks_v11 VALUES'+
  "($1,to_timestamp($2::double precision/1000),'broken_caravan','standard','settled')",
  [party,week]);
 await db.query('INSERT INTO private.party_event_roster_v11 VALUES'+
  '($1,to_timestamp($2::double precision/1000),$3)',[party,week,account]);
 // Disposable V87 canonical source fixture, BEFORE any award ledger writes.
 // V23 replay attestation is not a payout certificate: V87 is independently
 // required. These SQL rows are only present in the PGlite throwaway DB.
 await db.exec(
  'ALTER TABLE public.characters ADD CONSTRAINT party_v88_char_pair UNIQUE(id,account_id);'+
  'ALTER TABLE private.party_event_weeks_v11 ADD COLUMN event_ends_at timestamptz;'+
  'ALTER TABLE private.party_event_weeks_v11 ADD COLUMN active_stage smallint DEFAULT 3;'+
  'ALTER TABLE private.party_event_roster_v11 ADD COLUMN character_id uuid;'+
  'CREATE TABLE private.party_event_member_progress_v14('+
  'party_id uuid,event_starts_at timestamptz,account_id uuid,activity_points integer);'+
  'CREATE TABLE private.party_event_supply_orders_v16('+
  'id uuid PRIMARY KEY,party_id uuid,event_starts_at timestamptz,'+
  'stage smallint,kind text,target_quantity integer,donated_quantity integer);'+
  'CREATE TABLE private.party_event_supply_donations_v16('+
  'id uuid PRIMARY KEY,order_id uuid,party_id uuid,event_starts_at timestamptz,'+
  'account_id uuid,created_at timestamptz);'+
  'CREATE TABLE private.party_event_stage_seals_v17('+
  'party_id uuid,event_starts_at timestamptz,stage smallint,sealed_at timestamptz);'+
  'CREATE TABLE private.party_event_boss_loadouts_v18('+
  'party_id uuid,event_starts_at timestamptz,account_id uuid,'+
  'character_id uuid,character_level integer,snapshot_hash text,saved_at timestamptz);'+
  'CREATE TABLE private.party_event_boss_replay_attestations_v23('+
  'reservation_id uuid PRIMARY KEY,party_id uuid,event_starts_at timestamptz,'+
  'source_digest text,tiers_cleared smallint,worker_attested_at timestamptz,'+
  'rewards_granted boolean DEFAULT false,'+
  'reward_entitlement_created boolean DEFAULT false);'
 );
 await db.query('INSERT INTO public.characters VALUES($1,$2)',[otherHero,foreign]);
 await db.query(
  'UPDATE private.party_event_weeks_v11 SET event_ends_at='+
  'to_timestamp($2::double precision/1000),active_stage=3 WHERE party_id=$1',
  [party,weekEnds]);
 await db.query(
  'UPDATE private.party_event_roster_v11 SET character_id=$2 WHERE account_id=$1',
  [account,character]);
 await db.query(
  'INSERT INTO private.party_event_roster_v11 VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,$4)',
  [party,week,foreign,otherHero]);
 await db.query(
  'INSERT INTO private.party_event_member_progress_v14 VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,25)',
  [party,week,account]);
 await db.query(
  'INSERT INTO private.party_event_supply_orders_v16 VALUES('+
  "$1,$2,to_timestamp($3::double precision/1000),3,'optional',10,10)",
  [orderId,party,week]);
 await db.query(
  'INSERT INTO private.party_event_supply_donations_v16 VALUES('+
  '$1,$2,$3,to_timestamp($4::double precision/1000),$5,'+
  'to_timestamp($6::double precision/1000))',
  [proofId,orderId,party,week,account,week+3600000]);
 await db.query(
  'INSERT INTO private.party_event_stage_seals_v17 VALUES('+
  '$1,to_timestamp($2::double precision/1000),3,'+
  'to_timestamp($3::double precision/1000))',
  [party,week,week+172800000]);
 await db.query(
  'INSERT INTO private.party_event_boss_loadouts_v18 VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,$4,25,$5,'+
  'to_timestamp($6::double precision/1000))',
  [party,week,account,character,snapshot,week+86400000]);
 await db.query(
  'INSERT INTO private.party_event_boss_replay_attestations_v23 VALUES('+
  '$1,$2,to_timestamp($3::double precision/1000),$4,2,'+
  'to_timestamp($5::double precision/1000),false,false)',
  [proofId,party,week,digest,attested]);
 await db.exec(v87);
 await db.query(
  'INSERT INTO private.party_event_settlement_certificates_v87('+
  'party_id,event_starts_at,reservation_id,source_digest,verified_tiers_cleared,'+
  'independently_verified_victory,settled_at,issued_at) VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,$4,2,true,'+
  'to_timestamp($5::double precision/1000),'+
  'to_timestamp($6::double precision/1000))',
  [party,week,proofId,digest,attested,issued]);
 await db.query(
  'INSERT INTO private.party_event_member_tier_certificates_v87('+
  'party_id,event_starts_at,account_id,frozen_character_id,'+
  'frozen_level,frozen_loadout_hash,eligible_gear_tier) VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,$4,25,$5,2)',
  [party,week,account,character,snapshot]);
 const initial={
  character:{id:character,gold:100},account:{companionEssence:5},
  inventory:{capacity:2,stacks:[{itemId:'GEM_DUST',quantity:3}]},
  bank:{capacity:2,stacks:[]},
  overflow:{stacks:[],expiresAtMs:null},
 };
 await db.query('INSERT INTO public.online_game_states(account_id,character_id,state)'+
  ' VALUES($1::uuid,$2::uuid,$3::jsonb)',
  [account,character,JSON.stringify(initial)]);
 await db.query('INSERT INTO public.character_wallets VALUES($1::uuid,100)',
  [character]);
 await db.exec(v70);await db.exec(v61);await db.exec(v65);
 await db.exec(v86);
 const privileges=(await db.query(
  "SELECT has_table_privilege('anon','private.party_event_chest_resource_grants_v86','INSERT') AS anon_write,"+
  "has_table_privilege('service_role','private.party_event_chest_resource_grants_v86','INSERT') AS service_write"
 )).rows[0];
 assert.equal(privileges.anon_write,false);
 assert.equal(privileges.service_write,false);
 const ports={
  ...createPartyEventAtomicPortsV88(true),
  readAccountOwnedDrops:async()=>[],
  isOwnedCharacter:async(tx,owner,id)=>{
   const rows=(await tx.query('SELECT id FROM public.characters '+
    'WHERE account_id=$1::uuid AND id=$2::uuid',[owner,id])).rows;
   return rows.length===1;
  },
  readApprovedEquipmentContext:async()=>({tier:2}),
 };
 const pool={connect:async()=>({query:(sql,args)=>db.query(sql,args),release(){}})};
 const store=createChestPostgresStoreV70(pool,ports,true);
 const secretFor=(kind,hit)=>{
  const source=kindKey(kind);
  const table=resolveTrustedPartyChestSourceV77({
   authenticatedAccountId:account,sourceKey:source,proof,
  }).lootTable;
  for(let i=1;i<=255;i++){
   const secret=new Uint8Array(32).fill(i);
   const roll=deriveChestSettlementRollsV69(table,source,secret)[0];
   if((roll.hitRoll< table.groups[0].chanceBps)===hit)return secret;
  }
  throw Error('party_event_v86_no_deterministic_entropy_case');
 };
 const open=async(kind,hit=false)=>{
  const secret=secretFor(kind,hit);
  return createChestRewardSettlementV69(store,{secret},true)({
   authenticatedAccountId:account,sourceKey:kindKey(kind),
  });
 };
 // If the independent V87 certificate disappears, NO V70 payout can start.
 // This simulation is deliberately isolated before the first settlement.
 await db.query('DELETE FROM private.party_event_settlement_certificates_v87 '+
  'WHERE party_id=$1',[party]);
 await assert.rejects(()=>open('participation'),
  /settlement_certificate_missing_or_ambiguous/);
 assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM '+
  'private.chest_reward_receipts_v70')).rows[0].n,0);
 await db.query(
  'INSERT INTO private.party_event_settlement_certificates_v87('+
  'party_id,event_starts_at,reservation_id,source_digest,verified_tiers_cleared,'+
  'independently_verified_victory,settled_at,issued_at) VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,$4,2,true,'+
  'to_timestamp($5::double precision/1000),'+
  'to_timestamp($6::double precision/1000))',
  [party,week,proofId,digest,attested,issued]);
 const first=await open('participation');
 assert.equal(first.replayed,false);
 assert.equal(first.receipt.drops.length,0);
 const saved=(await db.query('SELECT state FROM public.online_game_states '+
  'WHERE account_id=$1',[account])).rows[0].state;
 assert.equal(saved.character.gold,300);
 assert.equal(saved.account.companionEssence,9);
 assert.equal(saved.inventory.stacks[0].quantity,5);
 assert.deepEqual(saved.overflow,initial.overflow);
 assert.equal((await db.query('SELECT gold::text AS gold FROM '+
  'public.character_wallets WHERE character_id=$1',[character])).rows[0].gold,'300');
 assert.equal((await db.query('SELECT balance::text AS balance FROM '+
  'private.party_sigils_wallet_v65 WHERE account_id=$1',[account])).rows[0].balance,'8');
 const audits=(await db.query(
  'SELECT ordinal,reward_id,custody,quantity FROM '+
  'private.party_event_chest_resource_grants_v86 WHERE source_key=$1 '+
  'ORDER BY ordinal',[kindKey('participation')])).rows;
 assert.deepEqual(audits.map(x=>[x.reward_id,x.custody,Number(x.quantity)]),[
  ['party_sigils','party_sigils',8],['gold','character_wallet',200],
  ['gem_dust','inventory',2],['companion_essence','account_state',4],
 ]);
 await assert.rejects(()=>db.query(
  'UPDATE private.party_event_chest_resource_grants_v86 SET quantity=999 '+
  'WHERE source_key=$1',[kindKey('participation')]),
  /party_event_v86_immutable_audit/);
 await assert.rejects(()=>db.query(
  'INSERT INTO private.party_event_chest_resource_grants_v86 '+
  '(source_key,account_id,credited_character_id,ordinal,reward_id,'+
  'quantity,custody,balance_before,balance_after) '+
  "VALUES($1,$2,$3,0,'party_sigils',8,'party_sigils',0,8)",
  [kindKey('participation'),foreign,character]),
  /foreign key|duplicate key/,
  'cross-account source audit may never be inserted');
 const history=(await db.query('SELECT source_kind,attachments,claimed_at '+
  'FROM private.reward_inbox_v1 WHERE source_key=$1',
  [kindKey('participation')])).rows;
 assert.equal(history.length,1);
 assert.equal(history[0].source_kind,'gift');
 assert.deepEqual(history[0].attachments,[]);
 assert.ok(history[0].claimed_at);
 const replay=await open('participation');
 assert.equal(replay.replayed,true);
 assert.deepEqual(replay.receipt,first.receipt);
 // Legitimate later spending does not turn a paid receipt into another payout.
 await db.query('UPDATE public.character_wallets SET gold=250 '+
  'WHERE character_id=$1',[character]);
 await db.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify({
   ...saved,character:{...saved.character,gold:250},
   account:{...saved.account,companionEssence:3},
   inventory:{...saved.inventory,stacks:[{itemId:'GEM_DUST',quantity:1}]},
  })]);
 assert.equal((await open('participation')).replayed,true,
  'historical resource consumption cannot trigger a second payout');
 // A full Inventory + Bank rejects the second chest; receipt, Sigils,
 // mutable game state, and audit all roll back in the SAME transaction.
 const blocked={...saved,character:{...saved.character,gold:250},
  account:{...saved.account,companionEssence:3},
  inventory:{capacity:1,stacks:[{itemId:'OTHER',quantity:1}]},
  bank:{capacity:1,stacks:[{itemId:'ANOTHER',quantity:1}]},
 };
 await db.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify(blocked)]);
 await assert.rejects(()=>open('preparation'),
  /party_event_v86_inventory_and_bank_full/);
 for(const table of [
  'private.chest_reward_receipts_v70','private.party_event_reward_receipts_v61',
  'private.party_sigils_ledger_v65',
  'private.party_event_chest_resource_grants_v86',
  'private.reward_inbox_v1',
 ]){
  const rows=(await db.query('SELECT COUNT(*)::int AS n FROM '+table+
   ' WHERE source_key=$1',[kindKey('preparation')])).rows;
  assert.equal(rows[0].n,0,'failed payout rolled back '+table);
 }
 assert.equal((await db.query('SELECT balance::text AS balance FROM '+
  'private.party_sigils_wallet_v65 WHERE account_id=$1',[account])).rows[0].balance,'8');
 assert.equal((await db.query('SELECT gold::text AS gold FROM '+
  'public.character_wallets WHERE character_id=$1',[character])).rows[0].gold,'250');
 assert.deepEqual((await db.query('SELECT state FROM public.online_game_states '+
  'WHERE account_id=$1',[account])).rows[0].state,blocked,
  'rejected payout cannot modify game state');
 await db.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify({
   ...blocked,inventory:{capacity:2,stacks:[{itemId:'GEM_DUST',quantity:1}]},
   bank:{capacity:2,stacks:[]},
  })]);
 const recovered=await open('preparation');
 assert.equal(recovered.replayed,false);
 assert.equal((await db.query('SELECT balance::text AS balance FROM '+
  'private.party_sigils_wallet_v65 WHERE account_id=$1',[account])).rows[0].balance,'18');
 assert.equal((await open('preparation')).replayed,true);
 // A genuine equipment hit remains blocked: NOT even guaranteed rewards
 // may escape the same transaction or create a new Inbox row.
 await assert.rejects(()=>open('finale',true),
  /chest_v70_eq2_manifest_and_custody_not_ready/);
 assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM '+
  'private.chest_reward_receipts_v70 WHERE source_key=$1',
  [kindKey('finale')])).rows[0].n,0);
 assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM '+
  'private.party_sigils_ledger_v65 WHERE source_key=$1',
  [kindKey('finale')])).rows[0].n,0);
 assert.equal((await db.query('SELECT balance::text AS balance FROM '+
  'private.party_sigils_wallet_v65 WHERE account_id=$1',[account])).rows[0].balance,'18');
 await assert.rejects(()=>createChestRewardSettlementV69(
  store,{secret:secretFor('participation',false)},true)({
  authenticatedAccountId:foreign,sourceKey:kindKey('participation'),
 }),/invalid_authenticated_source/);
 console.log('PARTY_EVENT_REAL_REWARDS_V86_OK: 4 real guarantees, V61+V65+V70+V80 atomic receipts, active character wallet, GameState, replay after spend, resource rollback, EQ2 blocked');
}finally{await db.close()}
