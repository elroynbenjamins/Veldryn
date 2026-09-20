begin;

-- Close the final Live-Ops race between loading an authoritative Event runtime
-- and committing a gameplay command. The existing v1 commit remains intact for
-- compatibility; v2 locks and revalidates the exact runtime snapshot first.
create or replace function public.commit_online_game_server_v2(
  p_account_id uuid,
  p_expected_version bigint,
  p_expected_gold bigint,
  p_request_id text,
  p_request_hash text,
  p_response jsonb,
  p_contributions jsonb
) returns jsonb
language plpgsql
security definer
set search_path=public
as $event_guard$
declare
  v_runtime jsonb;
  v_current jsonb;
  v_event_id text;
  e public.live_events%rowtype;
begin
  v_runtime:=p_response#>'{state,account,liveEvent}';
  v_event_id:=p_response#>>'{state,account,liveEvent,eventId}';

  if v_event_id is not null then
    -- A SHARE row lock serializes this gameplay commit against Control Center
    -- UPDATEs such as Hard off, End now and schedule changes. If an admin change
    -- already committed, the comparison below rejects this stale gameplay result.
    select *
      into e
    from public.live_events
    where event_id=v_event_id
    for share;

    if not found or not coalesce(e.enabled,false) then
      raise exception 'stale_event_runtime';
    end if;

    if e.starts_at is null or e.ends_at is null then
      raise exception 'stale_event_runtime';
    end if;

    v_current:=jsonb_build_object(
      'eventId',e.event_id,
      'enabled',true,
      'startsAtMs',floor(extract(epoch from e.starts_at)*1000),
      'endsAtMs',floor(extract(epoch from e.ends_at)*1000),
      'graceEndsAtMs',
        case
          when coalesce(e.grace_ends_at,e.claim_ends_at) is null then null
          else floor(extract(epoch from coalesce(e.grace_ends_at,e.claim_ends_at))*1000)
        end,
      'priority',e.priority,
      'modules',to_jsonb(e.modules)
    );

    if v_runtime is distinct from v_current then
      raise exception 'stale_event_runtime';
    end if;
  end if;

  return public.commit_online_game_server_v1(
    p_account_id,
    p_expected_version,
    p_expected_gold,
    p_request_id,
    p_request_hash,
    p_response,
    p_contributions
  );
end
$event_guard$;

revoke all on function public.commit_online_game_server_v2(uuid,bigint,bigint,text,text,jsonb,jsonb)
  from public,anon,authenticated;
grant execute on function public.commit_online_game_server_v2(uuid,bigint,bigint,text,text,jsonb,jsonb)
  to service_role;

commit;
