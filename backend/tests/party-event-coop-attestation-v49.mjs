/**
 * V49 disposable PGlite source-time witness proof. Creates only a minimal
 * canonical co-op schema; executes the UNMODIFIED hidden V49 trigger DDL.
 * No staging/production DB, event points, reward or public endpoint.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const load=(file)=>readFileSync(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/'+file,import.meta.url),'utf8');
const extract=(sql)=>{
 const lines=sql.split(/\r?\n/),first=lines.findIndex(l=>l.trim().toLowerCase()==='begin;'),
 last=lines.findLastIndex(l=>l.trim().toLowerCase()==='commit;');
 if(first<0||last<=first)throw Error('v49_hidden_transaction_missing');
 return lines.slice(first+1,last).join('\n');
};
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const echo='33333333-3333-4333-8333-333333333333';
const later='44444444-4444-4444-8444-444444444444';
const charA='55555555-5555-4555-8555-555555555555';
const charB='66666666-6666-4666-8666-666666666666';
const charEcho='77777777-7777-4777-8777-777777777777';
const charLater='88888888-8888-4888-8888-888888888888';
const live='99999999-9999-4999-8999-999999999999';
const qmode='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const solo='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const failure='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const unknown='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const route={nodes:[{nodeId:'COMBAT_A',contentId:'ELITE_WOLF'}]};
const db=await PGlite.create();
try{
 await db.exec(`
 create schema auth;
 create schema private;
 create role anon;
 create role authenticated;
 create role service_role;
 create table auth.users(id uuid primary key);
 create table public.characters(
  id uuid primary key,account_id uuid references auth.users(id) on delete cascade);
 create table public.expedition_runs(
  id uuid primary key,coop_mode text,route_graph_json jsonb);
 create table public.expedition_run_members(
  run_id uuid,account_id uuid,character_id uuid,member_kind text,
  active_participant_account_id uuid,echo_profile_version integer);
 create table public.coop_run_access_memberships(
  run_id uuid,account_id uuid,active boolean,membership_kind text);
 create table public.party_activity_weights_v16(
  kind text,content_id text,units_per_action numeric);
 create table public.coop_node_results(
  run_id uuid,node_id text,fencing_generation bigint,success boolean,
  start_state_hash text,committed_at timestamptz default now(),
  primary key(run_id,node_id));
 `);
 await db.exec(extract(load('20261118212000_party_event_coop_node_attestation_v49.sql')));
 const override=extract(load('20261118213000_party_event_v14_coop_attestation_patch_v49.sql'));
 assert.match(override,/private\.party_event_coop_node_actors_v49 witness/);
 assert.doesNotMatch(override,/join public\.coop_run_access_memberships access/);
 assert.doesNotMatch(override,/join public\.expedition_run_members/);
 assert.match(override,/if v_participants<2 then raise exception 'party_event_v14_solo_combat'/);
 assert.match(override,/source\.success=true/);
 for(const account of [a,b,echo,later]){
  await db.query('insert into auth.users(id) values ($1::uuid)',[account]);
 }
 for(const [character,account] of [[charA,a],[charB,b],[charEcho,echo],[charLater,later]]){
  await db.query('insert into public.characters(id,account_id) values ($1::uuid,$2::uuid)',
   [character,account]);
 }
 for(const [id,mode] of [[live,'live'],[qmode,'qmode'],[solo,'live'],
  [failure,'live'],[unknown,'live']]){
  await db.query('insert into public.expedition_runs values ($1::uuid,$2::text,$3::jsonb)',
   [id,mode,JSON.stringify(route)]);
 }
 await db.query('insert into public.party_activity_weights_v16 values ($1,$2,$3)',
  ['combat','ELITE_WOLF',1]);
 async function member(run,account,character,kind='human',active=true){
  await db.query(`insert into public.expedition_run_members values
   ($1::uuid,$2::uuid,$3::uuid,$4::text,$5::uuid,$6::integer)`,
   [run,account,character,kind,kind==='human'?account:echo,kind==='human'?null:1]);
  await db.query(`insert into public.coop_run_access_memberships values
   ($1::uuid,$2::uuid,$3::boolean,'live_participant')`,
   [run,account,active]);
 }
 for(const run of [live,qmode,failure,unknown]){
  await member(run,a,charA);
  await member(run,b,charB);
 }
 await member(live,echo,charEcho,'echo',true);
 await member(live,later,charLater,'human',false);
 await member(solo,a,charA);
 const node=async(run,id='COMBAT_A',success=true)=>db.query(`
  insert into public.coop_node_results(run_id,node_id,fencing_generation,success,start_state_hash)
  values($1::uuid,$2::text,7,$3::boolean,'SERVER_HASH')`,
 [run,id,success]);
 const count=async(run)=>Number((await db.query(`
 select count(*)::int c from private.party_event_coop_node_actors_v49
 where run_id=$1::uuid`,[run])).rows[0].c);
 await node(live);
 assert.equal(await count(live),2,'exactly two active human witnesses');
 const first=await db.query(`
 select account_id::text,character_id::text,content_id,fencing_generation,
  start_state_hash,node_committed_at
 from private.party_event_coop_node_actors_v49
 where run_id=$1::uuid order by account_id`,[live]);
 assert.deepEqual(first.rows.map(x=>x.account_id),[a,b]);
 assert.deepEqual(first.rows.map(x=>x.character_id),[charA,charB]);
 assert.ok(first.rows.every(x=>x.content_id==='ELITE_WOLF'
  &&Number(x.fencing_generation)===7&&x.start_state_hash==='SERVER_HASH'));
 const source=await db.query(`select committed_at from public.coop_node_results
 where run_id=$1::uuid`,[live]);
 assert.equal(new Date(first.rows[0].node_committed_at).toISOString(),
  new Date(source.rows[0].committed_at).toISOString(),
  'witness occurrence timestamp from same source transaction');

 // The source-time membership snapshot remains valid after the run closes;
 // later membership changes cannot retroactively create new witnesses.
 await db.query(`update public.coop_run_access_memberships set active=false
 where run_id=$1::uuid and account_id in ($2::uuid,$3::uuid)`,[live,a,b]);
 await db.query(`update public.coop_run_access_memberships set active=true
 where run_id=$1::uuid and account_id=$2::uuid`,[live,later]);
 assert.equal(await count(live),2,'disconnect cannot erase witness or add late actor');
 const noLate=await db.query(`
 select count(*)::int c from private.party_event_coop_node_actors_v49
 where run_id=$1::uuid and account_id=$2::uuid`,[live,later]);
 assert.equal(noLate.rows[0].c,0,'post-commit reconnect cannot forge witness');

 await node(qmode);await node(solo);await node(failure,'COMBAT_A',false);
 await node(unknown,'FAKE_NODE');
 for(const run of [qmode,solo,failure,unknown]){
  assert.equal(await count(run),0,'unqualified run/failed/unknown nodes cannot earn proof');
 }
 const perms=await db.query(`
 select has_table_privilege('authenticated',
  'private.party_event_coop_node_actors_v49','SELECT') visible,
  has_table_privilege('authenticated',
  'private.party_event_coop_node_actors_v49','INSERT') writable,
  has_table_privilege('service_role',
  'private.party_event_coop_node_actors_v49','SELECT') server_read`);
 assert.deepEqual(perms.rows[0],{visible:false,writable:false,server_read:true});
 let duplicateRejected=false;
 try{await node(live);}catch{duplicateRejected=true;}
 assert.equal(duplicateRejected,true,'replayed node commit cannot mint second source');

 // Account erasure cascades its private human witness, unlike an ordinary
 // disconnect. This proof holds no loot, EP or account-wide social reward.
 await db.query('delete from auth.users where id=$1::uuid',[a]);
 assert.equal(await count(live),1,'user erasure deletes attributed witness');

 console.log('PARTY_EVENTS_V49_PGLITE_OK: committed live human snapshot, Echo/Q-mode/solo/failed exclusion, disconnected run durability, privacy and replay');
}finally{await db.close()}
