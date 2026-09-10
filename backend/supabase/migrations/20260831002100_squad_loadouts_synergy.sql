create table if not exists squad_loadouts (
 squad_id uuid primary key references account_squads(id) on delete cascade,
 formation_version integer not null default 1,
 formation_json jsonb not null,
 synergy_keys jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now()
);
create table if not exists squad_loadout_history (
 squad_id uuid not null references account_squads(id) on delete cascade,
 formation_version integer not null, formation_json jsonb not null, synergy_keys jsonb not null,
 created_at timestamptz not null default now(), primary key(squad_id,formation_version)
);
