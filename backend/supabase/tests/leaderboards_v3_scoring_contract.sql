-- Integration test for the UNDEPLOYED Leaderboards v3 scoring proposal.
-- Run in the same disposable/staging transaction as the v3 SQL proposal.
-- It must never turn the client or Party Event leaderboard gates on.
DO $leaderboards$
DECLARE
 v_account uuid;
 v_board text;
 v_out jsonb;
 v_previous bigint;
 v_position bigint;
 v_value bigint;
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
   FOR v_row IN SELECT value FROM jsonb_array_elements(v_out->'entries') LOOP
      v_value := (v_row->>'value')::bigint;
      v_position := (v_row->>'rank')::bigint;
      IF v_value<0 OR v_position<1 OR
         (v_previous IS NOT NULL AND v_value>v_previous)
      THEN RAISE EXCEPTION 'V3_RANKING_ORDER_INVALID: %',v_board; END IF;
      v_previous := v_value;
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
