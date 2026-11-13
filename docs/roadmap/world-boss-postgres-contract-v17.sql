-- WORLD BOSS V17: PRIVATE DATABASE CONTRACT / POSTGRES TEST FIXTURE ONLY.
-- NOT A SUPABASE MIGRATION. DO NOT APPLY TO STAGING OR PRODUCTION.
-- DO NOT expose to PostgREST, public RPCs, clients or Edge routes.
--
-- V9 SQL is historical and NOT deployed; this self-contained draft replaces
-- its permanent ordinal constraint with partial uniqueness for active slots.
-- This file defines storage invariants only. It does NOT authenticate callers,
-- verify simulations, calculate damage, debit inventory or grant Sigils.
--
-- Review prerequisites before any real migration:
--  * private is an unexposed schema; server-only service credentials
--  * auth.users(id), public.characters(id/account_id) verified against live DDL
--  * approved owner-bound server code, lock order, external replay retention
--  * two-connection PostgreSQL tests and dedicated security review.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.world_boss_events_v17 (
 id uuid PRIMARY KEY,
 boss_id text NOT NULL CHECK (boss_id IN ('hollowroot','sunscar','frostmarch')),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 rules_version text NOT NULL CHECK (length(rules_version) BETWEEN 3 AND 80),
 max_hp bigint NOT NULL CHECK (max_hp > 0),
 remaining_hp bigint NOT NULL CHECK (remaining_hp >= 0 AND remaining_hp <= max_hp),
 revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at > starts_at AND ends_at - starts_at <= interval '7 days')
);

CREATE INDEX world_boss_v17_event_window_idx
 ON private.world_boss_events_v17(status,starts_at,ends_at);

