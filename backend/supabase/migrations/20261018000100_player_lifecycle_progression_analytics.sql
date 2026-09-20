begin;

create or replace function public.player_lifecycle_analytics_server_v1(p_days integer default 30)
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
  v_start timestamptz:=v_now-make_interval(days=>greatest(7,least(coalesce(p_days,30),90)));
  v_result jsonb;
begin
  with
  signup_cohort as (
    select id account_id,created_at,coalesce(is_anonymous,false) is_anonymous
    from auth.users
    where deleted_at is null and created_at>=v_start
  ),
  first_activity as (
    select
      account_id,
      min(first_seen_at) first_open_at,
      min(first_seen_at) filter(where gameplay_actions+event_actions+coop_actions>0) first_gameplay_at
    from public.player_activity_daily
    group by account_id
  ),
  character_progress as (
    select account_id,min(created_at) first_character_at,max(level) max_level
    from public.characters
    group by account_id
  ),
  state_flags as (
    select
      g.account_id,
      nullif(g.state->>'currentRegionId','') current_region_id,
      exists(
        select 1
        from jsonb_array_elements(coalesce(g.state->'quests','[]'::jsonb)) q
        where q->>'questId'='QST_001' and q->>'status'='claimed'
      ) first_story_claimed,
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
          where coalesce((o->>'claimed')::boolean,false)
        )
      ) contract_completed,
      (
        select count(*)
        from jsonb_array_elements(coalesce(g.state->'quests','[]'::jsonb)) q
        where q->>'status'='claimed'
      ) story_claims
    from public.online_game_states g
    where g.state is not null
  ),
  dungeon_progress as (
    select
      controller_account_id account_id,
      min(created_at) first_dungeon_at,
      min(completed_at) filter(where completed_at is not null) first_dungeon_clear_at
    from public.expedition_runs
    where controller_account_id is not null
    group by controller_account_id
  ),
  cohort_rows as (
    select
      s.account_id,s.created_at,s.is_anonymous,
      a.first_open_at,a.first_gameplay_at,
      c.first_character_at,c.max_level,
      coalesce(f.first_story_claimed,false) first_story_claimed,
      coalesce(f.contract_engaged,false) contract_engaged,
      coalesce(f.contract_completed,false) contract_completed,
      d.first_dungeon_at,d.first_dungeon_clear_at
    from signup_cohort s
    left join first_activity a using(account_id)
    left join character_progress c using(account_id)
    left join state_flags f using(account_id)
    left join dungeon_progress d using(account_id)
  ),
  stage_summary as (
    select
      count(*) signups,
      count(*) filter(where is_anonymous) anonymous_signups,
      count(*) filter(where not is_anonymous) registered_signups,
      count(*) filter(where first_open_at is not null) opened_game,
      count(*) filter(where first_character_at is not null) character_created,
      count(*) filter(where first_gameplay_at is not null) meaningful_gameplay,
      count(*) filter(where coalesce(max_level,0)>=2) level_2,
      count(*) filter(where first_story_claimed) first_story_claimed,
      count(*) filter(where contract_engaged) contract_engaged,
      count(*) filter(where contract_completed) contract_completed,
      count(*) filter(where first_dungeon_at is not null) dungeon_started,
      count(*) filter(where first_dungeon_clear_at is not null) dungeon_cleared,
      percentile_cont(0.5) within group(order by extract(epoch from(first_character_at-created_at))/3600)
        filter(where first_character_at>=created_at) median_hours_to_character,
      percentile_cont(0.5) within group(order by extract(epoch from(first_open_at-created_at))/3600)
        filter(where first_open_at>=created_at) median_hours_to_first_open,
      percentile_cont(0.5) within group(order by extract(epoch from(first_dungeon_at-created_at))/3600)
        filter(where first_dungeon_at>=created_at) median_hours_to_first_dungeon
    from cohort_rows
  ),
  active_accounts as (
    select distinct account_id
    from public.player_activity_daily
    where activity_date>=v_today-(v_days-1)
  ),
  active_progress as (
    select
      a.account_id,
      coalesce(c.max_level,0) max_level,
      coalesce(f.current_region_id,'UNKNOWN') current_region_id,
      coalesce(f.story_claims,0) story_claims,
      coalesce(f.contract_engaged,false) contract_engaged
    from active_accounts a
    left join character_progress c using(account_id)
    left join state_flags f using(account_id)
  ),
  level_thresholds as (
    select * from (values (2),(5),(10),(20),(25),(45),(70),(90)) t(level)
  ),
  level_reach as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'level',t.level,
        'count',coalesce(x.reached,0),
        'rate',case when x.with_character>0 then x.reached::numeric/x.with_character else null end
      ) order by t.level
    ),'[]'::jsonb) rows
    from level_thresholds t
    left join lateral (
      select
        count(*) filter(where max_level>=t.level) reached,
        count(*) filter(where max_level>0) with_character
      from active_progress
    ) x on true
  ),
  level_bands as (
    select coalesce(jsonb_agg(jsonb_build_object('band',band,'count',count) order by sort_key),'[]'::jsonb) rows
    from (
      select
        case
          when max_level<=0 then 'No character'
          when max_level<=4 then '1–4'
          when max_level<=9 then '5–9'
          when max_level<=19 then '10–19'
          when max_level<=24 then '20–24'
          when max_level<=44 then '25–44'
          when max_level<=69 then '45–69'
          when max_level<=89 then '70–89'
          else '90+'
        end band,
        case
          when max_level<=0 then 0 when max_level<=4 then 1 when max_level<=9 then 2 when max_level<=19 then 3
          when max_level<=24 then 4 when max_level<=44 then 5 when max_level<=69 then 6 when max_level<=89 then 7 else 8
        end sort_key,
        count(*) count
      from active_progress
      group by 1,2
    ) x
  ),
  region_distribution as (
    select coalesce(jsonb_agg(jsonb_build_object('regionId',current_region_id,'count',count) order by count desc,current_region_id),'[]'::jsonb) rows
    from (
      select current_region_id,count(*) count
      from active_progress
      group by current_region_id
    ) x
  ),
  story_distribution as (
    select coalesce(jsonb_agg(jsonb_build_object('band',band,'count',count) order by sort_key),'[]'::jsonb) rows
    from (
      select
        case
          when story_claims=0 then '0'
          when story_claims<=4 then '1–4'
          when story_claims<=9 then '5–9'
          when story_claims<=14 then '10–14'
          else '15'
        end band,
        case when story_claims=0 then 0 when story_claims<=4 then 1 when story_claims<=9 then 2 when story_claims<=14 then 3 else 4 end sort_key,
        count(*) count
      from active_progress
      group by 1,2
    ) x
  ),
  firsts as (
    select account_id,min(activity_date) first_active_date
    from public.player_activity_daily
    group by account_id
  ),
  long_retention as (
    select
      count(*) filter(where first_active_date=v_today-60) d60_cohort,
      count(*) filter(where first_active_date=v_today-60 and exists(
        select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=v_today
      )) d60_retained,
      count(*) filter(where first_active_date=v_today-90) d90_cohort,
      count(*) filter(where first_active_date=v_today-90 and exists(
        select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=v_today
      )) d90_retained
    from firsts f
  ),
  cohort_days as (
    select generate_series(v_today-149,v_today,interval '1 day')::date cohort_date
  ),
  long_cohorts as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'date',d.cohort_date,
        'size',coalesce(x.cohort_size,0),
        'd30Retained',coalesce(x.d30_retained,0),
        'd30Rate',case when coalesce(x.cohort_size,0)>0 and d.cohort_date<=v_today-30 then x.d30_retained::numeric/x.cohort_size else null end,
        'd60Retained',coalesce(x.d60_retained,0),
        'd60Rate',case when coalesce(x.cohort_size,0)>0 and d.cohort_date<=v_today-60 then x.d60_retained::numeric/x.cohort_size else null end,
        'd90Retained',coalesce(x.d90_retained,0),
        'd90Rate',case when coalesce(x.cohort_size,0)>0 and d.cohort_date<=v_today-90 then x.d90_retained::numeric/x.cohort_size else null end
      ) order by d.cohort_date
    ),'[]'::jsonb) rows
    from cohort_days d
    left join lateral (
      select
        count(*) cohort_size,
        count(*) filter(where exists(
          select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=d.cohort_date+30
        )) d30_retained,
        count(*) filter(where exists(
          select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=d.cohort_date+60
        )) d60_retained,
        count(*) filter(where exists(
          select 1 from public.player_activity_daily a where a.account_id=f.account_id and a.activity_date=d.cohort_date+90
        )) d90_retained
      from firsts f
      where f.first_active_date=d.cohort_date
    ) x on true
  )
  select jsonb_build_object(
    'generatedAt',v_now,
    'windowDays',v_days,
    'campaignAttributionAvailable',false,
    'signupTypes',jsonb_build_object(
      'anonymous',s.anonymous_signups,
      'registered',s.registered_signups
    ),
    'stages',jsonb_build_array(
      jsonb_build_object('key','signup','label','Account signup','count',s.signups),
      jsonb_build_object('key','open','label','Opened game','count',s.opened_game),
      jsonb_build_object('key','character','label','Character created','count',s.character_created),
      jsonb_build_object('key','gameplay','label','Meaningful gameplay','count',s.meaningful_gameplay),
      jsonb_build_object('key','level2','label','Reached level 2','count',s.level_2),
      jsonb_build_object('key','story1','label','First story chapter claimed','count',s.first_story_claimed),
      jsonb_build_object('key','contract','label','Contract Board engaged','count',s.contract_engaged),
      jsonb_build_object('key','contract_done','label','Contract Board order completed','count',s.contract_completed),
      jsonb_build_object('key','dungeon','label','First co-op dungeon started','count',s.dungeon_started),
      jsonb_build_object('key','dungeon_clear','label','First co-op dungeon cleared','count',s.dungeon_cleared)
    ),
    'timing',jsonb_build_object(
      'medianHoursToFirstOpen',s.median_hours_to_first_open,
      'medianHoursToCharacter',s.median_hours_to_character,
      'medianHoursToFirstDungeon',s.median_hours_to_first_dungeon
    ),
    'activePopulation',jsonb_build_object(
      'windowDays',v_days,
      'accounts',(select count(*) from active_progress),
      'withCharacter',(select count(*) from active_progress where max_level>0),
      'contractEngaged',(select count(*) from active_progress where contract_engaged),
      'levelReach',lr.rows,
      'levelBands',lb.rows,
      'regions',rd.rows,
      'storyClaims',sd.rows
    ),
    'longRetention',jsonb_build_object(
      'd60Cohort',r.d60_cohort,
      'd60Retained',r.d60_retained,
      'd60Retention',case when r.d60_cohort>0 then r.d60_retained::numeric/r.d60_cohort else null end,
      'd90Cohort',r.d90_cohort,
      'd90Retained',r.d90_retained,
      'd90Retention',case when r.d90_cohort>0 then r.d90_retained::numeric/r.d90_cohort else null end,
      'cohorts',lc.rows
    )
  )
  into v_result
  from stage_summary s
  cross join level_reach lr
  cross join level_bands lb
  cross join region_distribution rd
  cross join story_distribution sd
  cross join long_retention r
  cross join long_cohorts lc;

  return v_result;
end $$;

revoke execute on function public.player_lifecycle_analytics_server_v1(integer) from public,anon,authenticated;
grant execute on function public.player_lifecycle_analytics_server_v1(integer) to service_role;

commit;
