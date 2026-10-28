begin;

-- November/December 2026 event schedule revision (UTC).
-- Merchant playable Nov 6-26 inclusive, then three full claim-only days Nov 27-29.
-- Frostfall playable Dec 3-29 inclusive, then its existing four-day grace.
-- Update the Merchant window first to avoid the single-visible-event trigger
-- conflicting with Frostfall's previous Dec 1 start.
update public.live_events
set ends_at='2026-11-27T00:00:00Z'::timestamptz,
    grace_ends_at='2026-11-30T00:00:00Z'::timestamptz,
    config=coalesce(config,'{}'::jsonb)||jsonb_build_object(
      'annualWindow','Nov 6 - Nov 26',
      'claimGraceDays',3,
      'communityModuleEnabled',false
    ),
    updated_at=now()
where event_id='EVT_ANNUAL_011_2026';

update public.live_events
set starts_at='2026-12-03T00:00:00Z'::timestamptz,
    config=coalesce(config,'{}'::jsonb)||jsonb_build_object(
      'annualWindow','Dec 3 - Dec 29',
      'claimGraceDays',4,
      'communityModuleEnabled',false
    ),
    updated_at=now()
where event_id='EVT_ANNUAL_012_2026';

-- Community-wide goals are paused for all annual festivals, not just
-- Merchant and Frostfall. Keep authored goal definitions and historical
-- contribution/claim records intact to allow a later intentional re-launch.
update public.live_events
set config=coalesce(config,'{}'::jsonb)||jsonb_build_object('communityModuleEnabled',false),
    modules=array_remove(coalesce(modules,'{}'::text[]),'community'),
    updated_at=now()
where event_id like 'EVT_ANNUAL_%'
  and (
    coalesce(config->>'communityModuleEnabled','')<>'false'
    or 'community'=any(coalesce(modules,'{}'::text[]))
  );

-- Defense in depth for older clients still calling legacy authenticated RPCs.
-- The personal focus chooser and individual events remain available.
revoke execute on function public.contribute_event_currency(text,integer,uuid)
  from public,anon,authenticated;
revoke execute on function public.claim_event_community_reward(text,integer)
  from public,anon,authenticated;

commit;
