begin;

-- Guild Muster v1
-- A forgiving Guild participation loop built entirely on server-owned activity and verified gameplay.
-- Daily attendance gives a tiny automatic contribution; normal verified Combat/Skilling fills a capped daily bar.
-- Four meaningful days per week earn personal cadence. Shared Rally tiers boost Hall Progress from completed Projects.
-- No new currency and no client-controlled contribution writer.

create table if not exists public.guild_muster_daily(
  guild_id uuid not null references public.guilds(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  contribution_points integer not null default 0 check(contribution_points between 0 and 100),
  check_in_points integer not null default 0 check(check_in_points between 0 and 5),
  combat_points integer not null default 0 check(combat_points between 0 and 100),
  skilling_points integer not null default 0 check(skilling_points between 0 and 100),
  first_contribution_at timestamptz,
  last_contribution_at timestamptz,
  primary key(guild_id,account_id,activity_date)
);
create index if not exists idx_guild_muster_daily_week on public.guild_muster_daily(guild_id,activity_date,contribution_points);
create index if not exists idx_guild_muster_daily_member on public.guild_muster_daily(account_id,activity_date desc);

create table if not exists private.guild_muster_day_bindings(
  account_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  bound_at timestamptz not null default clock_timestamp(),
  primary key(account_id,activity_date)
);
revoke all on table private.guild_muster_day_bindings from public,anon,authenticated;
grant select,insert,update,delete on table private.guild_muster_day_bindings to service_role;

alter table public.guild_muster_daily enable row level security;
revoke all on table public.guild_muster_daily from public,anon,authenticated;
grant select on table public.guild_muster_daily to authenticated;
grant select,insert,update,delete on table public.guild_muster_daily to service_role;

drop policy if exists guild_muster_member_read_v1 on public.guild_muster_daily;
create policy guild_muster_member_read_v1
on public.guild_muster_daily
for select
to authenticated
using(
  exists(
    select 1
    from public.guild_members gm
    where gm.guild_id=guild_muster_daily.guild_id
      and gm.account_id=auth.uid()
  )
);

create or replace function public.guild_muster_check_in_from_activity_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_gid uuid;
  v_before integer:=0;
  v_bound_gid uuid;
  v_existing_check_in integer:=0;
  v_awarded integer:=0;
  v_now timestamptz:=clock_timestamp();
begin
  select gm.guild_id into v_gid
  from public.guild_members gm
  where gm.account_id=new.account_id
  limit 1;

  if v_gid is null then return new; end if;

  insert into private.guild_muster_day_bindings(account_id,activity_date,guild_id)
  values(new.account_id,new.activity_date,v_gid)
  on conflict(account_id,activity_date) do nothing;
  select b.guild_id into v_bound_gid
  from private.guild_muster_day_bindings b
  where b.account_id=new.account_id and b.activity_date=new.activity_date;
  if v_bound_gid is distinct from v_gid then return new; end if;

  select d.contribution_points,d.check_in_points
  into v_before,v_existing_check_in
  from public.guild_muster_daily d
  where d.guild_id=v_gid and d.account_id=new.account_id and d.activity_date=new.activity_date
  for update;

  v_before:=coalesce(v_before,0);
  v_existing_check_in:=coalesce(v_existing_check_in,0);
  v_awarded:=least(greatest(0,5-v_existing_check_in),greatest(0,100-v_before));
  if v_awarded<=0 then return new; end if;

  insert into public.guild_muster_daily(
    guild_id,account_id,activity_date,contribution_points,check_in_points,combat_points,skilling_points,
    first_contribution_at,last_contribution_at
  )
  values(v_gid,new.account_id,new.activity_date,v_awarded,v_awarded,0,0,v_now,v_now)
  on conflict(guild_id,account_id,activity_date) do update set
    contribution_points=least(100,public.guild_muster_daily.contribution_points+v_awarded),
    check_in_points=least(5,public.guild_muster_daily.check_in_points+v_awarded),
    first_contribution_at=coalesce(public.guild_muster_daily.first_contribution_at,excluded.first_contribution_at),
    last_contribution_at=excluded.last_contribution_at;

  update public.guild_members
  set contribution_xp=contribution_xp+v_awarded
  where guild_id=v_gid and account_id=new.account_id;

  return new;
end $$;

drop trigger if exists trg_guild_muster_activity_check_in_v1 on public.player_activity_daily;
create trigger trg_guild_muster_activity_check_in_v1
after insert on public.player_activity_daily
for each row execute function public.guild_muster_check_in_from_activity_v1();

revoke all on function public.guild_muster_check_in_from_activity_v1() from public,anon,authenticated;
grant execute on function public.guild_muster_check_in_from_activity_v1() to service_role;

create or replace function public.guild_muster_from_verified_pve_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_day date:=(new.created_at at time zone 'UTC')::date;
  v_before integer:=0;
  v_bound_gid uuid;
  v_delta integer:=0;
  v_awarded integer:=0;
begin
  insert into private.guild_muster_day_bindings(account_id,activity_date,guild_id)
  values(new.account_id,v_day,new.guild_id)
  on conflict(account_id,activity_date) do nothing;
  select b.guild_id into v_bound_gid
  from private.guild_muster_day_bindings b
  where b.account_id=new.account_id and b.activity_date=v_day;
  if v_bound_gid is distinct from new.guild_id then return new; end if;

  -- guild_pve_receipts are written by authoritative gameplay after the legacy client writer is revoked.
  -- Use diminishing returns so long idle settlements help without dominating the daily social loop.
  if new.kind='boss' then
    v_delta:=least(35,greatest(1,ceil(sqrt(greatest(new.amount,1)::numeric/1000)*8)::integer));
  else
    v_delta:=least(35,greatest(1,ceil(sqrt(greatest(new.amount,1)::numeric)*8)::integer));
  end if;

  select d.contribution_points into v_before
  from public.guild_muster_daily d
  where d.guild_id=new.guild_id and d.account_id=new.account_id and d.activity_date=v_day
  for update;
  v_before:=coalesce(v_before,0);
  v_awarded:=least(v_delta,greatest(0,100-v_before));
  if v_awarded<=0 then return new; end if;

  insert into public.guild_muster_daily(
    guild_id,account_id,activity_date,contribution_points,check_in_points,combat_points,skilling_points,
    first_contribution_at,last_contribution_at
  )
  values(
    new.guild_id,new.account_id,v_day,v_awarded,0,
    case when new.kind='boss' then v_awarded else 0 end,
    case when new.kind='project' then v_awarded else 0 end,
    new.created_at,new.created_at
  )
  on conflict(guild_id,account_id,activity_date) do update set
    contribution_points=least(100,public.guild_muster_daily.contribution_points+v_awarded),
    combat_points=least(100,public.guild_muster_daily.combat_points+case when new.kind='boss' then v_awarded else 0 end),
    skilling_points=least(100,public.guild_muster_daily.skilling_points+case when new.kind='project' then v_awarded else 0 end),
    first_contribution_at=coalesce(public.guild_muster_daily.first_contribution_at,excluded.first_contribution_at),
    last_contribution_at=greatest(coalesce(public.guild_muster_daily.last_contribution_at,excluded.last_contribution_at),excluded.last_contribution_at);

  update public.guild_members
  set contribution_xp=contribution_xp+v_awarded
  where guild_id=new.guild_id and account_id=new.account_id;

  return new;
end $$;

drop trigger if exists trg_guild_muster_verified_pve_v1 on public.guild_pve_receipts;
create trigger trg_guild_muster_verified_pve_v1
after insert on public.guild_pve_receipts
for each row execute function public.guild_muster_from_verified_pve_v1();

revoke all on function public.guild_muster_from_verified_pve_v1() from public,anon,authenticated;
grant execute on function public.guild_muster_from_verified_pve_v1() to service_role;

create or replace function public.guild_muster_rally_tier_for_week_v1(p_guild_id uuid,p_week_key date)
returns integer
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_members integer:=0;
  v_target integer:=4;
  v_marks integer:=0;
begin
  select count(*)::integer into v_members
  from public.guild_members gm
  where gm.guild_id=p_guild_id;

  v_target:=greatest(4,ceil(greatest(v_members,1)*0.60)::integer*4);

  select count(*)::integer into v_marks
  from public.guild_muster_daily d
  join public.guild_members gm on gm.guild_id=d.guild_id and gm.account_id=d.account_id
  where d.guild_id=p_guild_id
    and d.activity_date>=p_week_key
    and d.activity_date<p_week_key+7
    and d.contribution_points>=25;

  if v_marks>=v_target then return 3; end if;
  if v_marks>=ceil(v_target*0.70)::integer then return 2; end if;
  if v_marks>=ceil(v_target*0.35)::integer then return 1; end if;
  return 0;
end $$;

revoke all on function public.guild_muster_rally_tier_for_week_v1(uuid,date) from public,anon,authenticated;
grant execute on function public.guild_muster_rally_tier_for_week_v1(uuid,date) to service_role;

create or replace function public.guild_muster_state_v1()
returns table(
  guild_id uuid,
  activity_date date,
  week_key date,
  week_ends_at timestamptz,
  checked_in boolean,
  daily_points integer,
  check_in_points integer,
  combat_points integer,
  skilling_points integer,
  daily_cap integer,
  rally_mark_threshold integer,
  rally_mark_earned boolean,
  personal_qualifying_days integer,
  personal_weekly_goal integer,
  personal_weekly_points bigint,
  member_count integer,
  checked_in_members_today integer,
  qualified_members_today integer,
  rally_marks integer,
  rally_target integer,
  rally_tier integer,
  hall_bonus_bps integer,
  guild_weekly_points bigint
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_today date:=(clock_timestamp() at time zone 'UTC')::date;
  v_week date:=date_trunc('week',clock_timestamp() at time zone 'UTC')::date;
  v_daily_cap integer:=100;
  v_threshold integer:=25;
  v_personal_goal integer:=4;
  v_active_share numeric:=0.60;
  v_checked_in boolean:=false;
  v_daily integer:=0;
  v_check_in integer:=0;
  v_combat integer:=0;
  v_skilling integer:=0;
  v_personal_days integer:=0;
  v_personal_points bigint:=0;
  v_members integer:=0;
  v_checked_today integer:=0;
  v_qualified_today integer:=0;
  v_marks integer:=0;
  v_target integer:=4;
  v_tier integer:=0;
  v_bonus_bps integer:=0;
  v_guild_points bigint:=0;
begin
  if v_uid is null then return; end if;
  select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid limit 1;
  if v_gid is null then return; end if;

  select exists(
    select 1 from public.player_activity_daily a
    where a.account_id=v_uid and a.activity_date=v_today
  ) into v_checked_in;

  select
    coalesce(d.contribution_points,0),
    coalesce(d.check_in_points,0),
    coalesce(d.combat_points,0),
    coalesce(d.skilling_points,0)
  into v_daily,v_check_in,v_combat,v_skilling
  from (select 1) seed
  left join public.guild_muster_daily d
    on d.guild_id=v_gid and d.account_id=v_uid and d.activity_date=v_today;

  select
    count(*) filter(where d.contribution_points>=v_threshold)::integer,
    coalesce(sum(d.contribution_points),0)::bigint
  into v_personal_days,v_personal_points
  from public.guild_muster_daily d
  where d.guild_id=v_gid and d.account_id=v_uid
    and d.activity_date>=v_week and d.activity_date<v_week+7;

  select count(*)::integer into v_members from public.guild_members gm where gm.guild_id=v_gid;
  v_target:=greatest(4,ceil(greatest(v_members,1)*v_active_share)::integer*v_personal_goal);

  select count(distinct a.account_id)::integer into v_checked_today
  from public.player_activity_daily a
  join public.guild_members gm on gm.account_id=a.account_id and gm.guild_id=v_gid
  where a.activity_date=v_today;

  select count(*)::integer into v_qualified_today
  from public.guild_muster_daily d
  join public.guild_members gm on gm.guild_id=d.guild_id and gm.account_id=d.account_id
  where d.guild_id=v_gid and d.activity_date=v_today and d.contribution_points>=v_threshold;

  select
    count(*) filter(where d.contribution_points>=v_threshold)::integer,
    coalesce(sum(d.contribution_points),0)::bigint
  into v_marks,v_guild_points
  from public.guild_muster_daily d
  join public.guild_members gm on gm.guild_id=d.guild_id and gm.account_id=d.account_id
  where d.guild_id=v_gid and d.activity_date>=v_week and d.activity_date<v_week+7;

  v_tier:=case
    when v_marks>=v_target then 3
    when v_marks>=ceil(v_target*0.70)::integer then 2
    when v_marks>=ceil(v_target*0.35)::integer then 1
    else 0
  end;
  v_bonus_bps:=case v_tier when 3 then 1500 when 2 then 1000 when 1 then 500 else 0 end;

  return query select
    v_gid,v_today,v_week,(v_week+7)::timestamp at time zone 'UTC',
    v_checked_in,v_daily,v_check_in,v_combat,v_skilling,
    v_daily_cap,v_threshold,v_daily>=v_threshold,
    v_personal_days,v_personal_goal,v_personal_points,
    v_members,v_checked_today,v_qualified_today,
    v_marks,v_target,v_tier,v_bonus_bps,v_guild_points;
end $$;

revoke all on function public.guild_muster_state_v1() from public,anon;
grant execute on function public.guild_muster_state_v1() to authenticated,service_role;

create or replace function public.guild_muster_roster_v1()
returns table(
  account_id uuid,
  display_name text,
  role text,
  today_points integer,
  weekly_points bigint,
  qualifying_days integer,
  lifetime_points bigint
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_today date:=(clock_timestamp() at time zone 'UTC')::date;
  v_week date:=date_trunc('week',clock_timestamp() at time zone 'UTC')::date;
begin
  if v_uid is null then return; end if;
  select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid limit 1;
  if v_gid is null then return; end if;

  return query
  select
    gm.account_id,
    coalesce(nullif(trim(pp.display_name),''),'Adventurer')::text,
    gm.role::text,
    coalesce(max(d.contribution_points) filter(where d.activity_date=v_today),0)::integer,
    coalesce(sum(d.contribution_points) filter(where d.activity_date>=v_week and d.activity_date<v_week+7),0)::bigint,
    count(*) filter(where d.activity_date>=v_week and d.activity_date<v_week+7 and d.contribution_points>=25)::integer,
    gm.contribution_xp::bigint
  from public.guild_members gm
  left join public.player_profiles pp on pp.account_id=gm.account_id
  left join public.guild_muster_daily d on d.guild_id=gm.guild_id and d.account_id=gm.account_id
  where gm.guild_id=v_gid
  group by gm.guild_id,gm.account_id,gm.role,gm.contribution_xp,gm.joined_at,pp.display_name
  order by
    count(*) filter(where d.activity_date>=v_week and d.activity_date<v_week+7 and d.contribution_points>=25) desc,
    coalesce(sum(d.contribution_points) filter(where d.activity_date>=v_week and d.activity_date<v_week+7),0) desc,
    gm.joined_at asc,
    gm.account_id asc;
end $$;

revoke all on function public.guild_muster_roster_v1() from public,anon;
grant execute on function public.guild_muster_roster_v1() to authenticated,service_role;

create or replace function public.guild_muster_project_completion_bonus_v1()
returns trigger
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_completed timestamptz;
  v_week date;
  v_tier integer:=0;
  v_bonus_bps integer:=0;
  v_base_award integer:=0;
  v_bonus integer:=0;
  v_event_id text;
  v_inserted text;
begin
  if tg_op<>'UPDATE' or old.status='completed' or new.status<>'completed' then return new; end if;

  v_completed:=coalesce(new.completed_at,clock_timestamp());
  v_week:=date_trunc('week',v_completed at time zone 'UTC')::date;
  v_tier:=public.guild_muster_rally_tier_for_week_v1(new.guild_id,v_week);
  v_bonus_bps:=case v_tier when 3 then 1500 when 2 then 1000 when 1 then 500 else 0 end;
  if v_bonus_bps<=0 then return new; end if;

  v_base_award:=case new.kind when 'development' then 350 when 'event' then 250 else 200 end;
  v_bonus:=floor(v_base_award*v_bonus_bps/10000.0)::integer;
  if v_bonus<=0 then return new; end if;

  v_event_id:='muster-project:'||new.id::text;
  insert into private.guild_hall_receipts(guild_id,event_id,fingerprint,result)
  values(
    new.guild_id,
    v_event_id,
    'guild-muster-rally:v1',
    jsonb_build_object('rallyTier',v_tier,'hallBonusBps',v_bonus_bps,'hallProgressBonus',v_bonus,'weekKey',v_week)
  )
  on conflict(guild_id,event_id) do nothing
  returning event_id into v_inserted;

  if v_inserted is null then return new; end if;

  insert into public.guild_halls(guild_id,hall_progress,lifetime_projects_completed,facilities,revision,updated_at)
  values(new.guild_id,v_bonus,0,'{}'::jsonb,1,v_completed)
  on conflict(guild_id) do update set
    hall_progress=public.guild_halls.hall_progress+v_bonus,
    revision=public.guild_halls.revision+1,
    updated_at=v_completed;

  insert into public.guild_activity_feed(guild_id,kind,title,body,payload_json,created_at)
  values(
    new.guild_id,
    'muster_rally_bonus',
    'Guild Rally boosted Hall Progress',
    'Rally '||v_tier||' added +'||v_bonus||' Hall Progress to this Project completion.',
    jsonb_build_object('projectInstanceId',new.id,'rallyTier',v_tier,'hallBonusBps',v_bonus_bps,'hallProgressBonus',v_bonus),
    v_completed
  );

  return new;
end $$;

drop trigger if exists trg_zz_guild_muster_project_bonus_v1 on public.guild_project_instances;
create trigger trg_zz_guild_muster_project_bonus_v1
after update of status on public.guild_project_instances
for each row execute function public.guild_muster_project_completion_bonus_v1();

revoke all on function public.guild_muster_project_completion_bonus_v1() from public,anon,authenticated;
grant execute on function public.guild_muster_project_completion_bonus_v1() to service_role;

commit;
