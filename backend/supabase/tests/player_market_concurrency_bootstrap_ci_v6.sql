-- ONLY for ephemeral PostgreSQL CI service (postgres:17). NEVER deploy.
-- The zeroed account IDs below are synthetic and not production identities.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
-- Match Supabase's built-in auth.uid() implementation for disposable PG17
-- SQL tests. This local helper is NOT a production migration or auth bypass:
-- it derives the actor strictly from the simulated PostgREST JWT session.
create function auth.uid() returns uuid
language sql stable
as $auth_uid$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$auth_uid$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table auth.users(
 id uuid primary key,
 email text unique
);
create table public.online_game_states(
 account_id uuid primary key references auth.users(id),
 character_id uuid,
 state jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
create table public.characters(
 id uuid primary key,
 account_id uuid not null references auth.users(id),
 name text not null,
 class_id text not null,
 gold bigint not null default 0,
 updated_at timestamptz not null default now()
);
create table public.character_wallets(
 character_id uuid primary key references public.characters(id),
 gold bigint not null default 0,
 updated_at timestamptz not null default now()
);
