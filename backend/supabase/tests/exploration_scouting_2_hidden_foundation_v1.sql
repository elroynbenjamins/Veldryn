begin;
do $qa$
declare rel text; proc regprocedure; blocked boolean:=false;
begin
 foreach rel in array array['scouting_runtime_config_v1','account_exploration_v1','character_scouting_access_v1','scouting_assignments_v1','scouting_claims_v1','achievement_catalog','achievement_claims','achievement_showcase'] loop
  if to_regclass('public.'||rel) is null then raise exception 'missing relation %',rel;end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=rel and c.relrowsecurity) then raise exception 'RLS missing %',rel;end if;
 end loop;
 if (select released from public.scouting_runtime_config_v1 where singleton) then raise exception 'hidden foundation must remain unreleased';end if;
 if public.scouting_skill_level_from_xp_v1(0)<>1 or public.scouting_skill_level_from_xp_v1(16308)<>10 or public.scouting_skill_level_from_xp_v1(4344061)<>100 then raise exception 'skill curve drift';end if;
 if (select count(*) from public.achievement_catalog where achievement_id like 'exploration2_%')<>5 then raise exception 'achievement catalog drift';end if;
 foreach proc in array array[
   'public.scouting_snapshot_server_v1(uuid,uuid)'::regprocedure,
   'public.scouting_dispatch_server_v1(uuid,uuid,jsonb,text,timestamp with time zone)'::regprocedure,
   'public.scouting_claim_server_v1(uuid,uuid,text,text,timestamp with time zone)'::regprocedure,
   'public.scouting_migrate_account_server_v1(uuid,timestamp with time zone)'::regprocedure
 ] loop
  if has_function_privilege('anon',proc,'EXECUTE') or has_function_privilege('authenticated',proc,'EXECUTE') or not has_function_privilege('service_role',proc,'EXECUTE') then raise exception 'RPC privilege drift %',proc;end if;
 end loop;
 begin perform public.scouting_dispatch_server_v1(null,null,'{}'::jsonb,'qa_request',clock_timestamp());exception when others then blocked:=sqlerrm='SCOUTING_2_NOT_RELEASED';end;
 if not blocked then raise exception 'dispatch must fail closed';end if;
end $qa$;
select 'PASS: hidden Exploration 2.0 persistence stays server-only and unreleased' result;
rollback;
