-- Pin function search paths to prevent session-controlled object resolution.
alter function public.expedition_failure_fraction(boolean,numeric,boolean,numeric) set search_path = public, pg_temp;
alter function public.expedition_tier_marks_multiplier(smallint) set search_path = public, pg_temp;
alter function public.expedition_week_key(timestamp with time zone) set search_path = public, pg_temp;
alter function public.prevent_ops_remote_config_revision_mutation() set search_path = public, pg_temp;
alter function public.prevent_ops_admin_command_event_mutation() set search_path = public, pg_temp;
alter function public.prevent_liveops_definition_mutation() set search_path = public, pg_temp;
alter function public.prevent_liveops_instance_definition_mutation() set search_path = public, pg_temp;
alter function public.prevent_overlapping_party_event_windows() set search_path = public, pg_temp;
alter function public.prevent_guild_project_definition_mutation() set search_path = public, pg_temp;
alter function public.prevent_guild_project_instance_definition_mutation() set search_path = public, pg_temp;
alter function public.prevent_shared_world_instance_definition_mutation() set search_path = public, pg_temp;
alter function public.guild_open_halls_required_level_v54(integer) set search_path = public, pg_temp;
alter function public.arena_reward_tier_v1(integer) set search_path = public, pg_temp;
alter function public.ranking_skill_level_from_xp_v1(bigint) set search_path = public, pg_temp;
