-- Staging-only privacy fixture for the UNDEPLOYED global v3 boards.
-- Run with docs/roadmap/leaderboards-authoritative-scoring-v3-proposal.sql
-- in a single BEGIN/ROLLBACK transaction. No persistent profile edits/blocks.
DO $ranking_privacy$
DECLARE
  requester uuid;
  target uuid;
  snapshot jsonb;
  rank_before bigint;
  rank_after bigint;
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
  rank_before := (snapshot->'self'->>'rank')::bigint;
  IF rank_before IS NULL THEN RAISE EXCEPTION 'PUBLIC_REQUESTER_RANK_MISSING'; END IF;
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
  rank_after := (snapshot->'self'->>'rank')::bigint;
  IF rank_after IS DISTINCT FROM rank_before
  THEN RAISE EXCEPTION 'REQUESTER_RANK_MOVED_AFTER_BLOCK: before %, after %',rank_before,rank_after; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'entries') row
    WHERE row.value->>'displayName'=target_name)
  THEN RAISE EXCEPTION 'BLOCKED_TARGET_EXPOSED_IN_RANKINGS'; END IF;
  IF position(requester::text IN snapshot::text)>0
    OR position(target::text IN snapshot::text)>0
  THEN RAISE EXCEPTION 'ACCOUNT_UUID_EXPOSED_IN_RANKING_PROJECTION'; END IF;
  RAISE NOTICE 'v3 Rankings public/private/mutual-block/UUID privacy passed';
END $ranking_privacy$;

-- Deterministic tie + filtered-view fixture: equal scores retain shared global
-- rank, and hiding a top-ranked player never promotes lower-ranked survivors.
DO $rank_scope$
DECLARE actual jsonb;
BEGIN
  WITH scores(account_key,value,secondary_value,hidden) AS (
    VALUES ('alpha',100,3,false),('beta',100,3,true),
           ('gamma',80,2,false),('delta',60,1,false)
  ), official AS (
    SELECT s.*,rank() OVER (
      ORDER BY s.value DESC,s.secondary_value DESC
    ) AS rank_position FROM scores s
  ), visible AS (
    SELECT * FROM official WHERE NOT hidden
  )
  SELECT jsonb_agg(jsonb_build_object('name',v.account_key,'rank',v.rank_position)
    ORDER BY v.value DESC,v.secondary_value DESC,v.account_key)
  INTO actual FROM visible v;

  IF actual <> '[{"name":"alpha","rank":1},{"name":"gamma","rank":3},{"name":"delta","rank":4}]'::jsonb
  THEN RAISE EXCEPTION 'GLOBAL_RANK_TIE_AND_FILTER_CONTRACT_FAILED: %',actual; END IF;
  RAISE NOTICE 'Global tie and filtered rank gap contract passed';
END $rank_scope$;
