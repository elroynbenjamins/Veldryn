begin;
-- V45 reconciliation: per-character cross-skill discovery unlocks and account-wide collection-set completion.
-- Ownership remains canonical in existing item/pet/companion/bestiary systems.
create table if not exists private.cross_skill_discovery_state(
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null,
  unlocked_json jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check(revision>=0),
  updated_at timestamptz not null default now(),
  primary key(account_id,character_id)
);
create table if not exists public.collection_set_completions(
  account_id uuid not null references auth.users(id) on delete cascade,
  set_id text not null,
  completed_at timestamptz not null,
  reward_ref text not null,
  primary key(account_id,set_id)
);
create table if not exists private.v45_progression_receipts(
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  kind text not null check(kind in('cross_skill','collection_set')),
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(account_id,event_id)
);
alter table private.cross_skill_discovery_state enable row level security;
alter table public.collection_set_completions enable row level security;
alter table private.v45_progression_receipts enable row level security;
drop policy if exists "read own collection set completions" on public.collection_set_completions;
create policy "read own collection set completions" on public.collection_set_completions for select to authenticated using(account_id=auth.uid());
revoke all on private.cross_skill_discovery_state,private.v45_progression_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.cross_skill_discovery_state,private.v45_progression_receipts to service_role;
commit;
