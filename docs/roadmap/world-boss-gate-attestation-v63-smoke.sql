-- World Boss V63 private gate attestation contract. Disposable PG only.
-- This checks operator safety, not gameplay; all fixtures ROLLBACK.
BEGIN;
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
VALUES (
 'a0000000-0000-4000-8000-000000000063'::uuid,'hollowroot','draft',
 '2026-12-28T00:00:00Z'::timestamptz,
 '2027-01-04T00:00:00Z'::timestamptz,'v63-smoke',1000,1000);

DO $test$
DECLARE event_id_v63 uuid:='a0000000-0000-4000-8000-000000000063'::uuid;
BEGIN
 BEGIN
  PERFORM private.world_boss_v63_assert_gates(event_id_v63);
  RAISE EXCEPTION 'WB63_ACCEPTED_MISSING_CONTROLS';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB63_MISSING_OPERATOR_CONTROLS' THEN RAISE; END IF;
 END;
 INSERT INTO private.world_boss_ops_v61(
  event_id,changed_by,change_reason)
 VALUES (event_id_v63,'ci-operator','initial event safety: closed actions');
 IF NOT private.world_boss_v63_assert_gates(event_id_v63)
 THEN RAISE EXCEPTION 'WB63_HEALTHY_PRIVATE_GATES_REJECTED'; END IF;
END
$test$;

-- Confirm a disabled stop trigger fails the preflight, even though another
-- two event control gates remain available. The transaction is rolled back.
ALTER TABLE private.world_boss_attempts_v17
 DISABLE TRIGGER world_boss_v61_raid_gate;
DO $test$
DECLARE event_id_v63 uuid:='a0000000-0000-4000-8000-000000000063'::uuid;
BEGIN
 BEGIN
  PERFORM private.world_boss_v63_assert_gates(event_id_v63);
  RAISE EXCEPTION 'WB63_DISABLED_TRIGGER_ACCEPTED';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'WB63_EMERGENCY_GATES_UNAVAILABLE' THEN RAISE; END IF;
 END;
END
$test$;
ALTER TABLE private.world_boss_attempts_v17
 ENABLE TRIGGER world_boss_v61_raid_gate;

DO $test$
DECLARE event_id_v63 uuid:='a0000000-0000-4000-8000-000000000063'::uuid;
BEGIN
 IF private.world_boss_v63_assert_gates(event_id_v63) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'WB63_RECOVERED_TRIGGER_UNAVAILABLE'; END IF;
 IF pg_catalog.has_function_privilege(
  'anon','private.world_boss_v63_assert_gates(uuid)','EXECUTE')
 OR pg_catalog.has_function_privilege(
  'authenticated','private.world_boss_v63_assert_gates(uuid)','EXECUTE')
 OR NOT pg_catalog.has_function_privilege(
  'service_role','private.world_boss_v63_assert_gates(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'WB63_UNSAFE_RPC_GRANT'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V63_OPERATOR_CONTROL_ATTESTATION=PASS';
END
$test$;
ROLLBACK;
