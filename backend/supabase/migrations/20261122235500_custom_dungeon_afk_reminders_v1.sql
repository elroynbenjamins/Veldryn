-- Account-wide, local-time dungeon and per-character AFK reminders.
-- Native OS push is a separate opt-in deliverer; this migration powers the in-app inbox.
alter table public.dungeon_reminder_preferences_v1
  add column if not exists dungeon_weekday smallint not null default 6 check (dungeon_weekday between 1 and 7),
  add column if not exists dungeon_hour smallint not null default 10 check (dungeon_hour between 0 and 23),
  add column if not exists dungeon_minute smallint not null default 0 check (dungeon_minute in (0,15,30,45)),
  add column if not exists afk_enabled boolean not null default true,
  add column if not exists afk_lead_minutes smallint not null default 0 check (afk_lead_minutes in (0,30,60)),
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists quiet_enabled boolean not null default true;
comment on table public.dungeon_reminder_preferences_v1 is
  'Account notification settings; only Dungeon and AFK categories are active. No crafting or companion expedition alerts.';

-- The app calculates its existing authoritative per-character cap from
-- offlineCapBreakdown(state) and registers its latest snapshot at login/foreground.
-- Never infer the cap from a fixed 8h default for progressed characters.
create table if not exists private.afk_reminder_cap_snapshots_v1(
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  cap_hours smallint not null check (cap_hours between 8 and 30 and cap_hours%2=0),
  updated_at timestamptz not null default now(),
  primary key(account_id, character_id)
);
alter table private.afk_reminder_cap_snapshots_v1 enable row level security;
create index if not exists afk_reminder_caps_character_fk_v1 on private.afk_reminder_cap_snapshots_v1(character_id);
revoke all on private.afk_reminder_cap_snapshots_v1 from public,anon,authenticated;

create table if not exists private.afk_reminder_inbox_v1(
  id bigint generated always as identity primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  last_claim_at_ms bigint not null check (last_claim_at_ms>0),
  cap_hours smallint not null check (cap_hours between 8 and 30),
  threshold_at timestamptz not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique(account_id,character_id,last_claim_at_ms)
);
create index if not exists afk_reminder_inbox_unread_v1
 on private.afk_reminder_inbox_v1(account_id,created_at desc)
 where acknowledged_at is null;
alter table private.afk_reminder_inbox_v1 enable row level security;
create index if not exists afk_reminder_inbox_character_fk_v1 on private.afk_reminder_inbox_v1(character_id);
revoke all on private.afk_reminder_inbox_v1 from public,anon,authenticated;

create or replace function public.notification_preferences_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_account uuid:=auth.uid(); v_pref public.dungeon_reminder_preferences_v1%rowtype;
begin
 if v_account is null then raise exception 'authentication_required'; end if;
 select * into v_pref from public.dungeon_reminder_preferences_v1 where account_id=v_account;
 return pg_catalog.jsonb_build_object(
  'dungeonEnabled',coalesce(v_pref.enabled,true),
  'dungeonWeekday',coalesce(v_pref.dungeon_weekday,6),
  'dungeonHour',coalesce(v_pref.dungeon_hour,10),
  'dungeonMinute',coalesce(v_pref.dungeon_minute,0),
  'afkEnabled',coalesce(v_pref.afk_enabled,true),
  'afkLeadMinutes',coalesce(v_pref.afk_lead_minutes,0),
  'notificationsEnabled',coalesce(v_pref.notifications_enabled,true),
  'quietEnabled',coalesce(v_pref.quiet_enabled,true),
  'timeZone',coalesce(v_pref.time_zone,'UTC'));
end $$;
revoke all on function public.notification_preferences_v1() from public,anon;
grant execute on function public.notification_preferences_v1() to authenticated;

