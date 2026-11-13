-- Staging-only privacy fixture for the UNDEPLOYED global v3 boards.
-- Run with docs/roadmap/leaderboards-authoritative-scoring-v3-proposal.sql
-- in a single BEGIN/ROLLBACK transaction. No persistent profile edits/blocks.
DO $ranking_privacy$
DECLARE
  requester uuid;
  target uuid;
  snapshot jsonb;
  target_name text:='LEADERBOARDS_PRIVACY_QA_TARGET';
BEGIN
  SELECT s.account_id INTO requester
  FROM public.online_game_states s
  JOIN public.player_profiles p ON p.account_id=s.account_id
  WHERE p.profile_visibility='public'
    AND jsonb_typeof(s.state->'skills')='array'
    AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.state->'skills') k
      WHERE k.value->>'skillId'='mining')
  ORDER BY s.account_id LIMIT 1;
  SELECT s.account_id INTO target
  FROM public.online_game_states s
  JOIN public.player_profiles p ON p.account_id=s.account_id
  WHERE p.profile_visibility='public' AND s.account_id<>requester
    AND jsonb_typeof(s.state->'skills')='array'
    AND EXISTS(SELECT 1 FROM jsonb_array_elements(s.state->'skills') k
      WHERE k.value->>'skillId'='mining')
  ORDER BY s.account_id LIMIT 1;
  IF requester IS NULL OR target IS NULL
  THEN RAISE EXCEPTION 'RANKING_PRIVACY_FIXTURE_REQUIRES_TWO_ACCOUNTS'; END IF;

  UPDATE public.player_profiles SET display_name=target_name WHERE account_id=target;
  SELECT public.rankings_board_server_v3(requester,'mining',51,0) INTO snapshot;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'entries') row
    WHERE row.value->>'displayName'=target_name)
  THEN RAISE EXCEPTION 'PUBLIC_TARGET_MISSING_FROM_RANKINGS'; END IF;

  UPDATE public.player_profiles SET profile_visibility='private' WHERE account_id=target;
  SELECT public.rankings_board_server_v3(requester,'mining',51,0) INTO snapshot;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'entries') row
    WHERE row.value->>'displayName'=target_name)
  THEN RAISE EXCEPTION 'PRIVATE_TARGET_EXPOSED_IN_RANKINGS'; END IF;
  SELECT public.rankings_board_server_v3(target,'mining',51,0) INTO snapshot;
  IF (snapshot->'self'->>'listed')::boolean IS NOT FALSE
  THEN RAISE EXCEPTION 'PRIVATE_PROFILE_LISTED_SELF'; END IF;

  UPDATE public.player_profiles SET profile_visibility='public' WHERE account_id=target;
  INSERT INTO public.player_blocks(blocker_id,blocked_id)
    VALUES(target,requester) ON CONFLICT DO NOTHING;
  SELECT public.rankings_board_server_v3(requester,'mining',51,0) INTO snapshot;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'entries') row
    WHERE row.value->>'displayName'=target_name)
  THEN RAISE EXCEPTION 'BLOCKED_TARGET_EXPOSED_IN_RANKINGS'; END IF;
  IF position(requester::text IN snapshot::text)>0
    OR position(target::text IN snapshot::text)>0
  THEN RAISE EXCEPTION 'ACCOUNT_UUID_EXPOSED_IN_RANKING_PROJECTION'; END IF;
  RAISE NOTICE 'v3 Rankings public/private/mutual-block/UUID privacy passed';
END $ranking_privacy$;
