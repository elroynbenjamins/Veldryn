begin;

alter table public.player_activity_daily
  add column if not exists first_meaningful_kind text
    check (first_meaningful_kind is null or first_meaningful_kind in ('gameplay_action','event_action','coop_action')),
  add column if not exists first_meaningful_at timestamptz;

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
  v_meaningful_kind text:=case when p_kind in ('gameplay_action','event_action','coop_action') then p_kind else null end;
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
    estimated_active_seconds,estimated_sessions,heartbeat_count,
    first_meaningful_kind,first_meaningful_at
  )
  values(
    p_account_id,v_day,v_now,v_now,
    case when p_kind='foreground' then 1 else 0 end,
    case when p_kind='gameplay_action' then 1 else 0 end,
    case when p_kind='event_action' then 1 else 0 end,
    case when p_kind='coop_action' then 1 else 0 end,
    v_active_increment,
    v_session_increment,
    case when p_kind='heartbeat' then 1 else 0 end,
    v_meaningful_kind,
    case when v_meaningful_kind is not null then v_now else null end
  )
  on conflict(account_id,activity_date) do update set
    last_seen_at=v_now,
    foreground_opens=public.player_activity_daily.foreground_opens+excluded.foreground_opens,
    gameplay_actions=public.player_activity_daily.gameplay_actions+excluded.gameplay_actions,
    event_actions=public.player_activity_daily.event_actions+excluded.event_actions,
    coop_actions=public.player_activity_daily.coop_actions+excluded.coop_actions,
    estimated_active_seconds=least(86400,public.player_activity_daily.estimated_active_seconds+v_active_increment),
    estimated_sessions=public.player_activity_daily.estimated_sessions+v_session_increment,
    heartbeat_count=public.player_activity_daily.heartbeat_count+excluded.heartbeat_count,
    first_meaningful_kind=coalesce(public.player_activity_daily.first_meaningful_kind,excluded.first_meaningful_kind),
    first_meaningful_at=coalesce(public.player_activity_daily.first_meaningful_at,excluded.first_meaningful_at);

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

