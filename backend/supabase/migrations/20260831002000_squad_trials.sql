create table if not exists squad_trial_runs (
 id uuid primary key default gen_random_uuid(), account_id uuid not null, squad_id uuid not null references account_squads(id),
 season_key text not null, status text not null check(status in ('active','completed','failed','abandoned')),
 current_floor integer not null default 1 check(current_floor between 1 and 30), alive_character_ids jsonb not null,
 revives_remaining integer not null default 0, score integer not null default 0, state_version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists squad_trial_floor_results (
 run_id uuid not null references squad_trial_runs(id) on delete cascade, floor integer not null,
 result jsonb not null, score_awarded integer not null, created_at timestamptz not null default now(), primary key(run_id,floor)
);
create index if not exists idx_trial_account on squad_trial_runs(account_id,season_key,created_at desc);
