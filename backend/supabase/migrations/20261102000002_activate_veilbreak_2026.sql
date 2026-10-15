-- The client may render a scheduled event before its window begins, but only an
-- enabled runtime is allowed to accept online event commands. Activate the
-- Veilbreak runtime so the UI and authoritative gameplay share one state.
update public.live_events
set enabled=true,
    updated_at=now()
where event_id='EVT_ANNUAL_010_2026';
