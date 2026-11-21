-- Party Events V87 — review-only, NO deployable or live migration.
-- V11/V14/V16/V17/V18/V23 are all hidden predecessors. V23 is explicitly
-- NONPAYING: a replay attestation is NOT victory or a chest entitlement.
-- This guarded certificate boundary must have a separately audited worker;
-- NO creator, EXECUTE or client grant is shipped here.
BEGIN;

CREATE TABLE private.party_event_settlement_certificates_v87 (
 party_id uuid NOT NULL,
 event_starts_at timestamptz NOT NULL,
 reservation_id uuid NOT NULL UNIQUE
   REFERENCES private.party_event_boss_replay_attestations_v23(reservation_id)
   ON DELETE CASCADE,
 source_digest text NOT NULL CHECK(source_digest ~ '^[a-f0-9]{64}$'),
 verified_tiers_cleared smallint NOT NULL CHECK(verified_tiers_cleared BETWEEN 0 AND 12),
 independently_verified_victory boolean NOT NULL,
 settled_at timestamptz NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(party_id,event_starts_at),
 FOREIGN KEY(party_id,event_starts_at)
  REFERENCES private.party_event_weeks_v11(party_id,event_starts_at)
  ON DELETE CASCADE,
 CHECK(NOT independently_verified_victory OR verified_tiers_cleared > 0)
);
CREATE TABLE private.party_event_member_tier_certificates_v87 (
 party_id uuid NOT NULL,
 event_starts_at timestamptz NOT NULL,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 frozen_character_id uuid NOT NULL,
 frozen_level integer NOT NULL CHECK(frozen_level BETWEEN 1 AND 100),
 frozen_loadout_hash text NOT NULL CHECK(frozen_loadout_hash ~ '^[a-f0-9]{64}$'),
 eligible_gear_tier smallint NOT NULL CHECK(eligible_gear_tier BETWEEN 1 AND 9),
 tier_rules_version text NOT NULL DEFAULT 'server_level_snapshot_v2'
  CHECK(tier_rules_version='server_level_snapshot_v2'),
 issued_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(party_id,event_starts_at,account_id),
 FOREIGN KEY(party_id,event_starts_at,account_id)
  REFERENCES private.party_event_roster_v11(party_id,event_starts_at,account_id)
  ON DELETE CASCADE,
 FOREIGN KEY(frozen_character_id,account_id)
  REFERENCES public.characters(id,account_id) ON DELETE CASCADE
);

-- A certificate cannot repurpose a V23 worker assertion as independent
-- proof: a distinct audited V87 worker must sign the separate certificate,
-- and schema guards pin exact trusted V23 source identity + settled window.
CREATE FUNCTION private.party_event_v87_week_certificate_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $v87_week$
DECLARE
 w private.party_event_weeks_v11%ROWTYPE;
 a private.party_event_boss_replay_attestations_v23%ROWTYPE;
BEGIN
 SELECT * INTO w FROM private.party_event_weeks_v11
 WHERE party_id=NEW.party_id AND event_starts_at=NEW.event_starts_at FOR SHARE;
 SELECT * INTO a FROM private.party_event_boss_replay_attestations_v23
 WHERE reservation_id=NEW.reservation_id FOR SHARE;
 IF w.party_id IS NULL OR w.status<>'settled'
    OR w.active_stage<>3 OR a.reservation_id IS NULL
    OR a.party_id IS DISTINCT FROM NEW.party_id
    OR a.event_starts_at IS DISTINCT FROM NEW.event_starts_at
    OR a.source_digest IS DISTINCT FROM NEW.source_digest
    OR a.tiers_cleared IS DISTINCT FROM NEW.verified_tiers_cleared
    OR a.rewards_granted IS DISTINCT FROM FALSE
    OR a.reward_entitlement_created IS DISTINCT FROM FALSE
    OR NEW.settled_at < w.event_ends_at + INTERVAL '1 hour'
    OR NEW.settled_at < a.worker_attested_at
    OR NEW.settled_at > NEW.issued_at
 THEN RAISE EXCEPTION 'party_event_v87_untrusted_week_certificate'; END IF;
 RETURN NEW;
