-- Saturday 10:00 local-time dungeon weekly reward reminder.
-- Charges replenish every eight hours; only the weekly enhanced-reward
-- allowance resets on Monday 00:00 UTC. No "expiring charges" claim.
create table if not exists public.dungeon_reminder_preferences_v1 (
  account_id uuid primary key references auth.users(id) on delete cascade,
  time_zone text not null default 'UTC',
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.dungeon_reminder_preferences_v1 enable row level security;
revoke all on public.dungeon_reminder_preferences_v1 from anon,authenticated;

create table if not exists public.dungeon_reminder_inbox_v1 (
  account_id uuid not null references auth.users(id) on delete cascade,
  week_key date not null,
  kind text not null default 'weekly_dungeon_charges' check (kind='weekly_dungeon_charges'),
  charges_at_send smallint not null check (charges_at_send between 1 and 3),
  weekly_remaining_at_send smallint not null check (weekly_remaining_at_send between 1 and 12),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  primary key(account_id,week_key,kind)
);
create index if not exists dungeon_reminder_inbox_unread_v1
  on public.dungeon_reminder_inbox_v1(account_id,created_at desc)
  where acknowledged_at is null;
alter table public.dungeon_reminder_inbox_v1 enable row level security;
revoke all on public.dungeon_reminder_inbox_v1 from anon,authenticated;

-- Register an IANA time zone after login; never override an opt-out.
create or replace function public.dungeon_reminder_register_v1(p_time_zone text)
returns void language plpgsql security definer set search_path='' as $$
declare v_account uuid:=auth.uid();
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  if p_time_zone is null or length(p_time_zone)>64 or not exists(
    select 1 from pg_catalog.pg_timezone_names
    where name=p_time_zone and (name='UTC' or position('/' in name)>0)
  ) then raise exception 'invalid_time_zone'; end if;
  insert into public.dungeon_reminder_preferences_v1(account_id,time_zone)
  values(v_account,p_time_zone)
  on conflict(account_id) do update set time_zone=excluded.time_zone,updated_at=now();
end $$;
revoke all on function public.dungeon_reminder_register_v1(text) from public,anon;
grant execute on function public.dungeon_reminder_register_v1(text) to authenticated;

create or replace function public.dungeon_reminder_set_enabled_v1(p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_account uuid:=auth.uid();
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  if p_enabled is null then raise exception 'invalid_preference'; end if;
  insert into public.dungeon_reminder_preferences_v1(account_id,enabled)
  values(v_account,p_enabled)
  on conflict(account_id) do update set enabled=excluded.enabled,updated_at=now();
end $$;
revoke all on function public.dungeon_reminder_set_enabled_v1(boolean) from public,anon;
grant execute on function public.dungeon_reminder_set_enabled_v1(boolean) to authenticated;

-- Run from pg_cron every 15 minutes. Only registered players who have used
-- the dungeon reward system and have real available charges are included.
create or replace function private.enqueue_dungeon_reminders_v1(p_at timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  if p_at is null then raise exception 'invalid_timestamp'; end if;
  with eligible as (
    select pref.account_id,
           b.week_key,
           b.weekly_used,
           least(3,b.charges + case
             when b.next_charge_at is not null and b.charges<3 and p_at>=b.next_charge_at
             then (floor(extract(epoch from(p_at-b.next_charge_at))/28800)::integer+1)
             else 0 end)::smallint as effective_charges,
           ((date_trunc('week',p_at at time zone 'UTC'))::date) as current_week
    from public.dungeon_reminder_preferences_v1 pref
    join public.coop_reward_charge_balances b on b.account_id=pref.account_id
    cross join lateral (select p_at at time zone pref.time_zone as local_now) zone
    where pref.enabled
      and extract(isodow from zone.local_now)=6
      and extract(hour from zone.local_now)=10
      and extract(minute from zone.local_now)<15
  ), candidates as (
    select account_id,current_week,effective_charges,
      (12-case when week_key=current_week then weekly_used else 0 end)::smallint as weekly_remaining
    from eligible
  )
  insert into public.dungeon_reminder_inbox_v1
    (account_id,week_key,charges_at_send,weekly_remaining_at_send,created_at)
  select account_id,current_week,effective_charges,weekly_remaining,p_at
  from candidates where effective_charges>0 and weekly_remaining>0
  on conflict (account_id,week_key,kind) do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end $$;
revoke all on function private.enqueue_dungeon_reminders_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.enqueue_dungeon_reminders_v1(timestamptz) to service_role;

-- Show only a current, still-actionable reminder. Live budget recalculation
-- prevents a stale message after charges/weekly allowances were consumed.
create or replace function public.dungeon_reminder_pending_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_account uuid:=auth.uid();
  v_week date:=(date_trunc('week',now() at time zone 'UTC'))::date;
  v_row public.dungeon_reminder_inbox_v1%rowtype;
  v_budget jsonb;
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  select * into v_row from public.dungeon_reminder_inbox_v1
   where account_id=v_account and week_key=v_week
     and kind='weekly_dungeon_charges' and acknowledged_at is null
   order by created_at desc limit 1;
  if not found then return null; end if;
  if not exists(select 1 from public.dungeon_reminder_preferences_v1
                where account_id=v_account and enabled) then return null; end if;
  v_budget:=public.online_coop_reward_budget_server_v1(v_account);
  if coalesce((v_budget->>'charges')::integer,0)<=0
     or coalesce((v_budget->>'weeklyRemaining')::integer,0)<=0 then return null; end if;
  return pg_catalog.jsonb_build_object(
    'weekKey',v_week,'charges',(v_budget->>'charges')::integer,
    'weeklyRemaining',(v_budget->>'weeklyRemaining')::integer);
end $$;
revoke all on function public.dungeon_reminder_pending_v1() from public,anon;
grant execute on function public.dungeon_reminder_pending_v1() to authenticated;

create or replace function public.dungeon_reminder_ack_v1(p_week_key date)
returns void language plpgsql security definer set search_path='' as $$
declare v_account uuid:=auth.uid();
begin
 if v_account is null then raise exception 'authentication_required'; end if;
 if p_week_key is null then raise exception 'invalid_week'; end if;
 update public.dungeon_reminder_inbox_v1 set acknowledged_at=now()
 where account_id=v_account and week_key=p_week_key
   and kind='weekly_dungeon_charges' and acknowledged_at is null;
end $$;
revoke all on function public.dungeon_reminder_ack_v1(date) from public,anon;
grant execute on function public.dungeon_reminder_ack_v1(date) to authenticated;

-- Cron uses UTC internally, but each player's IANA zone is checked above,
-- including daylight-saving time transitions.
do $$
begin
 if not exists(select 1 from pg_catalog.pg_extension where extname='pg_cron') then
   raise exception 'pg_cron extension required';
 end if;
 if exists(select 1 from cron.job where jobname='veldryn-dungeon-reminder-sat-10-local') then
   perform cron.unschedule('veldryn-dungeon-reminder-sat-10-local');
 end if;
 perform cron.schedule('veldryn-dungeon-reminder-sat-10-local','*/15 * * * *',
   'select private.enqueue_dungeon_reminders_v1();');
end $$;

-- Read-only preference for the in-app Settings toggle.
create or replace function public.dungeon_reminder_preference_v1()
returns boolean language plpgsql stable security definer set search_path='' as $$
declare v_account uuid:=auth.uid(); v_enabled boolean;
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  select enabled into v_enabled from public.dungeon_reminder_preferences_v1
  where account_id=v_account;
  return coalesce(v_enabled,true);
end $$;
revoke all on function public.dungeon_reminder_preference_v1() from public,anon;
grant execute on function public.dungeon_reminder_preference_v1() to authenticated;
