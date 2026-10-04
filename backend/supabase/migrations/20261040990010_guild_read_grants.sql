-- Restore the narrow table-read grants used by the mobile guild UI.
-- RLS remains authoritative; write paths continue through RPCs.

grant select on table public.guilds to anon, authenticated;
grant select on table public.guild_members to authenticated;
grant select on table public.guild_applications to authenticated;
