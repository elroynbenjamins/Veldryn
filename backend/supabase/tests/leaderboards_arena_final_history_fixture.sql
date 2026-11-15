-- Rollback-only QA after the UNDEPLOYED Arena history proposal.
-- Inserts a closed test season and synthetic official scores in staging.
DO $arena_history$
DECLARE
  v_season text:='ranking-qa-'||substr(md5(clock_timestamp()::text),1,14);
  a uuid;b uuid;c uuid;
  snapshot jsonb;
  result jsonb;
  archived jsonb;
BEGIN
  SELECT account_id INTO a FROM public.player_profiles
  WHERE profile_visibility='public' ORDER BY account_id LIMIT 1;
  SELECT account_id INTO b FROM public.player_profiles
  WHERE profile_visibility='public' AND account_id<>a ORDER BY account_id LIMIT 1;
  SELECT account_id INTO c FROM public.player_profiles
  WHERE profile_visibility='public' AND account_id NOT IN(a,b)
  ORDER BY account_id LIMIT 1;
  IF a IS NULL OR b IS NULL OR c IS NULL
  THEN RAISE EXCEPTION 'ARENA_HISTORY_REQUIRES_THREE_STAGING_ACCOUNTS'; END IF;
  IF has_function_privilege('anon','public.rankings_finalize_arena_season_server_v1(text)','EXECUTE')
    OR has_function_privilege('authenticated','public.rankings_finalize_arena_season_server_v1(text)','EXECUTE')
    OR has_function_privilege('anon','public.rankings_arena_final_history_server_v1(uuid,text,text,integer,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'ARENA_HISTORY_EXPOSED_TO_CLIENT'; END IF;

  INSERT INTO public.squad_arena_seasons(id,starts_at,ends_at,status,rules_version)
  VALUES(v_season,clock_timestamp()-interval '30 days',
    clock_timestamp()-interval '2 days','closed',1);
  INSERT INTO public.squad_arena_season_accounts(season_id,account_id,rating,wins)
  VALUES(v_season,a,1600,20),(v_season,b,1600,20),(v_season,c,1450,10);
  PERFORM public.rankings_finalize_arena_season_server_v1(v_season);

  SELECT results INTO archived FROM private.rankings_arena_final_history_v1
  WHERE season_id=v_season AND metric='arena_rating';
  IF jsonb_array_length(archived)<>3
    OR (archived->0->>'rank')::integer<>1
    OR (archived->1->>'rank')::integer<>1
    OR (archived->2->>'rank')::integer<>3
  THEN RAISE EXCEPTION 'ARENA_FINALIZED_SHARED_TIES_WRONG'; END IF;

  -- A mutated season record can never overwrite the sealed historical rank.
  UPDATE public.squad_arena_season_accounts SET rating=9999 WHERE
    season_id=v_season AND account_id=c;
  PERFORM public.rankings_finalize_arena_season_server_v1(v_season);
  SELECT results INTO snapshot FROM private.rankings_arena_final_history_v1
  WHERE season_id=v_season AND metric='arena_rating';
  IF snapshot IS DISTINCT FROM archived
  THEN RAISE EXCEPTION 'ARENA_HISTORY_REFINALIZED_MUTATED'; END IF;

  BEGIN
    PERFORM public.rankings_arena_final_history_server_v1(a,v_season,'arena_rating',50,0);
    RAISE EXCEPTION 'ARENA_HISTORY_VISIBLE_BEFORE_GATE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'ARENA_HISTORY_DISABLED' THEN RAISE; END IF;
  END;
  UPDATE private.rankings_arena_history_gate_v1 SET enabled=true WHERE id=1;
  SELECT public.rankings_arena_final_history_server_v1(a,v_season,'arena_rating',50,0)
  INTO result;
  IF jsonb_array_length(result->'entries')<>3 OR result->>'seasonId'<>v_season
    OR (result->'entries'->2->>'rank')::integer<>3
  THEN RAISE EXCEPTION 'ARENA_FINAL_ARCHIVE_PROJECTION_INVALID'; END IF;
  UPDATE public.player_profiles SET profile_visibility='private' WHERE account_id=a;
  SELECT public.rankings_arena_final_history_server_v1(b,v_season,'arena_rating',50,0)
  INTO result;
  IF jsonb_array_length(result->'entries')<>2
    OR (result->'entries'->0->>'rank')::integer<>1
    OR (result->'entries'->1->>'rank')::integer<>3
  THEN RAISE EXCEPTION 'ARENA_HISTORY_PRIVACY_CHANGED_RANKS'; END IF;
  IF position(a::text IN result::text)>0 OR position(b::text IN result::text)>0
  THEN RAISE EXCEPTION 'ARENA_HISTORY_ACCOUNT_ID_LEAK'; END IF;
  RAISE NOTICE 'Arena closed season immutable archive and privacy tests passed';
END $arena_history$;