CREATE TABLE private.world_boss_attempts_v17 (
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 request_id text NOT NULL CHECK (request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 ordinal smallint NOT NULL CHECK (ordinal BETWEEN 1 AND 3),
 character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'reserved'
   CHECK (status IN ('reserved','committed','voided')),
 war_order text NOT NULL CHECK (war_order IN ('break_armor','hold_line','steady_assault')),
 phase text NOT NULL CHECK (phase IN ('armored','exposed','enraged')),
 rules_version text NOT NULL CHECK (length(rules_version) BETWEEN 3 AND 80),
 engine_version text NOT NULL CHECK (length(engine_version) BETWEEN 3 AND 80),
 server_seed text NOT NULL CHECK (server_seed ~ '^[A-Za-z0-9:_-]{24,512}$'),
 squad_digest text NOT NULL CHECK (squad_digest ~ '^[a-f0-9]{64}$'),
 frozen_squad jsonb NOT NULL CHECK (
  jsonb_typeof(frozen_squad)='object'
  AND octet_length(frozen_squad::text) BETWEEN 128 AND 262144
 ),
 war_camp_digest text CHECK (
  war_camp_digest IS NULL OR war_camp_digest ~ '^[a-f0-9]{64}$'
 ),
 encounter_profile_digest text CHECK (
  encounter_profile_digest IS NULL OR encounter_profile_digest ~ '^[a-f0-9]{64}$'
 ),
 reserved_at timestamptz NOT NULL DEFAULT now(),
 lease_generation bigint NOT NULL DEFAULT 1 CHECK (lease_generation >= 1),
 lease_owner text NOT NULL CHECK (
  lease_owner ~ '^[A-Za-z0-9:_-]{8,160}$'
 ),
 lease_expires_at timestamptz NOT NULL,
 hard_expires_at timestamptz NOT NULL,
 committed_at timestamptz,
 replay_digest text CHECK (
  replay_digest IS NULL OR replay_digest ~ '^[a-f0-9]{64}$'
 ),
 replay_object_key text CHECK (
  replay_object_key IS NULL OR length(replay_object_key) BETWEEN 8 AND 256
 ),
 raw_boss_damage numeric(18,2) CHECK (
  raw_boss_damage IS NULL OR raw_boss_damage BETWEEN 0 AND 1000000000000
 ),
 local_guard_damage numeric(18,2) CHECK (
  local_guard_damage IS NULL OR local_guard_damage BETWEEN 0 AND 1000000000000
 ),
 hp_before bigint CHECK (hp_before IS NULL OR hp_before >= 0),
 hp_after bigint CHECK (hp_after IS NULL OR hp_after >= 0),
 credited_hp bigint CHECK (credited_hp IS NULL OR credited_hp >= 0),
 residual_echo boolean,
 voided_at timestamptz,
 PRIMARY KEY (event_id,account_id,request_id),
 CHECK (hard_expires_at > reserved_at),
 CHECK (lease_expires_at > reserved_at AND lease_expires_at <= hard_expires_at),
 CHECK (
  (status='reserved' AND committed_at IS NULL AND voided_at IS NULL
   AND replay_digest IS NULL AND replay_object_key IS NULL
   AND raw_boss_damage IS NULL AND local_guard_damage IS NULL
   AND hp_before IS NULL AND hp_after IS NULL AND credited_hp IS NULL
   AND residual_echo IS NULL)
  OR
  (status='voided' AND voided_at IS NOT NULL AND committed_at IS NULL
   AND replay_digest IS NULL AND replay_object_key IS NULL
   AND raw_boss_damage IS NULL AND local_guard_damage IS NULL
   AND hp_before IS NULL AND hp_after IS NULL AND credited_hp IS NULL
   AND residual_echo IS NULL)
  OR
  (status='committed' AND voided_at IS NULL AND committed_at IS NOT NULL
   AND replay_digest IS NOT NULL AND replay_object_key IS NOT NULL
   AND raw_boss_damage IS NOT NULL AND local_guard_damage IS NOT NULL
   AND hp_before IS NOT NULL AND hp_after IS NOT NULL AND credited_hp IS NOT NULL
   AND residual_echo IS NOT NULL
   AND hp_after + credited_hp = hp_before)
 )
);

-- Three slots per account and event, reusable ONLY when a reservation is
-- voided. The primary key retains voided request IDs forever as tombstones.
-- Never use UNIQUE(event_id,account_id,ordinal) without this WHERE clause.
CREATE UNIQUE INDEX world_boss_v17_active_ordinal
 ON private.world_boss_attempts_v17(event_id,account_id,ordinal)
 WHERE status IN ('reserved','committed');
CREATE INDEX world_boss_v17_by_event_status
 ON private.world_boss_attempts_v17(event_id,status,reserved_at);
CREATE INDEX world_boss_v17_by_account
 ON private.world_boss_attempts_v17(account_id,event_id);

-- A real service must lock the EVENT row before selecting/updating this row.
-- The trigger prevents accidental refreezing, editing committed history or
-- rolling lease generations backwards even with a privileged service writer.
CREATE FUNCTION private.world_boss_v17_guard_attempt_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $guard$
BEGIN
 IF ROW(NEW.event_id,NEW.account_id,NEW.request_id,NEW.ordinal,
        NEW.character_id,NEW.war_order,NEW.phase,NEW.rules_version,
        NEW.engine_version,NEW.server_seed,NEW.squad_digest,
        NEW.frozen_squad,NEW.war_camp_digest,NEW.encounter_profile_digest,
        NEW.reserved_at,NEW.hard_expires_at)
    IS DISTINCT FROM
    ROW(OLD.event_id,OLD.account_id,OLD.request_id,OLD.ordinal,
        OLD.character_id,OLD.war_order,OLD.phase,OLD.rules_version,
        OLD.engine_version,OLD.server_seed,OLD.squad_digest,
        OLD.frozen_squad,OLD.war_camp_digest,OLD.encounter_profile_digest,
        OLD.reserved_at,OLD.hard_expires_at)
 THEN RAISE EXCEPTION 'WB17_FROZEN_ATTEMPT_MUTATION'; END IF;
 IF OLD.status IN ('committed','voided') THEN
  RAISE EXCEPTION 'WB17_TERMINAL_ATTEMPT_MUTATION';
 END IF;
 IF NEW.status NOT IN ('reserved','committed','voided') THEN
  RAISE EXCEPTION 'WB17_INVALID_TRANSITION';
 END IF;
 IF NEW.lease_generation < OLD.lease_generation OR
    NEW.lease_generation > OLD.lease_generation + 1 THEN
  RAISE EXCEPTION 'WB17_INVALID_LEASE_GENERATION';
 END IF;
 IF NEW.lease_generation = OLD.lease_generation AND
    NEW.lease_owner IS DISTINCT FROM OLD.lease_owner THEN
  RAISE EXCEPTION 'WB17_LEASE_OWNER_NEEDS_NEW_GENERATION';
 END IF;
 RETURN NEW;
END
$guard$;
CREATE TRIGGER world_boss_v17_attempt_guard
 BEFORE UPDATE ON private.world_boss_attempts_v17
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v17_guard_attempt_update();

CREATE TABLE private.world_boss_milestones_v17 (
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 threshold smallint NOT NULL CHECK (threshold IN (70,30,0)),
 crossed_by_account uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
 crossed_by_request text NOT NULL,
 crossed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (event_id,threshold)
);
-- This records crossing facts only. Nothing here can mint World Sigils.

ALTER TABLE private.world_boss_events_v17 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_attempts_v17 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_milestones_v17 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_events_v17,
 private.world_boss_attempts_v17,
 private.world_boss_milestones_v17 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v17_guard_attempt_update()
 FROM PUBLIC, anon, authenticated;
-- Existing private-schema grants require separate deployment review; this
-- draft grants only the server role usage, never client/anonymous roles.
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT,INSERT,UPDATE ON private.world_boss_events_v17,
 private.world_boss_attempts_v17,
 private.world_boss_milestones_v17 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v17_guard_attempt_update()
 TO service_role;
-- No SECURITY DEFINER; no public or authenticated API/RPC grants.
-- No event is inserted, activated or scheduled. No rewards/wallet.
COMMIT;
