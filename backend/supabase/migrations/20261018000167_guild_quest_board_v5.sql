begin;

-- Guild Quest board v5
-- Five stable weekly slots. No manual rerolls: the board changes at the UTC weekly reset.
-- Composition goals:
-- 1) one accessible Combat foundation;
-- 2) one accessible Skilling foundation;
-- 3) one specialized profession/combo quest;
-- 4) one broader mixed/combat/crafting quest;
-- 5) one featured harder quest.
-- This keeps the mobile board readable and guarantees useful playstyle coverage.

create or replace function public.guild_quest_board_v5(p_guild_id uuid,p_week date)
returns table(source_key text,board_slot integer,featured boolean)
language sql immutable set search_path=public as $$
 with seed as(select abs(hashtextextended(p_guild_id::text||':'||p_week::text,211)) n)
 select * from (
   values
    ('combat_front'::text,1,false),
    ('skilling_drive'::text,2,false),
    ('special_'||(((select n from seed)%3)+1)::text,3,false),
    ('extended_'||((((select n from seed)/7)%3)+1)::text,4,false),
    (case when ((select n from seed)/31)%2=0
       then 'special_'||((((select n from seed)/47)%3)+1)::text
       else 'extended_'||((((select n from seed)/47)%3)+1)::text end,5,true)
 ) b(source_key,board_slot,featured)
$$;

-- Board rarity is intentionally composed rather than pure RNG.
-- Slots 1/2 are quick participation; 3/4 are mid-tier; slot 5 is the weekly feature.
create or replace function public.guild_quest_board_rarity_v5(p_guild_id uuid,p_week date,p_slot integer)
returns text language sql immutable set search_path=public as $$
 with seed as(select abs(hashtextextended(p_guild_id::text||':'||p_week::text||':'||p_slot::text,223))%100 n)
 select case
   when p_slot=1 then case when n<65 then 'common' else 'uncommon' end
   when p_slot=2 then case when n<35 then 'common' else 'uncommon' end
   when p_slot in(3,4) then case when n<30 then 'uncommon' when n<85 then 'rare' else 'epic' end
   else case when n<55 then 'epic' else 'legendary' end
 end from seed
$$;

comment on function public.guild_quest_board_v5(uuid,date) is
 'Stable five-slot weekly Guild Quest board. No rerolls; guarantees Combat and Skilling access plus one featured harder quest.';
comment on function public.guild_quest_board_rarity_v5(uuid,date,integer) is
 'Composed rarity mix: quick Common/Uncommon, mid Uncommon/Rare/Epic, featured Epic/Legendary.';
commit;