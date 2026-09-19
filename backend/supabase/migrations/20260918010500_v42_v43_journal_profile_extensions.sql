begin;
-- V42/V43 reconciliation. Existing achievement/profile APIs stay authoritative for their current surfaces;
-- these tables persist the long-term Journal and extended showcase/privacy settings.
create table if not exists private.adventurers_journal_state(
  account_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 0 check(revision>=0),
  updated_at timestamptz not null default now(),
  check((state->>'schemaVersion')::integer=42)
);
create table if not exists public.player_profile_extensions(
  account_id uuid primary key references auth.users(id) on delete cascade,
  visibility text not null default 'public' check(visibility in('public','guild','private')),
  world_feed_opt_out boolean not null default false,
  selected_character_id uuid,
  bio text not null default '' check(char_length(bio)<=160),
  favorite_skill_id text,
  favorite_companion_id text,
  achievement_showcase_ids text[] not null default '{}'::text[] check(cardinality(achievement_showcase_ids)<=3),
  collection_showcase jsonb not null default '[]'::jsonb,
  record_showcase_ids text[] not null default '{}'::text[] check(cardinality(record_showcase_ids)<=3),
  revision bigint not null default 0 check(revision>=0),
  updated_at timestamptz not null default now()
);
alter table private.adventurers_journal_state enable row level security;
alter table public.player_profile_extensions enable row level security;
revoke all on private.adventurers_journal_state from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.adventurers_journal_state to service_role;
drop policy if exists "read own profile extension" on public.player_profile_extensions;
create policy "read own profile extension" on public.player_profile_extensions for select to authenticated using(account_id=auth.uid());
commit;
