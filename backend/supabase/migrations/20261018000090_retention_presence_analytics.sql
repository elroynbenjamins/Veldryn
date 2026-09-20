begin;

alter table public.player_activity_daily
  add column if not exists estimated_active_seconds bigint not null default 0 check (estimated_active_seconds>=0),
  add column if not exists estimated_sessions integer not null default 0 check (estimated_sessions>=0),
  add column if not exists heartbeat_count integer not null default 0 check (heartbeat_count>=0);

create table if not exists public.player_presence_5m (
  account_id uuid not null references auth.users(id) on delete cascade,
  bucket_start timestamptz not null,
  first_seen_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  signal_count integer not null default 1 check (signal_count>=1),
  primary key(account_id,bucket_start)
);

alter table public.player_presence_5m enable row level security;
revoke all on table public.player_presence_5m from public,anon,authenticated;
grant select,insert,update,delete on table public.player_presence_5m to service_role;

create index if not exists player_presence_5m_bucket_idx
  on public.player_presence_5m(bucket_start desc);

create or replace function public.record_player_activity_server_v1(p_account_id uuid,p_kind text)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_day date:=(v_now at time zone 'UTC')::date;
  v_last timestamptz;
  v_gap numeric:=0;
  v_active_increment integer:=60;
  v_session_increment integer:=1;
  v_bucket timestamptz;
begin
  if p_kind not in ('foreground','gameplay_action','event_action','coop_action','heartbeat') then
    raise exception 'invalid_player_activity_kind';
  end if;

  select last_seen_at
  into v_last
  from public.player_activity_daily
  where account_id=p_account_id and activity_date=v_day
  for update;

  if found then
    v_gap:=greatest(0,extract(epoch from (v_now-v_last)));
    if v_gap>1800 then
      v_active_increment:=60;
      v_session_increment:=1;
    else
      v_active_increment:=greatest(0,least(300,floor(v_gap)::integer));
      v_session_increment:=0;
    end if;
  end if;

  insert into public.player_activity_daily(
    account_id,activity_date,first_seen_at,last_seen_at,
    foreground_opens,gameplay_actions,event_actions,coop_actions,
    estimated_active_seconds,estimated_sessions,heartbeat_count
  )
  values(
    p_account_id,v_day,v_now,v_now,
    case when p_kind='foreground' then 1 else 0 end,
    case when p_kind='gameplay_action' then 1 else 0 end,
    case when p_kind='event_action' then 1 else 0 end,
    case when p_kind='coop_action' then 1 else 0 end,
    v_active_increment,
    v_session_increment,
    case when p_kind='heartbeat' then 1 else 0 end
  )
  on conflict(account_id,activity_date) do update set
    last_seen_at=v_now,
    foreground_opens=public.player_activity_daily.foreground_opens+excluded.foreground_opens,
    gameplay_actions=public.player_activity_daily.gameplay_actions+excluded.gameplay_actions,
    event_actions=public.player_activity_daily.event_actions+excluded.event_actions,
    coop_actions=public.player_activity_daily.coop_actions+excluded.coop_actions,
    estimated_active_seconds=least(86400,public.player_activity_daily.estimated_active_seconds+v_active_increment),
    estimated_sessions=public.player_activity_daily.estimated_sessions+v_session_increment,
    heartbeat_count=public.player_activity_daily.heartbeat_count+excluded.heartbeat_count;

  v_bucket:=date_trunc('hour',v_now)
    + make_interval(mins => (extract(minute from v_now)::integer/5)*5);

  insert into public.player_presence_5m(account_id,bucket_start,first_seen_at,last_seen_at,signal_count)
  values(p_account_id,v_bucket,v_now,v_now,1)
  on conflict(account_id,bucket_start) do update set
    last_seen_at=v_now,
    signal_count=public.player_presence_5m.signal_count+1;
end $$;

revoke execute on function public.record_player_activity_server_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.record_player_activity_server_v1(uuid,text) to service_role;

create or replace function public.record_player_presence_v1()
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_account_id uuid:=auth.uid();
begin
  if v_account_id is null then
    raise exception 'authentication_required';
  end if;
  perform public.record_player_activity_server_v1(v_account_id,'heartbeat');
end $$;

revoke execute on function public.record_player_presence_v1() from public,anon;
grant execute on function public.record_player_presence_v1() to authenticated;

