-- Aggregate player-facing annual/general Event telemetry for the private Live-Ops console.
-- This function intentionally returns only aggregate data; no player identifiers are exposed.
begin;

create or replace function public.player_event_analytics_server_v1(p_event_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_event public.live_events;
  v_progress jsonb;
  v_contributions jsonb;
  v_dungeons jsonb;
begin
  select * into v_event from public.live_events where event_id=p_event_id;
  if not found then raise exception 'player_event_not_found'; end if;

  select jsonb_build_object(
    'participants',count(*),
    'progressTotal',coalesce(sum(greatest(progress,0)),0),
    'progressAverage',coalesce(round(avg(greatest(progress,0))::numeric,1),0),
    'progressMedian',coalesce(round((percentile_cont(0.5) within group(order by greatest(progress,0)))::numeric,1),0),
    'progressP90',coalesce(round((percentile_cont(0.9) within group(order by greatest(progress,0)))::numeric,1),0),
    'progressMax',coalesce(max(greatest(progress,0)),0),
    'currencyBalance',coalesce(sum(greatest(currency_balance,0)),0),
    'estimatedCurrencySpent',coalesce(sum(greatest(progress-currency_balance,0)),0),
    'prestigeBalance',coalesce(sum(greatest(prestige_balance,0)),0),
    'repeatCacheClaims',coalesce(sum(greatest(repeat_cache_claims,0)),0),
    'combatActivity',coalesce(sum(greatest(coalesce((activity_totals->>'combat')::bigint,0),0)),0),
    'gatheringActivity',coalesce(sum(greatest(coalesce((activity_totals->>'gathering')::bigint,0),0)),0),
    'craftingActivity',coalesce(sum(greatest(coalesce((activity_totals->>'crafting')::bigint,0),0)),0),
    'bossActivity',coalesce(sum(greatest(coalesce((activity_totals->>'boss')::bigint,0),0)),0),
    'balanceAnomalies',count(*) filter(where currency_balance<0 or progress<0 or currency_balance>progress),
    'lastProgressAt',max(updated_at)
  )
  into v_progress
  from public.event_progress
  where event_id=p_event_id;

  select jsonb_build_object(
    'total',coalesce(sum(greatest(quantity,0)),0),
    'entries',count(*),
    'contributors',count(distinct account_id),
    'lastContributionAt',max(contributed_at)
  )
  into v_contributions
  from public.event_contributions
  where event_id=p_event_id;

  select jsonb_build_object(
    'starts',count(*),
    'uniqueControllers',count(distinct r.controller_account_id),
    'completed',count(*) filter(where p.state_json#>>'{run,phase}'='completed'),
    'failed',count(*) filter(where p.state_json#>>'{run,phase}'='failed'),
    'active',count(*) filter(where coalesce(p.state_json#>>'{run,phase}','') not in ('completed','failed')),
    'pendingSettlement',count(*) filter(where p.state_json#>>'{run,phase}'='completed' and p.state_json#>>'{run,settlement}'='pending'),
    'claimedSettlement',count(*) filter(where p.state_json#>>'{run,settlement}'='claimed'),
    'averageVisitedNodes',coalesce(round(avg(
      case when jsonb_typeof(p.state_json#>'{run,persistentState,visitedNodeIds}')='array'
        then jsonb_array_length(p.state_json#>'{run,persistentState,visitedNodeIds}')
        else 0 end
    )::numeric,1),0),
    'lastStartAt',max(r.created_at)
  )
  into v_dungeons
  from public.expedition_runs r
  join public.coop_run_private_state p on p.run_id=r.id
  where r.coop_mode='event'
    and p.state_json->>'liveEventId'=p_event_id;

  return jsonb_build_object(
    'eventId',v_event.event_id,
    'enabled',v_event.enabled,
    'startsAt',v_event.starts_at,
    'endsAt',v_event.ends_at,
    'graceEndsAt',v_event.grace_ends_at,
    'progress',coalesce(v_progress,'{}'::jsonb),
    'contributions',coalesce(v_contributions,'{}'::jsonb),
    'dungeons',coalesce(v_dungeons,'{}'::jsonb),
    'generatedAt',clock_timestamp()
  );
end $$;

revoke all on function public.player_event_analytics_server_v1(text) from public,anon,authenticated;
grant execute on function public.player_event_analytics_server_v1(text) to service_role;

commit;
