-- VELDRYN Combat Companions Phase 2/3.
-- Calendar-month Companion Trial rollover is LAZY and server-authoritative.
-- This migration does not reset passive Pets or any permanent companion progression.

alter table public.account_combat_companions
  add column if not exists selected_technique_id text,
  add column if not exists max_xp_overflow_week_key text,
  add column if not exists max_xp_overflow_essence integer not null default 0 check(max_xp_overflow_essence >= 0);

alter table public.account_companion_progression
  add column if not exists favorite_companion_id text,
  add column if not exists showcase_companion_ids text[] not null default '{}'::text[],
  add column if not exists assignment_bondstone_week_key text,
  add column if not exists assignment_bondstones_claimed integer not null default 0 check(assignment_bondstones_claimed >= 0);

create table if not exists public.account_companion_trials (
  account_id uuid primary key,
  season_key text not null,
  current_floor integer not null default 1 check(current_floor >= 1),
  checkpoint_floor integer not null default 1 check(checkpoint_floor >= 1),
  current_season_highest_floor integer not null default 0 check(current_season_highest_floor >= 0),
  first_clear_floors integer[] not null default '{}'::integer[],
  boss_reward_floors integer[] not null default '{}'::integer[],
  special_objectives jsonb not null default '{}'::jsonb,
  monthly_challenge_completion jsonb not null default '{}'::jsonb,
  weekly_state jsonb not null default '{}'::jsonb,
  leaderboard_score bigint not null default 0,
  active_run jsonb,
  lifetime_highest_floor integer not null default 0 check(lifetime_highest_floor >= 0),
  total_trial_bosses_defeated bigint not null default 0 check(total_trial_bosses_defeated >= 0),
  total_trial_floors_cleared bigint not null default 0 check(total_trial_floors_cleared >= 0),
  monthly_seasons_participated integer not null default 1 check(monthly_seasons_participated >= 0),
  monthly_floor_30_clears integer not null default 0 check(monthly_floor_30_clears >= 0),
  best_ever_companion_team_power bigint not null default 0 check(best_ever_companion_team_power >= 0),
  season_archive jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.companion_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  mission_id text not null,
  companion_ids text[] not null,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  mission_version integer not null,
  seed text not null,
  status text not null check(status in ('active','completed','claimed','cancelled')),
  claimed_at timestamptz,
  performance_grade text check(performance_grade is null or performance_grade in ('C','B','A','S')),
  reward_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_companion_assignments_account_status on public.companion_assignments(account_id,status);
create index if not exists idx_companion_assignments_ends_at on public.companion_assignments(ends_at) where status='active';

create table if not exists public.account_companion_special_challenges (
  account_id uuid not null,
  challenge_id text not null,
  boss_id text not null,
  clear_count integer not null default 0 check(clear_count >= 0),
  first_cleared_at timestamptz,
  last_cleared_at timestamptz,
  reward_companion_id text,
  reward_claimed boolean not null default false,
  primary key(account_id,challenge_id)
);

-- Generic exact-once receipts for companion economy/progression mutations.
-- Production adapters should insert/lock this row in the SAME transaction as the mutation.
create table if not exists public.companion_action_receipts (
  account_id uuid not null,
  action text not null,
  request_id text not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(account_id,action,request_id)
);
create index if not exists idx_companion_receipts_created on public.companion_action_receipts(created_at);

alter table public.account_companion_trials enable row level security;
alter table public.companion_assignments enable row level security;
alter table public.account_companion_special_challenges enable row level security;
alter table public.companion_action_receipts enable row level security;

do $$ begin
  create policy "owner read companion trials" on public.account_companion_trials for select using(account_id=auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "owner read companion assignments" on public.companion_assignments for select using(account_id=auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "owner read companion challenge progress" on public.account_companion_special_challenges for select using(account_id=auth.uid());
exception when duplicate_object then null; end $$;
-- Receipts intentionally have no ordinary-client policy; they are service-side anti-replay state.

comment on table public.account_companion_trials is 'Monthly UTC calendar Companion Trial state plus permanent lifetime stats. Lazy rollover on trusted Trial request; never reset companion progression/resources.';
comment on table public.companion_assignments is 'Sanctuary Companion Expeditions/assignments. Timestamp-based resolution; no background completion worker required.';
comment on table public.companion_action_receipts is 'Exactly-once companion mutations. Same account/action/request_id cannot award or charge twice.';
