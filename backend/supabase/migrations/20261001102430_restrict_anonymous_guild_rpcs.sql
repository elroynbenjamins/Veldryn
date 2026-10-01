-- These helpers read or calculate guild/account state and are only useful to
-- signed-in players. Keep the authenticated RPC surface intact while removing
-- the implicit anonymous SECURITY DEFINER entry points.
revoke execute on function public.guild_activity_active_members_for_date_v2(uuid, date) from anon;
revoke execute on function public.guild_activity_day_units_v2(uuid, date) from anon;
revoke execute on function public.guild_activity_decay_bps_for_day_v2(uuid, date) from anon;
revoke execute on function public.guild_activity_from_project_completion_v2() from anon;
revoke execute on function public.guild_activity_target_units_for_date_v2(uuid, date) from anon;
revoke execute on function public.guild_quest_action_progress_v3(uuid, date, jsonb) from anon;
revoke execute on function public.guild_quest_completion_meta_v6(uuid, date, text) from anon;
revoke execute on function public.guild_quest_personal_objective_progress_v6(uuid, uuid, date, jsonb) from anon;
revoke execute on function public.guild_quest_progress_v1(uuid, date) from anon;
revoke execute on function public.guild_quest_targets_v1(uuid, date) from anon;
