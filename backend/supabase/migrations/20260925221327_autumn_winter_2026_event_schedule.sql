begin;

-- Publish dates without activating gameplay. The public calendar RPC exposes
-- these windows while `enabled` remains under separate Live-Ops control.
insert into public.live_events(
  event_id,name,currency_id,enabled,starts_at,ends_at,grace_ends_at,config,priority,modules,updated_at
)
values
(
  'EVT_ANNUAL_010_2026','The Veilbreak','VEIL_SHARD',false,
  '2026-10-10T00:00:00Z'::timestamptz,'2026-11-03T00:00:00Z'::timestamptz,'2026-11-06T00:00:00Z'::timestamptz,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"veilbreak","claimGraceDays":3,"prestigeCurrencyId":"LANTERN_EMBER","prestigeCurrencyName":"Lantern Embers","annualWindow":"Oct 10 - Nov 2","communityModuleEnabled":false}'::jsonb,
  55,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_011_2026','Merchant & Guild Festival','GUILD_SCRIP',false,
  '2026-11-06T00:00:00Z'::timestamptz,'2026-11-30T00:00:00Z'::timestamptz,'2026-12-03T00:00:00Z'::timestamptz,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"merchant_guild","claimGraceDays":3,"prestigeCurrencyId":"CARAVAN_SEAL","prestigeCurrencyName":"Caravan Seals","annualWindow":"Nov 6 - Nov 29","communityModuleEnabled":false}'::jsonb,
  45,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_012_2026','Frostfall Festival','FROSTBELL_TOKEN',false,
  '2026-12-01T00:00:00Z'::timestamptz,'2026-12-30T00:00:00Z'::timestamptz,'2027-01-03T00:00:00Z'::timestamptz,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"frostfall","claimGraceDays":4,"prestigeCurrencyId":"AURORA_CHIME","prestigeCurrencyName":"Aurora Chimes","annualWindow":"Dec 1 - Dec 29","communityModuleEnabled":false}'::jsonb,
  60,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
)
on conflict(event_id) do update
set
  name=excluded.name,
  currency_id=excluded.currency_id,
  config=coalesce(public.live_events.config,'{}'::jsonb)||excluded.config,
  priority=excluded.priority,
  modules=excluded.modules,
  updated_at=now();

update public.live_events
set
  starts_at=schedule.starts_at,
  ends_at=schedule.ends_at,
  grace_ends_at=schedule.grace_ends_at,
  config=coalesce(public.live_events.config,'{}'::jsonb)||jsonb_build_object('annualWindow',schedule.window_label),
  updated_at=now()
from (values
  ('EVT_ANNUAL_010_2026','2026-10-10T00:00:00Z'::timestamptz,'2026-11-03T00:00:00Z'::timestamptz,'2026-11-06T00:00:00Z'::timestamptz,'Oct 10 - Nov 2'),
  ('EVT_ANNUAL_011_2026','2026-11-06T00:00:00Z'::timestamptz,'2026-11-30T00:00:00Z'::timestamptz,'2026-12-03T00:00:00Z'::timestamptz,'Nov 6 - Nov 29'),
  ('EVT_ANNUAL_012_2026','2026-12-01T00:00:00Z'::timestamptz,'2026-12-30T00:00:00Z'::timestamptz,'2027-01-03T00:00:00Z'::timestamptz,'Dec 1 - Dec 29')
) as schedule(event_id,starts_at,ends_at,grace_ends_at,window_label)
where public.live_events.event_id=schedule.event_id;

commit;
