begin;

-- Guild Quest Activity reward balance v10.
-- User target: approximately double the number of same-rarity quests required
-- to rebuild the Guild Activity meter. Quest duration/action targets are unchanged.
create or replace function public.guild_quest_rarity_reward_v3(r text)
returns integer language sql immutable as $$
 select case r
   when 'common' then 45
   when 'uncommon' then 75
   when 'rare' then 120
   when 'epic' then 180
   else 270
 end
$$;

comment on function public.guild_quest_rarity_reward_v3(text) is
 'Guild Quest Activity units: 45/75/120/180/270. Approximately doubles quest count versus v8 while preserving 5m/15m/45m/2h/4h duration targets.';
commit;