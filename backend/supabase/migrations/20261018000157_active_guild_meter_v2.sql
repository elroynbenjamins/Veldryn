begin;

-- Active Guild Meter v2
-- Sustained non-combat motivation layer:
-- * persistent meter, no weekly hard reset;
-- * target scales from members active within the last 14 UTC days;
-- * completed days decay by 0 / 5 / 10 percentage points depending on Guild participation;
-- * 20/40/60/80/100 milestones grant cumulative +5% non-combat effects;
-- * Guild Quest / Project callers use the same idempotent award path.

create or replace function public.guild_activity_active_members_for_date_v2(
  p_guild_id uuid,
  p_date date
)
returns integer
language sql
stable
security definer
set search_path=public
as $$
  select greatest(
    1,
    count(*) filter(
      where exists(
        select 1
        from public.player_activity_daily a
        where a.account_id=gm.account_id
          and a.activity_date between p_date-13 and p_date
      )
    )::integer
  )
  from public.guild_members gm
  where gm.guild_id=p_guild_id
$$;

create or replace function public.guild_activity_target_units_for_date_v2(
  p_guild_id uuid,
  p_date date
)
returns integer
language sql
stable
security definer
set search_path=public
as $$
  select greatest(
    100,
    ceil(public.guild_activity_active_members_for_date_v2(p_guild_id,p_date)*0.60)::integer*100
  )
$$;

create or replace function public.guild_activity_target_units_v1(p_guild_id uuid)
returns integer
language sql
stable
security definer
set search_path=public
as $$
  select public.guild_activity_target_units_for_date_v2(
    p_guild_id,
    (clock_timestamp() at time zone 'UTC')::date
  )
$$;

create or replace function public.guild_activity_day_units_v2(
  p_guild_id uuid,
  p_date date
)
returns integer
language sql
stable
security definer
set search_path=public,private
as $$
  select
    coalesce((
      select sum(d.contribution_points)::integer
      from public.guild_muster_daily d
      where d.guild_id=p_guild_id
        and d.activity_date=p_date
    ),0)
    +
    coalesce((
      select sum(r.contribution_units)::integer
      from private.guild_activity_receipts r
      where r.guild_id=p_guild_id
        and r.source_kind<>'muster_day'
        and (r.created_at at time zone 'UTC')::date=p_date
    ),0)
$$;

create or replace function public.guild_activity_decay_bps_for_day_v2(
  p_guild_id uuid,
  p_date date
)
returns integer
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_target integer:=public.guild_activity_target_units_for_date_v2(p_guild_id,p_date);
  v_units integer:=public.guild_activity_day_units_v2(p_guild_id,p_date);
begin
  if v_units>=ceil(v_target*0.25)::integer then return 0; end if;
  if v_units>0 then return 500; end if;
  return 1000;
end $$;

create or replace function public.guild_activity_apply_decay_v1(
  p_guild_id uuid,
  p_today date default (clock_timestamp() at time zone 'UTC')::date
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_state public.guild_activity_state%rowtype;
  v_day date;
  v_decay integer:=0;
begin
  insert into public.guild_activity_state(guild_id,last_decay_date)
  values(p_guild_id,p_today)
  on conflict(guild_id) do nothing;

  select * into v_state
  from public.guild_activity_state
  where guild_id=p_guild_id
  for update;

  if p_today<=v_state.last_decay_date then return coalesce(v_state.meter_bps,0); end if;

  for v_day in
    select gs::date
    from generate_series(
      v_state.last_decay_date::timestamp,
      (p_today-1)::timestamp,
      interval '1 day'
    ) gs
  loop
    v_decay:=v_decay+public.guild_activity_decay_bps_for_day_v2(p_guild_id,v_day);
  end loop;

  update public.guild_activity_state
     set meter_bps=greatest(0,meter_bps-v_decay),
         last_decay_date=p_today,
         updated_at=clock_timestamp()
   where guild_id=p_guild_id
   returning meter_bps into v_state.meter_bps;

  return coalesce(v_state.meter_bps,0);
end $$;

create or replace function public.guild_activity_state_v2()
returns table(
  guild_id uuid,
  meter_bps integer,
  activity_percent integer,
  target_units integer,
  active_member_count integer,
  activity_today_units integer,
  decay_mode text,
  partial_decay_percent integer,
  inactive_decay_percent integer,
  next_decay_date date,
  gathering_speed_bps integer,
  production_speed_bps integer,
  skill_xp_bps integer,
  mastery_xp_bps integer,
  rare_material_relative_bps integer
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_meter integer:=0;
  v_target integer:=100;
  v_active integer:=1;
  v_today date:=(clock_timestamp() at time zone 'UTC')::date;
  v_today_units integer:=0;
  v_mode text:='inactive';
begin
  if v_uid is null then return; end if;
  select gm.guild_id into v_gid
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;
  if v_gid is null then return; end if;

  v_meter:=public.guild_activity_apply_decay_v1(v_gid,v_today);
  v_target:=public.guild_activity_target_units_for_date_v2(v_gid,v_today);
  v_active:=public.guild_activity_active_members_for_date_v2(v_gid,v_today);
  v_today_units:=public.guild_activity_day_units_v2(v_gid,v_today);
  v_mode:=case
    when v_today_units>=ceil(v_target*0.25)::integer then 'protected'
    when v_today_units>0 then 'partial'
    else 'inactive'
  end;

  return query select
    v_gid,v_meter,floor(v_meter/100.0)::integer,v_target,v_active,v_today_units,v_mode,5,10,v_today+1,
    case when v_meter>=2000 then 500 else 0 end,
    case when v_meter>=4000 then 500 else 0 end,
    case when v_meter>=6000 then 500 else 0 end,
    case when v_meter>=8000 then 500 else 0 end,
    case when v_meter>=10000 then 500 else 0 end;
end $$;

revoke all on function public.guild_activity_state_v2() from public,anon;
grant execute on function public.guild_activity_state_v2() to authenticated,service_role;

create or replace function public.guild_activity_from_project_completion_v2()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_units integer:=0;
begin
  if tg_op<>'UPDATE' or old.status='completed' or new.status<>'completed' then return new; end if;
  v_units:=case new.kind when 'development' then 250 when 'event' then 200 else 150 end;
  perform * from public.guild_activity_award_v1(
    new.guild_id,
    'guild_project',
    new.id::text,
    v_units,
    coalesce(new.completed_at,clock_timestamp())
  );
  return new;
end $$;

drop trigger if exists trg_guild_activity_project_completion_v2 on public.guild_project_instances;
create trigger trg_guild_activity_project_completion_v2
after update of status on public.guild_project_instances
for each row execute function public.guild_activity_from_project_completion_v2();

comment on function public.guild_activity_state_v2()
  is 'Active Guild Meter v2: persistent 20/40/60/80/100 non-combat milestones, active-member scaling, and 0/5/10 daily decay.';
comment on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz)
  is 'Idempotent server-only activity award path for Guild Quests, completed Projects and verified cooperative objectives.';

commit;
