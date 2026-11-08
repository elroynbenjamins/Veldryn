-- Validate that the new weekly Party Events framework is non-exposed by default.
-- Run after 20261108184500_party_weekly_events_hidden_v2.sql.
BEGIN;
DO $test$
DECLARE r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled=false
  ) THEN
    RAISE EXCEPTION 'weekly Party Events unexpectedly enabled';
  END IF;

  FOR r IN
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private' AND c.relname LIKE 'party_weekly_event_%_v2'
      AND c.relkind='r'
  LOOP
    IF NOT r.relrowsecurity THEN
      RAISE EXCEPTION 'weekly Party Event table lacks RLS: %',r.relname;
    END IF;
    IF has_table_privilege('authenticated',format('private.%I',r.relname),'SELECT')
      OR has_table_privilege('anon',format('private.%I',r.relname),'SELECT')
      OR has_table_privilege('authenticated',format('private.%I',r.relname),'INSERT')
      OR has_table_privilege('authenticated',format('private.%I',r.relname),'UPDATE')
    THEN
      RAISE EXCEPTION 'weekly Party Event table exposed to clients: %',r.relname;
    END IF;
  END LOOP;

  IF has_function_privilege(
    'authenticated',
    'private.party_weekly_event_supply_donate_v2(uuid,uuid,integer,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'private.party_weekly_event_supply_donate_v2(uuid,uuid,integer,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'supply donation unexpectedly executable by clients';
  END IF;

  -- A trusted caller cannot spend a single item while the release gate is off.
  BEGIN
    PERFORM private.party_weekly_event_supply_donate_v2(
      gen_random_uuid(),gen_random_uuid(),1,'closedGateReplay01'
    );
    RAISE EXCEPTION 'disabled donation did not reject';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'PARTY_WEEKLY_EVENTS_DISABLED' THEN
      RAISE;
    END IF;
  END;

  -- The second pass must not introduce a public RPC.
  IF has_function_privilege('authenticated','private.party_weekly_event_enroll_v2(uuid,uuid)','EXECUTE')
    OR has_function_privilege('authenticated','private.party_weekly_event_record_activity_v2(uuid,text)','EXECUTE')
    OR has_function_privilege('authenticated','private.party_weekly_event_maybe_advance_v2(uuid)','EXECUTE')
    OR has_function_privilege('anon','private.party_weekly_event_enroll_v2(uuid,uuid)','EXECUTE')
    OR has_function_privilege('anon','private.party_weekly_event_record_activity_v2(uuid,text)','EXECUTE')
    OR has_function_privilege('anon','private.party_weekly_event_maybe_advance_v2(uuid)','EXECUTE')
    OR has_function_privilege('authenticated','private.party_weekly_event_open_vote_v2(uuid,smallint,text[],text)','EXECUTE')
    OR has_function_privilege('authenticated','private.party_weekly_event_cast_vote_v2(uuid,uuid,text)','EXECUTE')
    OR has_function_privilege('authenticated','private.party_weekly_event_vote_maybe_resolve_v2(uuid)','EXECUTE')
    OR has_function_privilege('anon','private.party_weekly_event_open_vote_v2(uuid,smallint,text[],text)','EXECUTE')
    OR has_function_privilege('anon','private.party_weekly_event_cast_vote_v2(uuid,uuid,text)','EXECUTE')
    OR has_function_privilege('anon','private.party_weekly_event_vote_maybe_resolve_v2(uuid)','EXECUTE')
  THEN
    RAISE EXCEPTION 'weekly progression RPC exposed to clients';
  END IF;

  -- Unverified arbitrary source identifiers must not produce EP, even when
  -- called with service privileges from a trusted worker.
  BEGIN
    PERFORM private.party_weekly_event_record_activity_v2(
      gen_random_uuid(),'no-such-source-01'
    );
    RAISE EXCEPTION 'disabled progress accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'PARTY_WEEKLY_EVENTS_DISABLED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM private.party_weekly_event_enroll_v2(gen_random_uuid(),gen_random_uuid());
    RAISE EXCEPTION 'disabled enrollment accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'PARTY_WEEKLY_EVENTS_DISABLED' THEN RAISE; END IF;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='private'
      AND indexname='party_weekly_event_members_v2_account_id_week_start_key'
  ) THEN
    RAISE EXCEPTION 'one-account-per-week binding unique constraint missing';
  END IF;

  RAISE NOTICE 'Hidden weekly Party Event security checks passed';
END $test$;
ROLLBACK;
