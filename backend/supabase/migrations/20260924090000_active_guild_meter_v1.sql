begin;

-- VELDRYN Active Guild Meter v1
-- Persistent non-combat Guild activity that rewards sustained cooperative play.
-- The meter does not hard-reset weekly. It decays by 10 percentage points per UTC day.
-- Awards are server-owned and idempotent; Guild Quests will be the primary caller.

create table if not exists public.guild_activity_state(
  guild_id uuid primary key references public.guilds(id) on delete cascade,
  meter_bps integer not null default 0 check(meter_bps between 0 and 10000),
  last_decay_date date not null default (clock_timestamp() at time zone 'UTC')::date,
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists private.guild_activity_receipts(
  guild_id uuid not null references public.guilds(id) on delete cascade,
  source_kind text not null,
  source_id text not null,
  contribution_units integer not null check(contribution_units > 0),
  awarded_bps integer not null check(awarded_bps >= 0),
  created_at timestamptz not null default clock_timestamp(),
  primary key(guild_id,source_kind,source_id)
);

revoke all on table private.guild_activity_receipts from public,anon,authenticated;
grant select,insert on table private.guild_activity_receipts to service_role;

alter table public.guild_activity_state enable row level security;
revoke all on table public.guild_activity_state from public,anon,authenticated;
grant select on table public.guild_activity_state to authenticated;
grant select,insert,update,delete on table public.guild_activity_state to service_role;

drop policy if exists guild_activity_member_read_v1 on public.guild_activity_state;
create policy guild_activity_member_read_v1
on public.guild_activity_state
for select
to authenticated
using(
  exists(
    select 1 from public.guild_members gm
    where gm.guild_id=guild_activity_state.guild_id
      and gm.account_id=auth.uid()
  )
);

create or replace function public.guild_activity_target_units_v1(p_guild_id uuid)
returns integer
language sql
stable
security definer
set search_path=public
as $$
  select greatest(100,ceil(greatest(count(*),1)*0.60)::integer*100)
  from public.guild_members
  where guild_id=p_guild_id
$$;

revoke all on function public.guild_activity_target_units_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_activity_target_units_v1(uuid) to service_role;

create or replace function public.guild_activity_apply_decay_v1(p_guild_id uuid,p_today date default (clock_timestamp() at time zone 'UTC')::date)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_state public.guild_activity_state%rowtype;
  v_days integer:=0;
begin
  insert into public.guild_activity_state(guild_id,last_decay_date)
  values(p_guild_id,p_today)
  on conflict(guild_id) do nothing;

  select * into v_state
  from public.guild_activity_state
  where guild_id=p_guild_id
  for update;

  v_days:=greatest(0,p_today-v_state.last_decay_date);
  if v_days>0 then
    update public.guild_activity_state
       set meter_bps=greatest(0,meter_bps-v_days*1000),
           last_decay_date=p_today,
           updated_at=clock_timestamp()
     where guild_id=p_guild_id
     returning meter_bps into v_state.meter_bps;
  end if;
  return coalesce(v_state.meter_bps,0);
end $$;

revoke all on function public.guild_activity_apply_decay_v1(uuid,date) from public,anon,authenticated;
grant execute on function public.guild_activity_apply_decay_v1(uuid,date) to service_role;

create or replace function public.guild_activity_award_v1(
  p_guild_id uuid,
  p_source_kind text,
  p_source_id text,
  p_contribution_units integer,
  p_occurred_at timestamptz default clock_timestamp()
)
returns table(meter_bps integer,awarded_bps integer,target_units integer)
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_target integer;
  v_award integer;
  v_existing integer;
  v_today date:=(p_occurred_at at time zone 'UTC')::date;
begin
  if p_contribution_units<=0 then raise exception 'GUILD_ACTIVITY_INVALID_UNITS'; end if;
  if nullif(trim(p_source_kind),'') is null or nullif(trim(p_source_id),'') is null then
    raise exception 'GUILD_ACTIVITY_SOURCE_REQUIRED';
  end if;

  perform public.guild_activity_apply_decay_v1(p_guild_id,v_today);
  v_target:=public.guild_activity_target_units_v1(p_guild_id);
  v_award:=least(10000,greatest(1,ceil(p_contribution_units::numeric/v_target*10000)::integer));

  select r.awarded_bps into v_existing
  from private.guild_activity_receipts r
  where r.guild_id=p_guild_id and r.source_kind=p_source_kind and r.source_id=p_source_id;

  if v_existing is not null then
    return query select s.meter_bps,v_existing,v_target
    from public.guild_activity_state s where s.guild_id=p_guild_id;
    return;
  end if;

  insert into private.guild_activity_receipts(guild_id,source_kind,source_id,contribution_units,awarded_bps)
  values(p_guild_id,trim(p_source_kind),trim(p_source_id),p_contribution_units,v_award);

  update public.guild_activity_state
     set meter_bps=least(10000,meter_bps+v_award),
         updated_at=p_occurred_at
   where guild_id=p_guild_id;

  return query select s.meter_bps,v_award,v_target
  from public.guild_activity_state s where s.guild_id=p_guild_id;
end $$;

revoke all on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz) to service_role;

