begin;

-- Guild Quest objectives v3: rarity + exact action counters.
-- Rarity pacing targets: Common ~5m, Uncommon ~15m, Rare ~45m, Epic ~2h, Legendary ~4h.
-- Uses the game's established Common/Uncommon/Rare/Epic/Legendary color language in clients.

create table if not exists public.guild_quest_action_daily(
  guild_id uuid not null references public.guilds(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  action_key text not null,
  action_count integer not null default 0 check(action_count>=0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(guild_id,account_id,activity_date,action_key)
);
alter table public.guild_quest_action_daily enable row level security;
revoke all on public.guild_quest_action_daily from public,anon,authenticated;
grant select,insert,update,delete on public.guild_quest_action_daily to service_role;

create policy guild_quest_action_member_read_v1 on public.guild_quest_action_daily
for select to authenticated using(exists(
 select 1 from public.guild_members gm
 where gm.guild_id=guild_quest_action_daily.guild_id and gm.account_id=auth.uid()
));

-- Called only by authoritative gameplay settlement/services.
create or replace function public.guild_quest_record_action_v1(
 p_account_id uuid,p_action_key text,p_count integer,p_at timestamptz default clock_timestamp()
) returns void language plpgsql security definer set search_path=public,private as $$
declare gid uuid; day date:=(p_at at time zone 'UTC')::date; bound_gid uuid;
begin
 if p_count<=0 or p_action_key not in ('fishing','mining','woodcutting','herbalism','smithing','cooking','crafting','combat_kill','dungeon_clear') then return; end if;
 select gm.guild_id into gid from public.guild_members gm where gm.account_id=p_account_id limit 1;
 if gid is null then return; end if;
 insert into private.guild_muster_day_bindings(account_id,activity_date,guild_id) values(p_account_id,day,gid)
 on conflict(account_id,activity_date) do nothing;
 select b.guild_id into bound_gid from private.guild_muster_day_bindings b where b.account_id=p_account_id and b.activity_date=day;
 if bound_gid is distinct from gid then return; end if;
 insert into public.guild_quest_action_daily(guild_id,account_id,activity_date,action_key,action_count,updated_at)
 values(gid,p_account_id,day,p_action_key,p_count,p_at)
 on conflict(guild_id,account_id,activity_date,action_key) do update
 set action_count=public.guild_quest_action_daily.action_count+excluded.action_count,updated_at=greatest(public.guild_quest_action_daily.updated_at,excluded.updated_at);
end $$;
revoke all on function public.guild_quest_record_action_v1(uuid,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.guild_quest_record_action_v1(uuid,text,integer,timestamptz) to service_role;

create or replace function public.guild_quest_rarity_v3(p_guild_id uuid,p_week date,p_slot integer)
returns text language sql immutable set search_path=public as $$
 with r as(select abs(hashtextextended(p_guild_id::text||':'||p_week::text||':'||p_slot::text,31))%100 n)
 select case when n<38 then 'common' when n<66 then 'uncommon' when n<86 then 'rare' when n<96 then 'epic' else 'legendary' end from r
$$;

create or replace function public.guild_quest_rarity_minutes_v3(r text)
returns integer language sql immutable as $$ select case r when 'common' then 5 when 'uncommon' then 15 when 'rare' then 45 when 'epic' then 120 else 240 end $$;
create or replace function public.guild_quest_rarity_reward_v3(r text)
returns integer language sql immutable as $$ select case r when 'common' then 80 when 'uncommon' then 180 when 'rare' then 400 when 'epic' then 850 else 1500 end $$;
create or replace function public.guild_quest_rarity_actions_v3(r text)
returns integer language sql immutable as $$ select case r when 'common' then 10 when 'uncommon' then 30 when 'rare' then 90 when 'epic' then 240 else 480 end $$;

create or replace function public.guild_quest_special_pool_v3(p_guild_id uuid,p_week date)
returns table(quest_key text,title text,category text,description text,theme text,rarity text,estimated_minutes integer,objective_json jsonb,activity_reward integer,sort_order integer)
language sql immutable set search_path=public as $$
 with s as(
  select abs(hashtextextended(p_guild_id::text||':'||p_week::text,77)) n
 ), slots as(
  select x.slot,public.guild_quest_rarity_v3(p_guild_id,p_week,x.slot) rarity,(n/(x.slot*13+1))%6 pick
  from s cross join (values(1),(2),(3)) x(slot)
 )
 select
  'special_'||slot,
  case pick
   when 0 then 'Cast & Quarry' when 1 then 'River Run' when 2 then 'Deep Delve'
   when 3 then 'Forest & Field' when 4 then 'Workshop Shift' else 'Guild Circuit' end,
  case when pick in(4) then 'Crafting' else 'Skilling' end,
  case pick
   when 0 then 'Fish and mine to complete this combined Guild objective.'
   when 1 then 'Complete Fishing actions through normal verified skilling.'
   when 2 then 'Complete Mining actions through normal verified skilling.'
   when 3 then 'Split effort between Woodcutting and Herbalism.'
   when 4 then 'Complete Smithing and Cooking actions for the Guild workshops.'
   else 'Complete Fishing, Mining and Woodcutting actions across a varied Guild circuit.' end,
  case pick when 0 then 'Fishing + Mining' when 1 then 'Fishing' when 2 then 'Mining' when 3 then 'Woodcutting + Herbalism' when 4 then 'Smithing + Cooking' else 'Multi-skill' end,
  rarity,public.guild_quest_rarity_minutes_v3(rarity),
  case pick
   when 0 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','fishing','target',public.guild_quest_rarity_actions_v3(rarity)),jsonb_build_object('key','mining','target',public.guild_quest_rarity_actions_v3(rarity))))
   when 1 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','fishing','target',public.guild_quest_rarity_actions_v3(rarity))))
   when 2 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','mining','target',public.guild_quest_rarity_actions_v3(rarity))))
   when 3 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','woodcutting','target',public.guild_quest_rarity_actions_v3(rarity)),jsonb_build_object('key','herbalism','target',public.guild_quest_rarity_actions_v3(rarity))))
   when 4 then jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','smithing','target',public.guild_quest_rarity_actions_v3(rarity)),jsonb_build_object('key','cooking','target',public.guild_quest_rarity_actions_v3(rarity))))
   else jsonb_build_object('mode','all','objectives',jsonb_build_array(jsonb_build_object('key','fishing','target',ceil(public.guild_quest_rarity_actions_v3(rarity)*.7)::int),jsonb_build_object('key','mining','target',ceil(public.guild_quest_rarity_actions_v3(rarity)*.7)::int),jsonb_build_object('key','woodcutting','target',ceil(public.guild_quest_rarity_actions_v3(rarity)*.7)::int))) end,
  public.guild_quest_rarity_reward_v3(rarity),3+slot
 from slots
$$;

create or replace function public.guild_quest_action_progress_v3(p_guild_id uuid,p_week date,p_objectives jsonb)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',o->>'key','target',(o->>'target')::int,'progress',least((o->>'target')::int,coalesce(x.total,0))) order by ord),'[]'::jsonb)
 from jsonb_array_elements(p_objectives->'objectives') with ordinality e(o,ord)
 left join lateral(
  select sum(a.action_count)::int total from public.guild_quest_action_daily a
  where a.guild_id=p_guild_id and a.activity_date between p_week and p_week+6 and a.action_key=o->>'key'
 ) x on true
$$;

commit;