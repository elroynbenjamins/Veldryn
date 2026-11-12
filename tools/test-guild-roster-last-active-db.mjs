/** Executes the real Guild activity roster migration against disposable PostgreSQL.
 * No Supabase project connection, account mutation, or network access.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

const backendRequire=createRequire(new URL('../backend/package.json',import.meta.url));
const {PGlite}=await import(pathToFileURL(backendRequire.resolve('@electric-sql/pglite')).href);
const db=new PGlite();
const guildA='00000000-0000-4000-8000-000000000101';
const guildB='00000000-0000-4000-8000-000000000102';
const leader='00000000-0000-4000-8000-000000000201';
const member='00000000-0000-4000-8000-000000000202';
const outsider='00000000-0000-4000-8000-000000000203';

try{
 await db.exec(`
  create role authenticated;create role anon;
  create schema auth;
  create or replace function auth.uid() returns uuid
  language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create table public.guild_members(account_id uuid primary key,guild_id uuid not null,role text not null,joined_at timestamptz not null);
  create table public.player_profiles(account_id uuid primary key,display_name text);
  create table public.player_activity_daily(account_id uuid,activity_date date,last_seen_at timestamptz);
  create or replace function public.social_account_last_active_v1(p_account_id uuid,p_fallback timestamptz default null)
  returns timestamptz language sql stable security definer set search_path=''
  as $$select coalesce((select max(a.last_seen_at) from public.player_activity_daily a where a.account_id=p_account_id),p_fallback)$$;
  insert into public.guild_members values
   ('${leader}','${guildA}','leader','2026-10-01T00:00:00Z'),
   ('${member}','${guildA}','member','2026-10-02T00:00:00Z'),
   ('${outsider}','${guildB}','leader','2026-10-03T00:00:00Z');
  insert into public.player_profiles values ('${leader}','Aster'),('${member}','Brann'),('${outsider}','Cora');
  insert into public.player_activity_daily values ('${leader}','2026-11-12','2026-11-12T13:00:00Z');
 `);
 const migration=readFileSync(new URL('../backend/supabase/migrations/20261112143000_guild_roster_last_active_v1.sql',import.meta.url),'utf8');
 await db.exec(migration);
 const setAccount=async(account)=>void await db.query("select set_config('request.jwt.claim.sub',$1,false)",[account??'']);
 const roster=async guild=>(await db.query('select * from public.guild_roster_with_activity_v1($1)',[guild])).rows;
 await setAccount(leader);
 const allowed=await roster(guildA);
 assert.equal(allowed.length,2,'a Guild member can read only their Guild');
 assert.equal(allowed[0].display_name,'Aster');
 assert.equal(allowed[0].role,'leader');
 assert.equal(new Date(allowed[0].last_active_at).toISOString(),'2026-11-12T13:00:00.000Z','last activity is observed activity, not join time');
 assert.equal(allowed[1].last_active_at,null,'a member with no observed activity remains unknown');
 assert.equal((await roster(guildB)).length,0,'the other Guild is private');
 await setAccount(outsider);
 assert.equal((await roster(guildA)).length,0,'another Guild member cannot inspect this roster');
 await setAccount(null);
 assert.equal((await roster(guildA)).length,0,'anonymous calls do not reveal Guild members');
 const access=(await db.query("select has_function_privilege('anon','public.guild_roster_with_activity_v1(uuid)','execute') as anon,has_function_privilege('authenticated','public.guild_roster_with_activity_v1(uuid)','execute') as authenticated")).rows[0];
 assert.equal(access.anon,false,'anon lacks permission to call activity RPC');
 assert.equal(access.authenticated,true,'authenticated members can call activity RPC');
 console.log('PASS: guild roster last-active SQL — member access, isolation, null activity and grants');
}finally{
 await db.close();
}
