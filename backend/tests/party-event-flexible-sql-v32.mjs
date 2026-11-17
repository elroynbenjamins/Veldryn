/**
 * Hidden V32 independent SQL safety test. Self-contained temporary PGlite
 * database; NEVER connects to staging or production. V11 draft SQL lives
 * under roadmap and is not a deployed Supabase migration.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const filename=fileURLToPath(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261113041500_party_event_receipt_ledger_v11.sql',
 import.meta.url));
const sql=readFileSync(filename,'utf8');
const db=await PGlite.create();
const fail=(reason)=>{throw new Error('party_events_v32_'+reason);};
async function denied(action,expected){
 try{await action();fail('unexpected_success_'+expected)}
 catch(e){if(!String(e).includes(expected))throw e;}
}
const uuid=(n)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
const characterId=(n)=>'20000000-0000-4000-8000-'+String(n).padStart(12,'0');
const party='30000000-0000-4000-8000-000000000032';
const started=new Date(Date.now()-60*60*1000).toISOString();
const ended=new Date(Date.now()+6*86400000).toISOString();
try{
 await db.exec(`
  create schema auth;
  create schema private;
  create role anon;
  create role authenticated;
  create role service_role;
  create table auth.users(id uuid primary key);
  create table public.characters(
   id uuid primary key,account_id uuid not null references auth.users(id),
   class_id text not null
  );
 `);
 await db.exec(sql);
 for(let i=1;i<=6;i++){
  await db.query('insert into auth.users(id) values($1::uuid)',[uuid(i)]);
  await db.query('insert into public.characters(id,account_id,class_id) values($1::uuid,$2::uuid,$3::text)',
   [characterId(i),uuid(i),i===5?'BASTION':'WAYFINDER']);
 }
 await db.query('insert into private.party_event_weeks_v11(party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty) values($1::uuid,$2::timestamptz,$3::timestamptz,$4,$5,0,$6)',
  [party,started,ended,'broken_caravan','bandits_crossing','standard']);
 // Every member has a real class-owner match, even when all four are DPS.
 for(let i=1;i<=4;i++){
  await db.query('insert into private.party_event_roster_v11(party_id,event_starts_at,account_id,character_id,role,joined_at) values($1::uuid,$2::timestamptz,$3::uuid,$4::uuid,$5,$6::timestamptz)',
   [party,started,uuid(i),characterId(i),'damage',started]);
 }
 const size=await db.query('select count(*)::int as n from private.party_event_roster_v11 where party_id=$1::uuid',[party]);
 if(size.rows[0]?.n!==4)fail('four_damage_not_enrolled');
 const tryJoin=(account,character,role)=>db.query(
  'insert into private.party_event_roster_v11(party_id,event_starts_at,account_id,character_id,role,joined_at) values($1::uuid,$2::timestamptz,$3::uuid,$4::uuid,$5,$6::timestamptz)',
  [party,started,account,character,role,started]);
 await denied(()=>tryJoin(uuid(5),characterId(5),'damage'),'party_event_role_mismatch');
 await denied(()=>tryJoin(uuid(5),characterId(5),'tank'),'party_event_role_capacity');
 await denied(()=>tryJoin(uuid(6),characterId(5),'tank'),'party_event_character_not_owned');
 await db.query('insert into private.party_event_stages_v11(party_id,event_starts_at,stage,opened_at) values($1::uuid,$2::timestamptz,1,$2::timestamptz)',
  [party,started]);
 await db.query(`insert into private.party_event_sources_v11(
  source_event_id,party_id,event_starts_at,account_id,stage,kind,occurred_at,committed_at)
  values($1,$2::uuid,$3::timestamptz,$4::uuid,1,'verified_noncombat',clock_timestamp(),clock_timestamp())`,
  ['PARTY_V32_PROVEN_SCOUT',party,started,uuid(1)]);
 const claim=(request)=>db.query('select private.record_party_event_action_v11($1::uuid,$2::timestamptz,$3,$4,$5,$6) as receipt',
  [party,started,'PARTY_V32_PROVEN_SCOUT','scout_route',request,'a'.repeat(64)]);
 const first=(await claim('PARTY_V32_SAME_REQUEST')).rows[0].receipt;
 const retry=(await claim('PARTY_V32_SAME_REQUEST')).rows[0].receipt;
 if(first.replayed!==false||retry.replayed!==true||
  first.eventPointsGranted!==0||retry.eventPointsGranted!==0||
  first.receiptId!==retry.receiptId)fail('receipt_not_replay_safe');
 await denied(()=>claim('PARTY_V32_DIFFERENT_KEY'),'party_event_action_already_claimed');
 const grants=await db.query(`select
 has_function_privilege('anon',
  'private.record_party_event_action_v11(uuid,timestamptz,text,text,text,text)','EXECUTE') as anon_access,
 has_function_privilege('authenticated',
  'private.record_party_event_action_v11(uuid,timestamptz,text,text,text,text)','EXECUTE') as user_access,
 has_function_privilege('service_role',
  'private.record_party_event_action_v11(uuid,timestamptz,text,text,text,text)','EXECUTE') as server_access`);
 if(grants.rows[0].anon_access||grants.rows[0].user_access||
  !grants.rows[0].server_access)fail('private_function_exposed');
 console.log('PARTY_EVENTS_V32_FLEXIBLE_PRIVATE_SQL_OK: four Damage classes, server-owned class role, cap 4, exactly-once zero-EP receipt, private RPC');
}finally{
 await db.close();
}
