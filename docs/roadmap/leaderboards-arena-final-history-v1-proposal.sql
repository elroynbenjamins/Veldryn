-- UNDEPLOYED immutable Arena season history. Service-role ONLY.
-- Settlement happens only after status='closed' and official season end.
-- No historical rankings release gate is enabled by this proposal.
BEGIN;
CREATE TABLE IF NOT EXISTS private.rankings_arena_final_history_v1 (
  season_id text NOT NULL,
  metric text NOT NULL CHECK(metric IN ('arena_rating','arena_wins')),
  finalized_at timestamptz NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  results jsonb NOT NULL,
  PRIMARY KEY (season_id,metric)
);
ALTER TABLE private.rankings_arena_final_history_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rankings_arena_final_history_v1
  FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS private.rankings_arena_history_gate_v1 (
  id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO private.rankings_arena_history_gate_v1(id,enabled) VALUES(1,false)
  ON CONFLICT(id) DO NOTHING;
ALTER TABLE private.rankings_arena_history_gate_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rankings_arena_history_gate_v1
  FROM PUBLIC,anon,authenticated;

-- The official Arena season, never client-submitted standings, is the source.
-- Existing closed-season results are snapshotted once. A repeated settlement
-- cannot change historical rankings or distribute rewards.
CREATE OR REPLACE FUNCTION public.rankings_finalize_arena_season_server_v1(
  p_season_id text
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $finalize$
DECLARE v_end timestamptz; v_metric text;
BEGIN
  IF p_season_id IS NULL OR length(p_season_id)>120 OR btrim(p_season_id)=''
  THEN RAISE EXCEPTION 'INVALID_ARENA_SEASON'; END IF;
  SELECT ends_at INTO v_end FROM public.squad_arena_seasons
  WHERE id=p_season_id AND status='closed' AND ends_at<=clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'ARENA_SEASON_NOT_CLOSED'; END IF;
  FOREACH v_metric IN ARRAY ARRAY['arena_rating','arena_wins'] LOOP
    INSERT INTO private.rankings_arena_final_history_v1(
      season_id,metric,finalized_at,results
    )
    WITH scores AS (
      SELECT a.account_id,a.rating,a.wins
      FROM public.squad_arena_season_accounts a
      JOIN public.player_profiles p ON p.account_id=a.account_id
      WHERE a.season_id=p_season_id AND p.profile_visibility='public'
    ), ranked AS (
      SELECT s.account_id,
        CASE WHEN v_metric='arena_wins' THEN s.wins ELSE s.rating END::bigint AS value,
        CASE WHEN v_metric='arena_wins' THEN s.rating ELSE s.wins END::numeric AS secondary_value
      FROM scores s
    ), ordered AS (
      SELECT r.*,rank() OVER(ORDER BY r.value DESC,r.secondary_value DESC) AS final_rank
      FROM ranked r
    )
    SELECT p_season_id,v_metric,v_end,coalesce(jsonb_agg(jsonb_build_object(
      'accountId',o.account_id,'rank',o.final_rank,
      'value',o.value,'secondaryValue',o.secondary_value
    ) ORDER BY o.value DESC,o.secondary_value DESC,o.account_id),'[]'::jsonb)
    FROM ordered o
    ON CONFLICT(season_id,metric) DO NOTHING;
  END LOOP;
END $finalize$;
REVOKE ALL ON FUNCTION public.rankings_finalize_arena_season_server_v1(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_finalize_arena_season_server_v1(text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.rankings_arena_final_history_server_v1(
  p_requester uuid,p_season_id text,p_metric text,
  p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $read$
DECLARE
  v_archive private.rankings_arena_final_history_v1%ROWTYPE;
  v_entries jsonb:='[]'::jsonb;
  v_self jsonb;
BEGIN
  IF p_requester IS NULL OR p_season_id IS NULL
    OR p_metric NOT IN ('arena_rating','arena_wins')
    OR p_limit IS NULL OR p_offset IS NULL
    OR p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 10000
  THEN RAISE EXCEPTION 'INVALID_ARENA_HISTORY_REQUEST'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.rankings_arena_history_gate_v1
    WHERE id=1 AND enabled)
  THEN RAISE EXCEPTION 'ARENA_HISTORY_DISABLED'; END IF;
  SELECT * INTO v_archive FROM private.rankings_arena_final_history_v1
  WHERE season_id=p_season_id AND metric=p_metric;
  IF NOT FOUND THEN RAISE EXCEPTION 'ARENA_HISTORY_NOT_FINALIZED'; END IF;
  WITH visible AS (
    SELECT r.item,p.display_name,r.ordinality,
      (r.item->>'accountId')::uuid AS account_id
    FROM jsonb_array_elements(v_archive.results) WITH ORDINALITY AS r(item,ordinality)
    JOIN public.player_profiles p
      ON p.account_id=(r.item->>'accountId')::uuid
    WHERE p.profile_visibility='public'
      AND NOT EXISTS (SELECT 1 FROM public.player_blocks b
        WHERE (b.blocker_id=p_requester AND b.blocked_id=p.account_id)
           OR (b.blocked_id=p_requester AND b.blocker_id=p.account_id))
  ), page AS (
    SELECT * FROM visible ORDER BY ordinality LIMIT p_limit OFFSET p_offset
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'rank',(pg.item->>'rank')::integer,
    'entityType','account',
    'displayName',coalesce(nullif(btrim(pg.display_name),''),'Adventurer'),
    'value',(pg.item->>'value')::bigint,
    'secondaryValue',(pg.item->>'secondaryValue')::numeric,
    'isSelf',pg.account_id=p_requester
  ) ORDER BY pg.ordinality),'[]'::jsonb)
  INTO v_entries FROM page pg;
  SELECT jsonb_build_object(
      'listed',true,'rank',(r.item->>'rank')::integer,
      'value',(r.item->>'value')::bigint,
      'secondaryValue',(r.item->>'secondaryValue')::numeric)
  INTO v_self FROM jsonb_array_elements(v_archive.results) r(item)
  JOIN public.player_profiles p ON p.account_id=p_requester
  WHERE r.item->>'accountId'=p_requester::text
    AND p.profile_visibility='public'
  LIMIT 1;
  RETURN jsonb_build_object(
    'board',p_metric,'seasonId',p_season_id,
    'title',CASE WHEN p_metric='arena_rating' THEN 'Arena Rating' ELSE 'Arena Wins' END,
    'description','Finalized Arena season, original official ranking.',
    'unit',CASE WHEN p_metric='arena_rating' THEN 'rating' ELSE 'wins' END,
    'prestigeOnly',true,
    'finalizedAtMs',floor(extract(epoch from v_archive.finalized_at)*1000)::bigint,
    'generatedAtMs',floor(extract(epoch from clock_timestamp())*1000)::bigint,
    'entries',v_entries,
    'self',coalesce(v_self,jsonb_build_object('listed',false,'value',0))
  );
END $read$;
REVOKE ALL ON FUNCTION public.rankings_arena_final_history_server_v1(uuid,text,text,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_arena_final_history_server_v1(uuid,text,text,integer,integer)
  TO service_role;
COMMIT;
