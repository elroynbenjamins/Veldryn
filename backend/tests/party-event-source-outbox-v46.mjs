/**
 * V46 disposable PGlite integration proof. Runs the ACTUAL unpromoted
 * V45 writer and V46 source triggers with an inert online-game commit stub.
 * No live database access and NO progress or reward functions mounted.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const loadDraft=(name)=>{
 const file=new URL('../../docs/roadmap/party-events/hidden-migrations/'+name,import.meta.url);
 const lines=readFileSync(file,'utf8').split(/\r?\n/);
 const start=lines.findIndex(line=>line.trim().toLowerCase()==='begin;');
 const end=lines.findLastIndex(line=>line.trim().toLowerCase()==='commit;');
 if(start<0||end<=start)throw Error('missing_hidden_draft_transaction_'+name);
 return lines.slice(start+1,end).join('\n');
};
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const request='valid_outbox_request_123';
const hash='b'.repeat(64);
const response=(resourceAmount=5)=>({
 state:{character:{id:character}},
 reward:{xp:45,elapsedSeconds:900,items:[{itemId:'COPPER_ORE',quantity:resourceAmount}]},
});
const contributions=[
 {kind:'crafting',contentId:'IRONWOOD_BINDING_RESIN',units:1},
 {kind:'gathering',contentId:'GREENFIELDS_COPPER_OUTCROP',units:2,questUnits:2},
];
const packet=(id,resourceAmount=5)=>({
 kind:'party-event-canonical-source-packet-v44',
 accountId:account,characterId:character,requestId:id,
 craft:[{kind:'craft',idempotencyKey:'pe44:'+id+':craft:0',
  recipeId:'IRONWOOD_BINDING_RESIN',quantity:1}],
 idle:[{kind:'idle',idempotencyKey:'pe44:'+id+':idle:0',
  activityId:'GREENFIELDS_COPPER_OUTCROP',elapsedSec:900,
  resourceAmount,xpAmount:45}],
 writesAuthorized:false,eventPointsGranted:0,rewardsGranted:false,
});
const db=await PGlite.create();
try{
 await db.exec(`
 create schema private;
 create role anon;
 create role authenticated;
 create role service_role;
 create table public.server_action_receipts(
  account_id uuid,action text,idempotency_key text,response jsonb,
  primary key(account_id,action,idempotency_key));
 create table public.craft_receipts(
  receipt_id uuid primary key default gen_random_uuid(),
  character_id uuid not null,idempotency_key text not null,
  recipe_id text not null,quantity integer not null check(quantity>0),
  created_at timestamptz not null default now(),
  unique(character_id,idempotency_key));
 create table public.idle_claim_receipts(
  claim_id uuid primary key default gen_random_uuid(),
  character_id uuid not null,idempotency_key text not null,
  activity_id text not null,elapsed_sec integer not null,
  resource_amount bigint not null check(resource_amount<10),
  xp_amount bigint not null,created_at timestamptz not null default now(),
  unique(character_id,idempotency_key));
 create or replace function public.commit_online_game_guild_pve_v1(
  p_account uuid,p_version bigint,p_gold bigint,p_id text,p_hash text,
  p_payload jsonb,p_contributions jsonb,p_deleted uuid default null)
 returns jsonb language plpgsql as $$
 declare previous jsonb;
 begin
  select response into previous from public.server_action_receipts
   where account_id=p_account and action='online_game_v1' and idempotency_key=p_id;
  if found then return previous;end if;
  insert into public.server_action_receipts(account_id,action,idempotency_key,response)
   values(p_account,'online_game_v1',p_id,p_payload);
  return p_payload;
 end;$$;
 `);
 await db.exec(loadDraft('20261118143000_party_event_canonical_source_writer_v45.sql'));
 await db.exec(loadDraft('20261118173000_party_event_source_outbox_v46.sql'));
 const invoke=(id=request,amount=5)=>db.query(`
 select private.commit_online_game_party_sources_v45(
  $1::uuid,0::bigint,0::bigint,$2::text,$3::text,$4::jsonb,$5::jsonb,$6::jsonb,
  null::uuid) as response`,
  [account,id,hash,JSON.stringify(response(amount)),
   JSON.stringify(contributions),JSON.stringify(packet(id,amount))]);
 const count=async()=>(
  await db.query(`select
   (select count(*)::int from public.server_action_receipts) actions,
   (select count(*)::int from public.craft_receipts) crafts,
   (select count(*)::int from public.idle_claim_receipts) idle,
   (select count(*)::int from private.party_event_source_outbox_v46) queued`)
 ).rows[0];
 const initial=await invoke();
 assert.equal(initial.rows.length,1);
 assert.deepEqual(await count(),{actions:1,crafts:1,idle:1,queued:2},
  'same committed command must enqueue exactly two canonical source identities');
 const sources=await db.query(`
 select o.source_type,o.source_ref::text as source_id,o.state,o.attempt_count,
   o.source_occurred_at,
   case when o.source_type='craft' then
    (select count(*)::int from public.craft_receipts c
      where c.receipt_id=o.source_ref and c.created_at=o.source_occurred_at)
   else (select count(*)::int from public.idle_claim_receipts i
      where i.claim_id=o.source_ref and i.created_at=o.source_occurred_at) end as matches
 from private.party_event_source_outbox_v46 o order by source_type`);
 assert.deepEqual(sources.rows.map(x=>x.source_type),['craft','idle']);
 assert.ok(sources.rows.every(x=>x.state==='pending'&&x.attempt_count===0&&x.matches===1),
  'source IDs and timestamps must come from committed canonical rows');
 await invoke();
 assert.deepEqual(await count(),{actions:1,crafts:1,idle:1,queued:2},
  'replayed online action cannot duplicate queued source');
 const failed='valid_outbox_request_456';
 let failure=false;
 try{await invoke(failed,12);}catch{failure=true;}
 assert.equal(failure,true,'injected evidence insert failure must reject entire action');
 assert.deepEqual(await count(),{actions:1,crafts:1,idle:1,queued:2},
  'source trigger and game commit must roll back together');
 assert.equal((await db.query(`select count(*)::int c from public.server_action_receipts
  where idempotency_key=$1`,[failed])).rows[0].c,0);
 const direct=await db.query(`
 select count(*)::int c from private.party_event_source_outbox_v46
 where source_ref not in (
  select receipt_id from public.craft_receipts
  union select claim_id from public.idle_claim_receipts)`);
 assert.equal(direct.rows[0].c,0,'queue cannot contain orphan source receipts');

 // V47 is an independently unpromoted post-V46 migration. Prove that
 // leased source ownership fences ACK, that expired leases can be reclaimed,
 // and that failures back off rather than silently dropping committed work.
 await db.exec(loadDraft('20261118183000_party_event_source_leases_v47.sql'));
 const firstLease=await db.query(`select * from private.lease_party_event_sources_v47(10,90)`);
 assert.equal(firstLease.rows.length,2,'the two committed receipts must be leaseable');
 const [first,second]=firstLease.rows;
 assert.notEqual(first.lease_token,second.lease_token,'each lease has a distinct DB token');
 const oldToken='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const forgedAck=await db.query(`select private.complete_party_event_source_v47(
  $1::text,$2::uuid,$3::uuid) done`,
 [first.source_type,first.source_ref,oldToken]);
 assert.equal(forgedAck.rows[0].done,false,'arbitrary stale token cannot acknowledge work');
 // Force lease expiry to simulate a process crash after V14 committed but
 // before the queue ACK. Another worker must get a NEW fencing token.
 await db.query(`update private.party_event_source_outbox_v46
 set lease_expires_at=clock_timestamp()-interval '1 second'
 where source_type=$1::text and source_ref=$2::uuid`,
 [first.source_type,first.source_ref]);
 const replacement=await db.query(`select * from private.lease_party_event_sources_v47(1,90)`);
 assert.equal(replacement.rows.length,1,'expired lease is returned to a new worker');
 assert.equal(replacement.rows[0].source_ref,first.source_ref);
 assert.notEqual(replacement.rows[0].lease_token,first.lease_token);
 const oldAck=await db.query(`select private.complete_party_event_source_v47(
  $1::text,$2::uuid,$3::uuid) done`,
 [first.source_type,first.source_ref,first.lease_token]);
 assert.equal(oldAck.rows[0].done,false,'old crashed worker cannot ack replacement lease');
 const newAck=await db.query(`select private.complete_party_event_source_v47(
  $1::text,$2::uuid,$3::uuid) done`,
 [first.source_type,first.source_ref,replacement.rows[0].lease_token]);
 assert.equal(newAck.rows[0].done,true,'only current lease holder may acknowledge');
 const badRetry=await db.query(`select private.retry_party_event_source_v47(
  $1::text,$2::uuid,$3::uuid,$4::text) queued`,
 [second.source_type,second.source_ref,oldToken,'private_credit_unavailable']);
 assert.equal(badRetry.rows[0].queued,false,'wrong lease token cannot change retry state');
 const retry=await db.query(`select private.retry_party_event_source_v47(
  $1::text,$2::uuid,$3::uuid,$4::text) queued`,
 [second.source_type,second.source_ref,second.lease_token,'private_credit_unavailable']);
 assert.equal(retry.rows[0].queued,true,'current lease holder can retry failed credit');
 const immediate=await db.query(`select * from private.lease_party_event_sources_v47(10,90)`);
 assert.equal(immediate.rows.length,0,'retry backoff prevents a busy loop');
 await db.query(`update private.party_event_source_outbox_v46
 set next_attempt_at=clock_timestamp()-interval '1 second'
 where source_type=$1::text and source_ref=$2::uuid`,
 [second.source_type,second.source_ref]);
 const next=await db.query(`select * from private.lease_party_event_sources_v47(10,90)`);
 assert.equal(next.rows.length,1);
 assert.equal(next.rows[0].attempt_count,2,'retry attempt is durably counted');
 const finalAck=await db.query(`select private.complete_party_event_source_v47(
  $1::text,$2::uuid,$3::uuid) done`,
 [second.source_type,second.source_ref,next.rows[0].lease_token]);
 assert.equal(finalAck.rows[0].done,true);
 const final=await db.query(`select state,count(*)::int c
 from private.party_event_source_outbox_v46 group by state`);
 assert.deepEqual(final.rows,[{state:'complete',c:2}],
  'every original committed receipt can eventually be acknowledged');
 console.log('PARTY_EVENTS_V47_PGLITE_OK: leased sources, token fencing, crash reclamation, exponential retry, and final ACK');
 console.log('PARTY_EVENTS_V46_PGLITE_OK: atomic source queue, canonical ID mapping, exact replay and after-insert rollback');
}finally{await db.close()}