create or replace function public.guild_activity_state_v1()
returns table(
  guild_id uuid,
  meter_bps integer,
  activity_percent integer,
  target_units integer,
  daily_decay_percent integer,
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
  v_today date:=(clock_timestamp() at time zone 'UTC')::date;
begin
  if v_uid is null then return; end if;
  select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid limit 1;
  if v_gid is null then return; end if;

  -- Read RPC applies the same deterministic decay so the UI never shows stale activity.
  -- Authenticated callers cannot directly write arbitrary progress.
  insert into public.guild_activity_state(guild_id,last_decay_date)
  values(v_gid,v_today) on conflict(guild_id) do nothing;

  update public.guild_activity_state
     set meter_bps=greatest(0,meter_bps-greatest(0,v_today-last_decay_date)*1000),
         last_decay_date=v_today,
         updated_at=case when v_today>last_decay_date then clock_timestamp() else updated_at end
   where guild_id=v_gid;

  select s.meter_bps into v_meter from public.guild_activity_state s where s.guild_id=v_gid;
  v_target:=public.guild_activity_target_units_v1(v_gid);

  return query select
    v_gid,v_meter,floor(v_meter/100.0)::integer,v_target,10,v_today+1,
    case when v_meter>=2000 then 500 else 0 end,
    case when v_meter>=4000 then 500 else 0 end,
    case when v_meter>=6000 then 500 else 0 end,
    case when v_meter>=8000 then 500 else 0 end,
    case when v_meter>=10000 then 500 else 0 end;
end $$;

revoke all on function public.guild_activity_state_v1() from public,anon;
grant execute on function public.guild_activity_state_v1() to authenticated,service_role;

create or replace function public.guild_activity_from_muster_v1()
returns trigger
language plpgsql
security definer
set search_path=public
as $
declare
  v_before_qualified boolean:=false;
  v_after_qualified boolean:=false;
  v_source_id text;
begin
  v_before_qualified:=coalesce(old.contribution_points,0)>=25;
  v_after_qualified:=coalesce(new.contribution_points,0)>=25;
  if v_before_qualified or not v_after_qualified then return new; end if;

  v_source_id:=new.account_id::text||':'||new.activity_date::text;
  perform * from public.guild_activity_award_v1(
    new.guild_id,
    'muster_day',
    v_source_id,
    25,
    coalesce(new.last_contribution_at,clock_timestamp())
  );
  return new;
end $;

drop trigger if exists trg_guild_activity_from_muster_v1 on public.guild_muster_daily;
create trigger trg_guild_activity_from_muster_v1
after update of contribution_points on public.guild_muster_daily
for each row execute function public.guild_activity_from_muster_v1();

revoke all on function public.guild_activity_from_muster_v1() from public,anon,authenticated;
grant execute on function public.guild_activity_from_muster_v1() to service_role;

comment on table public.guild_activity_state is 'Persistent Active Guild meter. No weekly hard reset; decays 10 percentage points per UTC day.';
comment on function public.guild_activity_award_v1(uuid,text,text,integer,timestamptz) is 'Server-only idempotent award path intended primarily for completed Guild Quests and verified cooperative objectives.';

commit;
