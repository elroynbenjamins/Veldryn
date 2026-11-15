-- Run after the UNDEPLOYED v3 proposal, inside its surrounding BEGIN/ROLLBACK.
-- Staging-only fixture: modify a saved Journal snapshot in the transaction.
-- The caller MUST ROLLBACK; never commit synthetic player achievements.
DO $journal_score$
DECLARE
  v_account uuid;
  v_ts bigint := floor(extract(epoch from now())*1000)::bigint;
  v_value bigint;
  v_count numeric;
  v_projection jsonb;
BEGIN
  SELECT s.account_id INTO v_account
  FROM public.online_game_states s
  JOIN public.player_profiles p ON p.account_id=s.account_id
  WHERE p.profile_visibility='public' ORDER BY s.account_id LIMIT 1;
  IF v_account IS NULL THEN RAISE EXCEPTION 'JOURNAL_SCORE_NO_STAGING_FIXTURE_ACCOUNT'; END IF;

  UPDATE public.online_game_states s SET state=jsonb_set(s.state,
    '{account,journalState}',
    jsonb_build_object(
      'schemaVersion',42,'accountId',s.account_id::text,
      'unlockedAchievements',jsonb_build_object(
        'combatant_novice',v_ts,
        'artisan_veteran',v_ts,
        'invented_grandmaster',v_ts,
        'combatant_grandmaster',9999999999999::bigint
      )
    ),true)
  WHERE s.account_id=v_account;

  SELECT m.value,m.secondary_value INTO v_value,v_count
  FROM private.rankings_verified_metrics_v3('achievement_score') m
  WHERE m.account_id=v_account;

  IF v_value<>60 OR v_count<>2 THEN
    RAISE EXCEPTION 'JOURNAL_SCORE_WRONG_RESULT: % / %',v_value,v_count;
  END IF;

  SELECT public.rankings_board_server_v3(v_account,'achievement_score',51,0)
  INTO v_projection;
  IF v_projection->>'board'<>'achievement_score'
    OR v_projection->>'unit'<>'points'
    OR (v_projection->'self'->>'value')::bigint<>60
    OR (v_projection->'self'->>'listed')::boolean IS NOT TRUE
  THEN RAISE EXCEPTION 'JOURNAL_SCORE_PROJECTION_WRONG'; END IF;
  RAISE NOTICE 'Journal Score fixture passed: 60 provisional points, 2 valid unlocks';
END $journal_score$;

-- Synthetic account with two saved character snapshots. Three journal rows
-- contain only two unique earned milestones; duplicate snapshots must NOT
-- inflate account-wide score or achievement count.
DO $journal_snapshot_dedup$
DECLARE v_points bigint; v_count numeric;
BEGIN
  WITH snapshots(account_key,milestone_id) AS (
    VALUES
      ('same-account','combatant_novice'),
      ('same-account','combatant_novice'),
      ('same-account','artisan_veteran')
  ), earned_once AS (
    SELECT DISTINCT account_key,milestone_id FROM snapshots
  )
  SELECT SUM(CASE WHEN milestone_id LIKE '%_novice' THEN 10
                  WHEN milestone_id LIKE '%_veteran' THEN 50
                  ELSE 0 END)::bigint, COUNT(*)::numeric
  INTO v_points,v_count FROM earned_once;
  IF v_points<>60 OR v_count<>2
  THEN RAISE EXCEPTION 'JOURNAL_MULTISAVE_DEDUP_FAILED'; END IF;
  IF position('SELECT DISTINCT s.account_id,x.key AS milestone_id' IN
    pg_get_functiondef('private.rankings_verified_metrics_v3(text)'::regprocedure))=0
  THEN RAISE EXCEPTION 'JOURNAL_DEDUP_SCORER_NOT_INSTALLED'; END IF;
  RAISE NOTICE 'Journal multi-snapshot milestone dedup contract passed';
END $journal_snapshot_dedup$;
