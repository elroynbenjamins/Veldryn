-- Saturday 10:00 local-time reminder for unused weekly dungeon bonus rewards.
-- Release gate: this is dormant until the native app has registered opt-in Expo tokens
-- and EAS/FCM/APNs credentials are configured. Never schedules local-only guesses.
create extension if not exists pg_net;

create table if not exists public.dungeon_push_devices_v1 (
  account_id uuid not null references auth.users(id) on delete cascade,
  installation_id uuid not null,
  expo_push_token text not null
    check (expo_push_token ~ '^(Expo|Exponent)PushToken\\[[A-Za-z0-9_-]+\\]$'),
  time_zone text not null,
  language text not null default 'en',
  dungeon_reminders_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (account_id, installation_id),
  constraint dungeon_push_timezone_length_v1 check (length(time_zone) between 2 and 80),
  constraint dungeon_push_language_length_v1 check (length(language) between 2 and 16)
);
create index if not exists dungeon_push_enabled_v1
  on public.dungeon_push_devices_v1(account_id) where dungeon_reminders_enabled;
alter table public.dungeon_push_devices_v1 enable row level security;
revoke all on public.dungeon_push_devices_v1 from public, anon, authenticated;
grant select, insert, update, delete on public.dungeon_push_devices_v1 to authenticated;
drop policy if exists dungeon_push_owner_v1 on public.dungeon_push_devices_v1;
create policy dungeon_push_owner_v1 on public.dungeon_push_devices_v1
  for all to authenticated using (account_id=(select auth.uid()))
  with check (account_id=(select auth.uid()));

create or replace function private.validate_dungeon_push_device_v1()
returns trigger language plpgsql set search_path = pg_catalog, pg_temp as $$
begin
  if not exists (select 1 from pg_timezone_names where name=new.time_zone) then
    raise exception 'INVALID_TIME_ZONE' using errcode='22023';
  end if;
  new.updated_at:=now();
  return new;
end;
$$;
revoke all on function private.validate_dungeon_push_device_v1() from public, anon, authenticated;
drop trigger if exists validate_dungeon_push_device_v1 on public.dungeon_push_devices_v1;
create trigger validate_dungeon_push_device_v1
  before insert or update on public.dungeon_push_devices_v1
  for each row execute function private.validate_dungeon_push_device_v1();

create table if not exists private.dungeon_push_outbox_v1 (
  id bigint generated always as identity primary key,
  account_id uuid not null,
  installation_id uuid not null,
  week_key date not null,
  charges_at_queue smallint not null check (charges_at_queue between 1 and 3),
  weekly_remaining_at_queue smallint not null check (weekly_remaining_at_queue between 1 and 12),
  queued_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending','submitted','confirmed','failed','canceled')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 4),
  next_attempt_at timestamptz not null default now(),
  net_request_id bigint,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  last_error text,
  unique (account_id,installation_id,week_key)
);
create index if not exists dungeon_push_pending_v1
 on private.dungeon_push_outbox_v1(next_attempt_at,id)
 where status='pending';
create index if not exists dungeon_push_submitted_v1
 on private.dungeon_push_outbox_v1(net_request_id)
 where status='submitted';
revoke all on private.dungeon_push_outbox_v1 from public, anon, authenticated;
alter table private.dungeon_push_outbox_v1 enable row level security;

-- Live charge calculation: charges refill every 8 hours, max 3; weekly cap is 12.
-- The weekly budget resets on UTC Monday (same clock as the authoritative game).
create or replace function private.dungeon_reminder_availability_v1(
  p_charges smallint, p_next_charge_at timestamptz, p_week_key date,
  p_weekly_used smallint, p_at timestamptz
) returns jsonb language sql stable set search_path=pg_catalog,pg_temp as $$
  select jsonb_build_object(
    'charges',case
      when p_charges>=3 or p_next_charge_at is null or p_next_charge_at>p_at then p_charges
      else least(3,p_charges+1+floor(extract(epoch from p_at-p_next_charge_at)/28800)::int)
    end,
    'remaining',greatest(0,12-case
      when p_week_key=((p_at at time zone 'UTC')::date - (extract(isodow from (p_at at time zone 'UTC'))::int-1)) then p_weekly_used
      else 0 end)
  );
