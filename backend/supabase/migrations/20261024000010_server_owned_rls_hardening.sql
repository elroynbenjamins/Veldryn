-- Security hardening: these tables are server-owned persistence/internal ledgers.
-- Player/mobile clients already have no direct SELECT/INSERT/UPDATE/DELETE grants.
-- Enabling RLS closes the remaining exposed-schema lint gap while SECURITY DEFINER
-- server RPCs and postgres-owned workers continue to operate normally.
--
-- Intentionally no anon/authenticated RLS policies are added.

alter table public.echo_recruitments enable row level security;
alter table public.party_match_receipts enable row level security;
alter table public.guild_contribution_ledger enable row level security;
alter table public.guild_skill_allocations enable row level security;
alter table public.guild_boss_windows enable row level security;
alter table public.guild_boss_attempts enable row level security;
alter table public.arena_matches enable row level security;
alter table public.raid_lockouts enable row level security;
alter table public.raid_loot_receipts enable row level security;
alter table public.economy_rollups_hourly enable row level security;
alter table public.account_risk_state enable row level security;
alter table public.client_builds enable row level security;
alter table public.api_request_receipts enable row level security;
alter table public.content_manifests enable row level security;
alter table public.account_squads enable row level security;
alter table public.account_squad_members enable row level security;
alter table public.squad_trial_runs enable row level security;
alter table public.squad_trial_floor_results enable row level security;
alter table public.squad_loadouts enable row level security;
alter table public.squad_loadout_history enable row level security;
alter table public.squad_arena_seasons enable row level security;
alter table public.squad_arena_reward_claims enable row level security;
alter table public.squad_api_receipts enable row level security;

revoke all privileges on table
  public.echo_recruitments,
  public.party_match_receipts,
  public.guild_contribution_ledger,
  public.guild_skill_allocations,
  public.guild_boss_windows,
  public.guild_boss_attempts,
  public.arena_matches,
  public.raid_lockouts,
  public.raid_loot_receipts,
  public.economy_rollups_hourly,
  public.account_risk_state,
  public.client_builds,
  public.api_request_receipts,
  public.content_manifests,
  public.account_squads,
  public.account_squad_members,
  public.squad_trial_runs,
  public.squad_trial_floor_results,
  public.squad_loadouts,
  public.squad_loadout_history,
  public.squad_arena_seasons,
  public.squad_arena_reward_claims,
  public.squad_api_receipts
from anon, authenticated;

revoke all privileges on table
  public.echo_recruitments,
  public.party_match_receipts,
  public.guild_contribution_ledger,
  public.guild_skill_allocations,
  public.guild_boss_windows,
  public.guild_boss_attempts,
  public.arena_matches,
  public.raid_lockouts,
  public.raid_loot_receipts,
  public.economy_rollups_hourly,
  public.account_risk_state,
  public.client_builds,
  public.api_request_receipts,
  public.content_manifests,
  public.account_squads,
  public.account_squad_members,
  public.squad_trial_runs,
  public.squad_trial_floor_results,
  public.squad_loadouts,
  public.squad_loadout_history,
  public.squad_arena_seasons,
  public.squad_arena_reward_claims,
  public.squad_api_receipts
from public;

comment on table public.echo_recruitments is 'Server-owned co-op persistence; no direct player Data API access.';
comment on table public.party_match_receipts is 'Server-owned party matchmaking receipt ledger; no direct player Data API access.';
comment on table public.guild_contribution_ledger is 'Server-owned guild contribution ledger; mutations/read models are exposed only through trusted services.';
comment on table public.guild_skill_allocations is 'Server-owned guild skill allocation state; no direct player Data API writes.';
comment on table public.guild_boss_windows is 'Server-owned guild boss scheduling state.';
comment on table public.guild_boss_attempts is 'Server-owned guild boss attempt receipts.';
comment on table public.arena_matches is 'Server-owned Arena match ledger.';
comment on table public.raid_lockouts is 'Server-owned raid lockout state.';
comment on table public.raid_loot_receipts is 'Server-owned raid loot receipt ledger.';
comment on table public.economy_rollups_hourly is 'Internal aggregated economy telemetry; never player writable.';
comment on table public.account_risk_state is 'Internal anti-abuse account risk state; never player readable or writable.';
comment on table public.client_builds is 'Internal client build compatibility registry.';
comment on table public.api_request_receipts is 'Internal API idempotency/request receipt ledger.';
comment on table public.content_manifests is 'Server-owned immutable/published content manifests.';
comment on table public.account_squads is 'Server-owned account squad state; use authoritative squad RPCs.';
comment on table public.account_squad_members is 'Server-owned account squad membership state; use authoritative squad RPCs.';
comment on table public.squad_trial_runs is 'Server-owned squad trial run state.';
comment on table public.squad_trial_floor_results is 'Server-owned squad trial floor result ledger.';
comment on table public.squad_loadouts is 'Server-owned squad loadout state.';
comment on table public.squad_loadout_history is 'Server-owned squad loadout history.';
comment on table public.squad_arena_seasons is 'Server-owned Arena season definitions/state.';
comment on table public.squad_arena_reward_claims is 'Server-owned Arena reward claim ledger.';
comment on table public.squad_api_receipts is 'Internal squad API receipt/idempotency ledger.';
