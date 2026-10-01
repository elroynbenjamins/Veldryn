begin;

do $$
begin
  if (select count(*) from public.live_events where event_id in (
    'EVT_ANNUAL_010_2026','EVT_ANNUAL_011_2026','EVT_ANNUAL_012_2026'
  )) <> 3 then
    raise exception 'all three autumn/winter events must exist';
  end if;

  if exists(
    select 1 from public.live_events
    where event_id in ('EVT_ANNUAL_010_2026','EVT_ANNUAL_011_2026','EVT_ANNUAL_012_2026')
      and enabled
  ) then
    raise exception 'publishing calendar dates must not enable event gameplay';
  end if;

  if not exists(
    select 1 from public.live_events
    where event_id='EVT_ANNUAL_010_2026'
      and starts_at='2026-10-10T00:00:00Z'::timestamptz
      and ends_at='2026-11-03T00:00:00Z'::timestamptz
      and grace_ends_at='2026-11-06T00:00:00Z'::timestamptz
  ) then
    raise exception 'Veilbreak schedule does not match the published window';
  end if;

  if not exists(
    select 1 from public.live_events
    where event_id='EVT_ANNUAL_011_2026'
      and starts_at='2026-11-06T00:00:00Z'::timestamptz
      and ends_at='2026-11-30T00:00:00Z'::timestamptz
      and grace_ends_at='2026-12-03T00:00:00Z'::timestamptz
  ) then
    raise exception 'Merchant & Guild schedule does not match the published window';
  end if;

  if not exists(
    select 1 from public.live_events
    where event_id='EVT_ANNUAL_012_2026'
      and starts_at='2026-12-01T00:00:00Z'::timestamptz
      and ends_at='2026-12-30T00:00:00Z'::timestamptz
      and grace_ends_at='2027-01-03T00:00:00Z'::timestamptz
  ) then
    raise exception 'Frostfall schedule does not match the published window';
  end if;
end $$;

rollback;
