-- Bounded operational telemetry for the authoritative gameplay transport.
-- This stores aggregate hourly counters only: no account IDs, request IDs, or payloads.
create or replace function public.record_online_command_outcome_server_v1(
  p_outcome text,
  p_command_type text,
  p_latency_ms integer
) returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_bucket timestamptz:=date_trunc('hour',v_now);
begin
  if p_outcome not in('committed','replayed','conflict','rejected','retryable_failure') then raise exception 'invalid_online_command_outcome'; end if;
  if p_command_type !~ '^[a-z][a-z0-9_]{1,79}$' then raise exception 'invalid_online_command_type'; end if;
  if p_latency_ms<0 or p_latency_ms>300000 then raise exception 'invalid_online_command_latency'; end if;

  insert into public.ops_metric_buckets(metric_key,bucket_start,bucket_minutes,dimension_key,dimensions_json,metric_type,sum_value,sample_count,min_value,max_value,last_value)
  values(
    'gameplay.command.'||p_outcome,v_bucket,60,p_command_type,jsonb_build_object('commandType',p_command_type),
    'counter',1,1,1,1,1
  )
  on conflict(metric_key,bucket_start,bucket_minutes,dimension_key) do update set
    sum_value=public.ops_metric_buckets.sum_value+1,
    sample_count=public.ops_metric_buckets.sample_count+1,
    min_value=least(coalesce(public.ops_metric_buckets.min_value,1),1),
    max_value=greatest(coalesce(public.ops_metric_buckets.max_value,1),1),
    last_value=1,
    updated_at=v_now;

  insert into public.ops_metric_buckets(metric_key,bucket_start,bucket_minutes,dimension_key,dimensions_json,metric_type,sum_value,sample_count,min_value,max_value,last_value)
  values(
    'gameplay.command.latency_ms',v_bucket,60,p_command_type,jsonb_build_object('commandType',p_command_type),
    'duration',p_latency_ms,1,p_latency_ms,p_latency_ms,p_latency_ms
  )
  on conflict(metric_key,bucket_start,bucket_minutes,dimension_key) do update set
    sum_value=public.ops_metric_buckets.sum_value+excluded.sum_value,
    sample_count=public.ops_metric_buckets.sample_count+1,
    min_value=least(coalesce(public.ops_metric_buckets.min_value,excluded.min_value),excluded.min_value),
    max_value=greatest(coalesce(public.ops_metric_buckets.max_value,excluded.max_value),excluded.max_value),
    last_value=excluded.last_value,
    updated_at=v_now;
end $$;

revoke all on function public.record_online_command_outcome_server_v1(text,text,integer) from public,anon,authenticated;
grant execute on function public.record_online_command_outcome_server_v1(text,text,integer) to service_role;

comment on function public.record_online_command_outcome_server_v1(text,text,integer) is 'Service-only, aggregate hourly gameplay transport telemetry without player or request identifiers.';
