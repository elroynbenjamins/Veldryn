-- Veldryn Rankings v4: UNDEPLOYED, service-role-only frozen pagination.
-- Depends on v3 verified metrics. NEVER run as a migration without review.
-- Staging QA must wrap this entire proposal and fixtures in BEGIN/ROLLBACK.
-- Keeps all public Rankings/event-history gates off; zero client writes.
BEGIN;

CREATE TABLE IF NOT EXISTS private.rankings_frozen_snapshots_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  board text NOT NULL,
  page_size integer NOT NULL CHECK(page_size BETWEEN 1 AND 50),
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  metadata jsonb NOT NULL,
  own_standing jsonb NOT NULL,
  ordered_rows jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS rankings_frozen_expiry_v1
  ON private.rankings_frozen_snapshots_v1(expires_at);
CREATE TABLE IF NOT EXISTS private.rankings_frozen_cursors_v1 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES private.rankings_frozen_snapshots_v1(id) ON DELETE CASCADE,
  raw_after integer NOT NULL CHECK(raw_after BETWEEN 0 AND 10051),
  UNIQUE(snapshot_id,raw_after)
);
CREATE INDEX IF NOT EXISTS rankings_frozen_cursors_snapshot_v1
  ON private.rankings_frozen_cursors_v1(snapshot_id);
ALTER TABLE private.rankings_frozen_snapshots_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.rankings_frozen_cursors_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rankings_frozen_snapshots_v1,private.rankings_frozen_cursors_v1
  FROM PUBLIC,anon,authenticated;

