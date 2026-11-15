-- Fix Dungeon Shop RPC authorization for the trusted co-op Edge service.
--
-- The snapshot/purchase RPCs intentionally use SECURITY INVOKER. Prior grants
-- on shop-owned tables omitted their existing expedition and co-op dependencies,
-- causing HTTP 403 from PostgREST and a 503 shop failure in the client.
-- These grants are restricted to service_role; anon/authenticated remain blocked.
--
-- The shop release switch and catalogue release statuses are unchanged.
grant select, insert, update on table public.expedition_wallets to service_role;
grant select, insert on table public.expedition_shop_purchases to service_role;
grant insert on table public.expedition_currency_ledger to service_role;
grant select on table public.coop_reward_entitlements to service_role;
grant select on table public.expedition_runs to service_role;
