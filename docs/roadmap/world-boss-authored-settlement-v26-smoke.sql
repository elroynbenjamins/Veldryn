-- V26 disposable PostgreSQL 16 transaction-boundary smoke, NEVER Supabase.
-- Requires V17/V18 and repaired V22 draft; no live account/event created.
BEGIN;
DO $test$
DECLARE
 reserve_fn text:='private.world_boss_v22_reserve_account(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)';
 helper_fn text:='private.world_boss_v26_valid_packet_engine(text,text)';
BEGIN
 IF NOT private.world_boss_v26_valid_packet_engine(
  'world-boss-v22-account-raid-prototype','world-boss-account-raid-v22-prototype')
 THEN RAISE EXCEPTION 'WB26_V22_LEGACY_PACKET_BROKEN'; END IF;
 IF NOT private.world_boss_v26_valid_packet_engine(
  'world-boss-v26-authored-account-packet','world-boss-account-rounds-v25-prototype')
 THEN RAISE EXCEPTION 'WB26_AUTHORED_PACKET_BROKEN'; END IF;
 IF private.world_boss_v26_valid_packet_engine(
  'world-boss-v26-authored-account-packet','world-boss-account-raid-v22-prototype') OR
    private.world_boss_v26_valid_packet_engine(
  'world-boss-v22-account-raid-prototype','world-boss-account-rounds-v25-prototype') OR
    private.world_boss_v26_valid_packet_engine(
  'world-boss-v26-authored-account-packet','world-boss-account-rounds-v99-prototype') OR
    private.world_boss_v26_valid_packet_engine('unknown','unknown')
 THEN RAISE EXCEPTION 'WB26_CROSS_ENGINE_PACKET_CONFUSION'; END IF;
 IF has_function_privilege('anon',reserve_fn,'EXECUTE')
    OR has_function_privilege('authenticated',reserve_fn,'EXECUTE')
    OR has_function_privilege('anon',helper_fn,'EXECUTE')
    OR has_function_privilege('authenticated',helper_fn,'EXECUTE')
 THEN RAISE EXCEPTION 'WB26_PRIVATE_FUNCTION_EXPOSED'; END IF;
 IF private.world_boss_v22_window_at(
  '2026-11-16 00:00+00'::timestamptz,
  '2026-11-22 23:59:59+00'::timestamptz)<>0 OR
    private.world_boss_v22_window_at(
  '2026-11-16 00:00+00'::timestamptz,
  '2026-11-23 00:00+00'::timestamptz)<>-1
 THEN RAISE EXCEPTION 'WB26_WEEKEND_BOUNDARY_WRONG'; END IF;
 IF pg_get_functiondef(reserve_fn::regprocedure) NOT LIKE '%selected_profile_digest%'
 THEN RAISE EXCEPTION 'WB26_LOCKED_PHASE_BINDING_MISSING'; END IF;
 RAISE NOTICE 'WB26_PACKET_ENGINE_DISJOINT_AND_PRIVATE_PASSED';
END
$test$;
ROLLBACK;
