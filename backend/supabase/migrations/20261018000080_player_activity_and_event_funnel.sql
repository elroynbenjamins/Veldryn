begin;

create table if not exists public.player_activity_daily (
  account_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  first_seen_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  foreground_opens integer not null default 0 check (foreground_opens>=0),
  gameplay_actions integer not null default 0 check (gameplay_actions>=0),
  event_actions integer not null default 0 check (event_actions>=0),
  coop_actions integer not null default 0 check (coop_actions>=0),
  primary key (account_id,activity_date)
);

alter table public.player_activity_daily enable row level security;
revoke all on table public.player_activity_daily from public,anon,authenticated;
grant select,insert,update,delete on table public.player_activity_daily to service_role;

create index if not exists player_activity_daily_date_idx
  on public.player_activity_daily(activity_date desc);

create or replace function public.record_player_activity_server_v1(p_account_id uuid,p_kind text)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_day date:=(clock_timestamp() at time zone 'UTC')::date;
begin
  if p_kind not in ('foreground','gameplay_action','event_action','coop_action') then
    raise exception 'invalid_player_activity_kind';
  end if;

  insert into public.player_activity_daily(
    account_id,activity_date,first_seen_at,last_seen_at,
    foreground_opens,gameplay_actions,event_actions,coop_actions
  )
  values(
    p_account_id,v_day,clock_timestamp(),clock_timestamp(),
    case when p_kind='foreground' then 1 else 0 end,
    case when p_kind='gameplay_action' then 1 else 0 end,
    case when p_kind='event_action' then 1 else 0 end,
    case when p_kind='coop_action' then 1 else 0 end
  )
  on conflict(account_id,activity_date) do update set
    last_seen_at=clock_timestamp(),
    foreground_opens=public.player_activity_daily.foreground_opens+excluded.foreground_opens,
    gameplay_actions=public.player_activity_daily.gameplay_actions+excluded.gameplay_actions,
    event_actions=public.player_activity_daily.event_actions+excluded.event_actions,
    coop_actions=public.player_activity_daily.coop_actions+excluded.coop_actions;
end $$;

revoke execute on function public.record_player_activity_server_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.record_player_activity_server_v1(uuid,text) to service_role;

create or replace function public.player_activity_analytics_server_v1(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_today date:=(clock_timestamp() at time zone 'UTC')::date;
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
  cohort as (
    select
      count(*) filter(where f.first_active_date=v_today) new_active_today,
      count(*) filter(where f.first_active_date=v_today-1) d1_cohort,
      count(*) filter(where f.first_active_date=v_today-1 and exists(
        select 1 from public.player_activity_daily a
        where a.account_id=f.account_id and a.activity_date=v_today
      )) d1_retained
    from firsts f
  ),
  auth_summary as (
    select
      count(*) filter(where (last_sign_in_at at time zone 'UTC')::date=v_today) latest_sign_in_today,
      count(*) filter(where (last_sign_in_at at time zone 'UTC')::date between v_today-6 and v_today) latest_sign_in_7d
    from auth.users
    where last_sign_in_at is not null
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
        'coopActions',coalesce(x.coop_actions,0)
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
        coalesce(sum(a.coop_actions),0) coop_actions
      from public.player_activity_daily a
      left join firsts f on f.account_id=a.account_id
      where a.activity_date=d.day
    ) x on true
  )
  select jsonb_build_object(
    'generatedAt',clock_timestamp(),
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
    'dauMau',case when s.mau>0 then s.dau::numeric/s.mau else null end,
    'latestAuthSignInToday',a.latest_sign_in_today,
    'latestAuthSignIn7d',a.latest_sign_in_7d,
    'daily',coalesce(d.series,'[]'::jsonb)
  )
  into v_result
  from summary s cross join cohort c cross join auth_summary a cross join daily d;

  return v_result;
end $$;

revoke execute on function public.player_activity_analytics_server_v1(integer) from public,anon,authenticated;
grant execute on function public.player_activity_analytics_server_v1(integer) to service_role;

