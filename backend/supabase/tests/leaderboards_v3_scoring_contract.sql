-- Integration test for the UNDEPLOYED Leaderboards v3 scoring proposal.
-- Run in the same disposable/staging transaction as the v3 SQL proposal.
-- It must never turn the client or Party Event leaderboard gates on.
DO $leaderboards$
DECLARE
 v_account uuid;
 v_board text;
 v_out jsonb;
 v_previous bigint;
 v_previous_secondary numeric;
 v_previous_rank bigint;
 v_position bigint;
 v_value bigint;
 v_secondary numeric;
 v_row jsonb;
BEGIN
 IF to_regprocedure('public.rankings_board_server_v3(uuid,text,integer,integer)') IS NULL
    OR to_regprocedure('private.rankings_verified_metrics_v3(text)') IS NULL
 THEN RAISE EXCEPTION 'V3_SCORING_FUNCTIONS_MISSING'; END IF;

 IF has_function_privilege('anon','public.rankings_board_server_v3(uuid,text,integer,integer)','EXECUTE')
   OR has_function_privilege('authenticated','public.rankings_board_server_v3(uuid,text,integer,integer)','EXECUTE')
   OR has_function_privilege('anon','private.rankings_verified_metrics_v3(text)','EXECUTE')
   OR has_function_privilege('authenticated','private.rankings_verified_metrics_v3(text)','EXECUTE')
   OR NOT has_function_privilege('service_role','public.rankings_board_server_v3(uuid,text,integer,integer)','EXECUTE')
 THEN RAISE EXCEPTION 'V3_RANKINGS_CLIENT_EXPOSURE'; END IF;

 SELECT account_id INTO v_account FROM public.player_profiles
 WHERE profile_visibility='public' ORDER BY created_at LIMIT 1;
 v_account := coalesce(v_account,'00000000-0000-0000-0000-000000000001'::uuid);
 FOREACH v_board IN ARRAY ARRAY[
   'profession_total','mining','woodcutting','fishing','smithing','cooking',
   'herbalism','alchemy','hunting','exploration','tailoring','enchanting',
   'faith','achievement_score','dungeon_tier','dungeon_clears'
 ] LOOP
   SELECT public.rankings_board_server_v3(v_account,v_board,51,0) INTO v_out;
   IF v_out->>'board'<>v_board OR jsonb_typeof(v_out->'entries')<>'array'
      OR jsonb_typeof(v_out->'self')<>'object'
   THEN RAISE EXCEPTION 'V3_BOARD_PROJECTION_INVALID: %',v_board; END IF;
   v_previous := NULL;
   v_previous_secondary := NULL;
   v_previous_rank := NULL;
   FOR v_row IN SELECT value FROM jsonb_array_elements(v_out->'entries') LOOP
      v_value := (v_row->>'value')::bigint;
      v_secondary := (v_row->>'secondaryValue')::numeric;
      v_position := (v_row->>'rank')::bigint;
      IF v_value<0 OR v_position<1 OR
         (v_previous IS NOT NULL AND (
            v_value>v_previous
            OR (v_value=v_previous AND v_secondary>v_previous_secondary)
            OR v_position<v_previous_rank
            OR (v_value=v_previous AND v_secondary=v_previous_secondary
                AND v_position<>v_previous_rank)
            OR ((v_value,v_secondary) IS DISTINCT FROM
                (v_previous,v_previous_secondary) AND v_position<=v_previous_rank)
         ))
      THEN RAISE EXCEPTION 'V3_RANKING_ORDER_OR_TIE_INVALID: %',v_board; END IF;
      v_previous := v_value;
      v_previous_secondary := v_secondary;
      v_previous_rank := v_position;
   END LOOP;
 END LOOP;

 FOREACH v_board IN ARRAY ARRAY['arena_rating','arena_wins','guild'] LOOP
   SELECT public.rankings_board_server_v3(v_account,v_board,51,0) INTO v_out;
   IF v_out->>'board'<>v_board OR jsonb_typeof(v_out->'entries')<>'array'
     OR (v_out->>'prestigeOnly')::boolean IS NOT TRUE
   THEN RAISE EXCEPTION 'V3_BREAKS_EXISTING_DELEGATED_BOARD: %',v_board; END IF;
 END LOOP;
 BEGIN
   PERFORM public.rankings_board_server_v3(v_account,'mining',101,0);
   RAISE EXCEPTION 'V3_ACCEPTED_OVERSIZE_REQUEST';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='V3_ACCEPTED_OVERSIZE_REQUEST' THEN RAISE; END IF;
 END;
 BEGIN
   PERFORM private.rankings_verified_metrics_v3('unapproved_score');
   RAISE EXCEPTION 'V3_ACCEPTED_UNTRUSTED_METRIC';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='V3_ACCEPTED_UNTRUSTED_METRIC' THEN RAISE; END IF;
 END;
 RAISE NOTICE 'V3 trusted scoring and read-only access tests passed';