-- All 19 scores: the v3 verified global scorers, current official Arena
-- season counters, and the current official guild level/XP counters.
CREATE OR REPLACE FUNCTION private.rankings_frozen_metrics_v1(p_board text)
RETURNS TABLE(entity_id uuid,entity_type text,value bigint,secondary_value numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $metrics$
DECLARE v_season text;
BEGIN
  IF p_board IN ('profession_total','mining','woodcutting','fishing','smithing',
    'cooking','herbalism','alchemy','hunting','exploration','tailoring',
    'enchanting','faith','achievement_score','dungeon_tier','dungeon_clears')
  THEN
    RETURN QUERY SELECT m.account_id,'account'::text,m.value,m.secondary_value
      FROM private.rankings_verified_metrics_v3(p_board) m;
  ELSIF p_board IN ('arena_rating','arena_wins') THEN
    SELECT s.id INTO v_season FROM public.squad_arena_seasons s
    WHERE s.starts_at<=clock_timestamp() AND s.ends_at>clock_timestamp()
    ORDER BY s.starts_at DESC LIMIT 1;
    RETURN QUERY SELECT a.account_id,'account'::text,
      CASE WHEN p_board='arena_wins' THEN a.wins ELSE a.rating END::bigint,
      CASE WHEN p_board='arena_wins' THEN a.rating ELSE a.wins END::numeric
    FROM public.squad_arena_season_accounts a
    WHERE a.season_id=v_season;
  ELSIF p_board='guild' THEN
    RETURN QUERY SELECT g.id,'guild'::text,g.level::bigint,g.xp::numeric
      FROM public.guilds g;
  ELSE
    RAISE EXCEPTION 'INVALID_RANKING_BOARD';
  END IF;
END $metrics$;
REVOKE ALL ON FUNCTION private.rankings_frozen_metrics_v1(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.rankings_frozen_metrics_v1(text) TO service_role;

-- The cursor is a random, unguessable UUID referencing private server storage,
-- bound to a requester. No score, sort key, account id or private data in token.
-- A page always rechecks *current* visibility and reciprocal blocks. If a row
-- becomes private, it disappears without changing anyone else's frozen rank.
CREATE OR REPLACE FUNCTION public.rankings_frozen_page_server_v1(
  p_requester uuid,p_cursor uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $page$
DECLARE
  v_snapshot private.rankings_frozen_snapshots_v1%ROWTYPE;
  v_after integer;
  v_hits jsonb:='[]'::jsonb;
  v_entries jsonb:='[]'::jsonb;
  v_last integer;
  v_next uuid;
  v_has_next boolean;
BEGIN
  IF p_requester IS NULL OR p_cursor IS NULL
  THEN RAISE EXCEPTION 'INVALID_RANKING_CURSOR'; END IF;
  SELECT s INTO v_snapshot
  FROM private.rankings_frozen_cursors_v1 c
  JOIN private.rankings_frozen_snapshots_v1 s ON s.id=c.snapshot_id
  WHERE c.id=p_cursor AND s.requester_id=p_requester
    AND s.expires_at>clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'RANKING_SNAPSHOT_EXPIRED_OR_FORBIDDEN'; END IF;
  SELECT c.raw_after INTO v_after FROM private.rankings_frozen_cursors_v1 c
  WHERE c.id=p_cursor AND c.snapshot_id=v_snapshot.id;

  WITH visible AS (
    SELECT r.ordinality::integer AS raw_ordinal,r.entry,
      coalesce(nullif(btrim(p.display_name),''),'Adventurer') AS account_name,
      g.name AS guild_name,g.tag AS guild_tag,g.tag_color_id,
      m.tag AS account_guild_tag,m.tag_color_id AS account_guild_color
    FROM jsonb_array_elements(v_snapshot.ordered_rows)
      WITH ORDINALITY AS r(entry,ordinality)
    LEFT JOIN public.player_profiles p
      ON p.account_id=(CASE WHEN r.entry->>'entityType'='account'
        THEN (r.entry->>'entityId')::uuid END)
    LEFT JOIN public.guilds g
      ON g.id=(CASE WHEN r.entry->>'entityType'='guild'
        THEN (r.entry->>'entityId')::uuid END)
    LEFT JOIN LATERAL (
      SELECT gg.tag,gg.tag_color_id FROM public.guild_members gm
      JOIN public.guilds gg ON gg.id=gm.guild_id
      WHERE gm.account_id=p.account_id ORDER BY gm.guild_id LIMIT 1
    ) m ON true
    WHERE r.ordinality>v_after
      AND ((r.entry->>'entityType'='guild' AND g.id IS NOT NULL)
       OR (r.entry->>'entityType'='account'
        AND p.profile_visibility='public'
        AND NOT EXISTS (
          SELECT 1 FROM public.player_blocks b
          WHERE (b.blocker_id=p_requester AND b.blocked_id=p.account_id)
             OR (b.blocked_id=p_requester AND b.blocker_id=p.account_id)
        )))
    ORDER BY r.ordinality
    LIMIT v_snapshot.page_size+1
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    '_rawOrdinal',v.raw_ordinal,
    'rank',(v.entry->>'rank')::bigint,
    'entityType',v.entry->>'entityType',
    'displayName',CASE WHEN v.entry->>'entityType'='guild'
      THEN v.guild_name ELSE v.account_name END,
    'guildTag',CASE WHEN v.entry->>'entityType'='guild'
      THEN v.guild_tag ELSE v.account_guild_tag END,
    'guildTagColorId',CASE WHEN v.entry->>'entityType'='guild'
      THEN v.tag_color_id ELSE v.account_guild_color END,
    'value',(v.entry->>'value')::bigint,
    'secondaryValue',(v.entry->>'secondaryValue')::numeric,
    'isSelf',v.entry->>'entityType'='account'
      AND v.entry->>'entityId'=p_requester::text
  ) ORDER BY v.raw_ordinal),'[]'::jsonb)
  INTO v_hits FROM visible v;
  v_has_next:=jsonb_array_length(v_hits)>v_snapshot.page_size;

  SELECT coalesce(jsonb_agg(v.item - '_rawOrdinal' ORDER BY v.item_index),'[]'::jsonb),
    max((v.item->>'_rawOrdinal')::integer)
  INTO v_entries,v_last
  FROM jsonb_array_elements(v_hits) WITH ORDINALITY AS v(item,item_index)
  WHERE v.item_index<=v_snapshot.page_size;

  IF v_has_next AND v_last IS NOT NULL THEN
    INSERT INTO private.rankings_frozen_cursors_v1(snapshot_id,raw_after)
    VALUES(v_snapshot.id,v_last)
    ON CONFLICT(snapshot_id,raw_after) DO UPDATE
      SET raw_after=excluded.raw_after
    RETURNING id INTO v_next;
  END IF;

  RETURN v_snapshot.metadata || jsonb_build_object(
    'entries',v_entries,'self',v_snapshot.own_standing,
    'cursor',p_cursor::text,'nextCursor',v_next::text,
    'hasNext',v_has_next,'frozen',true,'pageSize',v_snapshot.page_size,
    'expiresAtMs',floor(extract(epoch from v_snapshot.expires_at)*1000)::bigint
  );
END $page$;
REVOKE ALL ON FUNCTION public.rankings_frozen_page_server_v1(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_frozen_page_server_v1(uuid,uuid)
  TO service_role;

-- At most 10,051 frozen rows; page 201 is the last supported offset window.
-- Score ranking precedes viewer-specific blocks, so official shared tie ranks
-- never change with a viewer. No public materialized score table.
CREATE OR REPLACE FUNCTION public.rankings_frozen_start_server_v1(
  p_requester uuid,p_board text,p_page_size integer DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $start$
DECLARE
  v_rows jsonb:='[]'::jsonb;
  v_self jsonb;
  v_meta jsonb;
  v_id uuid;
  v_cursor uuid;
  v_now timestamptz:=clock_timestamp();
  v_season text;
BEGIN
  IF p_requester IS NULL OR p_board IS NULL
    OR p_page_size IS NULL OR p_page_size NOT BETWEEN 1 AND 50
  THEN RAISE EXCEPTION 'INVALID_RANKING_SNAPSHOT_REQUEST'; END IF;
  IF p_board IN ('arena_rating','arena_wins') THEN
    SELECT s.id INTO v_season FROM public.squad_arena_seasons s
    WHERE s.starts_at<=v_now AND s.ends_at>v_now
    ORDER BY s.starts_at DESC LIMIT 1;
  END IF;
  WITH source AS (
    SELECT r.* FROM private.rankings_frozen_metrics_v1(p_board) r
    WHERE r.entity_type='guild'
      OR EXISTS(SELECT 1 FROM public.player_profiles p
        WHERE p.account_id=r.entity_id AND p.profile_visibility='public')
  ), ranked AS (
    SELECT s.*, rank() OVER(
      ORDER BY s.value DESC,s.secondary_value DESC) AS official_rank
    FROM source s
  ), bounded AS (
    SELECT * FROM ranked
    ORDER BY value DESC,secondary_value DESC,entity_id LIMIT 10051
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'entityId',b.entity_id,'entityType',b.entity_type,
    'rank',b.official_rank,'value',b.value,
    'secondaryValue',b.secondary_value
  ) ORDER BY b.value DESC,b.secondary_value DESC,b.entity_id),'[]'::jsonb)
  INTO v_rows FROM bounded b;

  SELECT jsonb_build_object('listed',true,
    'rank',(e.item->>'rank')::bigint,
    'value',(e.item->>'value')::bigint,
    'secondaryValue',(e.item->>'secondaryValue')::numeric)
  INTO v_self
  FROM jsonb_array_elements(v_rows) e(item)
  WHERE e.item->>'entityType'='account'
    AND e.item->>'entityId'=p_requester::text LIMIT 1;
  v_self:=coalesce(v_self,jsonb_build_object(
    'listed',false,'value',0,'reason',
    'This account is not visible on the public ranking.'));

  v_meta:=jsonb_build_object(
    'board',p_board,
    'title',CASE WHEN p_board='profession_total' THEN 'Profession Total'
      WHEN p_board='achievement_score' THEN 'Achievement Score'
      WHEN p_board='arena_rating' THEN 'Arena Rating'
      WHEN p_board='arena_wins' THEN 'Arena Wins'
      WHEN p_board='guild' THEN 'Guild Prestige'
      ELSE initcap(replace(p_board,'_',' ')) END,
    'description','Server-calculated prestige. Snapshot freezes ranking order.',
    'unit',CASE WHEN p_board='profession_total' THEN 'levels'
      WHEN p_board='achievement_score' THEN 'points'
      WHEN p_board='arena_rating' THEN 'rating'
      WHEN p_board='arena_wins' THEN 'wins'
      WHEN p_board='dungeon_tier' THEN 'tier'
      WHEN p_board='dungeon_clears' THEN 'clears'
      WHEN p_board='guild' THEN 'level' ELSE 'level' END,
    'prestigeOnly',true,'seasonId',v_season,
    'generatedAtMs',floor(extract(epoch from v_now)*1000)::bigint);

  INSERT INTO private.rankings_frozen_snapshots_v1(
    requester_id,board,page_size,captured_at,expires_at,
    metadata,own_standing,ordered_rows
  ) VALUES(
    p_requester,p_board,p_page_size,v_now,v_now+interval '10 minutes',
    v_meta,v_self,v_rows
  ) RETURNING id INTO v_id;

  INSERT INTO private.rankings_frozen_cursors_v1(snapshot_id,raw_after)
  VALUES(v_id,0) RETURNING id INTO v_cursor;

  RETURN public.rankings_frozen_page_server_v1(p_requester,v_cursor);
END $start$;
REVOKE ALL ON FUNCTION public.rankings_frozen_start_server_v1(uuid,text,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_frozen_start_server_v1(uuid,text,integer)
  TO service_role;

-- Expired snapshots can be pruned by a scheduled service-role maintenance job.
-- No automatic server cron, public grants, migrations or release flags here.
COMMIT;
