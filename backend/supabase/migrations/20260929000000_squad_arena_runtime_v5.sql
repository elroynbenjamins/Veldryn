-- VELDRYN Squad Arena v5 durable contract.
-- Apply only after linked migration dry-run and schema lint. All mutating functions
-- are intended for the authenticated server adapter, never direct client writes.

alter table if exists public.squad_arena_defenses add column if not exists season_id text;
alter table if exists public.squad_arena_defenses add column if not exists label text not null default 'Adventurer';
alter table if exists public.squad_arena_defenses add column if not exists power_band integer not null default 1 check(power_band > 0);
alter table if exists public.squad_arena_defenses add column if not exists snapshot_hash text;
alter table if exists public.squad_arena_matches add column if not exists request_id text;
alter table if exists public.squad_arena_matches add column if not exists attacker_label text not null default 'Adventurer';
alter table if exists public.squad_arena_matches add column if not exists defender_label text not null default 'Adventurer';
alter table if exists public.squad_arena_matches add column if not exists attacker_snapshot_hash text;
alter table if exists public.squad_arena_matches add column if not exists defender_snapshot_hash text;
alter table if exists public.squad_arena_season_accounts add column if not exists day_key date not null default (now() at time zone 'utc')::date;
alter table if exists public.squad_arena_season_accounts add column if not exists week_key date not null default date_trunc('week',now() at time zone 'utc')::date;
create unique index if not exists uq_squad_arena_request on public.squad_arena_matches(season_id,attacker_account_id,request_id) where request_id is not null;
create index if not exists idx_squad_arena_defense_season on public.squad_arena_defenses(season_id,power_band,rating);

create table if not exists public.squad_arena_reward_entitlements(
 id uuid primary key default gen_random_uuid(), season_id text not null, account_id uuid not null,
 kind text not null check(kind in ('ranked_win','defense_win','season')),
 reward_tier smallint not null check(reward_tier between 1 and 6),
 catalog_version text not null default 'arena-rewards-v1', source_id text not null,
 created_at timestamptz not null default now(), claimed_at timestamptz, claim_request_id text,
 unique(season_id,account_id,kind,source_id)
);

alter table public.squad_arena_defenses enable row level security;
alter table public.squad_arena_matches enable row level security;
alter table public.squad_arena_season_accounts enable row level security;
alter table public.squad_arena_reward_entitlements enable row level security;
drop policy if exists arena_rewards_read_self on public.squad_arena_reward_entitlements;
create policy arena_rewards_read_self on public.squad_arena_reward_entitlements for select to authenticated using(account_id=auth.uid());

create or replace function public.arena_reward_tier_v1(p_rating integer) returns smallint
language sql immutable as $$ select case when p_rating>=2000 then 6 when p_rating>=1750 then 5 when p_rating>=1500 then 4 when p_rating>=1250 then 3 when p_rating>=1000 then 2 else 1 end::smallint $$;

create or replace function public.arena_season_server_v1(p_now timestamptz) returns jsonb
language plpgsql security definer set search_path=public as $$
declare anchor timestamptz:='2026-09-01 00:00:00+00'; span interval:='28 days'; idx integer; starts timestamptz; ends_at timestamptz; season_id text;
begin
 idx:=greatest(0,floor(extract(epoch from (p_now-anchor))/extract(epoch from span))::integer);
 starts:=anchor+idx*span; ends_at:=starts+span; season_id:='ARENA_S'||lpad((idx+1)::text,3,'0');
 insert into public.squad_arena_seasons(id,starts_at,ends_at,status,rules_version) values(season_id,starts,ends_at,'active',1)
 on conflict(id) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,status='active',rules_version=1;
 return jsonb_build_object('id',season_id,'startsAtMs',(extract(epoch from starts)*1000)::bigint,'endsAtMs',(extract(epoch from ends_at)*1000)::bigint,'rulesVersion',1);
end $$;

revoke all on function public.arena_reward_tier_v1(integer) from public;
grant execute on function public.arena_reward_tier_v1(integer) to service_role;
revoke all on function public.arena_season_server_v1(timestamptz) from public;
grant execute on function public.arena_season_server_v1(timestamptz) to service_role;
