begin;

-- Avoid duplicate objective families on the same weekly board.
-- Slot 5 is selected from candidates excluding slots 3 and 4.
create or replace function public.guild_quest_board_v5(p_guild_id uuid,p_week date)
returns table(source_key text,board_slot integer,featured boolean)
language sql immutable set search_path=public as $$
 with seed as(select abs(hashtextextended(p_guild_id::text||':'||p_week::text,211)) n),
 picks as(
   select
    'special_'||((n%3)+1)::text s3,
    'extended_'||(((n/7)%3)+1)::text s4,
    n from seed
 ), candidates as(
   select key,row_number() over(order by abs(hashtextextended(key||':'||p_guild_id::text||':'||p_week::text,229))) rn
   from picks cross join lateral(values('special_1'),('special_2'),('special_3'),('extended_1'),('extended_2'),('extended_3')) v(key)
   where key<>s3 and key<>s4
 )
 select * from (
   select 'combat_front'::text,1,false
   union all select 'skilling_drive',2,false
   union all select s3,3,false from picks
   union all select s4,4,false from picks
   union all select key,5,true from candidates where rn=1
 ) b(source_key,board_slot,featured)
$$;

comment on function public.guild_quest_board_v5(uuid,date) is
 'Stable five-slot weekly board with unique source families: Combat, Skilling, two varied objectives and one non-duplicate featured objective.';
commit;