$$;
revoke all on function private.dungeon_reminder_availability_v1(smallint,timestamptz,date,smallint,timestamptz) from public,anon,authenticated;

create or replace function private.enqueue_saturday_dungeon_push_v1(p_at timestamptz default now())
returns integer language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_inserted integer;
begin
  -- Trigger only for local Saturday 10:00-10:14. The 15-minute cron covers
  -- IANA time zones with 15/30/45-minute offsets and daylight-saving changes.
  with eligible as (
    select d.account_id,d.installation_id,
      ((p_at at time zone 'UTC')::date-
       (extract(isodow from (p_at at time zone 'UTC'))::int-1)) as week_key,
      private.dungeon_reminder_availability_v1(
        b.charges,b.next_charge_at,b.week_key,b.weekly_used,p_at) as availability
    from public.dungeon_push_devices_v1 d
    join public.coop_reward_charge_balances b on b.account_id=d.account_id
    where d.dungeon_reminders_enabled
      and d.updated_at>p_at-interval '120 days'
      and extract(isodow from (p_at at time zone d.time_zone))=6
      and extract(hour from (p_at at time zone d.time_zone))=10
      and extract(minute from (p_at at time zone d.time_zone)) between 0 and 14
  ),
  queued as (
    insert into private.dungeon_push_outbox_v1(
      account_id,installation_id,week_key,charges_at_queue,weekly_remaining_at_queue,queued_at
    )
    select e.account_id,e.installation_id,e.week_key,
      (e.availability->>'charges')::smallint,
      (e.availability->>'remaining')::smallint,p_at
    from eligible e where (e.availability->>'charges')::int>0
      and (e.availability->>'remaining')::int>0
    on conflict(account_id,installation_id,week_key) do nothing
    returning id
  ) select count(*) into v_inserted from queued;
  return v_inserted;
end;
$$;
revoke all on function private.enqueue_saturday_dungeon_push_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.enqueue_saturday_dungeon_push_v1(timestamptz) to service_role;

-- Submit asynchronously through pg_net. Missing/invalid credentials cannot be
-- mistaken for a successful phone delivery; the reconcile step checks responses.
create or replace function private.dispatch_saturday_dungeon_push_v1(p_at timestamptz default now())
returns integer language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_row record; v_request_id bigint; v_sent integer:=0; v_availability jsonb;
begin
  for v_row in
    select o.id,o.account_id,o.installation_id,o.week_key,o.attempt_count,
      d.expo_push_token, d.dungeon_reminders_enabled,
      b.charges,b.next_charge_at,b.week_key as balance_week,b.weekly_used
    from private.dungeon_push_outbox_v1 o
    left join public.dungeon_push_devices_v1 d
      on d.account_id=o.account_id and d.installation_id=o.installation_id
    left join public.coop_reward_charge_balances b on b.account_id=o.account_id
    where o.status='pending' and o.next_attempt_at<=p_at and o.attempt_count<4
    order by o.id limit 100 for update of o skip locked
  loop
    if coalesce(v_row.dungeon_reminders_enabled,false)=false
      or v_row.charges is null
      or v_row.week_key<>((p_at at time zone 'UTC')::date -
        (extract(isodow from (p_at at time zone 'UTC'))::int-1)) then
      update private.dungeon_push_outbox_v1 set status='canceled',last_error='no longer eligible'
        where id=v_row.id;
      continue;
    end if;
    v_availability:=private.dungeon_reminder_availability_v1(
       v_row.charges,v_row.next_charge_at,v_row.balance_week,v_row.weekly_used,p_at);
    if (v_availability->>'charges')::int<1 or (v_availability->>'remaining')::int<1 then
      update private.dungeon_push_outbox_v1 set status='canceled',last_error='charges or weekly cap used'
        where id=v_row.id;
      continue;
    end if;
    begin
      v_request_id:=net.http_post(
        url:='https://exp.host/--/api/v2/push/send',
        body:=jsonb_build_object(
          'to',v_row.expo_push_token,
          'title','Your dungeon charges await!',
          'body',format('You have %s dungeon charges ready and %s enhanced-reward runs left this week.',
               (v_availability->>'charges')::integer,(v_availability->>'remaining')::integer),
          'data',jsonb_build_object('kind','saturday_dungeon_reminder','screen','Coop'),
          'channelId','dungeon-reminders','priority','normal'
        ),
        headers:='{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
        timeout_milliseconds:=10000
      );
      update private.dungeon_push_outbox_v1
        set status='submitted',attempt_count=attempt_count+1,
            net_request_id=v_request_id,submitted_at=p_at,last_error=null
        where id=v_row.id;
      v_sent:=v_sent+1;
    exception when others then
      update private.dungeon_push_outbox_v1
        set attempt_count=least(4,attempt_count+1),
            next_attempt_at=p_at+interval '15 minutes',
            status=case when attempt_count>=3 then 'failed' else 'pending' end,
            last_error=left(sqlerrm,240) where id=v_row.id;
    end;
  end loop;
  return v_sent;
