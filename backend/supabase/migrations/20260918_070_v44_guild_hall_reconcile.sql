begin;
-- V44 reconciliation. Hall Progress is cumulative/non-spendable progression, not a currency.
create table if not exists public.guild_halls(
  guild_id uuid primary key references public.guilds(id) on delete cascade,
  hall_progress bigint not null default 0 check(hall_progress>=0),
  lifetime_projects_completed integer not null default 0 check(lifetime_projects_completed>=0),
  facilities jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check(revision>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.guild_hall_trophies(
  guild_id uuid not null references public.guilds(id) on delete cascade,
  trophy_key text not null,
  label text not null,
  description text not null default '',
  source_kind text not null,
  source_id text not null,
  earned_at timestamptz not null,
  primary key(guild_id,trophy_key),
  check(char_length(label)<=80),
  check(char_length(description)<=180)
);
create table if not exists private.guild_hall_receipts(
  guild_id uuid not null references public.guilds(id) on delete cascade,
  event_id text not null,
  fingerprint text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(guild_id,event_id)
);
alter table public.guild_halls enable row level security;
alter table public.guild_hall_trophies enable row level security;
alter table private.guild_hall_receipts enable row level security;
drop policy if exists "guild members read hall" on public.guild_halls;
create policy "guild members read hall" on public.guild_halls for select to authenticated using(exists(select 1 from public.guild_members gm where gm.guild_id=guild_halls.guild_id and gm.account_id=auth.uid()));
drop policy if exists "guild members read hall trophies" on public.guild_hall_trophies;
create policy "guild members read hall trophies" on public.guild_hall_trophies for select to authenticated using(exists(select 1 from public.guild_members gm where gm.guild_id=guild_hall_trophies.guild_id and gm.account_id=auth.uid()));
revoke all on private.guild_hall_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.guild_hall_receipts to service_role;
commit;
