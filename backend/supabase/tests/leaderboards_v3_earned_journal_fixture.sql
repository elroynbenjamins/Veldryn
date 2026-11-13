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
