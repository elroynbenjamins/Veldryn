/**
 * V45 disposable PGlite fault-injection regression. The real online-game
 * commit is substituted by an idempotent stub; ONLY the private V45 draft
 * function is executed unchanged. No persistent staging/production writes.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const migration=readFileSync(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261118143000_party_event_canonical_source_writer_v45.sql',
 import.meta.url),'utf8');
const lines=migration.split(/\r?\n/),a=lines.findIndex(x=>x.trim().toLowerCase()==='begin;'),
 b=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
if(a<0||b<=a)throw Error('V45 migration wrapper missing');
const DDL=lines.slice(a+1,b).join('\n');
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const request='valid_game_request_123';
const hash='a'.repeat(64);
const response={
 state:{character:{id:character}},
 reward:{xp:45,elapsedSeconds:900,items:[{itemId:'COPPER_ORE',quantity:5}]},
};
const contributions=[
 {kind:'crafting',contentId:'IRONWOOD_BINDING_RESIN',units:1},
 {kind:'gathering',contentId:'GREENFIELDS_COPPER_OUTCROP',units:2,questUnits:2},
];
const packet=(id=request,extra={})=>({
 kind:'party-event-canonical-source-packet-v44',
 accountId:account,characterId:character,requestId:id,
 craft:[{kind:'craft',idempotencyKey:'pe44:'+id+':craft:0',
  recipeId:'IRONWOOD_BINDING_RESIN',quantity:1}],
 idle:[{kind:'idle',idempotencyKey:'pe44:'+id+':idle:0',
  activityId:'GREENFIELDS_COPPER_OUTCROP',elapsedSec:900,resourceAmount:5,xpAmount:45}],
 writesAuthorized:false,eventPointsGranted:0,rewardsGranted:false,...extra,
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
  unique(character_id,idempotency_key));
 create table public.idle_claim_receipts(
  claim_id uuid primary key default gen_random_uuid(),
  character_id uuid not null,idempotency_key text not null,
  activity_id text not null,elapsed_sec integer not null,
  resource_amount bigint not null check(resource_amount<10),
  xp_amount bigint not null,unique(character_id,idempotency_key));
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
 await db.exec(DDL);
 const invoke=(id=request,body=response,contrib=contributions,proof=packet(id))=>
  db.query(`select private.commit_online_game_party_sources_v45(
 $1::uuid,0::bigint,0::bigint,$2::text,$3::text,$4::jsonb,$5::jsonb,$6::jsonb,null::uuid) as result`,
 [account,id,hash,JSON.stringify(body),JSON.stringify(contrib),JSON.stringify(proof)]);
 const counts=async()=>{
  const r=await db.query(`select
   (select count(*)::int from public.server_action_receipts) as actions,
   (select count(*)::int from public.craft_receipts) as crafts,
   (select count(*)::int from public.idle_claim_receipts) as idle`);
  return r.rows[0];
 };
 const result=await invoke();
 assert.equal(result.rows.length,1);
 assert.deepEqual(await counts(),{actions:1,crafts:1,idle:1});
 // Replays must not create any second item/receipt or XP source.
 const replay=await invoke();
 assert.equal(replay.rows.length,1);
 assert.deepEqual(await counts(),{actions:1,crafts:1,idle:1});
 async function denied(id,proof,body=response,contrib=contributions){
  let failed=false;
  try{await invoke(id,body,contrib,proof);}
  catch{failed=true;}
  assert.equal(failed,true,'unsafe packet must fail');
 }
 const idMismatch='valid_game_request_456';
 await denied(idMismatch,packet(idMismatch,{characterId:'33333333-3333-4333-8333-333333333333'}));
 await denied(idMismatch,packet(idMismatch,{writesAuthorized:true}));
 await denied(idMismatch,packet(idMismatch,{writesAuthorized:null}));
 await denied(idMismatch,packet(idMismatch,{rewardsGranted:null}));
 await denied(idMismatch,packet(idMismatch,{kind:null}));
 await denied(idMismatch,packet(idMismatch,{craft:null}));
 await denied(idMismatch,packet(idMismatch,{idle:null}));
 await denied(idMismatch,packet(idMismatch,{eventPointsGranted:10}));
 await denied(idMismatch,packet(idMismatch,{craft:[{kind:'craft',idempotencyKey:'pe44:'+idMismatch+':craft:0',recipeId:'DIFFERENT_RECIPE',quantity:1}]}));
 await denied(idMismatch,packet(idMismatch,{idle:[{...packet(idMismatch).idle[0],resourceAmount:500}]}));
 await denied(idMismatch,packet(idMismatch,{idle:[{...packet(idMismatch).idle[0],elapsedSec:null}]}));
 await denied(idMismatch,packet(idMismatch,{idle:[{...packet(idMismatch).idle[0],resourceAmount:null}]}));
 await denied(idMismatch,packet(idMismatch,{idle:[{...packet(idMismatch).idle[0],xpAmount:null}]}));
 assert.deepEqual(await counts(),{actions:1,crafts:1,idle:1});
 // Failure after the ordinary online commit MUST roll back the online
 // receipt and the first craft write as part of one SQL transaction.
 const forced='valid_game_request_789';
 const failedResponse={...response,reward:{...response.reward,items:[{itemId:'COPPER_ORE',quantity:12}]}};
 await denied(forced,packet(forced,{idle:[{...packet(forced).idle[0],resourceAmount:12}]}),failedResponse);
 assert.deepEqual(await counts(),{actions:1,crafts:1,idle:1});
 const existing=await db.query(`select count(*)::int as c from public.server_action_receipts
 where idempotency_key=$1::text`,[forced]);
 assert.equal(existing.rows[0].c,0,'failure cannot preserve an online action without corresponding canonical evidence');
 console.log('PARTY_EVENTS_V45_PGLITE_OK: same-transaction craft+idle, exact replay, malformed packet and injected failure rollback');
}finally{await db.close()}
