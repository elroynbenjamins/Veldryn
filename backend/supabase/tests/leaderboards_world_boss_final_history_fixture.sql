-- Staging-only World Boss leaderboard fixture. Run in the same transaction as
-- docs/roadmap/leaderboards-world-boss-final-history-v1-proposal.sql,
-- with the proposal's COMMIT removed and one final ROLLBACK.
-- Never leave synthetic Boss rows or temporary gate updates committed.
DO $fixture$
DECLARE
  v_boss uuid;
  v_one uuid;
  v_two uuid;
  v_three uuid;
  v_rows jsonb;
  v_result jsonb;
BEGIN
  SELECT p.account_id INTO v_one FROM public.player_profiles p
  WHERE p.profile_visibility='public' ORDER BY p.account_id LIMIT 1;
  SELECT p.account_id INTO v_two FROM public.player_profiles p
  WHERE p.profile_visibility='public' AND p.account_id<>v_one
  ORDER BY p.account_id LIMIT 1;
  SELECT p.account_id INTO v_three FROM public.player_profiles p
  WHERE p.profile_visibility='public' AND p.account_id NOT IN (v_one,v_two)
  ORDER BY p.account_id LIMIT 1;
  IF v_one IS NULL OR v_two IS NULL OR v_three IS NULL
  THEN RAISE EXCEPTION 'WORLD_BOSS_FIXTURE_REQUIRES_THREE_PUBLIC_STAGING_ACCOUNTS'; END IF;

  INSERT INTO public.shared_world_world_bosses(
    definition_id,definition_version,definition_snapshot,definition_hash,
    name_snapshot,region_id,state,starts_at,ends_at,max_hp,remaining_hp,
    daily_scored_attempts,finalized_at
  ) VALUES (
    'ranking_test_boss',1,'{}'::jsonb,repeat('0',64),
    'Ranking Fixture Boss','asterfall','finalized',
    now()-interval '10 days',now()-interval '3 days',
    100000,0,3,now()-interval '2 days'
  ) RETURNING id INTO v_boss;

  INSERT INTO public.shared_world_world_boss_final_ranks(
    boss_id,account_id,display_name_snapshot,final_rank,
    raid_impact,applied_global_damage,valid_attempts
  ) VALUES
    (v_boss,v_one,'Historical Champion',1,9000,6000,3),
    (v_boss,v_two,'Historical Defender',2,5000,3000,2),
    -- A malformed zero-valid-attempt row must never be surfaced.
    (v_boss,v_three,'Echo Only',3,50000,50000,0);

  -- Disabled by default, regardless of whether the event has final ranks.
  BEGIN
    PERFORM private.leaderboards_world_boss_event_v1(v_one,v_boss,51,0);
    RAISE EXCEPTION 'HIDDEN_WORLD_BOSS_READ_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'WORLD_BOSS_LEADERBOARDS_DISABLED' THEN RAISE; END IF;
  END;

  UPDATE private.leaderboards_world_boss_gate_v1 SET enabled=true WHERE id=1;
  SELECT private.leaderboards_world_boss_event_v1(v_one,v_boss,51,0)
    INTO v_result;
  v_rows:=v_result->'entries';
  IF jsonb_array_length(v_rows)<>2
    OR v_rows->0->>'displayName'<>'Historical Champion'
    OR (v_rows->0->>'rank')::integer<>1
    OR (v_rows->1->>'rank')::integer<>2
    OR (v_result->'self'->>'rank')::integer<>1
    OR (v_result->'self'->>'listed')::boolean IS NOT TRUE
  THEN RAISE EXCEPTION 'WORLD_BOSS_FINALIZED_PROJECTION_INVALID'; END IF;

  UPDATE public.player_profiles SET profile_visibility='private'
  WHERE account_id=v_two;
  SELECT private.leaderboards_world_boss_event_v1(v_one,v_boss,51,0)
    INTO v_result;
  IF jsonb_array_length(v_result->'entries')<>1
  THEN RAISE EXCEPTION 'WORLD_BOSS_PRIVATE_PROFILE_VISIBLE'; END IF;

  -- Original global ranks stay fixed across privacy filtering.
  -- The second eligible player remains #2 even with the leader hidden.
  UPDATE public.player_profiles SET profile_visibility='public'
  WHERE account_id=v_two;
  UPDATE public.player_profiles SET profile_visibility='private'
  WHERE account_id=v_one;
  SELECT private.leaderboards_world_boss_event_v1(v_two,v_boss,1,0)
    INTO v_result;
  IF jsonb_array_length(v_result->'entries')<>1
    OR (v_result->'entries'->0->>'rank')::integer<>2
    OR (v_result->'self'->>'rank')::integer<>2
  THEN RAISE EXCEPTION 'WORLD_BOSS_GLOBAL_RANK_CHANGED_BY_FILTER'; END IF;
  UPDATE public.player_profiles SET profile_visibility='public'
  WHERE account_id=v_one;
  INSERT INTO public.player_blocks(blocker_id,blocked_id)
  VALUES(v_two,v_one) ON CONFLICT DO NOTHING;
  SELECT private.leaderboards_world_boss_event_v1(v_one,v_boss,51,0)
    INTO v_result;
  IF jsonb_array_length(v_result->'entries')<>1
  THEN RAISE EXCEPTION 'WORLD_BOSS_MUTUAL_BLOCK_IGNORED'; END IF;

  RAISE NOTICE 'World Boss final history, privacy, block and echo-exclusion fixture passed';
END $fixture$;
