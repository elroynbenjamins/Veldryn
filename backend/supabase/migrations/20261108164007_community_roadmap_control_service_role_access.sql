-- Control panel's server-only service role can manage the private roadmap records.
-- The player-facing RPCs are the only access path for anon/authenticated clients.
-- Table RLS stays enabled; no direct table grants for client roles.
grant select, update on table public.community_roadmap_features to service_role;
grant select on table public.community_roadmap_votes to service_role;
