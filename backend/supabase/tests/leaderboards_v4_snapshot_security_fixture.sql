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
  i integer;
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
    -- Keep fixture within real production-style per-account rate limits.
    DELETE FROM private.rankings_frozen_snapshots_v1
    WHERE requester_id=requester;
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
  -- A rate-limited account cannot create arbitrarily many durable snapshots.
  DELETE FROM private.rankings_frozen_snapshots_v1 WHERE requester_id=requester;
  FOR i IN 1..6 LOOP
    PERFORM public.rankings_frozen_start_server_v1(requester,'mining',1);
  END LOOP;
  BEGIN
    PERFORM public.rankings_frozen_start_server_v1(requester,'mining',1);
    RAISE EXCEPTION 'SNAPSHOT_RATE_LIMIT_NOT_ENFORCED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'RANKING_SNAPSHOT_RATE_LIMITED' THEN RAISE; END IF;
  END;
  -- Bounded housekeeping prunes old cursors and sessions together.
  UPDATE private.rankings_frozen_snapshots_v1
  SET expires_at=clock_timestamp()-interval '2 hours'
  WHERE requester_id=requester;
  IF public.rankings_frozen_prune_server_v1(100)<6
  THEN RAISE EXCEPTION 'SNAPSHOT_CLEANUP_DID_NOT_DELETE_EXPIRED'; END IF;
  IF EXISTS(SELECT 1 FROM private.rankings_frozen_cursors_v1 c
    JOIN private.rankings_frozen_snapshots_v1 s ON s.id=c.snapshot_id
    WHERE s.requester_id=requester)
  THEN RAISE EXCEPTION 'SNAPSHOT_CURSOR_CASCADE_INCOMPLETE'; END IF;
  RAISE NOTICE 'All 19 boards, cursor replay, privacy, expiry and account binding passed';
END $rank_snap$;

-- The account's personal standing must be computed before the page cap.
DO $own_rank_beyond_cap$
DECLARE own_rank bigint; rows_in_page integer;
BEGIN
  WITH synthetic AS (
    SELECT n AS entity_id,(50001-n)::bigint AS value
    FROM generate_series(1,50000) AS n
  ), ranked AS MATERIALIZED (
    SELECT s.*,rank() OVER (ORDER BY s.value DESC) AS rank_position
    FROM synthetic s
  ), bounded AS (
    SELECT * FROM ranked ORDER BY value DESC,entity_id LIMIT 10051
  )
  SELECT (SELECT r.rank_position FROM ranked r WHERE r.entity_id=20000),
    (SELECT count(*) FROM bounded)
  INTO own_rank,rows_in_page;
  IF own_rank<>20000 OR rows_in_page<>10051
  THEN RAISE EXCEPTION 'PERSONAL_RANK_TRUNCATED_BEYOND_PAGE_CAP'; END IF;
  IF position('FROM ranked r WHERE r.entity_type=' IN
    pg_get_functiondef('public.rankings_frozen_start_server_v1(uuid,text,integer)'::regprocedure))=0
  THEN RAISE EXCEPTION 'FROZEN_SNAPSHOT_PERSONAL_RANK_NOT_UNBOUNDED'; END IF;
  RAISE NOTICE '50k account personal rank outside page cap remains preserved';
END $own_rank_beyond_cap$;


-- The guild board's personal standing belongs to the player's current guild,
-- not a nonexistent "guild account" row. Membership changes take effect
-- immediately without moving anyone else's original rank.
DO $guild_frozen_self$
DECLARE
  v_account uuid;
  v_guild uuid:=gen_random_uuid();
  v_result jsonb;
  v_cursor uuid;
BEGIN
  SELECT p.account_id INTO v_account FROM public.player_profiles p
  WHERE p.profile_visibility='public'
    AND NOT EXISTS(SELECT 1 FROM public.guild_members gm WHERE gm.account_id=p.account_id)
  ORDER BY p.account_id LIMIT 1;
  IF v_account IS NULL THEN
    RAISE EXCEPTION 'GUILD_SNAPSHOT_NEEDS_GUILDLESS_STAGING_ACCOUNT';
  END IF;

  INSERT INTO public.guilds(id,name,owner_account_id,level,xp,member_cap)
  VALUES(v_guild,'Guild'||translate(substr(md5(v_guild::text),1,12),'0123456789abcdef','abcdefghijklmnop'),v_account,9,1234,12);
  INSERT INTO public.guild_members(guild_id,account_id,role)
  VALUES(v_guild,v_account,'leader');

  SELECT public.rankings_frozen_start_server_v1(v_account,'guild',3)
  INTO v_result;
  v_cursor:=(v_result->>'cursor')::uuid;
  IF (v_result->'self'->>'listed')::boolean IS NOT TRUE
    OR (v_result->'self'->>'rank')::bigint<>1
    OR (v_result->'self'->>'value')::bigint<>9
    OR jsonb_array_length(v_result->'entries')<>1
    OR (v_result->'entries'->0->>'isSelf')::boolean IS NOT TRUE
  THEN RAISE EXCEPTION 'GUILD_SNAPSHOT_OWN_STANDING_MISSING'; END IF;

  DELETE FROM public.guild_members
  WHERE guild_id=v_guild AND account_id=v_account;
  SELECT public.rankings_frozen_page_server_v1(v_account,v_cursor)
  INTO v_result;
  IF (v_result->'self'->>'listed')::boolean IS NOT FALSE
    OR (v_result->'entries'->0->>'isSelf')::boolean IS NOT FALSE
    OR (v_result->'entries'->0->>'rank')::integer<>1
  THEN RAISE EXCEPTION 'GUILD_SNAPSHOT_STALE_MEMBERSHIP'; END IF;

  INSERT INTO public.guild_members(guild_id,account_id,role)
  VALUES(v_guild,v_account,'member');
  SELECT public.rankings_frozen_page_server_v1(v_account,v_cursor)
  INTO v_result;
  IF (v_result->'self'->>'listed')::boolean IS NOT TRUE
    OR (v_result->'entries'->0->>'isSelf')::boolean IS NOT TRUE
  THEN RAISE EXCEPTION 'GUILD_SNAPSHOT_REJOIN_NOT_VISIBLE'; END IF;
  RAISE NOTICE 'Guild viewer self-rank and live membership transitions passed';
END $guild_frozen_self$;
