begin;

-- Reconcile the hosted live-event registry with the production mobile catalog.
-- This migration is intentionally schedule-safe:
--   * newly inserted events start disabled;
--   * existing enabled/starts_at/ends_at/grace_ends_at values are never overwritten;
--   * operators remain responsible for activating exact dates.
--
-- Shared TypeScript game commands remain reward/progression authority. The
-- config metadata here gives Live-Ops a canonical identity, recurring calendar
-- window, currencies, modules, and claim-grace policy for every production event.

alter table public.event_cosmetic_unlocks
  drop constraint if exists event_cosmetic_unlocks_reward_type_check;

do $$ begin
  if not exists(
    select 1 from pg_constraint where conname='event_cosmetic_unlocks_reward_type_v14_check'
  ) then
    alter table public.event_cosmetic_unlocks
      add constraint event_cosmetic_unlocks_reward_type_v14_check
      check(reward_type in ('skin','pet','background','border','emote','title','companion'));
  end if;
end $$;

insert into public.live_events(
  event_id,name,currency_id,enabled,config,priority,modules,updated_at
)
values
(
  'EVT_ANNUAL_001_2026','Turning of the Age','AGE_TOKEN',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"turning_of_the_age","claimGraceDays":7,"prestigeCurrencyId":"FIRST_DAWN_SEAL","prestigeCurrencyName":"First Dawn Seals","annualWindow":"Dec 29 - Jan 4","communityModuleEnabled":false}'::jsonb,
  60,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_002_2026','Heartbond Festival','HEART_TOKEN',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"heartbond","claimGraceDays":7,"prestigeCurrencyId":"VOW_ROSE","prestigeCurrencyName":"Vow Roses","annualWindow":"February","communityModuleEnabled":false}'::jsonb,
  50,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_003_2026','Bloomwake','BLOOM_TOKEN',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"bloomwake","claimGraceDays":7,"prestigeCurrencyId":"VERDANT_SEED","prestigeCurrencyName":"Verdant Seeds","annualWindow":"March / April","communityModuleEnabled":false}'::jsonb,
  50,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_006_2026','Suncrest Games','SUNCREST_MEDAL',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"suncrest","claimGraceDays":7,"prestigeCurrencyId":"LAUREL_SEAL","prestigeCurrencyName":"Laurel Seals","annualWindow":"June / July","communityModuleEnabled":false}'::jsonb,
  50,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_008_2026','Starfall Nights','STAR_SHARD',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"starfall","claimGraceDays":7,"prestigeCurrencyId":"COMET_CORE","prestigeCurrencyName":"Comet Cores","annualWindow":"August","communityModuleEnabled":false}'::jsonb,
  50,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_009_2026','Harvestwake','HARVEST_MARK',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"harvestwake","claimGraceDays":7,"prestigeCurrencyId":"AMBER_SEED","prestigeCurrencyName":"Amber Seeds","annualWindow":"September","communityModuleEnabled":false}'::jsonb,
  50,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_010_2026','The Veilbreak','VEIL_SHARD',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"veilbreak","claimGraceDays":7,"prestigeCurrencyId":"LANTERN_EMBER","prestigeCurrencyName":"Lantern Embers","annualWindow":"October","communityModuleEnabled":false}'::jsonb,
  55,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_011_2026','Merchant & Guild Festival','GUILD_SCRIP',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"merchant_guild","claimGraceDays":7,"prestigeCurrencyId":"CARAVAN_SEAL","prestigeCurrencyName":"Caravan Seals","annualWindow":"November","communityModuleEnabled":false}'::jsonb,
  45,array['overview','rewards','tasks','collection','shop','pets','companions']::text[],now()
),
(
  'EVT_ANNUAL_012_2026','Frostfall Festival','FROSTBELL_TOKEN',false,
  '{"catalogStatus":"production","runtimeAuthority":"shared_typescript","visualKey":"frostfall","claimGraceDays":7,"prestigeCurrencyId":"AURORA_CHIME","prestigeCurrencyName":"Aurora Chimes","annualWindow":"December","communityModuleEnabled":false}'::jsonb,
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

-- Guard against accidentally enabling an event merely because a future catalog
-- migration updates its metadata: the ON CONFLICT clause deliberately omits
-- enabled and all schedule columns.

commit;
