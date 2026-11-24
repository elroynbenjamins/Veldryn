-- READ-ONLY 2.0 RELEASE CHECK. This is not a migration.
-- Run only after the real migration has been generated with the Supabase CLI,
-- reviewed, applied to staging, and all integration tests have passed.
do $gate$
declare
  rel text;
  proc regprocedure;
  achievement_count integer;
begin
  foreach rel in array array[
    'public.account_exploration_v1',
    'public.character_scouting_access_v1',
    'public.scouting_assignments_v1',
    'public.scouting_claims_v1',
    'public.achievement_catalog',
    'public.achievement_claims'
  ] loop
    if to_regclass(rel) is null then raise exception 'scouting_2_relation_missing: %',rel; end if;
  end loop;

  foreach rel in array array[
    'account_exploration_v1','character_scouting_access_v1','scouting_assignments_v1','scouting_claims_v1'
  ] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=rel and c.relrowsecurity)
    then raise exception 'scouting_2_rls_missing: %',rel; end if;
    if has_table_privilege('anon',format('public.%I',rel),'SELECT,INSERT,UPDATE,DELETE')
       or has_table_privilege('authenticated',format('public.%I',rel),'SELECT,INSERT,UPDATE,DELETE')
    then raise exception 'scouting_2_direct_table_access_exposed: %',rel; end if;
  end loop;

  foreach proc in array array[
    to_regprocedure('public.scouting_snapshot_server_v1(uuid,uuid)'),
    to_regprocedure('public.scouting_dispatch_server_v1(uuid,uuid,jsonb,text,timestamp with time zone)'),
    to_regprocedure('public.scouting_claim_server_v1(uuid,uuid,text,text,timestamp with time zone)'),
    to_regprocedure('public.scouting_migrate_account_server_v1(uuid,timestamp with time zone)')
  ] loop
    if proc is null then raise exception 'scouting_2_rpc_missing'; end if;
    if has_function_privilege('anon',proc,'EXECUTE') or has_function_privilege('authenticated',proc,'EXECUTE')
    then raise exception 'scouting_2_rpc_client_exposed: %',proc; end if;
    if not has_function_privilege('service_role',proc,'EXECUTE')
    then raise exception 'scouting_2_rpc_service_role_missing: %',proc; end if;
    if coalesce((select array_to_string(proconfig,',') from pg_proc where oid=proc),'') not like '%search_path=%'
    then raise exception 'scouting_2_rpc_search_path_unpinned: %',proc; end if;
  end loop;

  execute $q$
    select count(*) from public.achievement_catalog
    where achievement_id in (
      'exploration2_first_report','exploration2_asterfall_cartographer','exploration2_sunscar_cartographer',
      'exploration2_frostmarch_cartographer','exploration2_known_realm'
    )
  $q$ into achievement_count;
  if achievement_count<>5 then raise exception 'scouting_2_achievement_catalog_incomplete: %',achievement_count; end if;
end
$gate$;
select 'PASS: Exploration 2.0 persisted release prerequisites are present and client mutation is closed' as result;
