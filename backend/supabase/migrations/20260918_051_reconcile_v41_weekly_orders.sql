begin;
create schema if not exists private;
create table if not exists private.v41_weekly_order_accounts(
 account_id uuid primary key,state jsonb not null,revision bigint not null default 0,week_key text not null,starts_at timestamptz not null,ends_at timestamptz not null,generated_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((state->>'schemaVersion')::integer=41),check(revision>=0),check(ends_at>starts_at)
);
create table if not exists private.v41_weekly_order_progress_receipts(
 account_id uuid not null references private.v41_weekly_order_accounts(account_id) on delete cascade,event_id text not null,fingerprint text not null,result jsonb not null,created_at timestamptz not null default now(),primary key(account_id,event_id)
);
create table if not exists private.v41_weekly_order_claims(
 account_id uuid not null references private.v41_weekly_order_accounts(account_id) on delete cascade,claim_key text not null,week_key text not null,order_id text,reward_ref text not null,payload jsonb not null default '{}'::jsonb,status text not null default 'pending' check(status in('pending','granted','failed')),created_at timestamptz not null default now(),granted_at timestamptz,primary key(account_id,claim_key)
);
create index if not exists v41_weekly_order_week_idx on private.v41_weekly_order_accounts(week_key,ends_at);
create index if not exists v41_weekly_order_claim_pending_idx on private.v41_weekly_order_claims(status,created_at) where status='pending';
alter table private.v41_weekly_order_accounts enable row level security;
alter table private.v41_weekly_order_progress_receipts enable row level security;
alter table private.v41_weekly_order_claims enable row level security;
revoke all on private.v41_weekly_order_accounts,private.v41_weekly_order_progress_receipts,private.v41_weekly_order_claims from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.v41_weekly_order_accounts,private.v41_weekly_order_progress_receipts,private.v41_weekly_order_claims to service_role;
commit;