END;
$v87_week$;
CREATE TRIGGER party_event_v87_week_insert_guard BEFORE INSERT
ON private.party_event_settlement_certificates_v87
FOR EACH ROW EXECUTE FUNCTION private.party_event_v87_week_certificate_guard();

CREATE FUNCTION private.party_event_v87_member_certificate_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $v87_member$
DECLARE
 r private.party_event_roster_v11%ROWTYPE;
 l private.party_event_boss_loadouts_v18%ROWTYPE;
 w private.party_event_weeks_v11%ROWTYPE;
BEGIN
 SELECT * INTO w FROM private.party_event_weeks_v11
 WHERE party_id=NEW.party_id AND event_starts_at=NEW.event_starts_at FOR SHARE;
 SELECT * INTO r FROM private.party_event_roster_v11
 WHERE party_id=NEW.party_id AND event_starts_at=NEW.event_starts_at
   AND account_id=NEW.account_id FOR SHARE;
 SELECT * INTO l FROM private.party_event_boss_loadouts_v18
 WHERE party_id=NEW.party_id AND event_starts_at=NEW.event_starts_at
   AND account_id=NEW.account_id FOR SHARE;
 IF w.party_id IS NULL OR w.status<>'settled' OR r.account_id IS NULL
    OR l.account_id IS NULL OR r.character_id<>NEW.frozen_character_id
    OR l.character_id<>NEW.frozen_character_id
    OR l.character_level<>NEW.frozen_level
    OR l.snapshot_hash<>NEW.frozen_loadout_hash
    OR l.saved_at >= w.event_ends_at
    OR NOT EXISTS(SELECT 1 FROM private.party_event_settlement_certificates_v87 c
      WHERE c.party_id=NEW.party_id AND c.event_starts_at=NEW.event_starts_at)
 THEN RAISE EXCEPTION 'party_event_v87_untrusted_tier_certificate';END IF;
 RETURN NEW;
END;
$v87_member$;
CREATE TRIGGER party_event_v87_member_insert_guard BEFORE INSERT
ON private.party_event_member_tier_certificates_v87
FOR EACH ROW EXECUTE FUNCTION private.party_event_v87_member_certificate_guard();

CREATE FUNCTION private.party_event_v87_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $v87_immutable$
BEGIN
 RAISE EXCEPTION 'party_event_v87_immutable_certificate';
END;
$v87_immutable$;
CREATE TRIGGER party_event_v87_week_no_updates BEFORE UPDATE
ON private.party_event_settlement_certificates_v87
FOR EACH ROW EXECUTE FUNCTION private.party_event_v87_immutable();
CREATE TRIGGER party_event_v87_member_no_updates BEFORE UPDATE
ON private.party_event_member_tier_certificates_v87
FOR EACH ROW EXECUTE FUNCTION private.party_event_v87_immutable();

ALTER TABLE private.party_event_settlement_certificates_v87 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.party_event_member_tier_certificates_v87 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.party_event_settlement_certificates_v87,
 private.party_event_member_tier_certificates_v87
 FROM public,anon,authenticated,service_role;
GRANT SELECT ON private.party_event_settlement_certificates_v87,
 private.party_event_member_tier_certificates_v87 TO service_role;
REVOKE ALL ON FUNCTION private.party_event_v87_week_certificate_guard(),
 private.party_event_v87_member_certificate_guard(),
 private.party_event_v87_immutable()
 FROM public,anon,authenticated,service_role;

COMMENT ON TABLE private.party_event_settlement_certificates_v87 IS
 'UNDEPLOYED V87: requires audited independent combat replay and trusted certificate producer; V23 alone is NOT a reward entitlement.';
COMMENT ON TABLE private.party_event_member_tier_certificates_v87 IS
 'UNDEPLOYED V87: frozen server-certified tier; no guessed 2.0 level tiers or client-originated snapshots.';

COMMIT;
