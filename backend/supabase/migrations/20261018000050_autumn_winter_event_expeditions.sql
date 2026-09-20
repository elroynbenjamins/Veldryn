begin;

-- Register dedicated expedition content for the three upcoming autumn/winter
-- events. Future annual-season clones inherit this metadata from their template.
update public.live_events
set
  modules=case
    when 'expedition'=any(coalesce(modules,'{}'::text[])) then coalesce(modules,'{}'::text[])
    else array_append(coalesce(modules,'{}'::text[]),'expedition')
  end,
  config=coalesce(config,'{}'::jsonb)||case event_id
    when 'EVT_ANNUAL_010_2026' then
      '{"eventExpeditionId":"EVENT_VEILBREAK_GLOAM_BREACH","eventQuestline":["Relight the Lantern Gate","Seal the Hollow Chapel","Hunt the Hollow Regent"],"eventEnemies":["Veilshade Stalker","Lantern-Eater","Hollow Warden"],"eventBoss":"The Hollow Regent"}'::jsonb
    when 'EVT_ANNUAL_011_2026' then
      '{"eventExpeditionId":"EVENT_MERCHANT_GILDED_ROAD","eventQuestline":["Secure the Broken Tollgate","Recover the Stolen Ledgers","Retake the Counting House"],"eventEnemies":["Road Reaver","Ledger Hexer","Iron Tollkeeper"],"eventBoss":"The Coinbound Captain"}'::jsonb
    when 'EVT_ANNUAL_012_2026' then
      '{"eventExpeditionId":"EVENT_FROSTFALL_AURORA_HOLLOW","eventQuestline":["Recover the Snowbells","Clear the Frozen Giftworks","Ring the Aurora Belfry"],"eventEnemies":["Rimefang Marauder","Bellfrost Spirit","Giftwork Colossus"],"eventBoss":"The Rimebell Colossus"}'::jsonb
    else '{}'::jsonb
  end,
  updated_at=now()
where event_id in ('EVT_ANNUAL_010_2026','EVT_ANNUAL_011_2026','EVT_ANNUAL_012_2026');

commit;
