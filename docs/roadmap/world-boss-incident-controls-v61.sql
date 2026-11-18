-- VELDRYN World Boss V61: private first-live-event incident controls.
-- HIDDEN DRAFT; NOT A SUPABASE MIGRATION; NO LIVE ROLL-OUT.
-- Depends on V17 attempts, V27 War Camp and V28 claims.
-- This SQL can be loaded only into disposable CI or after a separate
-- explicitly approved migration review. Default is deny all NEW writes.
-- Existing attempt settlement / replay proof / reward entitlement rows are
-- deliberately not touched: pausing must not strand settled players.
BEGIN;

CREATE TABLE private.world_boss_ops_v61 (
 event_id uuid PRIMARY KEY
  REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 new_raids_open boolean NOT NULL DEFAULT false,
 new_donations_open boolean NOT NULL DEFAULT false,
 new_claims_open boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=1),
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 changed_by text NOT NULL CHECK(length(changed_by) BETWEEN 3 AND 80),
 change_reason text NOT NULL CHECK(length(change_reason) BETWEEN 12 AND 500)
);

CREATE TABLE private.world_boss_ops_audit_v61 (
 audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 revision bigint NOT NULL CHECK(revision>=1),
 new_raids_open boolean NOT NULL,
 new_donations_open boolean NOT NULL,
 new_claims_open boolean NOT NULL,
 changed_at timestamptz NOT NULL,
 changed_by text NOT NULL,
 change_reason text NOT NULL,
 UNIQUE(event_id,revision)
);

ALTER TABLE private.world_boss_ops_v61 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_ops_audit_v61 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_ops_v61
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON private.world_boss_ops_audit_v61
 FROM PUBLIC,anon,authenticated,service_role;
-- No public/client/service write or RPC grant. Only an approved privileged
-- operator with direct database control can initialize or update the mode.

CREATE FUNCTION private.world_boss_v61_ops_revision_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $guard$
BEGIN
 IF TG_OP='DELETE' THEN
  RAISE EXCEPTION 'WB61_CONTROL_DELETE_FORBIDDEN';
 END IF;
 IF TG_OP='UPDATE' AND (
  NEW.event_id IS DISTINCT FROM OLD.event_id
  OR NEW.revision IS DISTINCT FROM OLD.revision+1)
 THEN RAISE EXCEPTION 'WB61_INVALID_CONTROL_REVISION'; END IF;
 IF TG_OP='INSERT' AND NEW.revision<>1 THEN
  RAISE EXCEPTION 'WB61_INVALID_INITIAL_REVISION';
 END IF;
 IF NEW.changed_by IS NULL OR length(NEW.changed_by) NOT BETWEEN 3 AND 80
    OR NEW.change_reason IS NULL
    OR length(NEW.change_reason) NOT BETWEEN 12 AND 500
 THEN RAISE EXCEPTION 'WB61_OPERATOR_REASON_REQUIRED'; END IF;
 NEW.changed_at:=clock_timestamp();
 RETURN NEW;
END
$guard$;

CREATE TRIGGER world_boss_v61_ops_revision
BEFORE INSERT OR UPDATE OR DELETE ON private.world_boss_ops_v61
FOR EACH ROW EXECUTE FUNCTION private.world_boss_v61_ops_revision_guard();

CREATE FUNCTION private.world_boss_v61_write_ops_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $audit$
BEGIN
 INSERT INTO private.world_boss_ops_audit_v61(
  event_id,revision,new_raids_open,new_donations_open,new_claims_open,
  changed_at,changed_by,change_reason)
 VALUES(
  NEW.event_id,NEW.revision,NEW.new_raids_open,NEW.new_donations_open,
  NEW.new_claims_open,NEW.changed_at,NEW.changed_by,NEW.change_reason);
 RETURN NEW;
END
$audit$;

CREATE TRIGGER world_boss_v61_ops_audit
AFTER INSERT OR UPDATE ON private.world_boss_ops_v61
FOR EACH ROW EXECUTE FUNCTION private.world_boss_v61_write_ops_audit();

CREATE FUNCTION private.world_boss_v61_audit_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $audit$
BEGIN
 RAISE EXCEPTION 'WB61_AUDIT_IMMUTABLE';
END
$audit$;

CREATE TRIGGER world_boss_v61_audit_immutable
BEFORE UPDATE OR DELETE ON private.world_boss_ops_audit_v61
FOR EACH ROW EXECUTE FUNCTION private.world_boss_v61_audit_immutable();

