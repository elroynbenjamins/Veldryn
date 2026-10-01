begin;

-- VELDRYN Control reads and updates the player Event screen registry through
-- the private Cloudflare Pages Function using the Supabase service role.
-- Older live_events migrations only granted browser-facing RPC access, which
-- can leave direct PostgREST table access denied for the admin API.
grant select, insert, update on table public.live_events to service_role;

commit;
