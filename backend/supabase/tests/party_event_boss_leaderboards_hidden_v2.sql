-- Private scoreboard stays dark until the separate global Leaderboards release.
-- Run with all Party Events migrations inside disposable/staging transaction.
BEGIN;
DO $tests$
DECLARE
  v_name text;
  v_entry_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM private.party_event_leaderboard_gate_v2
    WHERE id=1 AND enabled=false
  ) THEN RAISE EXCEPTION 'Party Event leaderboard exposed before release'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private' AND c.relname='party_event_boss_leaderboard_entries_v2'
      AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'Private Party Event scoreboard missing RLS'; END IF;

  IF has_table_privilege('authenticated',
      'private.party_event_boss_leaderboard_entries_v2','SELECT')
    OR has_table_privilege('anon',
      'private.party_event_boss_leaderboard_entries_v2','SELECT')
    OR has_table_privilege('authenticated',
      'private.party_event_leaderboard_gate_v2','SELECT')
    OR has_table_privilege('anon',
      'private.party_event_leaderboard_gate_v2','SELECT')
    OR has_function_privilege('authenticated',
      'private.party_event_boss_rankings_v2(timestamptz,text,text,smallint,integer)',
      'EXECUTE')
    OR has_function_privilege('anon',
      'private.party_event_boss_rankings_v2(timestamptz,text,text,smallint,integer)',
      'EXECUTE')
  THEN RAISE EXCEPTION 'Party Event scoreboard readable by players'; END IF;

  BEGIN
    PERFORM * FROM private.party_event_boss_rankings_v2(
      '2026-11-09 00:00:00+00'::timestamptz,'standard','damage',2::smallint,25
    );
    RAISE EXCEPTION 'Leaderboard unexpectedly returned before global launch';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'PARTY_EVENT_LEADERBOARDS_DISABLED' THEN RAISE; END IF;
  END;

  -- SQL scoring interfaces can be tested in the transaction without ever
  -- enabling Party Events themselves or granting access to app roles.
  UPDATE private.party_event_leaderboard_gate_v2 SET enabled=true WHERE id=1;
  SELECT count(*) INTO v_entry_count FROM private.party_event_boss_rankings_v2(
    '2026-11-09 00:00:00+00'::timestamptz,'standard','depth',2::smallint,25
  );
  IF v_entry_count<>0 THEN
    RAISE EXCEPTION 'unexpected historical results from unlaunched Party Events';
  END IF;
  UPDATE private.party_event_leaderboard_gate_v2 SET enabled=false WHERE id=1;
  RAISE NOTICE 'Party Event leaderboard isolated and release-gated';
END $tests$;
ROLLBACK;