create or replace function public.notification_preferences_set_v1(
 p_dungeon_enabled boolean,p_weekday smallint,p_hour smallint,p_minute smallint,
 p_afk_enabled boolean,p_afk_lead_minutes smallint,p_notifications_enabled boolean,p_quiet_enabled boolean
) returns void language plpgsql security definer set search_path='' as $$
declare v_account uuid:=auth.uid();
begin
 if v_account is null then raise exception 'authentication_required'; end if;
 if p_dungeon_enabled is null or p_weekday is null or p_weekday not between 1 and 7
  or p_hour is null or p_hour not between 0 and 23
  or p_minute is null or p_minute not in (0,15,30,45)
  or p_afk_enabled is null or p_afk_lead_minutes is null or p_afk_lead_minutes not in (0,30,60)
  or p_notifications_enabled is null or p_quiet_enabled is null
  then raise exception 'invalid_notification_preferences' using errcode='22023';
 end if;
 insert into public.dungeon_reminder_preferences_v1(
  account_id,enabled,dungeon_weekday,dungeon_hour,dungeon_minute,afk_enabled,
  afk_lead_minutes,notifications_enabled,quiet_enabled
 ) values (
  v_account,p_dungeon_enabled,p_weekday,p_hour,p_minute,p_afk_enabled,
  p_afk_lead_minutes,p_notifications_enabled,p_quiet_enabled
 ) on conflict(account_id) do update set
  enabled=excluded.enabled,dungeon_weekday=excluded.dungeon_weekday,
  dungeon_hour=excluded.dungeon_hour,dungeon_minute=excluded.dungeon_minute,
  afk_enabled=excluded.afk_enabled,afk_lead_minutes=excluded.afk_lead_minutes,
  notifications_enabled=excluded.notifications_enabled,quiet_enabled=excluded.quiet_enabled,
  updated_at=now();
end $$;
revoke all on function public.notification_preferences_set_v1(boolean,smallint,smallint,smallint,boolean,smallint,boolean,boolean) from public,anon;
grant execute on function public.notification_preferences_set_v1(boolean,smallint,smallint,smallint,boolean,smallint,boolean,boolean) to authenticated;

create or replace function public.afk_reminder_register_cap_v1(
 p_character_id uuid,p_cap_hours smallint
) returns void language plpgsql security definer set search_path='' as $$
declare v_account uuid:=auth.uid();
begin
 if v_account is null then raise exception 'authentication_required'; end if;
 if p_character_id is null or p_cap_hours is null
  or p_cap_hours not between 8 and 30 or p_cap_hours%2<>0
  then raise exception 'invalid_afk_reminder_cap' using errcode='22023';end if;
 if not exists (
   select 1 from public.online_game_states s
   where s.account_id=v_account and s.character_id=p_character_id
     and s.state->'character'->>'id'=p_character_id::text
 ) then raise exception 'character_not_found'; end if;
 insert into private.afk_reminder_cap_snapshots_v1(account_id,character_id,cap_hours)
 values(v_account,p_character_id,p_cap_hours)
 on conflict(account_id,character_id) do update set
  cap_hours=excluded.cap_hours,updated_at=now();
end $$;
revoke all on function public.afk_reminder_register_cap_v1(uuid,smallint) from public,anon;
grant execute on function public.afk_reminder_register_cap_v1(uuid,smallint) to authenticated;

-- Pure threshold comparator for regression tests and the scheduled worker.
create or replace function private.afk_reminder_due_v1(
 p_last_claim_ms bigint,p_cap_hours smallint,p_lead_minutes smallint,p_at timestamptz
) returns boolean language sql stable set search_path='' as $$
 select p_last_claim_ms is not null
  and p_last_claim_ms between 1500000000000 and 9999999999999
  and p_cap_hours between 8 and 30 and p_lead_minutes in(0,30,60)
  and floor(extract(epoch from p_at)*1000)::bigint
   between p_last_claim_ms+(p_cap_hours::bigint*3600000)-(p_lead_minutes::bigint*60000)
       and p_last_claim_ms+(p_cap_hours::bigint*3600000)-(p_lead_minutes::bigint*60000)+20*60000;
$$;
revoke all on function private.afk_reminder_due_v1(bigint,smallint,smallint,timestamptz) from public,anon,authenticated;

