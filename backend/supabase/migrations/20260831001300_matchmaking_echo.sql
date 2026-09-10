-- v1.1: party matchmaking and frozen Echo recruitment.
create table if not exists public.matchmaking_tickets(
 id uuid primary key default gen_random_uuid(), character_id uuid not null, mode text not null,
 role text not null check(role in ('tank','damage','support')), power_index numeric not null,
 region_id text, expedition_id text, echo_allowed boolean not null default true,
 status text not null default 'queued' check(status in ('queued','matched','cancelled','expired')),
 created_at timestamptz not null default now(), matched_party_id uuid
);
create index if not exists matchmaking_queue_idx on public.matchmaking_tickets(mode,status,created_at);
create table if not exists public.echo_recruitments(
 id uuid primary key default gen_random_uuid(), recruiter_character_id uuid not null,
 echo_profile_id uuid not null, echo_profile_version integer not null,
 run_id uuid, created_at timestamptz not null default now(),
 unique(recruiter_character_id,echo_profile_id,run_id)
);
create table if not exists public.party_match_receipts(
 party_id uuid primary key, mode text not null, member_character_ids uuid[] not null,
 role_pattern text not null, created_at timestamptz not null default now()
);