create or replace function public.player_segmentation_analytics_server_v1(
  p_days integer default 90,
  p_min_sample integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_today date:=(v_now at time zone 'UTC')::date;
  v_days integer:=greatest(30,least(coalesce(p_days,90),180));
  v_min_sample integer:=greatest(3,least(coalesce(p_min_sample,5),50));
  v_since date:=v_today-(greatest(30,least(coalesce(p_days,90),180))-1);
  v_result jsonb;
begin
  with
  first_active as (
    select account_id,min(activity_date) first_active_date
    from public.player_activity_daily
    group by account_id
  ),
  first_character as (
    select distinct on(account_id) account_id,class_id
    from public.characters
    order by account_id,created_at,id
  ),
  character_progress as (
    select account_id,max(level) max_level
    from public.characters
    group by account_id
  ),
  first_meaningful as (
    select distinct on(account_id) account_id,first_meaningful_kind,first_meaningful_at
    from public.player_activity_daily
    where first_meaningful_kind is not null
    order by account_id,first_meaningful_at nulls last,activity_date
  ),
  activity_days as (
    select account_id,count(*) filter(where activity_date between v_today-29 and v_today) active_days_30
    from public.player_activity_daily
    group by account_id
  ),
  state_flags as (
    select
      g.account_id,
      (
        coalesce(
          case
            when coalesce(g.state#>>'{account,longTermMetrics,weekly_orders.completed}','') ~ '^[-]?[0-9]+(?:[.][0-9]+)?$'
              then (g.state#>>'{account,longTermMetrics,weekly_orders.completed}')::numeric
            else 0
          end,0
        )>0
        or exists(
          select 1
          from jsonb_array_elements(coalesce(g.state#>'{account,weeklyOrders,orders}','[]'::jsonb)) o
          where coalesce(nullif(o->>'progress','')::numeric,0)>0
        )
        or jsonb_array_length(coalesce(g.state#>'{account,weeklyOrderPendingRewards}','[]'::jsonb))>0
      ) contract_engaged,
      (
        select count(*)
        from jsonb_array_elements(coalesce(g.state->'quests','[]'::jsonb)) q
        where q->>'status'='claimed'
      ) story_claims
    from public.online_game_states g
    where g.state is not null
  ),
  guild_accounts as (
    select distinct account_id from public.guild_members
  ),
  party_accounts as (
    select distinct account_id from public.party_members
  ),
  coop_accounts as (
    select distinct account_id
    from (
      select controller_account_id account_id
      from public.expedition_runs
      where controller_account_id is not null
      union
      select active_participant_account_id account_id
      from public.expedition_run_members
      where active_participant_account_id is not null
    ) x
  ),
  event_accounts as (
    select distinct account_id
    from public.event_progress
    where progress>0 or currency_balance>0 or prestige_balance>0 or repeat_cache_claims>0
  ),
  base as (
    select
      f.account_id,
      f.first_active_date,
      coalesce(u.is_anonymous,false) is_anonymous,
      fc.class_id starting_class,
      coalesce(cp.max_level,0) max_level,
      fm.first_meaningful_kind,
      coalesce(ad.active_days_30,0) active_days_30,
      coalesce(sf.story_claims,0) story_claims,
      coalesce(sf.contract_engaged,false) contract_engaged,
      ga.account_id is not null current_guild,
      pa.account_id is not null party_history,
      ca.account_id is not null coop_participant,
      ea.account_id is not null event_participant,
      exists(
        select 1 from public.player_activity_daily d
        where d.account_id=f.account_id and d.activity_date=f.first_active_date+1
      ) retained_d1,
      exists(
        select 1 from public.player_activity_daily d
        where d.account_id=f.account_id and d.activity_date=f.first_active_date+7
      ) retained_d7,
      exists(
        select 1 from public.player_activity_daily d
        where d.account_id=f.account_id and d.activity_date=f.first_active_date+30
      ) retained_d30
    from first_active f
    join auth.users u on u.id=f.account_id and u.deleted_at is null
    left join first_character fc using(account_id)
    left join character_progress cp using(account_id)
    left join first_meaningful fm using(account_id)
    left join activity_days ad using(account_id)
    left join state_flags sf using(account_id)
    left join guild_accounts ga using(account_id)
    left join party_accounts pa using(account_id)
    left join coop_accounts ca using(account_id)
    left join event_accounts ea using(account_id)
    where f.first_active_date>=v_since
  ),
  segment_rows as (
    select b.*,s.dimension_key,s.dimension_label,s.segment_key,s.segment_label,s.segment_kind
    from base b
    cross join lateral (values
      ('starting_class','Starting class',coalesce(b.starting_class,'NO_CHARACTER'),
        case when b.starting_class is null then 'No character' else initcap(replace(lower(b.starting_class),'_',' ')) end,'baseline'),
      ('account_type','Account type',case when b.is_anonymous then 'guest' else 'registered' end,
        case when b.is_anonymous then 'Guest / anonymous' else 'Registered' end,'baseline'),
      ('first_activity','First meaningful activity',coalesce(b.first_meaningful_kind,'not_recorded'),
        case b.first_meaningful_kind when 'gameplay_action' then 'Core gameplay' when 'event_action' then 'Event' when 'coop_action' then 'Co-op' else 'Not recorded yet' end,'baseline'),
      ('guild','Current Guild membership',case when b.current_guild then 'in_guild' else 'no_guild' end,
        case when b.current_guild then 'In a Guild' else 'No Guild' end,'behavior'),
      ('party','Party participation',case when b.party_history then 'party_history' else 'no_party_history' end,
        case when b.party_history then 'Has Party history' else 'No Party history' end,'behavior'),
      ('coop','Co-op participation',case when b.coop_participant then 'coop_participant' else 'no_coop' end,
        case when b.coop_participant then 'Active co-op participant' else 'No active co-op participation' end,'behavior'),
      ('event','Event participation',case when b.event_participant then 'event_participant' else 'no_event' end,
        case when b.event_participant then 'Event participant' else 'No Event progress' end,'behavior'),
      ('contracts','Contract Board',case when b.contract_engaged then 'engaged' else 'not_engaged' end,
        case when b.contract_engaged then 'Engaged' else 'No engagement' end,'behavior')
    ) s(dimension_key,dimension_label,segment_key,segment_label,segment_kind)
  ),
  aggregated as (
    select
      dimension_key,dimension_label,segment_key,segment_label,segment_kind,
      count(*) accounts,
      count(*) filter(where max_level>0) with_character,
      percentile_cont(0.5) within group(order by max_level) filter(where max_level>0) median_level,
      count(*) filter(where max_level>=10) level10_count,
      count(*) filter(where max_level>=25) level25_count,
      count(*) filter(where story_claims>0) story_count,
      round(avg(active_days_30)::numeric,1) avg_active_days_30,
      count(*) filter(where first_active_date<=v_today-1) d1_eligible,
      count(*) filter(where first_active_date<=v_today-1 and retained_d1) d1_retained,
      count(*) filter(where first_active_date<=v_today-7) d7_eligible,
      count(*) filter(where first_active_date<=v_today-7 and retained_d7) d7_retained,
      count(*) filter(where first_active_date<=v_today-30) d30_eligible,
      count(*) filter(where first_active_date<=v_today-30 and retained_d30) d30_retained
    from segment_rows
    group by dimension_key,dimension_label,segment_key,segment_label,segment_kind
  ),
  dimensions as (
    select
      dimension_key,
      max(dimension_label) dimension_label,
      max(segment_kind) segment_kind,
      jsonb_agg(
        jsonb_build_object(
          'key',segment_key,
          'label',segment_label,
          'accounts',accounts,
          'sampleOk',accounts>=v_min_sample,
          'withCharacter',with_character,
          'medianLevel',case when with_character>=v_min_sample then round(median_level::numeric,1) else null end,
          'level10Reach',case when with_character>=v_min_sample then level10_count::numeric/with_character else null end,
          'level25Reach',case when with_character>=v_min_sample then level25_count::numeric/with_character else null end,
          'storyReach',case when accounts>=v_min_sample then story_count::numeric/accounts else null end,
          'avgActiveDays30',case when accounts>=v_min_sample then avg_active_days_30 else null end,
          'd1Eligible',d1_eligible,
          'd1Retention',case when d1_eligible>=v_min_sample then d1_retained::numeric/d1_eligible else null end,
          'd7Eligible',d7_eligible,
          'd7Retention',case when d7_eligible>=v_min_sample then d7_retained::numeric/d7_eligible else null end,
          'd30Eligible',d30_eligible,
          'd30Retention',case when d30_eligible>=v_min_sample then d30_retained::numeric/d30_eligible else null end
        )
        order by accounts desc,segment_label
      ) rows
    from aggregated
    group by dimension_key
  )
  select jsonb_build_object(
    'generatedAt',v_now,
    'windowDays',v_days,
    'minSample',v_min_sample,
    'population',(select count(*) from base),
    'notes',jsonb_build_array(
      'Retention is exact-day return from the first recorded active day.',
      'Behavior segments describe correlation, not causation.',
      'First meaningful activity is exact from this instrumentation deployment forward; older players may remain Not recorded until a new meaningful action is observed.',
      'Rates are hidden until the relevant segment or matured cohort reaches the configured minimum sample.'
    ),
    'dimensions',coalesce(jsonb_agg(
      jsonb_build_object(
        'key',dimension_key,
        'label',dimension_label,
        'kind',segment_kind,
        'rows',rows
      )
      order by case dimension_key
        when 'starting_class' then 1 when 'account_type' then 2 when 'first_activity' then 3
        when 'guild' then 4 when 'party' then 5 when 'coop' then 6 when 'event' then 7 else 8 end
    ),'[]'::jsonb)
  )
  into v_result
  from dimensions;

  return v_result;
end $$;

revoke execute on function public.player_segmentation_analytics_server_v1(integer,integer) from public,anon,authenticated;
grant execute on function public.player_segmentation_analytics_server_v1(integer,integer) to service_role;

commit;