END $leaderboards$;

-- Deterministic score-pair regression: when cached saves disagree, level and
-- tiebreak XP must belong to the same chosen skill record/character.
DO $profession_pair$
DECLARE
  best_level bigint;
  best_xp numeric;
  combined_levels bigint;
  combined_xp numeric;
BEGIN
  WITH saves(character_key,skill_id,skill_level,skill_xp) AS (
    VALUES
      ('main','mining',60,110::numeric),
      ('main','mining',59,999::numeric), -- stale duplicate: do NOT use its XP
      ('alt','mining',55,300::numeric)    -- lower-level character: not the tie XP
  ), per_character AS (
    SELECT DISTINCT ON (character_key,skill_id)
      character_key,skill_id,skill_level::bigint AS lvl,skill_xp AS xp
    FROM saves
    ORDER BY character_key,skill_id,skill_level DESC,skill_xp DESC
  )
  SELECT MAX(lvl),(array_agg(xp ORDER BY lvl DESC,xp DESC))[1],
    SUM(lvl),SUM(xp)
  INTO best_level,best_xp,combined_levels,combined_xp
  FROM per_character;
  IF best_level<>60 OR best_xp<>110
    OR combined_levels<>115 OR combined_xp<>410
  THEN RAISE EXCEPTION 'V3_PROFESSION_LEVEL_XP_PAIR_REGRESSION'; END IF;
  IF position('DISTINCT ON (sr.account_id,sr.character_id,sr.skill_id)' IN
    pg_get_functiondef('private.rankings_verified_metrics_v3(text)'::regprocedure))=0
  THEN RAISE EXCEPTION 'V3_PROFESSION_PAIR_IMPLEMENTATION_MISSING'; END IF;
  RAISE NOTICE 'V3 profession level/XP snapshot pairing contract passed';
END $profession_pair$;

-- Schema guard: guild_members has composite (guild_id,account_id) PK, so a
-- member can have duplicate account rows across guilds. The projection must
-- choose at most one guild tag; never duplicate a player or shift official ranks.
DO $one_account_one_row$
DECLARE projected_count integer;
BEGIN
  WITH scores(account_key,value) AS (
    VALUES ('alpha',100),('beta',50)
  ), memberships(account_key,guild_key) AS (
    VALUES ('alpha','guild-1'),('alpha','guild-2'),('beta','guild-3')
  ), projected AS (
    SELECT s.account_key,gm.guild_key
    FROM scores s
    LEFT JOIN LATERAL (
      SELECT m.guild_key FROM memberships m
      WHERE m.account_key=s.account_key
      ORDER BY m.guild_key LIMIT 1
    ) gm ON true
  )
  SELECT COUNT(*) INTO projected_count FROM projected;
  IF projected_count<>2 THEN
    RAISE EXCEPTION 'DUPLICATE_GUILD_MEMBERSHIP_INFLATES_LEADERBOARD'; END IF;
  IF position('LEFT JOIN LATERAL' IN
    pg_get_functiondef('public.rankings_board_server_v3(uuid,text,integer,integer)'::regprocedure))=0
  THEN RAISE EXCEPTION 'V3_GUILD_DEDUP_QUERY_MISSING'; END IF;
  RAISE NOTICE 'One-account-one-score guild membership projection passed';
END $one_account_one_row$;
