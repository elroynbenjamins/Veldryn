/**
 * V87 disposable PGlite SQL smoke. Source proof is selected from actual
 * joined review-only tables; no JSON supplied by client or payout port.
 * This does not create certificates in live PG nor certify a combat worker.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const {createPartyEventCanonicalSourcePortsV87}=require(
 '../.event-chest-tests/server/party/weekly-party-event-canonical-pg-v87.js');

function migration(path){
 const sql=readFileSync(new URL(path,import.meta.url),'utf8');
 const lines=sql.split(/\r?\n/);
 const start=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
 const end=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
 assert.ok(start>=0&&end>start,'bounded reviewed SQL '+path);
 return lines.slice(start+1,end).join('\n');
}
const reviewed=migration('../../docs/roadmap/party-events/hidden-migrations/20261121161500_party_event_authoritative_settlement_v87_REVIEW_ONLY.sql');
const owner='11111111-1111-4111-8111-111111111111';
const another='22222222-2222-4222-8222-222222222222';
const hero='33333333-3333-4333-8333-333333333333';
const otherHero='44444444-4444-4444-8444-444444444444';
const party='55555555-5555-4555-8555-555555555555';
const reservation='66666666-6666-4666-8666-666666666666';
const order='77777777-7777-4777-8777-777777777777';
const donation='88888888-8888-4888-8888-888888888888';
const optionalOrders=[order,'77777777-7777-4777-8777-777777777778','77777777-7777-4777-8777-777777777779'];
const digest='a'.repeat(64),snapshot='b'.repeat(64);
const week=Date.UTC(2026,10,9);
const end=week+604800000,attested=end+3600000,issued=end+7200000;
const key=(kind,account=owner)=>'party-event:'+week+':'+account+':'+kind;
const db=await PGlite.create();
try{
 await db.exec(
  'CREATE SCHEMA auth;CREATE SCHEMA private;'+
  'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;'+
  'CREATE TABLE auth.users(id uuid PRIMARY KEY);'+
  'CREATE TABLE public.characters('+
  'id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES auth.users(id),'+
  'UNIQUE(id,account_id));'+
  'CREATE TABLE private.party_event_weeks_v11('+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'event_ends_at timestamptz NOT NULL,family text NOT NULL,'+
  'difficulty text NOT NULL,status text NOT NULL,active_stage smallint NOT NULL,'+
  'PRIMARY KEY(party_id,event_starts_at));'+
  'CREATE TABLE private.party_event_roster_v11('+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'account_id uuid NOT NULL,character_id uuid NOT NULL,'+
  'PRIMARY KEY(party_id,event_starts_at,account_id));'+
  'CREATE TABLE private.party_event_member_progress_v14('+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'account_id uuid NOT NULL,activity_points integer NOT NULL);'+
  'CREATE TABLE private.party_event_supply_orders_v16('+
  'id uuid PRIMARY KEY,party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'stage smallint NOT NULL,kind text NOT NULL,'+
  'target_quantity integer NOT NULL,donated_quantity integer NOT NULL);'+
  'CREATE TABLE private.party_event_supply_donations_v16('+
  'id uuid PRIMARY KEY,order_id uuid NOT NULL,'+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'account_id uuid NOT NULL,created_at timestamptz NOT NULL);'+
  'CREATE TABLE private.party_event_stage_seals_v17('+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'stage smallint NOT NULL,sealed_at timestamptz NOT NULL);'+
  'CREATE TABLE private.party_event_boss_loadouts_v18('+
  'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
  'account_id uuid NOT NULL,character_id uuid NOT NULL,'+
  'character_level integer NOT NULL,snapshot_hash text NOT NULL,'+
  'saved_at timestamptz NOT NULL);'+
  'CREATE TABLE private.party_event_boss_replay_attestations_v23('+
  'reservation_id uuid PRIMARY KEY,party_id uuid NOT NULL,'+
  'event_starts_at timestamptz NOT NULL,source_digest text NOT NULL,'+
  'tiers_cleared smallint NOT NULL,worker_attested_at timestamptz NOT NULL,'+
  'rewards_granted boolean NOT NULL DEFAULT false,'+
  'reward_entitlement_created boolean NOT NULL DEFAULT false);'
 );
 await db.query('INSERT INTO auth.users VALUES($1),($2)',[owner,another]);
 await db.query('INSERT INTO public.characters VALUES($1,$2),($3,$4)',
  [hero,owner,otherHero,another]);
 await db.query('INSERT INTO private.party_event_weeks_v11 VALUES('+
  '$1,to_timestamp($2::double precision/1000),'+
  'to_timestamp($3::double precision/1000),'+
  "'broken_caravan','standard','settled',3)",
  [party,week,end]);
 await db.query('INSERT INTO private.party_event_roster_v11 VALUES'+
  '($1,to_timestamp($2::double precision/1000),$3,$4),'+
  '($1,to_timestamp($2::double precision/1000),$5,$6)',
  [party,week,owner,hero,another,otherHero]);
 await db.query('INSERT INTO private.party_event_member_progress_v14 VALUES'+
  '($1,to_timestamp($2::double precision/1000),$3,22)',[party,week,owner]);
 for(const optionalOrder of optionalOrders){
  await db.query('INSERT INTO private.party_event_supply_orders_v16 VALUES'+
   "($1,$2,to_timestamp($3::double precision/1000),2,'optional',10,10)",
   [optionalOrder,party,week]);
 }
 await db.query('INSERT INTO private.party_event_supply_donations_v16 VALUES'+
  '($1,$2,$3,to_timestamp($4::double precision/1000),$5,'+
  'to_timestamp($6::double precision/1000))',
  [donation,order,party,week,owner,week+172800000+3600000]);
 await db.query('INSERT INTO private.party_event_stage_seals_v17 VALUES'+
  '($1,to_timestamp($2::double precision/1000),2,'+
  'to_timestamp($3::double precision/1000))',[party,week,week+172800000]);
 await db.query('INSERT INTO private.party_event_boss_loadouts_v18 VALUES'+
  '($1,to_timestamp($2::double precision/1000),$3,$4,25,$5,'+
  'to_timestamp($6::double precision/1000))',
  [party,week,owner,hero,snapshot,week+86400000]);
 await db.query('INSERT INTO private.party_event_boss_replay_attestations_v23 VALUES'+
  '($1,$2,to_timestamp($3::double precision/1000),$4,2,'+
  'to_timestamp($5::double precision/1000),false,false)',
  [reservation,party,week,digest,attested]);
 await db.exec(reviewed);
 const permissions=(await db.query(
  "SELECT has_table_privilege('anon',"+
  "'private.party_event_settlement_certificates_v87','INSERT') AS anon_write,"+
  "has_table_privilege('service_role',"+
  "'private.party_event_member_tier_certificates_v87','INSERT') AS service_write"
 )).rows[0];
 assert.equal(permissions.anon_write,false);
 assert.equal(permissions.service_write,false);
 const ports=createPartyEventCanonicalSourcePortsV87(true);
 const tx={query:(sql,params)=>db.query(sql,params),release(){}};
 const read=kind=>ports.readCanonicalSource(tx,owner,key(kind));
 await assert.rejects(()=>read('participation'),
  /settlement_certificate_missing_or_ambiguous/,
  'V23 worker replay alone can never authorize chest payout');
 await db.query('INSERT INTO private.party_event_settlement_certificates_v87 '+
  '(party_id,event_starts_at,reservation_id,source_digest,verified_tiers_cleared,'+
  'independently_verified_victory,settled_at,issued_at) VALUES($1,'+
  'to_timestamp($2::double precision/1000),$3,$4,2,true,'+
  'to_timestamp($5::double precision/1000),'+
  'to_timestamp($6::double precision/1000))',
  [party,week,reservation,digest,attested,issued]);
 await assert.rejects(()=>read('participation'),
  /settlement_certificate_missing_or_ambiguous/,
  'No tier certificate: even participation is not grantable');
 await assert.rejects(()=>db.query(
  'INSERT INTO private.party_event_member_tier_certificates_v87 '+
  '(party_id,event_starts_at,account_id,frozen_character_id,frozen_level,'+
  'frozen_loadout_hash,eligible_gear_tier) VALUES($1,'+
  'to_timestamp($2::double precision/1000),$3,$4,26,$5,2)',
  [party,week,owner,hero,snapshot]),
  /party_event_v87_untrusted_tier_certificate/,
  'Do not accept mismatched frozen levels');
 await db.query(
  'INSERT INTO private.party_event_member_tier_certificates_v87 '+
  '(party_id,event_starts_at,account_id,frozen_character_id,frozen_level,'+
  'frozen_loadout_hash,eligible_gear_tier) VALUES($1,'+
  'to_timestamp($2::double precision/1000),$3,$4,25,$5,2)',
  [party,week,owner,hero,snapshot]);
 for(const [kind,sigils,chance] of [
  ['participation',8,1200],['preparation',10,1600],['finale',16,2400],
 ]){
  const earned=await read(kind);
  assert.equal(earned.earned,true);
  assert.equal(earned.recipientCharacterId,hero);
  assert.equal(earned.lootTable.guarantees[0].quantity,sigils);
  assert.equal(earned.lootTable.groups[0].chanceBps,chance);
 }
 await assert.rejects(()=>ports.readCanonicalSource(tx,another,key('finale')),
  /foreign_or_invalid_source/);
 await assert.rejects(()=>db.query(
  'UPDATE private.party_event_settlement_certificates_v87 '+
  'SET independently_verified_victory=false WHERE party_id=$1',[party]),
  /party_event_v87_immutable_certificate/);
 await assert.rejects(()=>db.query(
  'UPDATE private.party_event_member_tier_certificates_v87 '+
  'SET eligible_gear_tier=9 WHERE party_id=$1',[party]),
  /party_event_v87_immutable_certificate/);
 await db.query('UPDATE private.party_event_member_progress_v14 '+
  'SET activity_points=14 WHERE party_id=$1 AND account_id=$2',
  [party,owner]);
 await assert.rejects(()=>read('participation'),/unearned_or_foreign_chest/);
 await db.query('UPDATE private.party_event_member_progress_v14 '+
  'SET activity_points=22 WHERE party_id=$1 AND account_id=$2',
  [party,owner]);
 await db.query('UPDATE private.party_event_supply_orders_v16 '+
  'SET donated_quantity=9 WHERE id=$1',[order]);
 await assert.rejects(()=>read('preparation'),/unearned_or_foreign_chest/);
 assert.equal((await read('participation')).earned,true);
 await db.query('UPDATE private.party_event_supply_orders_v16 '+
  'SET donated_quantity=10 WHERE id=$1',[order]);
 // Stage 3-only rows cannot impersonate the three canonical Stage 2 preparations.
 await db.query('UPDATE private.party_event_supply_orders_v16 SET stage=3 WHERE party_id=$1',[party]);
 await assert.rejects(()=>read('preparation'),/unearned_or_foreign_chest/);
 await db.query('UPDATE private.party_event_supply_orders_v16 SET stage=2 WHERE party_id=$1',[party]);
 await db.query('UPDATE private.party_event_stage_seals_v17 SET stage=3 WHERE party_id=$1',[party]);
 await assert.rejects(()=>read('preparation'),/unearned_or_foreign_chest/);
 await db.query('UPDATE private.party_event_stage_seals_v17 SET stage=2 WHERE party_id=$1',[party]);
 await db.query('UPDATE private.party_event_supply_donations_v16 SET account_id=$1 WHERE id=$2',[another,donation]);
 await assert.rejects(()=>read('preparation'),/unearned_or_foreign_chest/);
 await db.query('UPDATE private.party_event_supply_donations_v16 SET account_id=$1 WHERE id=$2',[owner,donation]);
 await db.query('UPDATE private.party_event_supply_orders_v16 SET donated_quantity=9 WHERE id=$1',[optionalOrders[2]]);
 await assert.rejects(()=>read('preparation'),/unearned_or_foreign_chest/);
 await db.query('UPDATE private.party_event_supply_orders_v16 SET donated_quantity=10 WHERE id=$1',[optionalOrders[2]]);
 assert.equal((await read('preparation')).earned,true);
 await db.exec('BEGIN;');
 try{
  await db.query(
   'DELETE FROM private.party_event_settlement_certificates_v87 WHERE party_id=$1',
   [party]);
  await db.query('INSERT INTO private.party_event_settlement_certificates_v87 '+
   '(party_id,event_starts_at,reservation_id,source_digest,verified_tiers_cleared,'+
   'independently_verified_victory,settled_at,issued_at) VALUES($1,'+
   'to_timestamp($2::double precision/1000),$3,$4,2,false,'+
   'to_timestamp($5::double precision/1000),'+
   'to_timestamp($6::double precision/1000))',
   [party,week,reservation,digest,attested,issued]);
  await assert.rejects(()=>read('finale'),/unearned_or_foreign_chest/,
   'A trusted settlement without independent victory cannot earn finale');
  assert.equal((await read('participation')).earned,true);
 }finally{await db.exec('ROLLBACK;')}
 assert.equal((await read('finale')).earned,true);
 console.log('PARTY_EVENT_V87_CANONICAL_PG_OK: actual V11/V14/V16/V17/V18/V23/V87 SQL, independent victory/tier certificates, three chest kinds, readiness refusals, immutable gates');
}finally{await db.close()}
