begin;

-- Guild Quests v1
-- Weekly, asynchronous objectives that turn verified Guild Muster play into the
-- primary intentional source of Guild Activity. No new currency is introduced.

create table if not exists public.guild_quest_completions (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  week_key date not null,
  quest_key text not null check (quest_key in ('combat_front','skilling_drive','united_effort')),
  completed_at timestamptz not null default clock_timestamp(),
  activity_units integer not null check (activity_units > 0),
  primary key (guild_id,week_key,quest_key)
);

alter table public.guild_quest_completions enable row level security;
revoke all on public.guild_quest_completions from public,anon,authenticated;
grant select,insert,update,delete on public.guild_quest_completions to service_role;

create or replace function public.guild_quest_week_key_v1(p_at timestamptz default clock_timestamp())
returns date language sql immutable set search_path=public as $$
  select date_trunc('week',p_at at time zone 'UTC')::date
$$;

create or replace function public.guild_quest_targets_v1(p_guild_id uuid,p_week date)
returns table(active_members integer,combat_target integer,skilling_target integer,united_target integer)
language sql stable security definer set search_path=public as $$
  with m as (
    select greatest(1,public.guild_activity_active_members_for_date_v2(p_guild_id,p_week+6))::integer n
  )
  select n,greatest(600,n*180),greatest(600,n*180),greatest(900,n*260) from m
$$;

create or replace function public.guild_quest_progress_v1(p_guild_id uuid,p_week date)
returns table(combat_points integer,skilling_points integer,united_points integer,contributors integer)
language sql stable security definer set search_path=public as $$
  select
    coalesce(sum(least(120,greatest(0,d.combat_points))),0)::integer,
    coalesce(sum(least(120,greatest(0,d.skilling_points))),0)::integer,
    coalesce(sum(least(180,greatest(0,d.combat_points+d.skilling_points))),0)::integer,
    count(distinct d.account_id) filter(where d.contribution_points>=25)::integer
  from public.guild_muster_daily d
  where d.guild_id=p_guild_id and d.activity_date between p_week and p_week+6
$$;

create or replace function public.guild_quest_settle_v1(p_guild_id uuid,p_week date)
returns void language plpgsql security definer set search_path=public as $$
declare
  t record; p record; q text; reward integer;
begin
  select * into t from public.guild_quest_targets_v1(p_guild_id,p_week);
  select * into p from public.guild_quest_progress_v1(p_guild_id,p_week);
  for q,reward in select * from (values
    ('combat_front'::text,case when p.combat_points>=t.combat_target then 500 else 0 end),
    ('skilling_drive'::text,case when p.skilling_points>=t.skilling_target then 500 else 0 end),
    ('united_effort'::text,case when p.united_points>=t.united_target then 700 else 0 end)
  ) x loop
    if reward>0 then
      insert into public.guild_quest_completions(guild_id,week_key,quest_key,activity_units)
      values(p_guild_id,p_week,q,reward)
      on conflict do nothing;
      if found then
        perform * from public.guild_activity_award_v1(
          p_guild_id,'guild_quest',p_week::text||':'||q,reward,clock_timestamp()
        );
      end if;
    end if;
  end loop;
end $$;

create or replace function public.guild_quest_state_v1()
returns table(
  guild_id uuid,week_key date,week_ends_at timestamptz,active_members integer,
  quest_key text,title text,category text,description text,
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
         v.quest_key,v.title,v.category,v.description,v.progress,v.target,v.reward,
         exists(select 1 from public.guild_quest_completions c where c.guild_id=gid and c.week_key=wk and c.quest_key=v.quest_key),
         p.contributors
  from (values
    ('combat_front'::text,'Hold the Front'::text,'Combat'::text,'Win progress through verified combat play. Daily personal credit is capped so the Guild succeeds together.'::text,p.combat_points,t.combat_target,500),
    ('skilling_drive','Supply the Guild','Skilling','Gather, process and craft through normal play. Verified skilling progress advances this objective. ',p.skilling_points,t.skilling_target,500),
    ('united_effort','United Effort','Mixed','Any meaningful combat or skilling contribution counts, with a higher personal daily cap and a larger Activity reward.',p.united_points,t.united_target,700)
  ) v(quest_key,title,category,description,progress,target,reward);
end $$;

revoke all on function public.guild_quest_state_v1() from public,anon;
grant execute on function public.guild_quest_state_v1() to authenticated,service_role;
revoke all on function public.guild_quest_settle_v1(uuid,date) from public,anon,authenticated;
grant execute on function public.guild_quest_settle_v1(uuid,date) to service_role;

comment on function public.guild_quest_state_v1() is
  'Weekly Guild Quest board. Progress comes from verified Muster combat/skilling activity; completion grants idempotent Guild Activity units and no separate currency.';

commit;
