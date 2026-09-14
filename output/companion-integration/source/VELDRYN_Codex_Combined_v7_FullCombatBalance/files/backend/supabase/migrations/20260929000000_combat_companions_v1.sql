-- VELDRYN active Combat Companion progression. Passive collectible Pets remain separate.
create table if not exists public.account_combat_companions (
  account_id uuid not null,
  companion_id text not null,
  level smallint not null default 1 check(level between 1 and 35),
  xp bigint not null default 0 check(xp >= 0),
  ascension_tier smallint not null default 0 check(ascension_tier between 0 and 3),
  bond_level smallint not null default 1 check(bond_level between 1 and 10),
  bond_xp bigint not null default 0 check(bond_xp >= 0),
  bond_trait_unlocked boolean not null default false,
  mastered boolean not null default false,
  obtained_at timestamptz not null default now(),
  original_event_release_year integer,
  veteran_cosmetic_eligible boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(account_id, companion_id)
);

create table if not exists public.account_companion_progression (
  account_id uuid primary key,
  companion_essence bigint not null default 0 check(companion_essence >= 0),
  bondstones bigint not null default 0 check(bondstones >= 0),
  unlock_progress jsonb not null default '{}'::jsonb,
  sanctuary jsonb not null default '{"trainingGroundLevel":0,"essenceBasinLevel":0,"bondHallLevel":0,"expeditionPensLevel":0,"masteryChamberLevel":0}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.character_combat_companion_loadouts (
  character_id uuid primary key,
  account_id uuid not null,
  companion_id text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_character_companion_account on public.character_combat_companion_loadouts(account_id);

alter table public.account_combat_companions enable row level security;
alter table public.account_companion_progression enable row level security;
alter table public.character_combat_companion_loadouts enable row level security;

-- Clients may read their own state for projection, but all mutations stay server-authoritative.
do $$ begin
  create policy "owner read combat companions" on public.account_combat_companions for select using(account_id=auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "owner read companion progression" on public.account_companion_progression for select using(account_id=auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "owner read companion loadouts" on public.character_combat_companion_loadouts for select using(account_id=auth.uid());
exception when duplicate_object then null; end $$;

comment on table public.account_combat_companions is 'Account-wide active Combat Companion ownership/progression. Not passive collectible Pets. Service-role writes only.';
comment on table public.account_companion_progression is 'Account-wide Companion Essence, Bondstones, unlock counters and Sanctuary progression. Service-role writes only.';
comment on table public.character_combat_companion_loadouts is 'Character-specific equipped active companion. Server validates ownership and same-role restriction before writes.';
