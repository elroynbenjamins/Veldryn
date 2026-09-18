-- VELDRYN V40 reconciliation: goals, profession mastery, stop-only idle rules and activity-loadout extensions.
-- Private server-owned state. Does not alter the 24h base / 36h absolute Offline Reserve.
begin;
create schema if not exists private;

create table if not exists private.v40_idle_progression_accounts(
  account_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 0 check(revision>=0),
  tracked_since timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((state->>'schemaVersion')::integer=40)
);
create table if not exists private.v40_idle_progression_receipts(
  account_id uuid not null references private.v40_idle_progression_accounts(account_id) on delete cascade,
  event_id text not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(account_id,event_id)
);
create index if not exists v40_idle_progression_updated_idx on private.v40_idle_progression_accounts(updated_at desc);

alter table private.v40_idle_progression_accounts enable row level security;
alter table private.v40_idle_progression_receipts enable row level security;
revoke all on private.v40_idle_progression_accounts,private.v40_idle_progression_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.v40_idle_progression_accounts,private.v40_idle_progression_receipts to service_role;
commit;
