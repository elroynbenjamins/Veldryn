create table if not exists squad_arena_defenses (
 account_id uuid primary key,
 squad_id uuid not null references account_squads(id),
 squad_version integer not null,
 defense_snapshot jsonb not null,
 rating integer not null default 1000,
 updated_at timestamptz not null default now()
);
create table if not exists squad_arena_matches (
 id uuid primary key default gen_random_uuid(),
 season_id text not null,
 attacker_account_id uuid not null,
 defender_account_id uuid not null,
 attacker_squad_version integer not null,
 defender_squad_version integer not null,
 seed_hash text not null,
 result jsonb not null,
 attacker_rating_before integer not null,
 defender_rating_before integer not null,
 attacker_rating_delta integer not null,
 defender_rating_delta integer not null,
 created_at timestamptz not null default now()
);
create unique index if not exists uq_squad_arena_seed on squad_arena_matches(attacker_account_id,seed_hash);
create index if not exists idx_squad_arena_history on squad_arena_matches(attacker_account_id,created_at desc);
