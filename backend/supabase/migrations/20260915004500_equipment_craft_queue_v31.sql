-- Equipment 2.0 v31 crafting prerequisite queues.
-- Server-owned queue; clients can read their character queues but cannot write arbitrary steps.
create table if not exists public.equipment_craft_queues (
  id uuid primary key,
  character_id uuid not null,
  piece_id text not null,
  state text not null check (state in ('planned','running','blocked','completed','cancelled')),
  blocker_keys jsonb not null default '[]'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id,idempotency_key)
);
create table if not exists public.equipment_craft_queue_steps (
  queue_id uuid not null references public.equipment_craft_queues(id) on delete cascade,
  position integer not null,
  step_id text not null,
  kind text not null check (kind in ('process','component','final')),
  inventory_key text not null,
  quantity integer not null check (quantity > 0),
  skill_id text not null,
  skill_level integer not null check (skill_level >= 0),
  seconds integer not null check (seconds >= 0),
  depends_on jsonb not null default '[]'::jsonb,
  state text not null check (state in ('pending','running','done','blocked','cancelled')),
  primary key(queue_id,position),
  unique(queue_id,step_id)
);
alter table public.equipment_craft_queues enable row level security;
alter table public.equipment_craft_queue_steps enable row level security;
-- Integrator: bind character ownership to the existing character/account ownership function/policy.
-- Mutations must go through server/RPC service-role paths; do not add client INSERT/UPDATE policies.
