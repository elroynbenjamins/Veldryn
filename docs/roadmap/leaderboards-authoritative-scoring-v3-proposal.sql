-- Veldryn Leaderboards v3: UNDEPLOYED scoring prototype.
-- This proposal is intentionally under docs/roadmap, NOT a numbered migration.
-- Create a real migration with the Supabase CLI only after staging integration,
-- migration provenance and end-to-end release gates are reconciled.
-- The client rankings release flag remains false, and the backend calls v2.
--
-- Scoring inputs: service-written online_game_states and settled co-op result
-- entitlements, never a client-supplied leaderboard value.
BEGIN;

CREATE OR REPLACE FUNCTION private.rankings_verified_metrics_v3(p_board text)
RETURNS TABLE(account_id uuid, value bigint, secondary_value numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $metrics$
BEGIN
  IF p_board IN ('profession_total','mining','woodcutting','fishing','smithing',
    'cooking','herbalism','alchemy','hunting','exploration','tailoring',
    'enchanting','faith') THEN
    RETURN QUERY
    WITH saved_characters AS (
      SELECT s.account_id,c.id AS character_id,s.state->'skills' AS skills
      FROM public.online_game_states s
      JOIN public.characters c ON c.id=s.character_id AND c.account_id=s.account_id
      UNION ALL
      SELECT s.account_id,c.id AS character_id,x.value->'skills' AS skills
      FROM public.online_game_states s
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(s.state->'otherCharacters')='array'
          THEN s.state->'otherCharacters' ELSE '[]'::jsonb END
      ) x
      JOIN public.characters c ON c.account_id=s.account_id
        AND c.id::text=x.value->'character'->>'id'
      WHERE c.id IS DISTINCT FROM s.character_id
    ), skill_rows AS (
      SELECT saved.account_id,saved.character_id,
        x.value->>'skillId' AS skill_id,
        (x.value->>'level')::integer AS skill_level,
        (x.value->>'xp')::numeric AS skill_xp
      FROM saved_characters saved
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(saved.skills)='array'
          THEN saved.skills ELSE '[]'::jsonb END
      ) x
      WHERE x.value->>'skillId' IN ('mining','woodcutting','fishing','smithing',
        'cooking','herbalism','alchemy','hunting','exploration','tailoring',
        'enchanting','faith')
        AND jsonb_typeof(x.value->'level')='number'
        AND x.value->>'level' ~ '^[0-9]{1,3}$'
        AND (x.value->>'level')::integer BETWEEN 1 AND 999
        AND jsonb_typeof(x.value->'xp')='number'
        AND x.value->>'xp' ~ '^[0-9]{1,16}(\\.[0-9]{1,3})?$'
    ), per_character AS (
      SELECT sr.account_id,sr.character_id,sr.skill_id,
        MAX(sr.skill_level)::bigint AS lvl,MAX(sr.skill_xp) AS xp
      FROM skill_rows sr
      WHERE p_board='profession_total' OR sr.skill_id=p_board
      GROUP BY sr.account_id,sr.character_id,sr.skill_id
    )
    SELECT pc.account_id,
      CASE WHEN p_board='profession_total' THEN SUM(pc.lvl)
        ELSE MAX(pc.lvl) END::bigint AS value,
      CASE WHEN p_board='profession_total' THEN SUM(pc.xp)
        ELSE MAX(pc.xp) END AS secondary_value
    FROM per_character pc GROUP BY pc.account_id;

  ELSIF p_board='achievement_score' THEN
    -- Journal V42 unlocks automatically: EARNED milestones, not reward claims.
    -- 10/25/50/100/200 tier weights are provisional; no economic effect.
    -- The saved Journal still requires server-write integrity review.
    RETURN QUERY
    WITH family(name) AS (
      VALUES ('combatant'),('well_rounded'),('artisan'),('mastery_hall'),
             ('pathfinder'),('delver'),('keeper'),('beast_scholar'),('orderbound')
    ), tier(name,points) AS (
      VALUES ('novice',10::bigint),('adventurer',25::bigint),
             ('veteran',50::bigint),('master',100::bigint),
             ('grandmaster',200::bigint)
    ), catalog AS (
      SELECT f.name||'_'||t.name AS achievement_id,t.points
      FROM family f CROSS JOIN tier t
    ), earned AS (
      SELECT s.account_id,k.points
      FROM public.online_game_states s
      CROSS JOIN LATERAL jsonb_each(
        CASE WHEN jsonb_typeof(s.state#>'{account,journalState,unlockedAchievements}')='object'
          THEN s.state#>'{account,journalState,unlockedAchievements}'
          ELSE '{}'::jsonb END
      ) x
      JOIN catalog k ON k.achievement_id=x.key
      WHERE s.state#>>'{account,journalState,accountId}'=s.account_id::text
        AND s.state#>>'{account,journalState,schemaVersion}'='42'
        AND jsonb_typeof(x.value)='number'
        AND x.value#>>'{}' ~ '^[0-9]{13}
    RETURN QUERY
    WITH per_tier AS (
      SELECT e.recipient_account_id AS account_id,
        (s.state_json->'run'->>'tier')::integer AS tier,
        COUNT(DISTINCT e.run_id)::bigint AS clear_count
      FROM public.coop_reward_entitlements e
      JOIN public.coop_run_private_state s ON s.run_id=e.run_id
      WHERE e.entitlement_kind='participant'
        AND e.reward_stage='final'
        AND s.state_json->'run'->>'phase'='completed'
        AND s.state_json->'run'->>'tier' ~ '^[1-9][0-9]?$'
        AND (s.state_json->'run'->>'tier')::integer BETWEEN 1 AND 9
      GROUP BY e.recipient_account_id,(s.state_json->'run'->>'tier')::integer
    ), summary AS (
      SELECT t.account_id,MAX(t.tier) AS max_tier,
        SUM(t.clear_count)::bigint AS total_clears
      FROM per_tier t GROUP BY t.account_id
    )
    SELECT a.account_id,
      CASE WHEN p_board='dungeon_tier' THEN a.max_tier::bigint
        ELSE a.total_clears END AS value,
      CASE WHEN p_board='dungeon_tier' THEN
        (SELECT t.clear_count::numeric FROM per_tier t
          WHERE t.account_id=a.account_id AND t.tier=a.max_tier)
        ELSE a.max_tier::numeric END AS secondary_value
    FROM summary a;
  ELSE
    RAISE EXCEPTION 'INVALID_RANKING_METRIC';
  END IF;
END $metrics$;
REVOKE ALL ON FUNCTION private.rankings_verified_metrics_v3(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.rankings_verified_metrics_v3(text) TO service_role;

CREATE OR REPLACE FUNCTION public.rankings_board_server_v3(
  p_requester uuid,p_board text,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $board$
DECLARE
  v_rows jsonb := '[]'::jsonb;
  v_self jsonb;
  v_title text;
  v_unit text;
  v_description text;
BEGIN
  IF p_requester IS NULL OR p_board IS NULL OR p_limit IS NULL
    OR p_offset IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR p_offset NOT BETWEEN 0 AND 10000
  THEN RAISE EXCEPTION 'INVALID_RANKING_REQUEST'; END IF;

  -- Existing arena/guild boards remain delegated to v2. Journal Score
  -- uses earned V42 unlocks, with provisional tier-weighted points.
  IF p_board NOT IN ('profession_total','mining','woodcutting','fishing',
    'smithing','cooking','herbalism','alchemy','hunting','exploration',
    'tailoring','enchanting','faith','dungeon_tier','dungeon_clears')
  THEN
    RETURN public.rankings_board_server_v2(
      p_requester,p_board,p_limit,p_offset);
  END IF;

  v_title := CASE WHEN p_board='profession_total' THEN 'Profession Total'
    WHEN p_board='achievement_score' THEN 'Achievement Score'
    WHEN p_board='dungeon_tier' THEN 'Dungeon Tier'
    WHEN p_board='dungeon_clears' THEN 'Dungeon Clears'
    ELSE initcap(replace(p_board,'_',' ')) END;
  v_unit := CASE WHEN p_board='profession_total' THEN 'levels'
    WHEN p_board='achievement_score' THEN 'points'
    WHEN p_board='dungeon_tier' THEN 'tier'
    WHEN p_board='dungeon_clears' THEN 'clears'
    ELSE 'level' END;
  v_description := CASE WHEN p_board='profession_total'
      THEN 'Combined levels of existing account characters, from trusted online saves.'
    WHEN p_board='achievement_score'
      THEN 'Prestige from earned Adventurer''s Journal achievements, weighted by tier.'
    WHEN p_board='dungeon_tier'
      THEN 'Highest verified co-op dungeon tier completed, then clears at that tier.'
    WHEN p_board='dungeon_clears'
      THEN 'Distinct successful co-op dungeon runs with participant entitlements.'
    ELSE 'Highest server-saved character profession level, then XP.' END;

  WITH scores AS (
    SELECT m.account_id,m.value,m.secondary_value
    FROM private.rankings_verified_metrics_v3(p_board) m
  ), eligible AS (
    SELECT m.*,coalesce(nullif(btrim(p.display_name),''),'Adventurer') AS display_name,
      g.tag AS guild_tag,g.tag_color_id AS guild_tag_color_id
    FROM scores m
    JOIN public.player_profiles p ON p.account_id=m.account_id
    LEFT JOIN public.guild_members gm ON gm.account_id=m.account_id
    LEFT JOIN public.guilds g ON g.id=gm.guild_id
    WHERE p.profile_visibility='public'
      AND NOT EXISTS(
        SELECT 1 FROM public.player_blocks b
        WHERE (b.blocker_id=p_requester AND b.blocked_id=m.account_id)
          OR (b.blocker_id=m.account_id AND b.blocked_id=p_requester)
      )
  ), ranked AS (
    SELECT e.*,rank() OVER (
      ORDER BY e.value DESC,e.secondary_value DESC
    ) AS rank_position
    FROM eligible e
  ), page AS (
    SELECT r.* FROM ranked r
    ORDER BY r.value DESC,r.secondary_value DESC,r.display_name,r.account_id
    LIMIT p_limit OFFSET p_offset
  )
  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'rank',pg.rank_position,
      'entityType','account','displayName',pg.display_name,
      'guildTag',pg.guild_tag,'guildTagColorId',pg.guild_tag_color_id,
      'value',pg.value,'secondaryValue',pg.secondary_value,
      'playerBadges',private.player_badges_v1(pg.account_id),
      'isSelf',pg.account_id=p_requester
    ) ORDER BY pg.value DESC,pg.secondary_value DESC,pg.display_name,pg.account_id)
    FROM page pg
  ),'[]'::jsonb),
  coalesce((
    SELECT jsonb_build_object('listed',r.rank_position IS NOT NULL,
      'rank',r.rank_position,'value',s.value,
      'secondaryValue',s.secondary_value,
      'reason',CASE WHEN r.rank_position IS NULL
        THEN 'This account is not visible on the public ranking.' END)
    FROM scores s LEFT JOIN ranked r ON r.account_id=s.account_id
    WHERE s.account_id=p_requester
    LIMIT 1
  ),jsonb_build_object('listed',false,'value',0))
  INTO v_rows,v_self;

  RETURN jsonb_build_object(
    'board',p_board,'title',v_title,'description',v_description,
    'unit',v_unit,'prestigeOnly',true,'generatedAtMs',
    floor(extract(epoch from clock_timestamp())*1000)::bigint,
    'entries',v_rows,'self',v_self
  );
