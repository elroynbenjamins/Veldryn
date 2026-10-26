-- Guild Hall V44: read-only member projections for the mobile Guild Hall.
-- Previously the RLS member policies existed but authenticated lacked SELECT,
-- causing PostgREST 403 / 42501 for both Hall and trophies.
-- Keep the existing membership-scoped SELECT policies in place; no write grants.

grant select on table public.guild_halls to authenticated;
grant select on table public.guild_hall_trophies to authenticated;