create or replace function public.player_activity_analytics_server_v1(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_today date:=(v_now at time zone 'UTC')::date;
  v_days integer:=greatest(7,least(coalesce(p_days,30),90));
  v_result jsonb;
begin
  with firsts as (
    select account_id,min(activity_date) first_active_date
    from public.player_activity_daily
    group by account_id
  ),
  summary as (
    select
      count(distinct account_id) filter(where activity_date=v_today) dau,
      count(distinct account_id) filter(where activity_date=v_today-1) dau_yesterday,
      count(distinct account_id) filter(where activity_date between v_today-6 and v_today) wau,
      count(distinct account_id) filter(where activity_date between v_today-29 and v_today) mau
    from public.player_activity_daily
  ),
  cohort_summary as (
    select
      count(*) filter(where f.first_active_date=v_today) new_active_today,
      count(*) filter(where f.first_active_date=v_today-1) d1_cohort,
      count(*) filter(where f.first_active_date=v_today-1 and exists(
        select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=v_today
      )) d1_retained,
      count(*) filter(where f.first_active_date=v_today-7) d7_cohort,
      count(*) filter(where f.first_active_date=v_today-7 and exists(
        select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=v_today
      )) d7_retained,
      count(*) filter(where f.first_active_date=v_today-30) d30_cohort,
      count(*) filter(where f.first_active_date=v_today-30 and exists(
        select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=v_today
      )) d30_retained
    from firsts f
  ),
  session_summary as (
    select
      coalesce(sum(estimated_active_seconds),0) active_seconds_today,
      coalesce(sum(estimated_sessions),0) sessions_today,
      coalesce(sum(heartbeat_count),0) heartbeats_today
    from public.player_activity_daily
    where activity_date=v_today
  ),
  auth_summary as (
    select
      count(*) filter(where (last_sign_in_at at time zone 'UTC')::date=v_today) latest_sign_in_today,
      count(*) filter(where (last_sign_in_at at time zone 'UTC')::date between v_today-6 and v_today) latest_sign_in_7d
    from auth.users
    where last_sign_in_at is not null
  ),
  presence_buckets as (
    select bucket_start,count(*) observed_accounts
    from public.player_presence_5m
    where bucket_start>=v_now-interval '7 days'
    group by bucket_start
  ),
  presence_summary as (
    select
      (select count(distinct account_id) from public.player_presence_5m where bucket_start>=v_now-interval '10 minutes') observed_active_10m,
      coalesce(max(observed_accounts) filter(where bucket_start>=v_now-interval '24 hours'),0) peak_5m_24h,
      coalesce(max(observed_accounts),0) peak_5m_7d
    from presence_buckets
  ),
  days as (
    select generate_series(v_today-(v_days-1),v_today,interval '1 day')::date as day
  ),
  daily as (
    select jsonb_agg(
      jsonb_build_object(
        'date',d.day,
        'active',coalesce(x.active,0),
        'newActive',coalesce(x.new_active,0),
        'returning',greatest(0,coalesce(x.active,0)-coalesce(x.new_active,0)),
        'foregroundOpens',coalesce(x.foreground_opens,0),
        'gameplayActions',coalesce(x.gameplay_actions,0),
        'eventActions',coalesce(x.event_actions,0),
        'coopActions',coalesce(x.coop_actions,0),
        'estimatedActiveMinutes',round(coalesce(x.estimated_active_seconds,0)::numeric/60,1),
        'estimatedSessions',coalesce(x.estimated_sessions,0),
        'peakObserved5m',coalesce(p.peak_observed_5m,0)
      )
      order by d.day
    ) series
    from days d
    left join lateral (
      select
        count(*) active,
        count(*) filter(where f.first_active_date=d.day) new_active,
        coalesce(sum(a.foreground_opens),0) foreground_opens,
        coalesce(sum(a.gameplay_actions),0) gameplay_actions,
        coalesce(sum(a.event_actions),0) event_actions,
        coalesce(sum(a.coop_actions),0) coop_actions,
        coalesce(sum(a.estimated_active_seconds),0) estimated_active_seconds,
        coalesce(sum(a.estimated_sessions),0) estimated_sessions
      from public.player_activity_daily a
      left join firsts f on f.account_id=a.account_id
      where a.activity_date=d.day
    ) x on true
    left join lateral (
      select max(c) peak_observed_5m
      from (
        select count(*) c
        from public.player_presence_5m pp
        where (pp.bucket_start at time zone 'UTC')::date=d.day
        group by pp.bucket_start
      ) z
    ) p on true
  ),
  cohort_days as (
    select generate_series(v_today-59,v_today,interval '1 day')::date as cohort_date
  ),
  cohorts as (
    select jsonb_agg(
      jsonb_build_object(
        'date',cd.cohort_date,
        'size',coalesce(x.cohort_size,0),
        'd1Retained',coalesce(x.d1_retained,0),
        'd1Rate',case when coalesce(x.cohort_size,0)>0 and cd.cohort_date<=v_today-1 then x.d1_retained::numeric/x.cohort_size else null end,
        'd7Retained',coalesce(x.d7_retained,0),
        'd7Rate',case when coalesce(x.cohort_size,0)>0 and cd.cohort_date<=v_today-7 then x.d7_retained::numeric/x.cohort_size else null end,
        'd30Retained',coalesce(x.d30_retained,0),
        'd30Rate',case when coalesce(x.cohort_size,0)>0 and cd.cohort_date<=v_today-30 then x.d30_retained::numeric/x.cohort_size else null end
      )
      order by cd.cohort_date
    ) series
    from cohort_days cd
    left join lateral (
      select
        count(*) cohort_size,
        count(*) filter(where exists(
          select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=cd.cohort_date+1
        )) d1_retained,
        count(*) filter(where exists(
          select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=cd.cohort_date+7
        )) d7_retained,
        count(*) filter(where exists(
          select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=cd.cohort_date+30
        )) d30_retained
      from firsts f
      where f.first_active_date=cd.cohort_date
    ) x on true
  )
  select jsonb_build_object(
    'generatedAt',v_now,
    'timezone','UTC',
    'dau',s.dau,
    'dauYesterday',s.dau_yesterday,
    'wau',s.wau,
    'mau',s.mau,
    'newActiveToday',c.new_active_today,
    'returningToday',greatest(0,s.dau-c.new_active_today),
    'd1Cohort',c.d1_cohort,
    'd1Retained',c.d1_retained,
    'd1Retention',case when c.d1_cohort>0 then c.d1_retained::numeric/c.d1_cohort else null end,
    'd7Cohort',c.d7_cohort,
    'd7Retained',c.d7_retained,
    'd7Retention',case when c.d7_cohort>0 then c.d7_retained::numeric/c.d7_cohort else null end,
    'd30Cohort',c.d30_cohort,
    'd30Retained',c.d30_retained,
    'd30Retention',case when c.d30_cohort>0 then c.d30_retained::numeric/c.d30_cohort else null end,
    'dauMau',case when s.mau>0 then s.dau::numeric/s.mau else null end,
    'estimatedActiveMinutesToday',round(ss.active_seconds_today::numeric/60,1),
    'estimatedSessionsToday',ss.sessions_today,
    'estimatedAvgActiveMinutesPerDau',case when s.dau>0 then round(ss.active_seconds_today::numeric/60/s.dau,1) else null end,
    'estimatedAvgSessionMinutes',case when ss.sessions_today>0 then round(ss.active_seconds_today::numeric/60/ss.sessions_today,1) else null end,
    'presenceHeartbeatsToday',ss.heartbeats_today,
    'observedActive10m',ps.observed_active_10m,
    'peakObserved5m24h',ps.peak_5m_24h,
    'peakObserved5m7d',ps.peak_5m_7d,
    'latestAuthSignInToday',a.latest_sign_in_today,
    'latestAuthSignIn7d',a.latest_sign_in_7d,
    'daily',coalesce(d.series,'[]'::jsonb),
    'cohorts',coalesce(ch.series,'[]'::jsonb)
  )
  into v_result
  from summary s
  cross join cohort_summary c
  cross join session_summary ss
  cross join auth_summary a
  cross join presence_summary ps
  cross join daily d
  cross join cohorts ch;

  return v_result;
end $$;

revoke execute on function public.player_activity_analytics_server_v1(integer) from public,anon,authenticated;
grant execute on function public.player_activity_analytics_server_v1(integer) to service_role;

commit;
