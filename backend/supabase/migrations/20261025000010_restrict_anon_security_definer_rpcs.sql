-- Restrict SECURITY DEFINER helper functions that inherited default PUBLIC EXECUTE.
-- Only explicit client-facing read/RLS helpers retain authenticated execution.
-- Trigger/guard helpers remain callable by trusted postgres/service-role paths only.

revoke execute on function public.active_live_events() from public, anon, authenticated;
revoke execute on function public.visible_live_events() from public, anon, authenticated;
revoke execute on function public.is_active_party_member_v16(uuid,uuid) from public, anon, authenticated;

revoke execute on function public.enforce_guild_member_cap_v54() from public, anon, authenticated;
revoke execute on function public.enforce_persistent_party_size_v16() from public, anon, authenticated;
revoke execute on function public.guild_launch_caps_guard_v54() from public, anon, authenticated;
revoke execute on function public.guild_open_halls_guard_v54() from public, anon, authenticated;
revoke execute on function public.guild_open_halls_sync_v54() from public, anon, authenticated;
revoke execute on function public.squad_assert_three_members(uuid) from public, anon, authenticated;

grant execute on function public.active_live_events() to authenticated, service_role;
grant execute on function public.visible_live_events() to authenticated, service_role;
grant execute on function public.is_active_party_member_v16(uuid,uuid) to authenticated, service_role;

grant execute on function public.enforce_guild_member_cap_v54() to service_role;
grant execute on function public.enforce_persistent_party_size_v16() to service_role;
grant execute on function public.guild_launch_caps_guard_v54() to service_role;
grant execute on function public.guild_open_halls_guard_v54() to service_role;
grant execute on function public.guild_open_halls_sync_v54() to service_role;
grant execute on function public.squad_assert_three_members(uuid) to service_role;

-- This SECURITY DEFINER assertion was the only function in this set with a mutable search_path.
alter function public.squad_assert_three_members(uuid) set search_path = public, pg_temp;
