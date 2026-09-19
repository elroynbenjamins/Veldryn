-- VELDRYN Equipment 2.0. Additive migration; current local repository remains authoritative.
create table if not exists public.equipment_v22_craft_history(
  character_id uuid not null,
  piece_id text not null,
  first_crafted_at timestamptz not null default now(),
  primary key(character_id,piece_id)
);
create table if not exists public.equipment_v22_skin_unlocks(
  character_id uuid not null,
  skin_id text not null,
  source_type text not null check(source_type in ('equipment_set','event_skin')),
  unlocked_at timestamptz not null default now(),
  primary key(character_id,skin_id)
);
create table if not exists public.equipment_v22_event_skin_definitions(
  skin_id text primary key,
  class_id text not null,
  event_key text not null,
  display_name text not null,
  collectible_bonus_key text,
  collectible_bonus_value numeric,
  return_or_catchup_required boolean not null default true,
  provides_equipment_stats boolean not null default false check(provides_equipment_stats=false),
  provides_set_bonuses boolean not null default false check(provides_set_bonuses=false),
  created_at timestamptz not null default now()
);
create table if not exists public.equipment_v22_craft_jobs(
  job_id uuid primary key default gen_random_uuid(),
  character_id uuid not null,
  piece_id text not null,
  started_at timestamptz not null default now(),
  finishes_at timestamptz not null,
  state text not null default 'running' check(state in ('running','completed','cancelled')),
  idempotency_key text not null unique
);
alter table public.equipment_v22_craft_history enable row level security;
alter table public.equipment_v22_skin_unlocks enable row level security;
alter table public.equipment_v22_event_skin_definitions enable row level security;
alter table public.equipment_v22_craft_jobs enable row level security;
-- Intentionally no direct client write policies. Trusted server/domain services settle crafts and unlock skins.
