-- Day 8 boss loadouts and outcome ledger remain private until launch.
-- Designed to run inside an outer transaction against disposable/staging data.
BEGIN;
DO $tests$
DECLARE r record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled=false
  ) THEN RAISE EXCEPTION 'Party Event gate unexpectedly enabled'; END IF;

  FOR r IN SELECT c.relname,c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private'
      AND c.relname IN ('party_event_boss_loadouts_v2','party_event_boss_results_v2')
  LOOP
    IF NOT r.relrowsecurity
      OR has_table_privilege('authenticated',format('private.%I',r.relname),'SELECT')
      OR has_table_privilege('anon',format('private.%I',r.relname),'SELECT')
      OR has_table_privilege('authenticated',format('private.%I',r.relname),'INSERT')
    THEN RAISE EXCEPTION 'Day 8 table unexpectedly exposed: %',r.relname; END IF;
  END LOOP;

  IF has_function_privilege('authenticated',
    'private.party_event_boss_save_loadout_v2(uuid,uuid,uuid,text,integer,text,jsonb)','EXECUTE')
    OR has_function_privilege('anon',
      'private.party_event_boss_save_loadout_v2(uuid,uuid,uuid,text,integer,text,jsonb)','EXECUTE')
    OR has_function_privilege('authenticated',
      'private.party_event_boss_lock_roster_v2(uuid)','EXECUTE')
    OR has_function_privilege('anon',
      'private.party_event_boss_lock_roster_v2(uuid)','EXECUTE')
    OR has_function_privilege('authenticated',
      'private.party_event_boss_record_result_v2(uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon',
      'private.party_event_boss_record_result_v2(uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'Day 8 private function callable by app roles'; END IF;

  BEGIN
    PERFORM private.party_event_boss_save_loadout_v2(
      gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'main',1,
      repeat('a',64),'{}'::jsonb
    );
    RAISE EXCEPTION 'Day 8 save unexpectedly permitted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'PARTY_WEEKLY_EVENTS_DISABLED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM private.party_event_boss_lock_roster_v2(gen_random_uuid());
    RAISE EXCEPTION 'Day 8 lock unexpectedly permitted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'PARTY_WEEKLY_EVENTS_DISABLED' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM private.party_event_boss_record_result_v2(gen_random_uuid(),'{}'::jsonb);
    RAISE EXCEPTION 'Day 8 result unexpectedly permitted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'PARTY_WEEKLY_EVENTS_DISABLED' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'Hidden Day 8 boss security checks passed';
END $tests$;
ROLLBACK;
