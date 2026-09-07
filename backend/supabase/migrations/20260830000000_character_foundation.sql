-- Veldryn online foundation. This migration intentionally precedes every
-- feature migration: all character-scoped systems depend on these records.
create extension if not exists pgcrypto;

create table if not exists public.player_profiles (
  account_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  profile_title text,
  profile_background_id text not null default 'asterfall-night',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 20),
  class_id text not null,
  body_presentation text not null default 'male' check (body_presentation in ('male', 'female')),
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  gold bigint not null default 0 check (gold >= 0),
  base_stats jsonb not null default '{}'::jsonb,
  customization jsonb not null default '{}'::jsonb,
  equipment jsonb not null default '{}'::jsonb,
  profile_title text,
  profile_background_id text not null default 'asterfall-night',
  profile_appearance_mode text not null default 'live' check (profile_appearance_mode in ('live', 'showcase')),
  profile_equipment_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create index if not exists characters_account_id_idx on public.characters(account_id);
create index if not exists characters_level_idx on public.characters(level desc);

alter table public.player_profiles enable row level security;
alter table public.characters enable row level security;

create policy "public profile previews" on public.player_profiles
  for select using (true);
create policy "account reads own profile" on public.player_profiles
  for select using (account_id = auth.uid());
create policy "account writes own profile" on public.player_profiles
  for all using (account_id = auth.uid()) with check (account_id = auth.uid());

create policy "public character previews" on public.characters
  for select using (true);
create policy "account creates characters" on public.characters
  for insert with check (account_id = auth.uid());
create policy "account updates own characters" on public.characters
  for update using (account_id = auth.uid()) with check (account_id = auth.uid());
create policy "account deletes own characters" on public.characters
  for delete using (account_id = auth.uid());

-- Keeps client-side profile customisation compatible while writes remain
-- constrained to the signed-in account via the policies above.
grant select, insert, update, delete on public.player_profiles, public.characters to authenticated;
