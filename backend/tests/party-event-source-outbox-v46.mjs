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
    (select count(*) from public.craft_receipts c
      where c.receipt_id=o.source_ref and c.created_at=o.source_occurred_at)
   else (select count(*) from public.idle_claim_receipts i
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
 console.log('PARTY_EVENTS_V46_PGLITE_OK: atomic source queue, canonical ID mapping, exact replay and after-insert rollback');
}finally{await db.close()}
