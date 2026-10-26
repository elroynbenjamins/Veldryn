-- Restore narrowly scoped SELECT grants for the server-owned Guild Token Shop.
-- Earlier RLS hardening revoked table privileges from service_role although the
-- server shop's SECURITY INVOKER RPCs read these membership and reward tables.
-- Authenticated/anon players receive no new privileges. No write grants.
GRANT SELECT ON TABLE public.guild_members,public.guilds TO service_role;
GRANT SELECT ON TABLE public.event_community_claims TO service_role;
GRANT SELECT ON TABLE public.guild_project_member_progress,public.guild_project_instances TO service_role;
