begin;

-- Guild Quest rotation v2
-- Stable weekly presentation variety without changing the underlying verified
-- combat/skilling accounting. Each week always retains one Combat, one Skilling
-- and one Mixed objective, so no playstyle can be randomly excluded.

create or replace function public.guild_quest_rotation_v2(p_guild_id uuid,p_week date)
returns table(
  quest_key text,title text,category text,description text,theme text,sort_order integer
)
language sql immutable set search_path=public as $$
  with seed as (
    select abs(hashtextextended(p_guild_id::text||':'||p_week::text,0))::bigint n
  ),
  picks as (
    select
      (n % 4)::integer combat_pick,
      ((n / 7) % 4)::integer skill_pick,
      ((n / 31) % 4)::integer mixed_pick
    from seed
  )
  select * from (
    select 'combat_front'::text,
      (array['Hold the Front','Hunt Together','Clear the Roads','Guild Vanguard'])[combat_pick+1],
      'Combat'::text,
      (array[
        'Win progress through verified combat play. Daily personal credit is capped so the Guild succeeds together.',
        'Defeat enemies through normal verified combat. Every active fighter can add useful weekly progress.',
        'Keep dangerous routes clear through verified combat activity; no specific monster grind is required.',
        'Push the Guild combat objective together. Progress comes from normal server-verified fighting.'
      ])[combat_pick+1],
      (array['Vanguard','Hunt','Patrol','Assault'])[combat_pick+1],1
    from picks
    union all
    select 'skilling_drive',
      (array['Supply the Guild','Hands at Work','Guild Workshop','Resource Drive'])[skill_pick+1],
      'Skilling',
      (array[
        'Gather, process and craft through normal play. Verified skilling progress advances this objective.',
        'Put professions to work. Verified gathering, processing and crafting all help the Guild.',
        'Keep the Guild workshops supplied through ordinary skilling activity across professions.',
        'Build a shared stock of effort through verified non-combat skilling; no item donation is required.'
      ])[skill_pick+1],
      (array['Supply','Professions','Workshop','Gathering'])[skill_pick+1],2
    from picks
    union all
    select 'united_effort',
      (array['United Effort','Many Paths, One Guild','All Hands','Guild Momentum'])[mixed_pick+1],
      'Mixed',
      (array[
        'Any meaningful combat or skilling contribution counts, with a higher personal daily cap and a larger Activity reward.',
        'Combatants and skillers contribute to the same shared target. Choose the playstyle that suits you.',
        'Every verified activity lane can help. Broad participation matters more than forcing one optimal task.',
        'Build momentum together through combat or skilling while individual daily credit remains capped.'
      ])[mixed_pick+1],
      (array['Unity','Open Choice','Participation','Momentum'])[mixed_pick+1],3
    from picks
  ) q
$$;

create or replace function public.guild_quest_state_v1()
returns table(
  guild_id uuid,week_key date,week_ends_at timestamptz,active_members integer,
  quest_key text,title text,category text,description text,theme text,
  progress integer,target integer,activity_reward integer,completed boolean,
  contributor_count integer
)
language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid(); gid uuid; wk date:=public.guild_quest_week_key_v1(); t record; p record;
begin
  if uid is null then return; end if;
  select gm.guild_id into gid from public.guild_members gm where gm.account_id=uid limit 1;
  if gid is null then return; end if;
  perform public.guild_quest_settle_v1(gid,wk);
  select * into t from public.guild_quest_targets_v1(gid,wk);
  select * into p from public.guild_quest_progress_v1(gid,wk);

  return query
  select gid,wk,(wk+7)::timestamp at time zone 'UTC',t.active_members,
         r.quest_key,r.title,r.category,r.description,r.theme,
         case r.quest_key when 'combat_front' then p.combat_points when 'skilling_drive' then p.skilling_points else p.united_points end,
         case r.quest_key when 'combat_front' then t.combat_target when 'skilling_drive' then t.skilling_target else t.united_target end,
         case r.quest_key when 'united_effort' then 700 else 500 end,
         exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=r.quest_key),
         p.contributors
  from public.guild_quest_rotation_v2(gid,wk) r
  order by r.sort_order;
end $$;

revoke all on function public.guild_quest_state_v1() from public,anon;
grant execute on function public.guild_quest_state_v1() to authenticated,service_role;

comment on function public.guild_quest_rotation_v2(uuid,date) is
  'Deterministic weekly Guild Quest presentation rotation; guarantees Combat, Skilling and Mixed accessibility every week.';

commit;
