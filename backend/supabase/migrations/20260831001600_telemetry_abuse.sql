-- v1.4: append-only telemetry and anti-abuse signals.
create table if not exists public.security_events(
 id bigserial primary key, account_id uuid, character_id uuid, event_type text not null,
 severity smallint not null default 1, fingerprint text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists security_events_lookup_idx on public.security_events(account_id,event_type,created_at desc);
create table if not exists public.economy_rollups_hourly(
 hour timestamptz not null, source_type text not null, item_or_currency text not null,
 generated bigint not null default 0, sunk bigint not null default 0, traded bigint not null default 0,
 primary key(hour,source_type,item_or_currency)
);
create table if not exists public.account_risk_state(
 account_id uuid primary key, risk_score integer not null default 0, restriction_level integer not null default 0,
 updated_at timestamptz not null default now()
);
