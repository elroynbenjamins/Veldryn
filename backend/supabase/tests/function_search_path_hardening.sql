begin;

do $$
declare
  funcs regprocedure[] := array[
    'public.expedition_failure_fraction(boolean,numeric,boolean,numeric)'::regprocedure,
    'public.expedition_tier_marks_multiplier(smallint)'::regprocedure,
    'public.expedition_week_key(timestamp with time zone)'::regprocedure,
    'public.prevent_ops_remote_config_revision_mutation()'::regprocedure,
    'public.prevent_ops_admin_command_event_mutation()'::regprocedure,
    'public.prevent_liveops_definition_mutation()'::regprocedure,
    'public.prevent_liveops_instance_definition_mutation()'::regprocedure,
    'public.prevent_overlapping_party_event_windows()'::regprocedure,
    'public.prevent_guild_project_definition_mutation()'::regprocedure,
    'public.prevent_guild_project_instance_definition_mutation()'::regprocedure,
    'public.prevent_shared_world_instance_definition_mutation()'::regprocedure,
    'public.guild_open_halls_required_level_v54(integer)'::regprocedure,
    'public.arena_reward_tier_v1(integer)'::regprocedure,
    'public.ranking_skill_level_from_xp_v1(bigint)'::regprocedure
  ];
  f regprocedure;
  cfg text;
begin
  foreach f in array funcs loop
    select coalesce(array_to_string(proconfig,','),'') into cfg from pg_proc where oid=f;
    if cfg not like '%search_path=public, pg_temp%' then
      raise exception 'function % must pin search_path, got %',f,cfg;
    end if;
  end loop;
end $$;

set local search_path = pg_temp;
select public.expedition_tier_marks_multiplier(1::smallint) is not null;
select public.expedition_week_key(clock_timestamp()) is not null;
select public.guild_open_halls_required_level_v54(1) is not null;
select public.arena_reward_tier_v1(1000) is not null;
select public.ranking_skill_level_from_xp_v1(0) is not null;

rollback;
