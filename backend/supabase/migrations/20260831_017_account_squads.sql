create table if not exists account_squads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  mode text not null check (mode in ('arena','trial','boss_team','event')),
  name text not null default 'Squad',
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id, mode, name)
);
create table if not exists account_squad_members (
  squad_id uuid not null references account_squads(id) on delete cascade,
  character_id uuid not null,
  slot smallint not null check(slot between 1 and 3),
  position text not null check(position in ('front','middle','back')),
  snapshot_version integer not null default 0,
  primary key(squad_id, slot),
  unique(squad_id, character_id),
  unique(squad_id, position)
);
create index if not exists idx_account_squads_owner on account_squads(account_id,mode,is_active);
