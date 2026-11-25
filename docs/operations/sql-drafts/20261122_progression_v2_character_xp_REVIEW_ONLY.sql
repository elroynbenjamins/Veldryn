-- REVIEW ONLY — do NOT apply to staging or production.
-- Proposed isolated database contract for Veldryn 2.0 three-track progression.
-- Grounded against read-only staging schema inspection, 2026-11-22.
-- Does not replace public.characters(xp,level), public.character_skills(xp,level)
-- or private.v45_progression_receipts (account-scoped old receipt history).
-- Requires full staging concurrency tests and owner approval before migration.

-- public.characters.id is uuid PK; character_skills is keyed by
-- (character_id,skill_id); the new bank is character-specific, not account-wide.
create table private.character_career_progress_v2 (
  character_id uuid primary key references public.characters(id) on delete cascade,
  overall_character_xp bigint not null default 0 check (overall_character_xp >= 0),
  progression_version smallint not null default 1 check (progression_version = 1),
  -- Claim receipts at/before the cutover are already represented by the backfill.
  activated_at timestamptz not null default now(),
  migrated_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table private.character_career_progress_v2 enable row level security;

-- Unique across all characters: no transferring a completed job to another alt.
-- Only an authenticated internal server settlement should ever write these.
create table private.character_career_awards_v2 (
  source_kind text not null
    check (source_kind in ('combat_reward','gathering_claim','craft_claim','processing_claim','migration_backfill')),
  source_id text not null check (length(source_id) between 8 and 128),
  character_id uuid not null references public.characters(id) on delete cascade,
  progression_version smallint not null default 1 check (progression_version = 1),
  overall_character_xp_delta bigint not null
    check (overall_character_xp_delta >= 0 and overall_character_xp_delta <= 1000000),
  profession_id text,
  profession_xp_delta bigint not null default 0
    check (profession_xp_delta >= 0 and profession_xp_delta <= 1000000),
  fingerprint text not null check (length(fingerprint) between 8 and 4096),
  created_at timestamptz not null default now(),
  primary key (source_kind,source_id),
  check (
    (source_kind = 'combat_reward' and profession_id is null and profession_xp_delta = 0)
    or (source_kind = 'migration_backfill' and profession_id is null and profession_xp_delta = 0)
    or (source_kind in ('gathering_claim','craft_claim','processing_claim')
        and profession_id is not null)
  )
);
create index character_career_awards_v2_character_created_idx
  on private.character_career_awards_v2(character_id,created_at desc);
alter table private.character_career_awards_v2 enable row level security;

-- Original source evidence is NOT inferred from legacy activity response.
-- This future table must be populated from the same trusted transaction
-- that commits public.online_game_states and server_action_receipts.
-- The source_kind/source_id key is global and must match award ledger.
-- The request_id is merely a duplicate-detection dimension, NOT evidence.
create table private.online_career_reward_sources_v2 (
  source_kind text not null
    check (source_kind in ('gathering_claim','combat_reward','craft_claim')),
  source_id text not null check (source_id ~ '^[0-9a-f]{64}$'),
  account_id uuid not null,
  request_id text not null check (request_id ~ '^[a-zA-Z0-9_-]{8,128}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  segment_index integer not null check (segment_index between 0 and 63),
  expected_game_revision bigint not null check (expected_game_revision >= 1),
  character_id uuid not null references public.characters(id) on delete cascade,
  profession_id text,
  -- Non-gathering sources have no idle-claim elapsed time.
  claimed_elapsed_seconds integer not null default 0
    check (claimed_elapsed_seconds between 0 and 86400),
  base_effort_seconds integer not null
    check (base_effort_seconds between 1 and 108000),
  check (
    (source_kind='gathering_claim' and
      profession_id in ('mining','woodcutting','fishing','herbalism') and
      claimed_elapsed_seconds>=1 and base_effort_seconds<=86400)
    or (source_kind='combat_reward' and profession_id is null and
      claimed_elapsed_seconds=0 and base_effort_seconds<=86400)
    or (source_kind='craft_claim' and
      profession_id in ('smithing','tailoring','cooking','alchemy','enchanting') and
      claimed_elapsed_seconds=0 and base_effort_seconds<=10800)
  ),
  difficulty_basis_points integer not null
    check (difficulty_basis_points in (2500,5000,10000)),
  completed_at timestamptz not null default clock_timestamp(),
  primary key (source_kind,source_id),
  unique (account_id,request_id,segment_index)
);
create index online_career_reward_sources_v2_character_completed_idx
  on private.online_career_reward_sources_v2(character_id,completed_at desc);
alter table private.online_career_reward_sources_v2 enable row level security;

-- This review DDL intentionally provides no public/client route for minting
-- these proofs. Pending proof bytes from a gateway are not sufficient.
-- The future internal commit must atomically:
--   1. Fence account ID + expected state revision (and wallet).
--   2. Require the PRE-command character ID and a valid server-simulated
--      completed claim segment, not post-switch character or response.activity.
--   3. Persist immutable source row with database-created completed_at.
--   4. Compare completed_at strictly after per-character activated_at.
--   5. Write globally unique award receipt and increment the new bank once.
--   6. Commit existing state, game action receipt, materials and related
--      economy changes in the SAME PostgreSQL transaction.
-- Retry with same request_id but changed hash/source is a collision error.
-- No extra client RPC should be needed after a completed game commit.

-- Intentionally NO grants, RLS policies, public RPC, triggers or
-- SECURITY DEFINER functions. Integration must read server-verified source
-- receipts and commit source completion, insert-on-conflict-do-nothing
-- award ledger and exactly-once increment of new overall XP in ONE
-- transaction. NEVER update from a client-supplied XP amount or elapsed timer.
--
-- Historical event cutoff: only canonical source receipts completed strictly
-- AFTER that character's career_progress.activated_at may award incremental
-- Overall XP. Backfilled 1.x accomplishments already contributed to the
-- character's initial balance; reprocessing older receipts would double-credit.
-- A missing activation row/time or source-completion timestamp fails closed.
-- The backend must inspect the persisted source receipt created_at; do NOT
-- accept a device timestamp or a client-chosen idempotency key as provenance.
--
-- On replay, return the existing award without incrementing XP. If a source
-- key collides but its owner/fingerprint/XP differs, reject as tampering;
-- do not silently treat it as a successful replay.
--
-- Do not mirror profession XP into a second spendable source of truth.
-- When production source settlement already updates character_skills,
-- the same transaction must synchronize the new Character XP ledger.
--
-- Backfill: dry-run deterministic MAX(combat-level, highest validated skill
-- level) as the new Overall Character Level floor, with new profession XP
-- banks separately converted at their current level + proportional progress.
-- Preserve ALL legacy character, combat and profession XP/levels unchanged.
--
-- Staging QA needed: two concurrent claims for one job; claim after cancel;
-- retry with altered payload; same receipt claimed on an alternate character;
-- actual T1-T9 crafting actions; offline queue flush; 30-hour AFK cap;
-- rollback; role privileges and RLS in pg17; server restart/retry.
