-- VELDRYN v11/v12 preference persistence.
-- These records are UI preferences/snapshots only. Gameplay eligibility,
-- rewards, inventory ownership and equipment changes remain authoritative in
-- online_game_states and the existing server-side action paths.

create table if not exists public.account_catalog_preferences (
  account_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{"favoriteItemIds":[],"favoriteRecipeIds":[],"favoriteCompanionIds":[],"favoriteQuestIds":[],"favoriteAchievementIds":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint account_catalog_preferences_object check (jsonb_typeof(preferences)='object'),
  constraint account_catalog_favorite_items_array check (jsonb_typeof(coalesce(preferences->'favoriteItemIds','[]'::jsonb))='array'),
  constraint account_catalog_favorite_recipes_array check (jsonb_typeof(coalesce(preferences->'favoriteRecipeIds','[]'::jsonb))='array'),
  constraint account_catalog_favorite_companions_array check (jsonb_typeof(coalesce(preferences->'favoriteCompanionIds','[]'::jsonb))='array'),
  constraint account_catalog_favorite_quests_array check (jsonb_typeof(coalesce(preferences->'favoriteQuestIds','[]'::jsonb))='array'),
  constraint account_catalog_favorite_achievements_array check (jsonb_typeof(coalesce(preferences->'favoriteAchievementIds','[]'::jsonb))='array')
);
alter table public.account_catalog_preferences enable row level security;
do $$ begin create policy "owner read catalog preferences" on public.account_catalog_preferences for select using(account_id=auth.uid()); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner insert catalog preferences" on public.account_catalog_preferences for insert with check(account_id=auth.uid()); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner update catalog preferences" on public.account_catalog_preferences for update using(account_id=auth.uid()) with check(account_id=auth.uid()); exception when duplicate_object then null; end $$;
grant select,insert,update on public.account_catalog_preferences to authenticated;

create table if not exists public.account_game_guide_state (
  account_id uuid primary key references auth.users(id) on delete cascade,
  guide_state jsonb not null default '{"seenGuideIds":[],"acknowledgedGuideIds":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint account_game_guide_state_object check (jsonb_typeof(guide_state)='object'),
  constraint account_game_guide_seen_array check (jsonb_typeof(coalesce(guide_state->'seenGuideIds','[]'::jsonb))='array'),
  constraint account_game_guide_ack_array check (jsonb_typeof(coalesce(guide_state->'acknowledgedGuideIds','[]'::jsonb))='array')
);
alter table public.account_game_guide_state enable row level security;
do $$ begin create policy "owner read game guide state" on public.account_game_guide_state for select using(account_id=auth.uid()); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner insert game guide state" on public.account_game_guide_state for insert with check(account_id=auth.uid()); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner update game guide state" on public.account_game_guide_state for update using(account_id=auth.uid()) with check(account_id=auth.uid()); exception when duplicate_object then null; end $$;
grant select,insert,update on public.account_game_guide_state to authenticated;

create table if not exists public.character_saved_loadout_presets (
  character_id uuid primary key references public.characters(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  presets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint character_saved_loadout_presets_array check (jsonb_typeof(presets)='array'),
  constraint character_saved_loadout_presets_limit check (jsonb_array_length(presets)<=3)
);
create index if not exists idx_character_saved_loadout_presets_account on public.character_saved_loadout_presets(account_id);
alter table public.character_saved_loadout_presets enable row level security;
do $$ begin create policy "owner read saved loadouts" on public.character_saved_loadout_presets for select using(account_id=auth.uid()); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner insert saved loadouts" on public.character_saved_loadout_presets for insert with check(account_id=auth.uid() and exists(select 1 from public.characters c where c.id=character_id and c.account_id=auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner update saved loadouts" on public.character_saved_loadout_presets for update using(account_id=auth.uid()) with check(account_id=auth.uid() and exists(select 1 from public.characters c where c.id=character_id and c.account_id=auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "owner delete saved loadouts" on public.character_saved_loadout_presets for delete using(account_id=auth.uid()); exception when duplicate_object then null; end $$;
grant select,insert,update,delete on public.character_saved_loadout_presets to authenticated;

comment on table public.account_catalog_preferences is 'Account-wide UI favorites. No progression or reward authority.';
comment on table public.account_game_guide_state is 'Replayable UI onboarding acknowledgement only.';
comment on table public.character_saved_loadout_presets is 'Character-specific loadout snapshots. Applying them must use authoritative equipment services.';
