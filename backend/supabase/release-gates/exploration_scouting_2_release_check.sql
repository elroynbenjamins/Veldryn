-- READ-ONLY Exploration 2.0 FINAL RELEASE CHECK.
-- The hidden foundation is already staged. This check must FAIL until the
-- authoritative settlement functions replace every NOT_READY placeholder and
-- the runtime release bit is explicitly enabled in the final coordinated 2.0 migration.
do $gate$
declare
  rel text;
  proc regprocedure;
  achievement_count integer;
  fn text;
begin
  foreach rel in array array[
    'scouting_runtime_config_v1','account_exploration_v1','character_scouting_access_v1',
    'scouting_assignments_v1','scouting_claims_v1','achievement_catalog','achievement_claims','achievement_showcase'
  ] loop
    if to_regclass('public.'||rel) is null then raise exception 'scouting_2_relation_missing: %',rel; end if;
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=rel and c.relrowsecurity)
    then raise exception 'scouting_2_rls_missing: %',rel; end if;
    if has_table_privilege('anon',format('public.%I',rel),'SELECT,INSERT,UPDATE,DELETE')
       or has_table_privilege('authenticated',format('public.%I',rel),'SELECT,INSERT,UPDATE,DELETE')
    then raise exception 'scouting_2_direct_table_access_exposed: %',rel; end if;
  end loop;

  foreach proc in array array[
    to_regprocedure('public.scouting_snapshot_server_v1(uuid,uuid)'),
    to_regprocedure('public.scouting_dispatch_server_v1(uuid,uuid,jsonb,text,timestamp with time zone)'),
    to_regprocedure('public.scouting_claim_server_v1(uuid,uuid,text,text,timestamp with time zone)'),
    to_regprocedure('public.scouting_migrate_account_server_v1(uuid,timestamp with time zone)'),
    to_regprocedure('public.achievement_snapshot_server_v1(uuid)'),
    to_regprocedure('public.achievement_claim_server_v1(uuid,text,text,timestamp with time zone)'),
    to_regprocedure('public.achievement_showcase_update_server_v1(uuid,text[],text,timestamp with time zone)')
  ] loop
    if proc is null then raise exception 'scouting_2_rpc_missing'; end if;
    if has_function_privilege('anon',proc,'EXECUTE') or has_function_privilege('authenticated',proc,'EXECUTE')
    then raise exception 'scouting_2_rpc_client_exposed: %',proc; end if;
    if not has_function_privilege('service_role',proc,'EXECUTE')
    then raise exception 'scouting_2_rpc_service_role_missing: %',proc; end if;
    if coalesce((select array_to_string(proconfig,',') from pg_proc where oid=proc),'') not like '%search_path=%'
    then raise exception 'scouting_2_rpc_search_path_unpinned: %',proc; end if;
    fn:=upper(pg_get_functiondef(proc));
    if fn like '%SETTLEMENT_NOT_READY%' then raise exception 'scouting_2_rpc_placeholder_remaining: %',proc; end if;
  end loop;

  if not coalesce((select released from public.scouting_runtime_config_v1 where singleton),false)
  then raise exception 'scouting_2_runtime_not_released'; end if;

  select count(*) into achievement_count from public.achievement_catalog
   where enabled and achievement_id in (
    'exploration2_first_report','exploration2_asterfall_cartographer','exploration2_sunscar_cartographer',
    'exploration2_frostmarch_cartographer','exploration2_known_realm');
  if achievement_count<>5 then raise exception 'scouting_2_achievement_catalog_incomplete: %',achievement_count; end if;
end
$gate$;
select 'PASS: Exploration 2.0 persistence, settlement and release prerequisites are ready' as result;
