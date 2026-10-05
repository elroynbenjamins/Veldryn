/** Disposable PostgreSQL regression harness; never connects to a hosted database.
 * Loads the real profile-public resolver and the complete co-op icon migration.
 * The existing schema/auth claims are fixtures, not an emulation of the RPCs.
 *
 * Run from any directory:
 * PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
 *   node backend/online/tests/coop-profile-icons-db.mjs
 * The test dependency can live outside the repository; no production dependency
 * or package manifest change is required. Validated with PGlite 0.5.8.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const {PGlite}=await import(process.env.PGLITE_MODULE
  ?pathToFileURL(process.env.PGLITE_MODULE).href
  :'@electric-sql/pglite');
const db=new PGlite();
const read=file=>readFileSync(new URL(`../../supabase/${file}`,import.meta.url),'utf8');
const profileMigration=read('migrations/20261039000000_profile_icons.sql');
const functionSource=(source,name)=>{
  const start=source.indexOf(`create or replace function ${name}(`);
  const end=source.indexOf('end $$;',start);
  assert(start>=0&&end>start,`Cannot locate real ${name} function body`);
  return source.slice(start,end+7);
};

try{
  await db.exec(`
    create role anon;create role authenticated;create role service_role;
    create schema auth;create schema private;
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;
    -- Intentionally no private-schema USAGE for authenticated. The public
    -- SQL-standard invoker wrapper must call its bound helper without this grant.
    create table public.player_blocks(blocker_id uuid,blocked_id uuid,
      primary key(blocker_id,blocked_id));
    create table public.player_profile_extensions(
      account_id uuid primary key,visibility text,world_feed_opt_out boolean,bio text,
      achievement_showcase_ids text[],collection_showcase jsonb,record_showcase_ids text[],
      mastery_showcase_action_ids text[],selected_character_id uuid,favorite_skill_id text,
      favorite_companion_id text,revision bigint);
    create table public.player_profiles(account_id uuid primary key,active_character_id uuid,
      display_name text,profile_title text,profile_background_id text);
    create table public.online_game_states(account_id uuid primary key,state jsonb);
    create table private.adventurers_journal_state(account_id uuid primary key,state jsonb);
    create table public.guild_members(account_id uuid primary key,guild_id uuid);
    create table public.characters(id uuid primary key,account_id uuid,name text,class_id text,
      level int,body_presentation text,profile_title text,profile_background_id text,
      updated_at timestamptz default now());
    -- The mode check is deliberately relaxed only in this disposable scaffold
    -- so the RPC's unsupported-mode denial can be exercised as defense in depth.
    create table public.expedition_runs(id uuid primary key,coop_mode text,status text);
    create table public.expedition_run_members(
      run_id uuid references public.expedition_runs(id),character_id uuid references public.characters(id),
      account_id uuid,source_account_id uuid,active_participant_account_id uuid,
      member_kind text,slot_id text,loadout_snapshot jsonb,stat_snapshot jsonb,snapshot_hash text,
      primary key(run_id,character_id));
    create table public.coop_run_access_memberships(
      run_id uuid references public.expedition_runs(id),account_id uuid,active boolean,
      membership_kind text,primary key(run_id,account_id));
    create table public.coop_run_private_state(run_id uuid primary key,state_json jsonb);
    create table public.coop_run_client_snapshots(run_id uuid primary key,state_version bigint,
      event_cursor bigint,projection_json jsonb);
    create table public.coop_ready_checks(id uuid primary key,roster_json jsonb,
      frozen_roster_json jsonb,status text,roster_revision bigint);
    create table public.online_coop_lfg_posts(id uuid primary key,owner_account_id uuid unique,
      character_id uuid,created_at timestamptz,expires_at timestamptz,closed_at timestamptz);
    alter table public.expedition_runs enable row level security;
    alter table public.expedition_run_members enable row level security;
    alter table public.coop_run_access_memberships enable row level security;
    alter table public.coop_run_private_state enable row level security;
    alter table public.coop_run_client_snapshots enable row level security;
    alter table public.coop_ready_checks enable row level security;
    alter table public.online_coop_lfg_posts enable row level security;
    alter table public.online_game_states enable row level security;
    grant select on public.expedition_runs,public.expedition_run_members,
      public.coop_run_access_memberships,public.coop_run_client_snapshots to authenticated;
    create policy coop_access_read_self on public.coop_run_access_memberships
      for select using(account_id=auth.uid());
    create policy coop_client_snapshot_read_active_member on public.coop_run_client_snapshots
      for select using(exists(select 1 from public.coop_run_access_memberships a
        where a.run_id=coop_run_client_snapshots.run_id and a.account_id=auth.uid() and a.active));
    -- No raw modern co-op run/member read policy; production similarly limits
    -- their legacy read policies to coop_mode IS NULL.
  `);
  await db.exec(functionSource(profileMigration,'public.profile_public_v43'));
  await db.exec('revoke all on function public.profile_public_v43(uuid) from public,anon;grant execute on function public.profile_public_v43(uuid) to authenticated;');
  await db.exec(read('migrations/20261102000000_coop_profile_icons.sql'));
  const fixture=readFileSync(new URL('./fixtures/coop-profile-icons.sql',import.meta.url),'utf8');
  const results=await db.exec(fixture);
  for(const result of results)for(const row of result.rows??[])
    if(typeof row.result==='string')console.log(row.result);
  // The SQL fixture rolls back both identities and its temporary assertions.
  assert.equal((await db.query('select count(*)::int as count from public.expedition_runs')).rows[0].count,0);
  assert.equal((await db.query('select count(*)::int as count from public.online_game_states')).rows[0].count,0);
  console.log('PASS co-op icon SQL fixture rolls back all test data');
}finally{
  await db.close();
}
