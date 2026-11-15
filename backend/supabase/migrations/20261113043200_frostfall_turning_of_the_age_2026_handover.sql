begin;

-- Approved New Year handover for the 2026/27 annual event season.
-- UTC boundaries are exclusive: a day is playable/claimable up to 23:59:59.999Z
-- before its recorded ending timestamp.
--
-- Frostfall active Dec 3-26 (ends Dec 27 00:00)
-- Frostfall claims Dec 27-28 (ends Dec 29 00:00)
-- Turning active Dec 29-Jan 4 (ends Jan 5 00:00)
-- Turning claims Jan 5-11 (ends Jan 12 00:00)
--
-- Schedule only: never auto-enable either event or modify earned rewards.
-- Works safely against either NULL staging dates or the prior production dates.

do $preflight$
begin
  if (select count(*) from public.live_events
      where event_id in ('EVT_ANNUAL_012_2026','EVT_ANNUAL_001_2026')) <> 2 then
    raise exception 'year_end_handover_missing_event_catalog_rows';
  end if;

  if exists (
    select 1 from public.live_events
    where event_id in ('EVT_ANNUAL_012_2026','EVT_ANNUAL_001_2026')
      and enabled
  ) then
    raise exception 'year_end_handover_requires_both_events_disabled';
  end if;
end
$preflight$;

update public.live_events
set
  starts_at='2026-12-03T00:00:00Z'::timestamptz,
  ends_at='2026-12-27T00:00:00Z'::timestamptz,
  grace_ends_at='2026-12-29T00:00:00Z'::timestamptz,
  config=coalesce(config,'{}'::jsonb)
    || '{"annualWindow":"Dec 3 - Dec 26","claimGraceDays":2,"communityModuleEnabled":false}'::jsonb,
  updated_at=now()
where event_id='EVT_ANNUAL_012_2026';

update public.live_events
set
  starts_at='2026-12-29T00:00:00Z'::timestamptz,
  ends_at='2027-01-05T00:00:00Z'::timestamptz,
  grace_ends_at='2027-01-12T00:00:00Z'::timestamptz,
  config=coalesce(config,'{}'::jsonb)
    || '{"annualWindow":"Dec 29 - Jan 4","claimGraceDays":7,"communityModuleEnabled":false}'::jsonb,
  updated_at=now()
where event_id='EVT_ANNUAL_001_2026';

do $verify$
declare
  frost public.live_events%rowtype;
  turning public.live_events%rowtype;
begin
  select * into strict frost from public.live_events where event_id='EVT_ANNUAL_012_2026';
  select * into strict turning from public.live_events where event_id='EVT_ANNUAL_001_2026';

  if frost.ends_at <> '2026-12-27T00:00:00Z'::timestamptz
    or frost.grace_ends_at <> turning.starts_at
    or turning.ends_at <> '2027-01-05T00:00:00Z'::timestamptz
    or turning.grace_ends_at <> '2027-01-12T00:00:00Z'::timestamptz
    or frost.enabled or turning.enabled
  then
    raise exception 'year_end_handover_boundary_verification_failed';
  end if;
end
$verify$;

commit;
