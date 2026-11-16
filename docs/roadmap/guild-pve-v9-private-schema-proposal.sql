-- VELDRYN GUILD EXPEDITIONS V9: PRIVATE POSTGRES PROPOSAL, NOT A MIGRATION.
--
-- NEVER EXECUTE this document on staging or production as-is. The release
-- requires schema review, migration ordering, role/RLS advisor checks, an
-- authenticated server-only caller and real multi-worker transaction tests.
--
-- Investigated Veldryn STAGING schema metadata only (2026-11-15):
-- public.guilds(id uuid), public.guild_members(guild_id uuid,account_id uuid,
-- joined_at timestamptz), public.online_game_states(account_id uuid,
-- character_id uuid nullable,state jsonb,revision bigint).
-- Existing public.guild_pve_encounters_v1 / guild_pve_roster_v2 are LIVE
-- guild systems and must not be reused or modified for Broken Forge.

begin;

create schema if not exists guild_expedition_private_v9;
revoke all on schema guild_expedition_private_v9 from public, anon, authenticated;

create table if not exists guild_expedition_private_v9.guild_runs (
  cycle_id text not null,
  guild_id uuid not null references public.guilds(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  difficulty text not null check (difficulty in ('Scout','Veteran','Mythic')),
  manifest_version text not null,
  reference_digest text not null check (reference_digest ~ '^[0-9a-f]{64}$'),
  frozen_roster_size integer not null check (frozen_roster_size between 1 and 200),
  pressure integer not null default 0 check (pressure between 0 and 100),
  revision bigint not null default 0 check (revision>=0),
  created_at timestamptz not null default now(),
  primary key (cycle_id,guild_id),
  check (end_at = start_at + interval '14 days')
);

create table if not exists guild_expedition_private_v9.guild_nodes (
  cycle_id text not null,
  guild_id uuid not null,
  node_id text not null check (node_id ~ '^C[123]-0[1-6]$'),
  max_hp numeric(18,2) not null check (max_hp>=0),
  hp numeric(18,2) not null check (hp>=0 and hp<=max_hp),
  phase_id text,
  phase_triggers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(phase_triggers)='array'),
  cleared boolean not null default false,
  revision bigint not null default 0 check (revision>=0),
  primary key (cycle_id,guild_id,node_id),
  foreign key (cycle_id,guild_id)
    references guild_expedition_private_v9.guild_runs(cycle_id,guild_id)
    on delete restrict,
  check (not cleared or hp=0)
);

create table if not exists guild_expedition_private_v9.roster (
  cycle_id text not null,
  guild_id uuid not null,
  account_id uuid not null,
  eligible_since timestamptz not null,
  seals_spent integer not null default 0 check (seals_spent between 0 and 8),
  orders_spent integer not null default 0 check (orders_spent between 0 and 6),
  action_count integer not null default 0 check (action_count>=0),
  primary key (cycle_id,guild_id,account_id),
  foreign key (cycle_id,guild_id)
    references guild_expedition_private_v9.guild_runs(cycle_id,guild_id)
    on delete restrict
);

create table if not exists guild_expedition_private_v9.cycle_account_bindings (
  cycle_id text not null,
  account_id uuid not null,
  guild_id uuid not null,
  first_committed_at timestamptz not null default now(),
  primary key (cycle_id,account_id), -- One guild per account per global cycle
  foreign key (cycle_id,guild_id,account_id)
    references guild_expedition_private_v9.roster(cycle_id,guild_id,account_id)
    on delete restrict
);

create table if not exists guild_expedition_private_v9.action_receipts (
  cycle_id text not null,
  account_id uuid not null,
  request_id text not null check (length(request_id) between 2 and 100),
  guild_id uuid not null,
  character_id uuid not null,
  node_id text not null,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  source_digest text check (source_digest ~ '^[0-9a-f]{64}$'),
  source_game_revision bigint check (source_game_revision>=1),
  kind text not null check (kind in ('battle','exploration')),
  status text not null check (status in ('committed','stale')),
  cost_seals smallint not null check (cost_seals in (0,1)),
  cost_orders smallint not null check (cost_orders in (0,1)),
  before_hp numeric(18,2) not null check (before_hp>=0),
  after_hp numeric(18,2) not null check (after_hp>=0 and after_hp<=before_hp),
  credited_hp numeric(18,2) not null check (credited_hp>=0),
  before_pressure integer not null check (before_pressure between 0 and 100),
  after_pressure integer not null check (after_pressure between 0 and 100),
  phase_transitions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(phase_transitions)='array'),
  result_reel jsonb,
  committed_revision bigint not null check (committed_revision>=0),
  accepted_at timestamptz not null default now(),
  primary key (cycle_id,account_id,request_id),
  foreign key (cycle_id,guild_id,account_id)
    references guild_expedition_private_v9.roster(cycle_id,guild_id,account_id)
    on delete restrict,
  foreign key (cycle_id,guild_id,node_id)
    references guild_expedition_private_v9.guild_nodes(cycle_id,guild_id,node_id)
    on delete restrict,
  check (credited_hp=before_hp-after_hp),
  check (
   (kind='battle' and cost_orders=0) or
   (kind='exploration' and cost_seals=0)
  ),
  check (status<>'stale' or (cost_orders=0 and cost_seals=0 and credited_hp=0))
);
create index if not exists guild_exp_v9_receipts_by_run
  on guild_expedition_private_v9.action_receipts(cycle_id,guild_id,accepted_at);