end;
$$;
revoke all on function private.dispatch_saturday_dungeon_push_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.dispatch_saturday_dungeon_push_v1(timestamptz) to service_role;

create or replace function private.expo_push_accepted_v1(p_status integer,p_body text)
returns boolean language plpgsql stable set search_path=pg_catalog,pg_temp as $$
begin
  if p_status not between 200 and 299 then return false; end if;
  return coalesce((p_body::jsonb #>> '{data,status}')='ok',false);
exception when others then return false;
end;
$$;
revoke all on function private.expo_push_accepted_v1(integer,text) from public,anon,authenticated;

create or replace function private.reconcile_saturday_dungeon_push_v1(p_at timestamptz default now())
returns integer language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_count integer;
begin
  with response as (
    select o.id,o.attempt_count,r.status_code,r.error_msg,r.content,
      private.expo_push_accepted_v1(r.status_code,r.content) as accepted
    from private.dungeon_push_outbox_v1 o
    join net._http_response r on r.id=o.net_request_id
    where o.status='submitted' and o.submitted_at<=p_at
  )
  update private.dungeon_push_outbox_v1 o
  set status=case when response.accepted then 'confirmed'
           when response.attempt_count>=4 then 'failed' else 'pending' end,
      confirmed_at=case when response.accepted then p_at else null end,
      next_attempt_at=case when response.accepted then o.next_attempt_at else p_at+interval '15 minutes' end,
      last_error=case when response.accepted then null
              else left(coalesce(response.error_msg,response.content,'Expo push rejected'),240) end,
      net_request_id=case when response.accepted then o.net_request_id else null end
  from response where response.id=o.id;
  get diagnostics v_count=row_count;
  -- pg_net may lose a response after a crash; allow bounded retry.
  update private.dungeon_push_outbox_v1 set status=case when attempt_count>=4 then 'failed' else 'pending' end,
    next_attempt_at=p_at+interval '15 minutes',net_request_id=null,last_error='push transport response timed out'
    where status='submitted' and submitted_at<p_at-interval '10 minutes'
      and not exists(select 1 from net._http_response r where r.id=net_request_id);
  delete from private.dungeon_push_outbox_v1 where queued_at<p_at-interval '35 days';
  return v_count;
end;
$$;
revoke all on function private.reconcile_saturday_dungeon_push_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.reconcile_saturday_dungeon_push_v1(timestamptz) to service_role;

-- The cron command is a single statement; work is idempotent and bounded.
create or replace function private.process_saturday_dungeon_push_v1(p_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_reconciled integer;v_queued integer;v_submitted integer;
begin
  v_reconciled:=private.reconcile_saturday_dungeon_push_v1(p_at);
  v_queued:=private.enqueue_saturday_dungeon_push_v1(p_at);
  v_submitted:=private.dispatch_saturday_dungeon_push_v1(p_at);
  return jsonb_build_object('reconciled',v_reconciled,'queued',v_queued,'submitted',v_submitted);
end;
$$;
revoke all on function private.process_saturday_dungeon_push_v1(timestamptz) from public,anon,authenticated;
grant execute on function private.process_saturday_dungeon_push_v1(timestamptz) to service_role;

-- No notifications are generated without a registered opt-in device and
-- a real positive charge + unused weekly enhanced-reward budget.
select cron.schedule(
  'veldryn-saturday-dungeon-push-v1',
  '*/15 * * * *',
  $$select private.process_saturday_dungeon_push_v1(now());$$
);
