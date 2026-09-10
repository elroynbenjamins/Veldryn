-- v1.2: guild progression, contribution ledger, boss windows.
create table if not exists public.guild_contribution_ledger(
 id uuid primary key default gen_random_uuid(), guild_id uuid not null, character_id uuid not null,
 contribution_type text not null, amount bigint not null check(amount>0), idempotency_key text not null,
 created_at timestamptz not null default now(), unique(character_id,idempotency_key)
);
create table if not exists public.guild_skill_allocations(
 guild_id uuid not null, skill_id text not null, rank integer not null default 0 check(rank>=0),
 updated_at timestamptz not null default now(), primary key(guild_id,skill_id)
);
create table if not exists public.guild_boss_windows(
 id uuid primary key default gen_random_uuid(), guild_id uuid not null, boss_id text not null,
 starts_at timestamptz not null, ends_at timestamptz not null, max_attempts_per_member integer not null default 3,
 status text not null default 'open'
);
create table if not exists public.guild_boss_attempts(
 window_id uuid not null, character_id uuid not null, attempt_no integer not null,
 damage bigint not null default 0, created_at timestamptz not null default now(),
 primary key(window_id,character_id,attempt_no)
);