END $board$;
REVOKE ALL ON FUNCTION public.rankings_board_server_v3(uuid,text,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_board_server_v3(uuid,text,integer,integer)
  TO service_role;
COMMIT;

        AND (x.value#>>'{}')::numeric BETWEEN 946684800000
          AND extract(epoch from now())*1000
    )
    SELECT v.account_id,SUM(v.points)::bigint AS value,
      COUNT(*)::numeric AS secondary_value
    FROM earned v GROUP BY v.account_id;
  ELSIF p_board IN ('dungeon_tier','dungeon_clears') THEN
    RETURN QUERY
    WITH per_tier AS (
      SELECT e.recipient_account_id AS account_id,
        (s.state_json->'run'->>'tier')::integer AS tier,
        COUNT(DISTINCT e.run_id)::bigint AS clear_count
      FROM public.coop_reward_entitlements e
      JOIN public.coop_run_private_state s ON s.run_id=e.run_id
      WHERE e.entitlement_kind='participant'
        AND e.reward_stage='final'
        AND s.state_json->'run'->>'phase'='completed'
        AND s.state_json->'run'->>'tier' ~ '^[1-9][0-9]?$'
        AND (s.state_json->'run'->>'tier')::integer BETWEEN 1 AND 9
      GROUP BY e.recipient_account_id,(s.state_json->'run'->>'tier')::integer
    ), summary AS (
      SELECT t.account_id,MAX(t.tier) AS max_tier,
        SUM(t.clear_count)::bigint AS total_clears
      FROM per_tier t GROUP BY t.account_id
    )
    SELECT a.account_id,
      CASE WHEN p_board='dungeon_tier' THEN a.max_tier::bigint
        ELSE a.total_clears END AS value,
      CASE WHEN p_board='dungeon_tier' THEN
        (SELECT t.clear_count::numeric FROM per_tier t
          WHERE t.account_id=a.account_id AND t.tier=a.max_tier)
        ELSE a.max_tier::numeric END AS secondary_value
    FROM summary a;
  ELSE
    RAISE EXCEPTION 'INVALID_RANKING_METRIC';
  END IF;
END $metrics$;
REVOKE ALL ON FUNCTION private.rankings_verified_metrics_v3(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.rankings_verified_metrics_v3(text) TO service_role;

CREATE OR REPLACE FUNCTION public.rankings_board_server_v3(
  p_requester uuid,p_board text,p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $board$
DECLARE
  v_rows jsonb := '[]'::jsonb;
  v_self jsonb;
  v_title text;
  v_unit text;
  v_description text;
BEGIN
  IF p_requester IS NULL OR p_board IS NULL OR p_limit IS NULL
    OR p_offset IS NULL OR p_limit NOT BETWEEN 1 AND 100
    OR p_offset NOT BETWEEN 0 AND 10000
  THEN RAISE EXCEPTION 'INVALID_RANKING_REQUEST'; END IF;

  -- Existing arena/guild boards remain delegated to v2. Achievement Score
  -- deliberately stays a placeholder until its claimed-score ledger exists.
  IF p_board NOT IN ('profession_total','mining','woodcutting','fishing',
    'smithing','cooking','herbalism','alchemy','hunting','exploration',
    'tailoring','enchanting','faith','dungeon_tier','dungeon_clears',
    'achievement_score')
  THEN
    RETURN public.rankings_board_server_v2(
      p_requester,p_board,p_limit,p_offset);
  END IF;

  v_title := CASE WHEN p_board='profession_total' THEN 'Profession Total'
    WHEN p_board='dungeon_tier' THEN 'Dungeon Tier'
    WHEN p_board='dungeon_clears' THEN 'Dungeon Clears'
    ELSE initcap(replace(p_board,'_',' ')) END;
  v_unit := CASE WHEN p_board='profession_total' THEN 'levels'
    WHEN p_board='dungeon_tier' THEN 'tier'
    WHEN p_board='dungeon_clears' THEN 'clears'
    ELSE 'level' END;
  v_description := CASE WHEN p_board='profession_total'
      THEN 'Combined levels of existing account characters, from trusted online saves.'
    WHEN p_board='dungeon_tier'
      THEN 'Highest verified co-op dungeon tier completed, then clears at that tier.'
    WHEN p_board='dungeon_clears'
      THEN 'Distinct successful co-op dungeon runs with participant entitlements.'
    ELSE 'Highest server-saved character profession level, then XP.' END;

  WITH scores AS (
    SELECT m.account_id,m.value,m.secondary_value
    FROM private.rankings_verified_metrics_v3(p_board) m
  ), eligible AS (
    SELECT m.*,coalesce(nullif(btrim(p.display_name),''),'Adventurer') AS display_name,
      g.tag AS guild_tag,g.tag_color_id AS guild_tag_color_id
    FROM scores m
    JOIN public.player_profiles p ON p.account_id=m.account_id
    LEFT JOIN public.guild_members gm ON gm.account_id=m.account_id
    LEFT JOIN public.guilds g ON g.id=gm.guild_id
    WHERE p.profile_visibility='public'
      AND NOT EXISTS(
        SELECT 1 FROM public.player_blocks b
        WHERE (b.blocker_id=p_requester AND b.blocked_id=m.account_id)
          OR (b.blocker_id=m.account_id AND b.blocked_id=p_requester)
      )
  ), ranked AS (
    SELECT e.*,rank() OVER (
      ORDER BY e.value DESC,e.secondary_value DESC
    ) AS rank_position
    FROM eligible e
  ), page AS (
    SELECT r.* FROM ranked r
    ORDER BY r.value DESC,r.secondary_value DESC,r.display_name,r.account_id
    LIMIT p_limit OFFSET p_offset
  )
  SELECT coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'rank',pg.rank_position,
      'entityType','account','displayName',pg.display_name,
      'guildTag',pg.guild_tag,'guildTagColorId',pg.guild_tag_color_id,
      'value',pg.value,'secondaryValue',pg.secondary_value,
      'playerBadges',private.player_badges_v1(pg.account_id),
      'isSelf',pg.account_id=p_requester
    ) ORDER BY pg.value DESC,pg.secondary_value DESC,pg.display_name,pg.account_id)
    FROM page pg
  ),'[]'::jsonb),
  coalesce((
    SELECT jsonb_build_object('listed',r.rank_position IS NOT NULL,
      'rank',r.rank_position,'value',s.value,
      'secondaryValue',s.secondary_value,
      'reason',CASE WHEN r.rank_position IS NULL
        THEN 'This account is not visible on the public ranking.' END)
    FROM scores s LEFT JOIN ranked r ON r.account_id=s.account_id
    WHERE s.account_id=p_requester
    LIMIT 1
  ),jsonb_build_object('listed',false,'value',0))
  INTO v_rows,v_self;

  RETURN jsonb_build_object(
    'board',p_board,'title',v_title,'description',v_description,
    'unit',v_unit,'prestigeOnly',true,'generatedAtMs',
    floor(extract(epoch from clock_timestamp())*1000)::bigint,
    'entries',v_rows,'self',v_self
  );
END $board$;
REVOKE ALL ON FUNCTION public.rankings_board_server_v3(uuid,text,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_board_server_v3(uuid,text,integer,integer)
  TO service_role;
COMMIT;
