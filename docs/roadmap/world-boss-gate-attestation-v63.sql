-- World Boss V63 — private operational gate attestation, REVIEW ONLY.
-- NOT A STAGING/PRODUCTION MIGRATION. Apply only in disposable CI after V61.
-- Ensures the unmounted authenticated action gateway cannot be accidentally
-- mounted against a database missing emergency stop / privilege protection.
BEGIN;

CREATE FUNCTION private.world_boss_v63_assert_gates(p_event uuid)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $check$
DECLARE
 active_triggers integer;
BEGIN
 IF p_event IS NULL THEN
  RAISE EXCEPTION 'WB63_INVALID_EVENT';
 END IF;
 -- Enrolling an event never opens a channel. Its operator controls must
 -- already exist even when all actions are intentionally closed.
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_ops_v61 o
  JOIN private.world_boss_events_v17 e ON e.id=o.event_id
  WHERE o.event_id=p_event AND o.revision>=1
    AND o.changed_by IS NOT NULL AND o.change_reason IS NOT NULL)
 THEN RAISE EXCEPTION 'WB63_MISSING_OPERATOR_CONTROLS'; END IF;

 -- All THREE independently paused receipt inserts must retain the
 -- exact installed BEFORE INSERT gate on their expected private table.
 SELECT count(*) INTO active_triggers
 FROM pg_catalog.pg_trigger t
 JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='private' AND t.tgenabled='O'
   AND NOT t.tgisinternal
   AND (
    (c.relname='world_boss_attempts_v17'
     AND t.tgname='world_boss_v61_raid_gate')
    OR
    (c.relname='world_boss_war_donations_v27'
     AND t.tgname='world_boss_v61_donation_gate')
    OR
    (c.relname='world_boss_claim_receipts_v28'
     AND t.tgname='world_boss_v61_claim_gate')
   )
   AND (t.tgtype::integer & 5)=5 -- ROW + INSERT
   AND (t.tgtype::integer & 2)=2 -- BEFORE
   AND t.tgfoid='private.world_boss_v61_gate_insert()'::pg_catalog.regprocedure;
 IF active_triggers<>3 THEN
  RAISE EXCEPTION 'WB63_EMERGENCY_GATES_UNAVAILABLE';
 END IF;

 -- Operator-only mutation/read; client/API principals may not bypass V61.
 IF pg_catalog.has_table_privilege('anon','private.world_boss_ops_v61','UPDATE')
 OR pg_catalog.has_table_privilege('authenticated','private.world_boss_ops_v61','UPDATE')
 OR pg_catalog.has_table_privilege('service_role','private.world_boss_ops_v61','UPDATE')
 OR pg_catalog.has_table_privilege('anon','private.world_boss_ops_status_v61','SELECT')
 OR pg_catalog.has_table_privilege('authenticated','private.world_boss_ops_status_v61','SELECT')
 THEN RAISE EXCEPTION 'WB63_OPERATOR_PRIVILEGES_UNSAFE'; END IF;
 RETURN true;
END
$check$;

REVOKE ALL ON FUNCTION private.world_boss_v63_assert_gates(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v63_assert_gates(uuid)
 TO service_role;
COMMIT;
