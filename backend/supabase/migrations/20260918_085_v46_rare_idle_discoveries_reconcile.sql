begin;
-- V46 reconciliation: rare idle discoveries.
-- This supplements finalized settlement events only; it is not a second normal-loot simulator.
create table if not exists private.rare_idle_discovery_state(
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null,
  state jsonb not null,
  revision bigint not null default 0 check(revision>=0),
  updated_at timestamptz not null default now(),
  primary key(account_id,character_id)
);
create table if not exists private.rare_idle_discovery_receipts(
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(account_id,event_id)
);
revoke all on private.rare_idle_discovery_state,private.rare_idle_discovery_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.rare_idle_discovery_state,private.rare_idle_discovery_receipts to service_role;
commit;