-- Shared row lock serializes each accepted new write against an operator
-- pause. Existing V18/V22/V27/V28 transactions already lock the event first;
-- operators UPDATE only the controls row to avoid reversing that lock order.
-- SECURITY DEFINER permits the table owner to lock the control row without
-- giving gameplay's service_role permission to override the kill switch.
CREATE FUNCTION private.world_boss_v61_assert_new_action(
 p_event uuid,p_action text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $check$
DECLARE allowed boolean;
BEGIN
 IF p_event IS NULL OR p_action IS NULL
    OR p_action NOT IN ('raid','donation','claim')
 THEN RAISE EXCEPTION 'WB61_INVALID_OPERATION'; END IF;
 SELECT CASE p_action
  WHEN 'raid' THEN new_raids_open
  WHEN 'donation' THEN new_donations_open
  WHEN 'claim' THEN new_claims_open END
 INTO allowed
 FROM private.world_boss_ops_v61
 WHERE event_id=p_event FOR SHARE;
 IF NOT FOUND OR allowed IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'WB61_NEW_ACTION_PAUSED';
 END IF;
END
$check$;

CREATE FUNCTION private.world_boss_v61_gate_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $gate$
BEGIN
 IF TG_TABLE_SCHEMA<>'private' THEN
  RAISE EXCEPTION 'WB61_UNKNOWN_TABLE';
 END IF;
 IF TG_TABLE_NAME='world_boss_attempts_v17' THEN
  PERFORM private.world_boss_v61_assert_new_action(NEW.event_id,'raid');
 ELSIF TG_TABLE_NAME='world_boss_war_donations_v27' THEN
  PERFORM private.world_boss_v61_assert_new_action(NEW.event_id,'donation');
 ELSIF TG_TABLE_NAME='world_boss_claim_receipts_v28' THEN
  PERFORM private.world_boss_v61_assert_new_action(NEW.event_id,'claim');
 ELSE
  RAISE EXCEPTION 'WB61_UNKNOWN_TABLE';
 END IF;
 RETURN NEW;
END
$gate$;

CREATE TRIGGER world_boss_v61_raid_gate
BEFORE INSERT ON private.world_boss_attempts_v17
FOR EACH ROW EXECUTE FUNCTION private.world_boss_v61_gate_insert();

CREATE TRIGGER world_boss_v61_donation_gate
BEFORE INSERT ON private.world_boss_war_donations_v27
FOR EACH ROW EXECUTE FUNCTION private.world_boss_v61_gate_insert();

CREATE TRIGGER world_boss_v61_claim_gate
BEFORE INSERT ON private.world_boss_claim_receipts_v28
FOR EACH ROW EXECUTE FUNCTION private.world_boss_v61_gate_insert();

-- Operators need event-level counters during the first real live cycle,
-- without reading any account IDs, replay contents or per-player payloads.
-- LATERAL aggregation avoids multiplying results across attempts/donations.
CREATE VIEW private.world_boss_ops_status_v61 AS
SELECT e.id AS event_id,e.boss_id,e.status AS event_status,
 e.starts_at,e.ends_at,e.max_hp,e.remaining_hp,
 COALESCE(o.new_raids_open,false) AS new_raids_open,
 COALESCE(o.new_donations_open,false) AS new_donations_open,
 COALESCE(o.new_claims_open,false) AS new_claims_open,
 o.revision AS controls_revision,o.changed_at AS controls_changed_at,
 COALESCE(a.reserved_count,0) AS reserved_attempts,
 COALESCE(a.committed_count,0) AS committed_attempts,
 COALESCE(a.voided_count,0) AS voided_attempts,
 COALESCE(a.unproved_count,0) AS committed_without_replay_proof,
 COALESCE(d.donation_count,0) AS accepted_donations,
 COALESCE(c.claim_count,0) AS accepted_claims,
 COALESCE(l.ledger_count,0) AS reward_ledger_rows
FROM private.world_boss_events_v17 e
LEFT JOIN private.world_boss_ops_v61 o ON o.event_id=e.id
LEFT JOIN LATERAL (
 SELECT count(*) FILTER(WHERE a.status='reserved') AS reserved_count,
  count(*) FILTER(WHERE a.status='committed') AS committed_count,
  count(*) FILTER(WHERE a.status='voided') AS voided_count,
  count(*) FILTER(WHERE a.status='committed'
   AND NOT EXISTS(SELECT 1 FROM private.world_boss_replay_proofs_v28 p
    WHERE p.event_id=a.event_id AND p.account_id=a.account_id
     AND p.request_id=a.request_id)) AS unproved_count
 FROM private.world_boss_attempts_v17 a WHERE a.event_id=e.id
) a ON true
LEFT JOIN LATERAL (
 SELECT count(*) AS donation_count
 FROM private.world_boss_war_donations_v27 d WHERE d.event_id=e.id
) d ON true
LEFT JOIN LATERAL (
 SELECT count(*) AS claim_count
 FROM private.world_boss_claim_receipts_v28 c WHERE c.event_id=e.id
) c ON true
LEFT JOIN LATERAL (
 SELECT count(*) AS ledger_count
 FROM private.world_boss_reward_ledger_v28 l WHERE l.event_id=e.id
) l ON true;
REVOKE ALL ON private.world_boss_ops_status_v61
 FROM PUBLIC,anon,authenticated,service_role;

-- No direct invocation by mobile, anon, authenticated or gameplay roles.
REVOKE ALL ON FUNCTION private.world_boss_v61_assert_new_action(uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_v61_gate_insert()
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_v61_ops_revision_guard()
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_v61_write_ops_audit()
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_v61_audit_immutable()
 FROM PUBLIC,anon,authenticated,service_role;
COMMIT;

-- Privileged, operator-reviewed usage example (DO NOT EXECUTE HERE):
-- INSERT INTO private.world_boss_ops_v61(event_id,changed_by,change_reason)
-- VALUES ('<approved event UUID>', 'operator', 'initial locked policy');
-- UPDATE private.world_boss_ops_v61
-- SET new_raids_open=false, revision=revision+1, changed_by='operator',
--     change_reason='pause new raids; existing receipts may settle'
-- WHERE event_id='<approved event UUID>';
-- Re-enabling any operation requires a separate reviewed UPDATE.
