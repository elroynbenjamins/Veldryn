begin;

-- Promote the three events after Frostfall from event-contract-only content to
-- full event-expedition content. The static game definitions remain authority
-- for rewards/balance; this metadata lets Live-Ops and clients advertise the
-- dedicated route when the event is enabled.
update public.live_events
set
  modules=case when 'expedition'=any(modules) then modules else array_append(modules,'expedition') end,
  config=coalesce(config,'{}'::jsonb)||case event_id
    when 'EVT_ANNUAL_001_2026' then '{"eventExpeditionId":"EVENT_TURNING_CHRONICLE_VAULT","eventQuestline":["Chronicle the Closing Age","Recover the Broken Hours","Guard the First Dawn"],"eventBoss":"The Last Hour"}'::jsonb
    when 'EVT_ANNUAL_002_2026' then '{"eventExpeditionId":"EVENT_HEARTBOND_VOW_GARDEN","eventQuestline":["Mend the Festival Routes","Recover the Vow Tokens","Restore the Vow Garden"],"eventBoss":"The Severed Vow"}'::jsonb
    when 'EVT_ANNUAL_003_2026' then '{"eventExpeditionId":"EVENT_BLOOMWAKE_THORNHEART_GROVE","eventQuestline":["Wake the Old Groves","Clear the Feral Bloom","Restore the Heartroot"],"eventBoss":"The Thornheart Ancient"}'::jsonb
    else '{}'::jsonb
  end,
  updated_at=now()
where event_id in ('EVT_ANNUAL_001_2026','EVT_ANNUAL_002_2026','EVT_ANNUAL_003_2026');

commit;