create or replace function public.player_event_funnel_server_v1(p_event_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_event public.live_events;
  v_funnel jsonb;
  v_daily jsonb;
  v_shop jsonb;
begin
  select * into v_event from public.live_events where event_id=p_event_id;
  if not found then raise exception 'player_event_not_found'; end if;

  with states as (
    select account_id,state#>'{account}' account
    from public.online_game_states
    where state is not null
  )
  select jsonb_build_object(
    'projectChoosers',count(*) filter(where coalesce(account->'eventChoiceById','{}'::jsonb) ? p_event_id),
    'dailyGiftClaimers',count(*) filter(where exists(
      select 1 from jsonb_array_elements_text(coalesce(account->'eventDailyGiftClaimIds','[]'::jsonb)) v
      where v like p_event_id||':%'
    )),
    'dailyGiftClaims',coalesce(sum((select count(*) from jsonb_array_elements_text(coalesce(account->'eventDailyGiftClaimIds','[]'::jsonb)) v where v like p_event_id||':%')),0),
    'contractAcceptors',count(*) filter(where exists(
      select 1 from jsonb_array_elements_text(coalesce(account->'eventAcceptedContractIds','[]'::jsonb)) v
      where v like p_event_id||':%'
    )),
    'contractAcceptances',coalesce(sum((select count(*) from jsonb_array_elements_text(coalesce(account->'eventAcceptedContractIds','[]'::jsonb)) v where v like p_event_id||':%')),0),
    'contractClaimers',count(*) filter(where exists(
      select 1 from jsonb_array_elements_text(coalesce(account->'eventObjectiveClaimIds','[]'::jsonb)) v
      where v like p_event_id||':%'
    )),
    'contractClaims',coalesce(sum((select count(*) from jsonb_array_elements_text(coalesce(account->'eventObjectiveClaimIds','[]'::jsonb)) v where v like p_event_id||':%')),0),
    'weeklyClaimers',count(*) filter(where exists(
      select 1 from jsonb_array_elements_text(coalesce(account->'eventWeeklyClaimIds','[]'::jsonb)) v
      where v like p_event_id||':%'
    )),
    'weeklyClaims',coalesce(sum((select count(*) from jsonb_array_elements_text(coalesce(account->'eventWeeklyClaimIds','[]'::jsonb)) v where v like p_event_id||':%')),0),
    'shopBuyers',count(*) filter(where exists(
      select 1 from jsonb_each_text(coalesce(account->'eventShopPurchaseCounts','{}'::jsonb)) p
      where p.key like p_event_id||':%' and coalesce(p.value,'0')::integer>0
    )),
    'shopPurchases',coalesce(sum((select coalesce(sum(coalesce(p.value,'0')::integer),0) from jsonb_each_text(coalesce(account->'eventShopPurchaseCounts','{}'::jsonb)) p where p.key like p_event_id||':%')),0),
    'milestoneClaimers',count(*) filter(where exists(
      select 1 from jsonb_array_elements_text(coalesce(account->'eventRewardClaimIds','[]'::jsonb)) v
      where v like p_event_id||':%'
    )),
    'milestoneClaims',coalesce(sum((select count(*) from jsonb_array_elements_text(coalesce(account->'eventRewardClaimIds','[]'::jsonb)) v where v like p_event_id||':%')),0),
    'discoveryClaimers',count(*) filter(where exists(
      select 1 from jsonb_array_elements_text(coalesce(account->'eventDiscoveryClaimIds','[]'::jsonb)) v
      where v like p_event_id||':%'
    )),
    'communityContributors',count(*) filter(where coalesce((account->'eventContributionById'->>p_event_id)::bigint,0)>0)
  )
  into v_funnel
  from states;

  with claims as (
    select g.account_id,substring(v.value from char_length(p_event_id)+2) claim_date
    from public.online_game_states g
    cross join lateral jsonb_array_elements_text(coalesce(g.state#>'{account,eventDailyGiftClaimIds}','[]'::jsonb)) v(value)
    where v.value like p_event_id||':%'
  )
  select coalesce(jsonb_agg(jsonb_build_object('date',claim_date,'claimers',claimers) order by claim_date),'[]'::jsonb)
  into v_daily
  from (
    select claim_date,count(distinct account_id) claimers
    from claims
    group by claim_date
  ) x;

  with purchases as (
    select g.account_id,substring(p.key from char_length(p_event_id)+2) offer_id,coalesce(p.value,'0')::integer quantity
    from public.online_game_states g
    cross join lateral jsonb_each_text(coalesce(g.state#>'{account,eventShopPurchaseCounts}','{}'::jsonb)) p
    where p.key like p_event_id||':%' and coalesce(p.value,'0')::integer>0
  )
  select coalesce(jsonb_agg(jsonb_build_object('offerId',offer_id,'purchases',purchases,'buyers',buyers) order by purchases desc,offer_id),'[]'::jsonb)
  into v_shop
  from (
    select offer_id,sum(quantity) purchases,count(distinct account_id) buyers
    from purchases
    group by offer_id
  ) x;

  return jsonb_build_object(
    'eventId',p_event_id,
    'generatedAt',clock_timestamp(),
    'funnel',coalesce(v_funnel,'{}'::jsonb),
    'dailyGiftDays',coalesce(v_daily,'[]'::jsonb),
    'shopMix',coalesce(v_shop,'[]'::jsonb)
  );
end $$;

revoke execute on function public.player_event_funnel_server_v1(text) from public,anon,authenticated;
grant execute on function public.player_event_funnel_server_v1(text) to service_role;

commit;
