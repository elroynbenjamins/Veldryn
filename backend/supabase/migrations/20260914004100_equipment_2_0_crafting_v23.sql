begin;
create table if not exists public.equipment_v23_craft_jobs(
 id uuid primary key, character_id uuid not null, piece_id text not null, idempotency_key text not null,
 started_at timestamptz not null, completes_at timestamptz not null, status text not null check(status in('running','completed','cancelled')),
 completed_at timestamptz null, created_at timestamptz not null default now(), unique(character_id,idempotency_key)
);
create index if not exists equipment_v23_craft_jobs_character_status_idx on public.equipment_v23_craft_jobs(character_id,status,completes_at);
alter table public.equipment_v23_craft_jobs enable row level security;
revoke all on public.equipment_v23_craft_jobs from anon,authenticated;
-- Craft start/settlement must run through trusted server code which reserves materials atomically in the current inventory domain.
create table if not exists public.equipment_v23_upgrade_receipts(
 id uuid primary key, character_id uuid not null, piece_instance_id uuid not null, from_rank int not null, to_rank int not null,
 cost_snapshot jsonb not null, idempotency_key text not null, created_at timestamptz not null default now(), unique(character_id,idempotency_key)
);
alter table public.equipment_v23_upgrade_receipts enable row level security;
revoke all on public.equipment_v23_upgrade_receipts from anon,authenticated;
commit;
