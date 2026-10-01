-- Pin the lookup path for legacy public helpers flagged by the Supabase
-- security advisor.  Keep public available because these helpers reference
-- application objects in the public schema.
alter function public.veldryn_game_state_add_stackable_v1(jsonb, text, integer, bigint)
  set search_path = pg_catalog, public;

alter function public.guild_quest_rarity_minutes_v3(text)
  set search_path = pg_catalog, public;

alter function public.guild_quest_rarity_actions_v3(text)
  set search_path = pg_catalog, public;

alter function public.guild_quest_rarity_reward_v3(text)
  set search_path = pg_catalog, public;

alter function public.veldryn_hash_roll_v1(text)
  set search_path = pg_catalog, public;
