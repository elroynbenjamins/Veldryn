-- Rollback-only integration fixture for the undeployed v3 profession scorer.
-- Requires an existing single-save, public staging account with a valid owned
-- character. All synthetic modifications must be enclosed in BEGIN/ROLLBACK.
DO $profession_real$
DECLARE
  v_account uuid;
  v_level bigint;
  v_xp numeric;
  v_board jsonb;
BEGIN
  SELECT s.account_id INTO v_account
  FROM public.online_game_states s
  JOIN public.player_profiles p ON p.account_id=s.account_id
  JOIN public.characters c ON c.id=s.character_id AND c.account_id=s.account_id
  WHERE p.profile_visibility='public'
  GROUP BY s.account_id
  HAVING COUNT(*)=1
  ORDER BY s.account_id LIMIT 1;
  IF v_account IS NULL THEN
    RAISE EXCEPTION 'STAGING_PROFESSION_FIXTURE_ACCOUNT_MISSING'; END IF;

  -- Duplicate mining skill entries have conflicting level and XP. Never take
  -- XP from the stale lower-level record when ranking the level 51 character.
  UPDATE public.online_game_states s
  SET state=jsonb_set(jsonb_set(s.state,'{skills}',jsonb_build_array(
    jsonb_build_object('skillId','mining','level',51,'xp',100),
    jsonb_build_object('skillId','mining','level',50,'xp',9999),
    jsonb_build_object('skillId','woodcutting','level',10,'xp',200)
  ),true),'{otherCharacters}','[]'::jsonb,true)
  WHERE s.account_id=v_account;

  SELECT m.value,m.secondary_value INTO v_level,v_xp
  FROM private.rankings_verified_metrics_v3('mining') m
  WHERE m.account_id=v_account;
  IF v_level<>51 OR v_xp<>100 THEN
    RAISE EXCEPTION 'MINING_LEVEL_XP_COHERENCE_INVALID: % / %',v_level,v_xp;
  END IF;

  SELECT m.value,m.secondary_value INTO v_level,v_xp
  FROM private.rankings_verified_metrics_v3('woodcutting') m
  WHERE m.account_id=v_account;
  IF v_level<>10 OR v_xp<>200 THEN
    RAISE EXCEPTION 'WOODCUTTING_SKILL_PROJECTION_INVALID: % / %',v_level,v_xp;
  END IF;

  SELECT m.value,m.secondary_value INTO v_level,v_xp
  FROM private.rankings_verified_metrics_v3('profession_total') m
  WHERE m.account_id=v_account;
  IF v_level<>61 OR v_xp<>300 THEN
    RAISE EXCEPTION 'ACCOUNT_PROFESSION_TOTAL_INVALID: % / %',v_level,v_xp;
  END IF;

  SELECT public.rankings_board_server_v3(v_account,'mining',51,0)
  INTO v_board;
  IF (v_board->'self'->>'value')::bigint<>51
    OR (v_board->'self'->>'secondaryValue')::numeric<>100
  THEN RAISE EXCEPTION 'PUBLIC_PROFESSION_PROJECTION_INVALID'; END IF;

  RAISE NOTICE 'Actual v3 scorer verified: mining 51+100XP, woodcutting 10+200XP, total 61+300XP';
END $profession_real$;
