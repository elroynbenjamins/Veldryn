begin;

do $$
declare
  t text;
  targets text[] := array[
    'echo_recruitments','party_match_receipts','guild_contribution_ledger','guild_skill_allocations','guild_boss_windows','guild_boss_attempts',
    'arena_matches','raid_lockouts','raid_loot_receipts','economy_rollups_hourly','account_risk_state','client_builds','api_request_receipts','content_manifests',
    'account_squads','account_squad_members','squad_trial_runs','squad_trial_floor_results','squad_loadouts','squad_loadout_history','squad_arena_seasons',
    'squad_arena_reward_claims','squad_api_receipts'
  ];
  has_rls boolean;
begin
  foreach t in array targets loop
    select c.relrowsecurity
      into has_rls
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname=t;

    if has_rls is distinct from true then
      raise exception 'server-owned table % must have RLS enabled',t;
    end if;

    if has_table_privilege('anon',format('public.%I',t),'SELECT')
       or has_table_privilege('anon',format('public.%I',t),'INSERT')
       or has_table_privilege('anon',format('public.%I',t),'UPDATE')
       or has_table_privilege('anon',format('public.%I',t),'DELETE')
       or has_table_privilege('anon',format('public.%I',t),'TRUNCATE') then
      raise exception 'anon retains unsafe table privilege on %',t;
    end if;

    if has_table_privilege('authenticated',format('public.%I',t),'SELECT')
       or has_table_privilege('authenticated',format('public.%I',t),'INSERT')
       or has_table_privilege('authenticated',format('public.%I',t),'UPDATE')
       or has_table_privilege('authenticated',format('public.%I',t),'DELETE')
       or has_table_privilege('authenticated',format('public.%I',t),'TRUNCATE') then
      raise exception 'authenticated retains unsafe table privilege on %',t;
    end if;
  end loop;
end $$;

select 'PASS: server-owned public tables require trusted RPC/server access' as result;
rollback;
