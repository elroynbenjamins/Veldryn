-- Execute only after v3 scorer + v4 snapshot proposal, inside BEGIN/ROLLBACK.
-- This intentionally changes staging profile visibility and snapshot expiry;
-- do not ever commit synthetic results, gates or account changes.
DO $rank_snap$
DECLARE
  requester uuid;
  other_account uuid;
  original jsonb;
  first_page jsonb;
  replay jsonb;
  second_page jsonb;
  next_page jsonb;
  after_private jsonb;
  cursor uuid;
  next_cursor uuid;
  board text;
  prior_value bigint;
  frozen_value bigint;
  snapshot_id uuid;
BEGIN
  SELECT account_id INTO requester FROM public.player_profiles
  WHERE profile_visibility='public' ORDER BY account_id LIMIT 1;
  SELECT account_id INTO other_account FROM public.player_profiles
  WHERE profile_visibility='public' AND account_id<>requester
  ORDER BY account_id LIMIT 1;
  IF requester IS NULL OR other_account IS NULL THEN
    RAISE EXCEPTION 'NEED_TWO_STAGING_PUBLIC_ACCOUNTS'; END IF;

  IF has_function_privilege('anon','public.rankings_frozen_start_server_v1(uuid,text,integer)','EXECUTE')
    OR has_function_privilege('authenticated','public.rankings_frozen_start_server_v1(uuid,text,integer)','EXECUTE')
    OR has_function_privilege('anon','public.rankings_frozen_page_server_v1(uuid,uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.rankings_frozen_page_server_v1(uuid,uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.rankings_frozen_page_server_v1(uuid,uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'SNAPSHOT_FUNCTIONS_EXPOSED_TO_CLIENT'; END IF;

  FOREACH board IN ARRAY ARRAY[
    'profession_total','mining','woodcutting','fishing','smithing','cooking',
    'herbalism','alchemy','hunting','exploration','tailoring','enchanting',
    'faith','achievement_score','dungeon_tier','dungeon_clears',
    'arena_rating','arena_wins','guild'
  ] LOOP
    SELECT public.rankings_frozen_start_server_v1(requester,board,50) INTO original;
    IF original->>'board'<>board
      OR original->>'frozen'<>'true'
      OR jsonb_typeof(original->'entries')<>'array'
      OR (original->>'pageSize')::integer<>50
    THEN RAISE EXCEPTION 'FROZEN_BOARD_MISMATCH: %',board; END IF;
  END LOOP;

  SELECT public.rankings_frozen_start_server_v1(requester,'mining',2) INTO first_page;
  cursor:=(first_page->>'cursor')::uuid;
  next_cursor:=(first_page->>'nextCursor')::uuid;
  IF cursor IS NULL OR next_cursor IS NULL
    OR jsonb_array_length(first_page->'entries')<>2
  THEN RAISE EXCEPTION 'FROZEN_FIRST_PAGE_INVALID'; END IF;
  SELECT public.rankings_frozen_page_server_v1(requester,cursor) INTO replay;
  IF replay->'entries' IS DISTINCT FROM first_page->'entries'
  THEN RAISE EXCEPTION 'FROZEN_CURSOR_NOT_IDEMPOTENT'; END IF;
  SELECT public.rankings_frozen_page_server_v1(requester,next_cursor)
    INTO second_page;
  IF second_page->'entries' IS NULL
    OR (first_page->'entries'->0->>'displayName')
      =(second_page->'entries'->0->>'displayName')
  THEN RAISE EXCEPTION 'FROZEN_CURSOR_DUPLICATES_FIRST_ENTRY'; END IF;
  IF position(requester::text IN first_page::text)>0
    OR position(other_account::text IN first_page::text)>0
  THEN RAISE EXCEPTION 'SNAPSHOT_EXPOSED_ACCOUNT_UUID'; END IF;

  -- Changing a profile immediately removes it on any existing cursor.
  UPDATE public.player_profiles SET profile_visibility='private'
  WHERE account_id=requester;
  SELECT public.rankings_frozen_page_server_v1(requester,cursor)
    INTO after_private;
  IF (after_private->'self'->>'listed')::boolean IS NOT FALSE
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(after_private->'entries') x
      WHERE (x.value->>'isSelf')::boolean IS TRUE
    )
  THEN RAISE EXCEPTION 'SNAPSHOT_IGNORED_NEW_PRIVACY'; END IF;
  UPDATE public.player_profiles SET profile_visibility='public'
  WHERE account_id=requester;

  SELECT c.snapshot_id INTO snapshot_id
  FROM private.rankings_frozen_cursors_v1 c WHERE c.id=cursor;
  UPDATE private.rankings_frozen_snapshots_v1 SET expires_at=clock_timestamp()-interval '1 second'
  WHERE id=snapshot_id;
  BEGIN
    PERFORM public.rankings_frozen_page_server_v1(requester,cursor);
    RAISE EXCEPTION 'EXPIRED_SNAPSHOT_ALLOWED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'RANKING_SNAPSHOT_EXPIRED_OR_FORBIDDEN' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.rankings_frozen_page_server_v1(other_account,cursor);
    RAISE EXCEPTION 'OTHER_ACCOUNT_STOLE_SNAPSHOT';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'RANKING_SNAPSHOT_EXPIRED_OR_FORBIDDEN' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'All 19 boards, cursor replay, privacy, expiry and account binding passed';
END $rank_snap$;
