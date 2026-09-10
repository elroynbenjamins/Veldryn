create table if not exists squad_arena_seasons (
 id text primary key, starts_at timestamptz not null, ends_at timestamptz not null, status text not null check(status in ('scheduled','active','finalizing','closed')),
 rules_version integer not null, created_at timestamptz not null default now()
);
create table if not exists squad_arena_season_accounts (
 season_id text not null references squad_arena_seasons(id), account_id uuid not null, rating integer not null default 1000,
 wins integer not null default 0, losses integer not null default 0, defense_wins integer not null default 0,
 bonus_wins_day integer not null default 0, bonus_wins_week integer not null default 0, defense_rewards_day integer not null default 0,
 reward_claimed boolean not null default false, updated_at timestamptz not null default now(), primary key(season_id,account_id)
);
create table if not exists squad_arena_reward_claims (
 season_id text not null, account_id uuid not null, reward_tier smallint not null, reward_payload jsonb not null,
 claimed_at timestamptz not null default now(), primary key(season_id,account_id)
);
