-- v1.3: normalized PvP and raid weekly loot/pity foundation.
create table if not exists public.arena_matches(
 id uuid primary key default gen_random_uuid(), season_id text not null, player_a uuid not null, player_b uuid not null,
 normalized_rules_version text not null, seed_hash text not null, winner uuid, rating_delta_a integer, rating_delta_b integer,
 created_at timestamptz not null default now()
);
create table if not exists public.raid_lockouts(
 character_id uuid not null, raid_boss_id text not null, week_key text not null,
 eligible_kills integer not null default 0, personal_loot_claimed boolean not null default false,
 pity_counter integer not null default 0, primary key(character_id,raid_boss_id,week_key)
);
create table if not exists public.raid_loot_receipts(
 id uuid primary key default gen_random_uuid(), character_id uuid not null, raid_boss_id text not null,
 week_key text not null, reward_json jsonb not null, created_at timestamptz not null default now(),
 unique(character_id,raid_boss_id,week_key)
);
