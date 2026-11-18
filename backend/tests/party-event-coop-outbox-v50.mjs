/**
 * Real disposable V49→V50 SQL proof: finalized co-op source, immutable
 * participant witnesses and Party-event-scoped per-human outbox all commit
 * atomically. No staging/production access and no EP/Gold/rewards.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const draft=name=>{
 const sql=readFileSync(new URL(
  '../../docs/roadmap/party-events/hidden-migrations/'+name,import.meta.url),'utf8');
 const lines=sql.split(/\r?\n/);
 const a=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
 const b=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
 if(a<0||b<=a)throw Error('v50_missing_draft_transaction');
 return lines.slice(a+1,b).join('\n');
};
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const foreign='33333333-3333-4333-8333-333333333333';
const ca='44444444-4444-4444-8444-444444444444';
const cb='55555555-5555-4555-8555-555555555555';
const cf='66666666-6666-4666-8666-666666666666';
const party='77777777-7777-4777-8777-777777777777';
const run='88888888-8888-4888-8888-888888888888';
const rollbackRun='99999999-9999-4999-8999-999999999999';
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
 create table private.party_event_weeks_v11(
  party_id uuid,event_starts_at timestamptz,event_ends_at timestamptz,
  active_stage smallint,status text,primary key(party_id,event_starts_at));
 create table private.party_event_roster_v11(
  party_id uuid,event_starts_at timestamptz,account_id uuid,
  character_id uuid,joined_at timestamptz);
 create table private.party_event_stages_v11(
  party_id uuid,event_starts_at timestamptz,stage smallint,opened_at timestamptz);
 `);
 await db.exec(draft('20261118212000_party_event_coop_node_attestation_v49.sql'));
 await db.exec(draft('20261118220000_party_event_coop_actor_outbox_v50.sql'));
 for(const account of [a,b,foreign]){
  await db.query('insert into auth.users values ($1::uuid)',[account]);
 }
 for(const [char,account] of [[ca,a],[cb,b],[cf,foreign]]){
  await db.query('insert into public.characters values ($1::uuid,$2::uuid)',[char,account]);
 }
 const week=await db.query(`
  select clock_timestamp()-interval '1 day' as start_at,
   clock_timestamp()+interval '6 days' as end_at`);
 const start=week.rows[0].start_at,end=week.rows[0].end_at;
 await db.query(`insert into private.party_event_weeks_v11
 values($1::uuid,$2::timestamptz,$3::timestamptz,2,'active')`,[party,start,end]);
 await db.query(`insert into private.party_event_stages_v11 values
 ($1::uuid,$2::timestamptz,2,clock_timestamp()-interval '2 hours')`,
 [party,start]);
 await db.query(`insert into private.party_event_roster_v11 values
 ($1::uuid,$2::timestamptz,$3::uuid,$4::uuid,clock_timestamp()-interval '12 hours'),
 ($1::uuid,$2::timestamptz,$5::uuid,$6::uuid,clock_timestamp()-interval '12 hours')`,
 [party,start,a,ca,b,cb]);
 await db.query(`insert into public.party_activity_weights_v16 values
 ('combat','ELITE_WOLF',1)`);
 for(const id of [run,rollbackRun]){
  await db.query(`insert into public.expedition_runs values
 ($1::uuid,'live',$2::jsonb)`,
 [id,JSON.stringify({nodes:[{nodeId:'COMBAT_A',contentId:'ELITE_WOLF'}]})]);
  for(const [account,char] of [[a,ca],[b,cb],[foreign,cf]]){
   await db.query(`insert into public.expedition_run_members values
   ($1::uuid,$2::uuid,$3::uuid,'human',$2::uuid,null)`,
   [id,account,char]);
   await db.query(`insert into public.coop_run_access_memberships values
   ($1::uuid,$2::uuid,true,'live_participant')`,[id,account]);
  }
 }
 const node=id=>db.query(`insert into public.coop_node_results
 (run_id,node_id,fencing_generation,success,start_state_hash)
 values($1::uuid,'COMBAT_A',7,true,'NODE_HASH')`,[id]);
 const summary=async id=run=>(
  await db.query(`select
  (select count(*)::int from public.coop_node_results where run_id=$1::uuid) as nodes,
  (select count(*)::int from private.party_event_coop_node_actors_v49
   where run_id=$1::uuid) as witnesses,
  (select count(*)::int from private.party_event_coop_actor_outbox_v50
   where run_id=$1::uuid) as pending`,[id])
 ).rows[0];
 await node(run);
 assert.deepEqual(await summary(),{nodes:1,witnesses:3,pending:2},
  '3 human witnesses, only 2 enrolled in same event get durable queue');
 const actors=await db.query(`
 select account_id::text from private.party_event_coop_actor_outbox_v50
 where run_id=$1::uuid order by account_id`,[run]);
 assert.deepEqual(actors.rows.map(x=>x.account_id),[a,b],
  'foreign non-enrolled actor not queued');
 await db.query(`update public.coop_run_access_memberships set active=false
 where run_id=$1::uuid`,[run]);
 assert.deepEqual(await summary(),{nodes:1,witnesses:3,pending:2},
  'later dungeon disconnect does not change source-time queue');
 let dupe=false;
 try{await node(run);}catch{dupe=true;}
 assert.equal(dupe,true,'duplicate resolved node cannot enqueue again');

 const leased=await db.query(`
 select * from private.lease_party_event_coop_actors_v50(10,90)`);
 assert.equal(leased.rows.length,2);
 assert.notEqual(leased.rows[0].lease_token,leased.rows[1].lease_token);
 const one=leased.rows[0],two=leased.rows[1];
 const complete=(r,token=r.lease_token)=>db.query(`
 select private.complete_party_event_coop_actor_v50(
 $1::uuid,$2::text,$3::uuid,$4::uuid) ok`,
 [r.run_id,r.node_id,r.actor_account_id,token]);
 const failed=await complete(one,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 assert.equal(failed.rows[0].ok,false,'forged ACK token denied');
 assert.equal((await complete(one)).rows[0].ok,true);
 await db.query(`
 update private.party_event_coop_actor_outbox_v50
 set lease_expires_at=clock_timestamp()-interval '1 second'
 where run_id=$1::uuid and node_id=$2 and account_id=$3::uuid`,
 [two.run_id,two.node_id,two.actor_account_id]);
 const reclaim=await db.query(`
 select * from private.lease_party_event_coop_actors_v50(1,90)`);
 assert.equal(reclaim.rows.length,1);
 assert.equal(reclaim.rows[0].actor_account_id,two.actor_account_id);
 assert.notEqual(reclaim.rows[0].lease_token,two.lease_token);
 assert.equal((await complete(two)).rows[0].ok,false,
  'crashed old worker cannot ACK replacement token');
 const rr=reclaim.rows[0];
 const retry=await db.query(`
 select private.retry_party_event_coop_actor_v50(
 $1::uuid,$2::text,$3::uuid,$4::uuid,'private_credit_unavailable') queued`,
 [rr.run_id,rr.node_id,rr.actor_account_id,rr.lease_token]);
 assert.equal(retry.rows[0].queued,true);
 assert.equal((await db.query(`
 select * from private.lease_party_event_coop_actors_v50(10,90)`)).rows.length,0,
 'retry requires backoff, no busy loop');
 await db.query(`update private.party_event_coop_actor_outbox_v50
 set next_attempt_at=clock_timestamp()-interval '1 second'
 where run_id=$1::uuid and account_id=$2::uuid`,[run,two.actor_account_id]);
 const rel=await db.query(`select * from private.lease_party_event_coop_actors_v50(10,90)`);
 assert.equal(rel.rows.length,1);
 assert.equal(rel.rows[0].attempt_count,3,'repeated lease recorded');
 assert.equal((await complete(rel.rows[0])).rows[0].ok,true);
 const completeCount=await db.query(`select count(*)::int c
 from private.party_event_coop_actor_outbox_v50 where state='complete'`);
 assert.equal(completeCount.rows[0].c,2);

 // Failure AFTER canonical node source insertion must roll back the node
 // plus every witness and queued participant, never orphan a source.
 await db.exec(`
 create function private.fail_coop_outbox_test_v50()
 returns trigger language plpgsql as $$
 begin raise exception 'injected_coop_queue_failure';end;$$;
 create trigger injected_source_failure_v50
 before insert on private.party_event_coop_actor_outbox_v50
 for each row execute function private.fail_coop_outbox_test_v50();
 `);
 let forced=false;
 try{await node(rollbackRun);}catch{forced=true;}
 assert.equal(forced,true,'force queue error during same canonical transaction');
 assert.deepEqual(await summary(rollbackRun),{nodes:0,witnesses:0,pending:0},
  'the canonical node and witness MUST roll back with its outbox');

 const privilege=await db.query(`
 select has_table_privilege('authenticated',
 'private.party_event_coop_actor_outbox_v50','SELECT') player_read,
 has_function_privilege('authenticated',
 'private.lease_party_event_coop_actors_v50(integer,integer)','EXECUTE') player_lease,
 has_function_privilege('service_role',
 'private.lease_party_event_coop_actors_v50(integer,integer)','EXECUTE') worker_lease`);
 assert.deepEqual(privilege.rows[0],
  {player_read:false,player_lease:false,worker_lease:true});
 console.log('PARTY_EVENTS_V50_PGLITE_OK: same-transaction witnesses/queue, enrolled-only source, lease fencing, crash recovery, forced rollback, service-role-only');
}finally{await db.close()}
