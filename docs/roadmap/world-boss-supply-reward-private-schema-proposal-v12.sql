-- VELDRYN WORLD BOSSES V12 — READ-ONLY / SECURITY REVIEW DDL PROPOSAL
--
-- NOT A MIGRATION. DO NOT RUN ON STAGING OR PRODUCTION.
-- No app route imports these tables. This draft deliberately contains NO
-- SECURITY DEFINER RPC and NO grant path for minting World Sigils.
--
-- Assumes the V9/V10 PRIVATE event schema has been independently reviewed,
-- migrated and hardened first. The v9 proposal in docs is NOT deployed.
--
-- DESIGN ONLY: when implementing, inventory debits MUST update
-- public.online_game_states (account_id, character_id, state jsonb,
-- revision bigint) in the SAME DB transaction as the supply receipt,
-- contribution increment and event-level War Camp revision. The exact
-- inventory JSON shape/item identifiers must first be verified with the
-- live-game authoritative item normalization/ownership paths. NEVER accept
-- caller-asserted quantities, item prices, or state revisions without lock.
BEGIN;

-- Independent War Camp snapshot revision: avoid conflating community supply
-- upgrades with the event's boss HP revision or battle phase.
CREATE TABLE IF NOT EXISTS private.world_boss_supply_event_state_v12 (
 event_id uuid PRIMARY KEY REFERENCES private.world_boss_event_instances_v1(id) ON DELETE RESTRICT,
 revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS private.world_boss_supply_tracks_v12 (
 event_id uuid NOT NULL REFERENCES private.world_boss_event_instances_v1(id) ON DELETE RESTRICT,
 track text NOT NULL CHECK (track IN ('fortifications','fieldProvisions','siegecraft')),
 tier_1_goal integer NOT NULL CHECK (tier_1_goal >= 1),
 tier_2_goal integer NOT NULL,
 contribution_count integer NOT NULL DEFAULT 0 CHECK (contribution_count >= 0),
 revised_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (event_id, track),
 CHECK (tier_2_goal > tier_1_goal),
 CHECK (contribution_count <= tier_2_goal)
);

CREATE TABLE IF NOT EXISTS private.world_boss_supply_receipts_v12 (
 event_id uuid NOT NULL REFERENCES private.world_boss_event_instances_v1(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 request_id text NOT NULL CHECK (request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 ordinal smallint NOT NULL CHECK (ordinal BETWEEN 1 AND 2),
 track text NOT NULL CHECK (track IN ('fortifications','fieldProvisions','siegecraft')),
 recipe_id text NOT NULL CHECK (recipe_id ~ '^[A-Za-z0-9:_-]{1,160}$'),
 source_character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE RESTRICT,
 source_game_revision_before bigint NOT NULL CHECK (source_game_revision_before >= 0),
 source_game_revision_after bigint NOT NULL CHECK (source_game_revision_after >= 1),
 resources_consumed jsonb NOT NULL CHECK (
   jsonb_typeof(resources_consumed)='array' AND
   octet_length(resources_consumed::text) BETWEEN 10 AND 8192
 ),
 supply_revision bigint NOT NULL CHECK (supply_revision >= 1),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (event_id, account_id, request_id),
 UNIQUE (event_id, account_id, ordinal),
 CHECK (source_game_revision_after = source_game_revision_before + 1)
);
CREATE INDEX IF NOT EXISTS world_boss_supply_by_track_v12
 ON private.world_boss_supply_receipts_v12(event_id, track, created_at);

-- Entitlement facts only; NOT a currency balance. A release-approved server
-- worker must derive reward_key/amount from the committed source receipts,
-- approved 100-Sigil policy, and owner-qualified milestone crossings.
-- Never let an app send amount or account ID as independent authority.
CREATE TABLE IF NOT EXISTS private.world_boss_reward_entitlements_v12 (
 event_id uuid NOT NULL REFERENCES private.world_boss_event_instances_v1(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 reward_key text NOT NULL CHECK (
   reward_key ~ '^(attack:[1-3]|impact:(0[.]8|1[.]8|3)|global:(70|30|0)|supply:[1-2])$'
 ),
 amount smallint NOT NULL CHECK (amount IN (5,10,15)),
 source_request_id text,
 source_receipt_hash text CHECK (
   source_receipt_hash IS NULL OR source_receipt_hash ~ '^[0-9a-f]{64}$'
 ),
 computed_version text NOT NULL CHECK (length(computed_version) BETWEEN 3 AND 80),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (event_id, account_id, reward_key)
);
CREATE INDEX IF NOT EXISTS world_boss_reward_by_account_v12
 ON private.world_boss_reward_entitlements_v12(account_id, event_id);

-- Defense in depth. This proposal exposes ZERO client-facing tables/RPCs.
ALTER TABLE private.world_boss_supply_event_state_v12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_supply_tracks_v12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_supply_receipts_v12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_reward_entitlements_v12 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_supply_event_state_v12,
 private.world_boss_supply_tracks_v12,
 private.world_boss_supply_receipts_v12,
 private.world_boss_reward_entitlements_v12 FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.world_boss_supply_event_state_v12,
 private.world_boss_supply_tracks_v12,
 private.world_boss_supply_receipts_v12,
 private.world_boss_reward_entitlements_v12 TO service_role;

-- IMPLEMENTATION CONTRACT (not executable in this draft):
--  1) Authenticate server caller; request carries recipe ID and request ID,
--     never arbitrary resources/quantity, wallet amount or borrower account.
--  2) Lock event row FOR UPDATE. Check existing (event, account, request)
--     before event-close checks, returning immutable receipt for retries.
--  3) Require event active and within UTC window. Verify 0 <= attempts < 2
--     account-wide before inserting ordinal 1 or 2.
--  4) Lock the source public.online_game_states row FOR UPDATE with both
--     account_id and character_id. Verify the game's inventory schema and
--     material ownership, item trade/bind restrictions, and version.
--  5) Use the server-published resource recipe to decrement state inventory,
--     bump revision exactly once, and insert the supply receipt.
--  6) Lock the one target supply track and supply_event_state row, cap at Tier II,
--     increment its count, and atomically bump the separate War Camp revision.
--     Do NOT change the event's combat/HP revision; no hidden goal retarget.
--  7) Commit all writes together. All errors roll back inventory AND credits.
--  8) An independent server entitlement job later reads only COMMITTED attack
--     receipts, unique supply receipts and recorded community milestones.
--     Source key unique: event/account/attack-ordinal, supply-ordinal, etc.
--  9) Qualified global bonuses require >=1 committed battle by event close.
-- 10) Enforce account event cap <=100 with DB-locked account aggregate before
--     any eventual, separately approved actual wallet-mint operation.
-- 11) Test two services concurrently, stale inventory snapshots, duplicate
--     requests, event close, rollback, forged recipe IDs, low stock, RLS.
--
-- SECURITY NOTES:
-- * A plain snapshot SHA256 digest is NOT a signature or authorization.
-- * No actual real-account inventory debits, event rows or reward grants.
-- * The DB writer for public.online_game_states must be reconciled with
--   existing optimistic revision and game-state normalization code first.
-- * No SECURITY DEFINER functions are granted or exposed in this proposal.
COMMIT;
