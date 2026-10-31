import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';

// Disposable in-memory database: verify all three weekly activity paths use
// one 20-effort-per-minute daily budget and the existing completion caps.
const db=new PGlite();
const home=path.dirname(fileURLToPath(import.meta.url));
const account='11111111-1111-4111-8111-111111111111',guild='22222222-2222-4222-8222-222222222222';
const project='33333333-3333-4333-8333-333333333333';
const now='2026-10-30T14:00:00Z',ts=Date.parse(now);
const single=async(s,args=[])=> (await db.query(s,args)).rows[0];
try{
 await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as
  'select nullif(current_setting(''app.test_uid'',true),'''')::uuid';
 create table auth.users(id uuid primary key);
 create table public.guilds(id uuid primary key);
 create table public.guild_members(
  account_id uuid primary key references auth.users(id),guild_id uuid references public.guilds(id),joined_at timestamptz not null);
 create table public.guild_project_instances(
  id uuid primary key,guild_id uuid references public.guilds(id),template_id text not null,
  status text not null,cycle_key text not null,started_at timestamptz not null,ends_at timestamptz not null,
  target_points bigint not null,completion_points bigint not null default 0,
  combat_points bigint not null default 0,skilling_points bigint not null default 0,
  meaningful_contributors integer not null default 0,minimum_meaningful_contributors integer not null default 1,
  single_account_completion_share_cap numeric not null default .5,
  completed_at timestamptz,completion_snapshot jsonb
 );
 create table public.guild_project_member_progress(
  project_instance_id uuid references public.guild_project_instances(id),account_id uuid references auth.users(id),
  raw_points bigint not null default 0,completion_points bigint not null default 0,
  combat_points bigint not null default 0,skilling_points bigint not null default 0,
  joined_at_snapshot timestamptz not null,first_contribution_at timestamptz,last_contribution_at timestamptz,
  primary key(project_instance_id,account_id)
 );
 create table public.guild_project_effort_days_v1(
  project_id uuid references public.guild_project_instances(id),account_id uuid references auth.users(id),
  earned_day date,credited_ms bigint not null default 0,
  primary key(project_id,account_id,earned_day)
 );
 create table public.guild_project_cycle_bindings(
  cycle_key text not null,account_id uuid not null,guild_id uuid not null,
  bound_at timestamptz not null,points_at_bind bigint not null,
  primary key(cycle_key,account_id)
 );
 create function public.ensure_guild_weekly_project_v2(p_guild uuid,p_now timestamptz)
 returns void language plpgsql as $$begin null;end$$;
 `);
 await db.exec(readFileSync(path.join(home,'supabase/migrations/20261104000015_guild_weekly_activity_paths.sql'),'utf8'));
 await db.query('insert into auth.users(id) values($1)',[account]);
 await db.query('insert into public.guilds(id) values($1)',[guild]);
 await db.query('insert into public.guild_members(account_id,guild_id,joined_at) values($1,$2,$3)',[account,guild,new Date(ts-5*3600000).toISOString()]);
 await db.query(`insert into public.guild_project_instances(id,guild_id,template_id,status,cycle_key,started_at,ends_at,target_points)
 values($1,$2,'guild_weekly_shared_effort','active','weekly:2026-10-26',$3,$4,10000)`,[project,guild,new Date(ts-4*3600000).toISOString(),new Date(ts+3600000).toISOString()]);
 await db.query('insert into public.guild_project_member_progress(project_instance_id,account_id,joined_at_snapshot) values($1,$2,$3)',[project,account,new Date(ts-4*3600000).toISOString()]);
 const t=(offset)=>ts-offset*1000;
 const activities=[
  {kind:'combat',startsAtMs:t(60),endsAtMs:ts},
  {kind:'skilling',startsAtMs:t(60),endsAtMs:ts},
  {kind:'crafting',startsAtMs:t(30),endsAtMs:ts},
  {kind:'crafting',units:2},
 ];
 await db.query('select public.credit_guild_project_effort_v2($1,$2,$3::jsonb,$4::timestamptz)',
  [account,guild,JSON.stringify(activities),now]);
 const progress=await single('select raw_points,combat_points,skilling_points,completion_points from public.guild_project_member_progress where project_instance_id=$1 and account_id=$2',[project,account]);
 assert.deepEqual([Number(progress.raw_points),Number(progress.combat_points),Number(progress.skilling_points),Number(progress.completion_points)],[60,20,40,60]);
 const sources=(await db.query('select source,points from public.guild_project_effort_sources_v1 where project_id=$1 order by source',[project])).rows;
 assert.deepEqual(sources.map(x=>[x.source,Number(x.points)]),[['combat',20],['crafting',20],['gathering',20]]);
 assert.equal(Number((await single('select completion_points from public.guild_project_instances where id=$1',[project])).completion_points),60);
 await db.query('select public.credit_guild_project_effort_v2($1,$2,$3::jsonb,$4::timestamptz)',[
  account,guild,JSON.stringify([{kind:'combat',startsAtMs:t(3*3600),endsAtMs:ts}]),now]);
 const daily=await single('select raw_points from public.guild_project_member_progress where project_instance_id=$1 and account_id=$2',[project,account]);
 assert.equal(Number(daily.raw_points),2400,'shared daily effort cap applies to combined activities');
 const after=await single('select completion_points from public.guild_project_instances where id=$1',[project]);
 assert.equal(Number(after.completion_points),2400,'no additional reward or completion credit outside existing daily cap');
 console.log('PASS: verified combat, gathering, timed crafting and finished items share weekly Guild effort and cap');
}finally{await db.close();}
