begin;

-- Guild Quest variety v4
-- Adds combat, dungeon, crafting and cross-playstyle combinations while preserving
-- the v3 rarity duration budget. These objectives use the exact completed-action ledger.

create or replace function public.guild_quest_extended_pool_v4(p_guild_id uuid,p_week date)
returns table(quest_key text,title text,category text,description text,theme text,rarity text,estimated_minutes integer,objective_json jsonb,activity_reward integer,sort_order integer)
language sql immutable set search_path=public as $$
 with seed as(select abs(hashtextextended(p_guild_id::text||':'||p_week::text,141)) n),
 slots as(
   select x.slot,public.guild_quest_rarity_v3(p_guild_id,p_week,x.slot+10) rarity,(n/(x.slot*19+3))%7 pick
   from seed cross join (values(1),(2),(3)) x(slot)
 ), scale as(
   select *,public.guild_quest_rarity_actions_v3(rarity) actions from slots
 )
 select
  'extended_'||slot,
  case pick
   when 0 then 'Monster Sweep' when 1 then 'Dungeon Patrol' when 2 then 'Forge & Feast'
   when 3 then 'Hunter-Gatherers' when 4 then 'River & Road' when 5 then 'Delve & Defeat' else 'Guild Work Order' end,
  case when pick in(0,1) then 'Combat' when pick in(2,6) then 'Crafting' else 'Mixed' end,
  case pick
   when 0 then 'Defeat enemies through verified combat.'
   when 1 then 'Complete Guild-eligible dungeon runs.'
   when 2 then 'Split completed actions between Smithing and Cooking.'
   when 3 then 'Defeat enemies and complete Woodcutting actions.'
   when 4 then 'Fish while the Guild also defeats enemies.'
   when 5 then 'Mine resources and complete dungeon runs.'
   else 'Complete a varied order of crafting, Fishing and Mining.' end,
  case pick when 0 then 'Combat Kills' when 1 then 'Dungeons' when 2 then 'Smithing + Cooking' when 3 then 'Combat + Woodcutting' when 4 then 'Fishing + Combat' when 5 then 'Mining + Dungeons' else 'Craft + Gather' end,
  rarity,public.guild_quest_rarity_minutes_v3(rarity),
  case pick
   when 0 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','combat_kill','target',greatest(5,actions))))
   when 1 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','dungeon_clear','target',greatest(1,ceil(actions/40.0)::int))))
   when 2 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','smithing','target',greatest(2,ceil(actions*.5)::int)),jsonb_build_object('key','cooking','target',greatest(2,ceil(actions*.5)::int))))
   when 3 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','combat_kill','target',greatest(3,ceil(actions*.5)::int)),jsonb_build_object('key','woodcutting','target',greatest(3,ceil(actions*.5)::int))))
   when 4 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','fishing','target',greatest(3,ceil(actions*.5)::int)),jsonb_build_object('key','combat_kill','target',greatest(3,ceil(actions*.5)::int))))
   when 5 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','mining','target',greatest(3,ceil(actions*.75)::int)),jsonb_build_object('key','dungeon_clear','target',greatest(1,ceil(actions/80.0)::int))))
   else jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','crafting','target',greatest(2,ceil(actions/3.0)::int)),jsonb_build_object('key','fishing','target',greatest(2,ceil(actions/3.0)::int)),jsonb_build_object('key','mining','target',greatest(2,ceil(actions/3.0)::int)))) end,
  public.guild_quest_rarity_reward_v3(rarity),6+slot
 from scale
$$;

comment on function public.guild_quest_extended_pool_v4(uuid,date) is
 'Deterministic extended Guild Quest pool for combat, dungeons, crafting and mixed objective combinations.';
commit;