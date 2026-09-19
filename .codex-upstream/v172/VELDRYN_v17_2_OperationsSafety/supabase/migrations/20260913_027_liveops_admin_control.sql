-- VELDRYN v17.1 — Private Live-Ops Admin Control support.
-- Depends on v17 migration 20260913_026_social_liveops_party_events_v17.sql.
-- This migration DOES NOT expose admin write access to authenticated game clients.
-- The Cloudflare Pages Function uses the Supabase service-role key server-side and performs its own admin-role checks.

create table if not exists public.liveops_admin_users(
  account_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check(role in('owner','editor','viewer')),
  display_name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.liveops_event_drafts(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  definition_json jsonb not null,
  schedule_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check(status in('draft','published')),
  published_event_id text,
  published_version integer,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists idx_liveops_event_drafts_status_updated on public.liveops_event_drafts(status, updated_at desc);

create table if not exists public.liveops_admin_templates(
  template_id text primary key,
  name text not null,
  description text not null default '',
  definition_json jsonb not null,
  enabled boolean not null default true,
  source text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists idx_liveops_admin_templates_enabled_name on public.liveops_admin_templates(enabled, name);

create table if not exists public.liveops_admin_reward_catalog(
  bundle_id text primary key,
  label text not null,
  tier text not null check(tier in('participation','milestone','prestige')),
  enabled boolean not null default true,
  -- An owner explicitly sets this true only after confirming that the real economy/reward registry can grant this bundle.
  validated boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.liveops_runtime_health(
  component text primary key,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  last_result_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.liveops_admin_audit_log(
  id bigint generated always as identity primary key,
  actor_account_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role text,
  action text not null,
  target_type text not null,
  target_id text not null default '',
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_liveops_admin_audit_log_created on public.liveops_admin_audit_log(created_at desc);
create index if not exists idx_liveops_admin_audit_target on public.liveops_admin_audit_log(target_type, target_id, created_at desc);

alter table public.liveops_admin_users enable row level security;
alter table public.liveops_event_drafts enable row level security;
alter table public.liveops_admin_templates enable row level security;
alter table public.liveops_admin_reward_catalog enable row level security;
alter table public.liveops_admin_audit_log enable row level security;
alter table public.liveops_runtime_health enable row level security;

-- Intentionally no anon/authenticated policies on admin tables. Normal game sessions must not browse them.
-- Service-role requests from the private admin API bypass RLS and are then checked against liveops_admin_users.

-- Seed the reward IDs referenced by the v17 launch definitions. They intentionally start UNVALIDATED.
-- Confirm each bundle is implemented in the real economy grant path before setting validated=true in VELDRYN Control.
insert into public.liveops_admin_reward_catalog(bundle_id,label,tier,validated,notes) values
  ('party_event_participation_v1','Party Event — Qualified','participation',false,'v17 reference reward ID; map/confirm in the real reward registry before publishing'),
  ('party_event_personal_250_v1','Personal milestone — 250','milestone',false,'v17 reference reward ID'),
  ('party_event_personal_750_v1','Personal milestone — 750','milestone',false,'v17 reference reward ID'),
  ('party_event_personal_1500_v1','Personal milestone — 1,500','milestone',false,'v17 reference reward ID'),
  ('party_event_personal_2500_v1','Personal milestone — 2,500','milestone',false,'v17 reference reward ID'),
  ('party_event_party_2000_v1','Party milestone — 2,000','milestone',false,'v17 reference reward ID'),
  ('party_event_party_4000_v1','Party milestone — 4,000','milestone',false,'v17 reference reward ID'),
  ('party_event_party_6000_v1','Party milestone — 6,000','milestone',false,'v17 reference reward ID'),
  ('party_event_party_9000_v1','Party milestone — 9,000','milestone',false,'v17 reference reward ID'),
  ('party_event_rank_top25_v1','Party rank — Top 25%','milestone',false,'v17 reference reward ID'),
  ('party_event_rank_top10pct_v1','Party rank — Top 10%','prestige',false,'v17 reference reward ID'),
  ('party_event_rank_top100_v1','Party rank — Top 100','prestige',false,'v17 reference reward ID'),
  ('party_event_rank_top10_v1','Party rank — Top 10','prestige',false,'v17 reference reward ID')
on conflict(bundle_id) do nothing;

-- Reusable template seed. These mirror the v17 launch pool but live in an EDITABLE admin-template table.
-- Publishing still creates a separate immutable row in liveops_event_definitions.
do $$
declare
  personal jsonb := jsonb_build_array(
    jsonb_build_object('points',250,'reward',jsonb_build_object('bundleId','party_event_personal_250_v1','tier','milestone')),
    jsonb_build_object('points',750,'reward',jsonb_build_object('bundleId','party_event_personal_750_v1','tier','milestone')),
    jsonb_build_object('points',1500,'reward',jsonb_build_object('bundleId','party_event_personal_1500_v1','tier','milestone')),
    jsonb_build_object('points',2500,'reward',jsonb_build_object('bundleId','party_event_personal_2500_v1','tier','milestone'))
  );
  party jsonb := jsonb_build_array(
    jsonb_build_object('points',2000,'reward',jsonb_build_object('bundleId','party_event_party_2000_v1','tier','milestone')),
    jsonb_build_object('points',4000,'reward',jsonb_build_object('bundleId','party_event_party_4000_v1','tier','milestone')),
    jsonb_build_object('points',6000,'reward',jsonb_build_object('bundleId','party_event_party_6000_v1','tier','milestone')),
    jsonb_build_object('points',9000,'reward',jsonb_build_object('bundleId','party_event_party_9000_v1','tier','milestone'))
  );
  ranking jsonb := jsonb_build_object(
    'qualified',jsonb_build_object('bundleId','party_event_participation_v1','tier','participation'),
    'top25Percent',jsonb_build_object('bundleId','party_event_rank_top25_v1','tier','milestone'),
    'top10Percent',jsonb_build_object('bundleId','party_event_rank_top10pct_v1','tier','prestige'),
    'top100',jsonb_build_object('bundleId','party_event_rank_top100_v1','tier','prestige'),
    'top10',jsonb_build_object('bundleId','party_event_rank_top10_v1','tier','prestige')
  );
begin
  insert into public.liveops_admin_templates(template_id,name,description,source,definition_json) values
  ('party_event_rift_surge','Rift Surge','Mixed 48-hour Party Event','v17_seed',jsonb_build_object(
    'id','party_event_rift_surge','version',1,'scope','party','name','Rift Surge','shortDescription','Stabilize a spreading Rift through combat and realm-support activities.','durationHours',48,
    'contributionRules',jsonb_build_object('allowedCategories',jsonb_build_array('combat','skilling'),'allowedActivityKinds','[]'::jsonb,'allowedRegionIds','[]'::jsonb,'requiredAnyTags','[]'::jsonb,'dailyAccountCreditCap',2400,'minimumCategoryFraction',jsonb_build_object('combat',0.30,'skilling',0.30),'activityMultipliers','{}'::jsonb,'challengeMultipliers',jsonb_build_object('elite',1.05,'boss',1.10)),
    'personalMilestones',personal,'partyMilestones',party,'personalPartyRewardEligibilityPoints',250,'rankedMinimumPartyPoints',4000,'rankedMinimumMeaningfulContributors',2,'meaningfulContributorPoints',250,'partyBindingLockPoints',250,'rankingRewards',ranking,'eventTags',jsonb_build_array('rift','mixed','party_event')
  )),
  ('party_event_sunscar_invasion','Sunscar Invasion','Combat 48-hour regional Party Event','v17_seed',jsonb_build_object(
    'id','party_event_sunscar_invasion','version',1,'scope','party','name','Sunscar Invasion','shortDescription','Drive back an invasion with efficient combat, elite hunts and regional boss clears.','durationHours',48,
    'contributionRules',jsonb_build_object('allowedCategories',jsonb_build_array('combat'),'allowedActivityKinds',jsonb_build_array('combat'),'allowedRegionIds',jsonb_build_array('sunscar'),'requiredAnyTags','[]'::jsonb,'dailyAccountCreditCap',2400,'minimumCategoryFraction','{}'::jsonb,'activityMultipliers','{}'::jsonb,'challengeMultipliers',jsonb_build_object('elite',1.08,'boss',1.12)),
    'personalMilestones',personal,'partyMilestones',party,'personalPartyRewardEligibilityPoints',250,'rankedMinimumPartyPoints',4000,'rankedMinimumMeaningfulContributors',2,'meaningfulContributorPoints',250,'partyBindingLockPoints',250,'rankingRewards',ranking,'eventTags',jsonb_build_array('sunscar','combat','party_event')
  )),
  ('party_event_asterfall_reconstruction','Rebuild Asterfall','Skilling 48-hour regional Party Event','v17_seed',jsonb_build_object(
    'id','party_event_asterfall_reconstruction','version',1,'scope','party','name','Rebuild Asterfall','shortDescription','Gather, process and craft supplies to restore damaged frontier infrastructure.','durationHours',48,
    'contributionRules',jsonb_build_object('allowedCategories',jsonb_build_array('skilling'),'allowedActivityKinds',jsonb_build_array('gathering','processing','crafting','delivery'),'allowedRegionIds',jsonb_build_array('asterfall'),'requiredAnyTags','[]'::jsonb,'dailyAccountCreditCap',2400,'minimumCategoryFraction','{}'::jsonb,'activityMultipliers',jsonb_build_object('processing',1.03,'crafting',1.05,'delivery',1.05),'challengeMultipliers','{}'::jsonb),
    'personalMilestones',personal,'partyMilestones',party,'personalPartyRewardEligibilityPoints',250,'rankedMinimumPartyPoints',4000,'rankedMinimumMeaningfulContributors',2,'meaningfulContributorPoints',250,'partyBindingLockPoints',250,'rankingRewards',ranking,'eventTags',jsonb_build_array('asterfall','skilling','party_event')
  )),
  ('party_event_frostmarch_supply_crisis','Frostmarch Supply Crisis','Skilling 48-hour regional Party Event','v17_seed',jsonb_build_object(
    'id','party_event_frostmarch_supply_crisis','version',1,'scope','party','name','Frostmarch Supply Crisis','shortDescription','Keep remote settlements supplied through fishing, hunting, gathering and crafting.','durationHours',48,
    'contributionRules',jsonb_build_object('allowedCategories',jsonb_build_array('skilling'),'allowedActivityKinds',jsonb_build_array('fishing','hunting','gathering','processing','crafting','delivery'),'allowedRegionIds',jsonb_build_array('frostmarch'),'requiredAnyTags','[]'::jsonb,'dailyAccountCreditCap',2400,'minimumCategoryFraction','{}'::jsonb,'activityMultipliers',jsonb_build_object('fishing',1.03,'hunting',1.03,'delivery',1.08),'challengeMultipliers','{}'::jsonb),
    'personalMilestones',personal,'partyMilestones',party,'personalPartyRewardEligibilityPoints',250,'rankedMinimumPartyPoints',4000,'rankedMinimumMeaningfulContributors',2,'meaningfulContributorPoints',250,'partyBindingLockPoints',250,'rankingRewards',ranking,'eventTags',jsonb_build_array('frostmarch','skilling','party_event')
  )),
  ('party_event_blackened_wells','Blackened Wells','Specialized mixed 48-hour Party Event','v17_seed',jsonb_build_object(
    'id','party_event_blackened_wells','version',1,'scope','party','name','Blackened Wells','shortDescription','Contain poisoned threats while gathering reagents and producing emergency remedies.','durationHours',48,
    'contributionRules',jsonb_build_object('allowedCategories',jsonb_build_array('combat','skilling'),'allowedActivityKinds',jsonb_build_array('combat','gathering','alchemy','crafting'),'allowedRegionIds','[]'::jsonb,'requiredAnyTags',jsonb_build_array('poison','antidote','tainted'),'dailyAccountCreditCap',2400,'minimumCategoryFraction',jsonb_build_object('combat',0.25,'skilling',0.25),'activityMultipliers',jsonb_build_object('alchemy',1.08),'challengeMultipliers','{}'::jsonb),
    'personalMilestones',personal,'partyMilestones',party,'personalPartyRewardEligibilityPoints',250,'rankedMinimumPartyPoints',4000,'rankedMinimumMeaningfulContributors',2,'meaningfulContributorPoints',250,'partyBindingLockPoints',250,'rankingRewards',ranking,'eventTags',jsonb_build_array('mixed','poison','party_event')
  ))
  on conflict(template_id) do nothing;
end $$;

comment on table public.liveops_runtime_health is 'Server-worker heartbeat/status. Service-side only; no player RLS policies.';
comment on table public.liveops_admin_users is 'Private VELDRYN Control authorization. No browser/mobile RLS policies; accessed by service-role admin API only.';
comment on table public.liveops_admin_reward_catalog is 'Admin-side allow-list. validated=true is an operator assertion that the real reward bundle is grantable.';
comment on table public.liveops_event_drafts is 'Mutable authoring state. Publishing creates immutable liveops_event_definitions rows.';

-- ONE-TIME OWNER BOOTSTRAP (run manually after creating your Supabase Auth account):
-- insert into public.liveops_admin_users(account_id, role, display_name)
-- values ('YOUR_AUTH_USER_UUID'::uuid, 'owner', 'VELDRYN Owner')
-- on conflict(account_id) do update set role='owner', enabled=true, updated_at=now();
