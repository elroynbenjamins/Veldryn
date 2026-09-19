begin;
-- V52 host reconciliation for the production Harvestwake definition.
update public.live_events
set modules=array['overview','rewards','tasks','collection','shop','pets']::text[],
    priority=greatest(priority,50),
    grace_ends_at=coalesce(grace_ends_at,ends_at + interval '7 days')
where event_id='EVT_ANNUAL_009_2026';
commit;
