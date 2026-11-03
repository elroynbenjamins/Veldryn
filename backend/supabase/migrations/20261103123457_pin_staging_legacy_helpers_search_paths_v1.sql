-- Align staging's five legacy helper functions to the already-verified
-- production function search paths. No privileges, function bodies or RLS change.
-- This migration was applied and verified first on VELDRYN staging under
-- 20261103123457. Re-running on production is idempotent.
alter function public.guild_quest_rarity_actions_v3(text) set search_path = pg_catalog, public;
alter function public.guild_quest_rarity_minutes_v3(text) set search_path = pg_catalog, public;
alter function public.veldryn_game_state_add_stackable_v1(jsonb,text,integer,bigint) set search_path = pg_catalog, public;
alter function public.veldryn_hash_roll_v1(text) set search_path = pg_catalog, public;
alter function public.guild_shop_claim_immutable_guard_v1() set search_path = '';