create or replace function private.enqueue_afk_reminders_v1(p_at timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if p_at is null then raise exception 'invalid_timestamp';end if;
 with active as (
  select p.account_id,s.character_id,c.cap_hours,p.afk_lead_minutes,
   (s.state->'activity'->>'lastClaimAtMs')::bigint as last_claim_ms
  from public.dungeon_reminder_preferences_v1 p
  join private.afk_reminder_cap_snapshots_v1 c on c.account_id=p.account_id
  join public.online_game_states s on s.account_id=c.account_id and s.character_id=c.character_id
  where p.notifications_enabled and p.afk_enabled
   and s.state->'activity' is not null and pg_catalog.jsonb_typeof(s.state->'activity')='object'
   and (s.state->'activity'->>'lastClaimAtMs') ~ '^[0-9]{13}$'
   and c.updated_at>p_at-interval '120 days'
 ), eligible as (
  select a.*,
   pg_catalog.to_timestamp(
      (a.last_claim_ms+a.cap_hours::bigint*3600000-a.afk_lead_minutes::bigint*60000)/1000.0
   ) as threshold_at
  from active a
  where private.afk_reminder_due_v1(a.last_claim_ms,a.cap_hours,a.afk_lead_minutes,p_at)
 )
 insert into private.afk_reminder_inbox_v1(
  account_id,character_id,last_claim_at_ms,cap_hours,threshold_at,created_at
 )
 select e.account_id,e.character_id,e.last_claim_ms,e.cap_hours,e.threshold_at,p_at
 from eligible e on conflict(account_id,character_id,last_claim_at_ms) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end $$;
revoke all on function private.enqueue_afk_reminders_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.enqueue_afk_reminders_v1(timestamptz) to service_role;

create or replace function private.notification_quiet_now_v1(
 p_time_zone text,p_enabled boolean,p_at timestamptz
) returns boolean language sql stable set search_path='' as $$
 select coalesce(p_enabled,false)
  and (extract(hour from (p_at at time zone coalesce(p_time_zone,'UTC'))) >= 23
   or extract(hour from (p_at at time zone coalesce(p_time_zone,'UTC'))) < 8);
$$;
revoke all on function private.notification_quiet_now_v1(text,boolean,timestamptz) from public,anon,authenticated;

-- The existing weekly reminder keeps its account/week deduplication key.
create or replace function private.enqueue_dungeon_reminders_v1(p_at timestamptz default now())
returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if p_at is null then raise exception 'invalid_timestamp';end if;
 with eligible as (
   select pref.account_id,b.week_key,b.weekly_used,
    least(3,b.charges+case when b.next_charge_at is not null and b.charges<3
      and p_at>=b.next_charge_at
      then floor(extract(epoch from(p_at-b.next_charge_at))/28800)::integer+1
      else 0 end)::smallint as effective_charges,
    (date_trunc('week',p_at at time zone 'UTC'))::date as current_week
   from public.dungeon_reminder_preferences_v1 pref
   join public.coop_reward_charge_balances b on b.account_id=pref.account_id
   cross join lateral(select p_at at time zone pref.time_zone as local_now) zone
   where pref.enabled and pref.notifications_enabled
     and extract(isodow from zone.local_now)=pref.dungeon_weekday
     and extract(hour from zone.local_now)=pref.dungeon_hour
     and extract(minute from zone.local_now)=pref.dungeon_minute
 ), candidates as (
  select account_id,current_week,effective_charges,
    (12-case when week_key=current_week then weekly_used else 0 end)::smallint as weekly_remaining
  from eligible
 )
 insert into public.dungeon_reminder_inbox_v1(
  account_id,week_key,charges_at_send,weekly_remaining_at_send,created_at)
 select account_id,current_week,effective_charges,weekly_remaining,p_at from candidates
 where effective_charges>0 and weekly_remaining>0
 on conflict(account_id,week_key,kind) do nothing;
 get diagnostics v_count=row_count;
 return v_count;
end $$;
revoke all on function private.enqueue_dungeon_reminders_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.enqueue_dungeon_reminders_v1(timestamptz) to service_role;

-- Quiet hours and global preference also apply to old client inbox readers.
create or replace function public.dungeon_reminder_pending_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_account uuid:=auth.uid();
 v_week date:=(date_trunc('week',now() at time zone 'UTC'))::date;
 v_row public.dungeon_reminder_inbox_v1%rowtype;
 v_budget jsonb;v_pref public.dungeon_reminder_preferences_v1%rowtype;
begin
 if v_account is null then raise exception 'authentication_required';end if;
 select * into v_pref from public.dungeon_reminder_preferences_v1 where account_id=v_account;
 if not found or not v_pref.enabled or not v_pref.notifications_enabled
  or private.notification_quiet_now_v1(v_pref.time_zone,v_pref.quiet_enabled,now())
  then return null;end if;
 select * into v_row from public.dungeon_reminder_inbox_v1
 where account_id=v_account and week_key=v_week
  and kind='weekly_dungeon_charges' and acknowledged_at is null
 order by created_at desc limit 1;
 if not found then return null;end if;
 v_budget:=public.online_coop_reward_budget_server_v1(v_account);
 if coalesce((v_budget->>'charges')::integer,0)<1
  or coalesce((v_budget->>'weeklyRemaining')::integer,0)<1 then return null;end if;
 return pg_catalog.jsonb_build_object(
  'weekKey',v_week,'charges',(v_budget->>'charges')::integer,
  'weeklyRemaining',(v_budget->>'weeklyRemaining')::integer);
end $$;
revoke all on function public.dungeon_reminder_pending_v1() from public,anon;
grant execute on function public.dungeon_reminder_pending_v1() to authenticated;

create or replace function public.afk_reminder_pending_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_account uuid:=auth.uid(); v_pref public.dungeon_reminder_preferences_v1%rowtype;
 v_row record; v_now_ms bigint:=floor(extract(epoch from now())*1000)::bigint;
begin
 if v_account is null then raise exception 'authentication_required';end if;
 select * into v_pref from public.dungeon_reminder_preferences_v1 where account_id=v_account;
 if not found or not v_pref.afk_enabled or not v_pref.notifications_enabled
   or private.notification_quiet_now_v1(v_pref.time_zone,v_pref.quiet_enabled,now())
   then return null;end if;
 select i.character_id,i.last_claim_at_ms,c.cap_hours,
  s.state->'character'->>'name' as name
 into v_row
 from private.afk_reminder_inbox_v1 i
 join public.online_game_states s on s.account_id=i.account_id and s.character_id=i.character_id
 join private.afk_reminder_cap_snapshots_v1 c
   on c.account_id=i.account_id and c.character_id=i.character_id
 where i.account_id=v_account and i.acknowledged_at is null
   and i.created_at>now()-interval '36 hours'
   and c.cap_hours=i.cap_hours
   and pg_catalog.jsonb_typeof(s.state->'activity')='object'
   and (s.state->'activity'->>'lastClaimAtMs') ~ '^[0-9]{13}$'
   and (s.state->'activity'->>'lastClaimAtMs')::bigint=i.last_claim_at_ms
   and v_now_ms>=i.last_claim_at_ms+
      (i.cap_hours::bigint*3600000)-(v_pref.afk_lead_minutes::bigint*60000)
 order by i.created_at desc limit 1;
 if not found then return null;end if;
 return pg_catalog.jsonb_build_object(
   'characterId',v_row.character_id,
   'characterName',coalesce(v_row.name,'Adventurer'),
   'lastClaimAtMs',v_row.last_claim_at_ms,
   'capHours',v_row.cap_hours,
   'isFull',v_now_ms>=v_row.last_claim_at_ms+v_row.cap_hours::bigint*3600000,
   'minutesLeft',greatest(0,ceil(
     (v_row.last_claim_at_ms+v_row.cap_hours::bigint*3600000-v_now_ms)/60000.0)::integer));
end $$;
revoke all on function public.afk_reminder_pending_v1() from public,anon;
grant execute on function public.afk_reminder_pending_v1() to authenticated;

create or replace function public.afk_reminder_ack_v1(
 p_character_id uuid,p_last_claim_at_ms bigint
) returns void language plpgsql security definer set search_path='' as $$
declare v_account uuid:=auth.uid();
begin
 if v_account is null then raise exception 'authentication_required';end if;
 if p_character_id is null or p_last_claim_at_ms is null then raise exception 'invalid_request';end if;
 update private.afk_reminder_inbox_v1 set acknowledged_at=now()
 where account_id=v_account and character_id=p_character_id
   and last_claim_at_ms=p_last_claim_at_ms and acknowledged_at is null;
end $$;
revoke all on function public.afk_reminder_ack_v1(uuid,bigint) from public,anon;
grant execute on function public.afk_reminder_ack_v1(uuid,bigint) to authenticated;

create or replace function private.enqueue_custom_notifications_v1(p_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_dungeons int;v_afk int;
begin
 v_dungeons:=private.enqueue_dungeon_reminders_v1(p_at);
 v_afk:=private.enqueue_afk_reminders_v1(p_at);
 delete from private.afk_reminder_inbox_v1 where created_at<p_at-interval '35 days';
 return pg_catalog.jsonb_build_object('dungeon',v_dungeons,'afk',v_afk);
end $$;
revoke all on function private.enqueue_custom_notifications_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.enqueue_custom_notifications_v1(timestamptz) to service_role;

-- Extend the existing worker rather than run a second overlapping reminder job.
do $$
begin
 if exists(select 1 from cron.job where jobname='veldryn-dungeon-reminder-sat-10-local') then
  perform cron.unschedule('veldryn-dungeon-reminder-sat-10-local');
 end if;
 perform cron.schedule('veldryn-custom-notifications-15m-v1','*/15 * * * *',
   'select private.enqueue_custom_notifications_v1();');
end $$;