-- NO WALLET OR INBOX PAYOUT CODE IMPLEMENTED. A future separate settlement
-- job can claim a unique source before grant, using an audited outbox.
create table if not exists guild_expedition_private_v9.entitlement_outbox (
  cycle_id text not null,
  guild_id uuid not null,
  account_id uuid not null,
  source_key text not null,
  reward_kind text not null,
  reward_manifest_version text not null,
  reward_payload jsonb not null,
  state text not null default 'pending'
    check (state in ('pending','processing','settled','failed')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  primary key (cycle_id,account_id,source_key),
  foreign key (cycle_id,guild_id,account_id)
    references guild_expedition_private_v9.roster(cycle_id,guild_id,account_id)
    on delete restrict
);

-- Private-only, deny Data API clients even if a schema is exposed by mistake.
alter table guild_expedition_private_v9.guild_runs enable row level security;
alter table guild_expedition_private_v9.guild_nodes enable row level security;
alter table guild_expedition_private_v9.roster enable row level security;
alter table guild_expedition_private_v9.cycle_account_bindings enable row level security;
alter table guild_expedition_private_v9.action_receipts enable row level security;
alter table guild_expedition_private_v9.entitlement_outbox enable row level security;

revoke all on all tables in schema guild_expedition_private_v9
 from public, anon, authenticated;
revoke all on all sequences in schema guild_expedition_private_v9
 from public, anon, authenticated;
-- Service-role grant is a deployment decision, never a mobile grant:
-- grant usage on schema guild_expedition_private_v9 to service_role;
-- grant select, insert, update on all tables in schema guild_expedition_private_v9
--   to service_role;

commit;

-- ATOMIC SUBMISSION CONTRACT (application-side SQL transaction, not executed):
--
-- 1. Authenticated server principal extracts account UUID; API accepts only
--    character UUID, guild/cycle selection, node, stance and request nonce.
-- 2. BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE.
-- 3. For cross-guild binding races, take transaction-scoped lock on canonical
--    cycle/account advisory key, or rely on the unique primary key and retry
--    a serialization/uniqueness conflict; NEVER trust a process-local mutex.
-- 4. Check existing action_receipts(cycle,account,nonce) FIRST, before the
--    active-window check. Exact matching fingerprint => return saved result.
--    Different fingerprint => reject.
-- 5. Lock guild_runs row FOR UPDATE, then relevant guild_nodes row, then
--    roster row; read immutable difficulty, snapshot manifest, quota counters,
--    initial node HP/phase, Pressure, cleared status and prerequisites.
-- 6. Validate frozen roster, 72-hour tenure, current guild binding and
--    account owner in public.online_game_states. Freeze validated
--    character/equipment/skill/gem/companion server loadout and revision.
--    Existing source-state mutation paths need optimistic revision checks;
--    no client Combat Power or client-authored reel.
-- 7. If already cleared: insert one zero-cost 'stale' receipt, commit, return.
--    If locked: reject without receipt or debit. For valid battles enforce
--    4 Seals before day 8 and 8 cumulative from day 8. Orders use 3/6.
-- 8. Compute deterministic actual combat from the frozen node profile and
--    verified loadout; hold locks or use a durable SERIALIZABLE
--    reservation/queue. If using an async worker, freeze reservation and
--    deterministic seed in the DB and settle in row-order with stale replay;
--    do not let concurrent workers both consume a Seal or skip phases.
-- 9. In SAME COMMIT: clamp credited HP to remaining HP, record phase transitions,
--    update Pressure and revision, increment account-wide quota, insert binding
--    and source-digested immutable receipt, and write an outbox entitlement
--    ONLY when audited eligibility actually becomes true. No payout now.
-- 10. COMMIT; serialization retry uses the same nonce and must revalidate
--     current phase and target. A network retry returns the original result.
--
-- CRITICAL: after DB crash, a successfully committed receipt MUST remain.
-- A halfway battle must not debit attempts without a corresponding stable
-- replay result; the exact two-stage reservation protocol is a future gate.
--
-- This proposal is intentionally outside supabase/migrations and has NOT
-- been applied anywhere. The eventual deployment migration must be generated
-- and reviewed separately, including security advisors and staging tests.
