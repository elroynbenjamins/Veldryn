-- UNDEPLOYED party/guild competitive archive contract.
-- Store ONLY from verified Day-8 Party Event or six-week Guild PvE settlement,
-- NEVER from client submissions, provisional live scores or payout requests.
-- Storage and reads are service-role-only, feature gated independently.
-- This design must NOT be migrated until mode-specific server finalizers are wired.
BEGIN;
-- Trusted mode-specific finalizers will register exactly one verified
-- settlement receipt per metric/bracket, with a digest of FINAL score rows.
-- This table intentionally has no public write RPC or generic registration
-- endpoint. Nothing in this proposal can finalize live event progress.
CREATE TABLE IF NOT EXISTS private.rankings_final_mode_settlement_receipts_v1 (
  id uuid PRIMARY KEY,
  mode text NOT NULL CHECK(mode IN ('party_event','guild_pve')),
  event_key text NOT NULL CHECK(length(event_key) BETWEEN 1 AND 120),
  metric text NOT NULL,
  bracket text NOT NULL,
  event_ends_at timestamptz NOT NULL,
  finalized_at timestamptz NOT NULL,
  source_version integer NOT NULL CHECK(source_version>=1),
  entries_digest text NOT NULL CHECK(entries_digest ~ '^[0-9a-f]{32}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(mode,event_key,metric,bracket),
  CHECK(event_ends_at<=finalized_at)
);
ALTER TABLE private.rankings_final_mode_settlement_receipts_v1
  ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rankings_final_mode_settlement_receipts_v1
  FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS private.rankings_final_mode_archives_v1 (
  mode text NOT NULL CHECK(mode IN ('party_event','guild_pve')),
  event_key text NOT NULL,
  metric text NOT NULL,
  bracket text NOT NULL,
  source_receipt_id uuid NOT NULL REFERENCES private.rankings_final_mode_settlement_receipts_v1(id),
  event_ends_at timestamptz NOT NULL,
  finalized_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  rows jsonb NOT NULL,
  PRIMARY KEY(mode,event_key,metric,bracket)
);
ALTER TABLE private.rankings_final_mode_archives_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rankings_final_mode_archives_v1
  FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS private.rankings_final_mode_gates_v1 (
  mode text PRIMARY KEY CHECK(mode IN ('party_event','guild_pve')),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO private.rankings_final_mode_gates_v1(mode,enabled)
VALUES('party_event',false),('guild_pve',false)
ON CONFLICT(mode) DO NOTHING;
ALTER TABLE private.rankings_final_mode_gates_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.rankings_final_mode_gates_v1
  FROM PUBLIC,anon,authenticated;

-- Preserve finality even if a future privileged path accidentally tries to
-- update an archived scoreboard or its certified receipt. New settlement
-- versions must receive distinct event keys, not modify published results.
CREATE OR REPLACE FUNCTION private.rankings_reject_final_record_mutation_v1()
RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $immutable$
BEGIN
  RAISE EXCEPTION 'FINAL_RANKING_RECORD_IMMUTABLE';
END $immutable$;
REVOKE ALL ON FUNCTION private.rankings_reject_final_record_mutation_v1()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS rankings_archive_immutable_v1
  ON private.rankings_final_mode_archives_v1;
CREATE TRIGGER rankings_archive_immutable_v1
  BEFORE UPDATE OR DELETE ON private.rankings_final_mode_archives_v1
  FOR EACH ROW EXECUTE FUNCTION private.rankings_reject_final_record_mutation_v1();
DROP TRIGGER IF EXISTS rankings_receipt_immutable_v1
  ON private.rankings_final_mode_settlement_receipts_v1;
CREATE TRIGGER rankings_receipt_immutable_v1
  BEFORE UPDATE OR DELETE ON private.rankings_final_mode_settlement_receipts_v1
  FOR EACH ROW EXECUTE FUNCTION private.rankings_reject_final_record_mutation_v1();

-- No grant to client roles; the caller must be an authenticated backend mode
-- finalizer holding a service key and verifying settlement receipts first.
-- Server RPC computes ranks: client-supplied rank is ignored.
CREATE OR REPLACE FUNCTION public.rankings_final_mode_seal_server_v1(
  p_mode text,p_event_key text,p_metric text,p_bracket text,
  p_receipt_id uuid,p_ends_at timestamptz,p_finalized_at timestamptz,
  p_entries jsonb
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $seal$
DECLARE
  v_expected text;
  v_count integer;
  v_distinct integer;
  v_rows jsonb;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('party_event','guild_pve') OR p_event_key IS NULL
    OR length(p_event_key) NOT BETWEEN 1 AND 120
    OR p_bracket IS NULL OR length(p_bracket) NOT BETWEEN 1 AND 48
    OR p_bracket !~ '^[a-z0-9_:-]+$'
    OR p_receipt_id IS NULL OR p_ends_at IS NULL OR p_finalized_at IS NULL
    OR p_ends_at>p_finalized_at OR p_finalized_at>clock_timestamp()
    OR p_finalized_at<'2020-01-01'::timestamptz
    OR p_entries IS NULL OR jsonb_typeof(p_entries)<>'array'
  THEN RAISE EXCEPTION 'INVALID_COMPETITIVE_FINAL_RECEIPT'; END IF;
  IF (p_mode='party_event' AND p_metric NOT IN
       ('damage','depth','support','shielding','mechanics'))
    OR (p_mode='guild_pve' AND p_metric NOT IN
       ('campaign_score','campaign_progress','contribution'))
    OR p_metric IS NULL
  THEN RAISE EXCEPTION 'INVALID_COMPETITIVE_FINAL_METRIC'; END IF;
  v_expected:=CASE WHEN p_mode='party_event' THEN 'party' ELSE 'guild' END;
  v_count:=jsonb_array_length(p_entries);
  IF v_count<1 OR v_count>5000 THEN
    RAISE EXCEPTION 'INVALID_COMPETITIVE_FINAL_ENTRY_COUNT'; END IF;
  SELECT COUNT(DISTINCT x.item->>'entityId') INTO v_distinct
  FROM jsonb_array_elements(p_entries) x(item);
  IF v_distinct<>v_count OR EXISTS(
    SELECT 1 FROM jsonb_array_elements(p_entries) x(item)
    WHERE jsonb_typeof(x.item)<>'object'
      OR x.item->>'entityType'<>v_expected
      OR (x.item->>'entityId') IS NULL
      OR x.item->>'entityId' !~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
      OR jsonb_typeof(x.item->'displayName')<>'string'
      OR length(btrim(x.item->>'displayName')) NOT BETWEEN 1 AND 64
      OR x.item->>'value' !~ '^[0-9]{1,15}$'
      OR coalesce(x.item->>'secondaryValue','0') !~ '^[0-9]{1,15}$'
  )
  THEN RAISE EXCEPTION 'INVALID_COMPETITIVE_FINAL_ENTRIES'; END IF;

  -- A random UUID is not evidence of a settled event. Require a private
  -- authoritative receipt registered by a mode-specific server finalizer.
  -- Match the exact metric, bracket, event timestamps and frozen score rows;
  -- mismatched or provisional submissions fail closed, including retries.
  IF NOT EXISTS(
    SELECT 1 FROM private.rankings_final_mode_settlement_receipts_v1 receipt
    WHERE receipt.id=p_receipt_id
      AND receipt.mode=p_mode
      AND receipt.event_key=p_event_key
      AND receipt.metric=p_metric
      AND receipt.bracket=p_bracket
      AND receipt.event_ends_at=p_ends_at
      AND receipt.finalized_at=p_finalized_at
      AND receipt.source_version>=1
      AND receipt.entries_digest=pg_catalog.md5(p_entries::text)
  )
  THEN RAISE EXCEPTION 'COMPETITIVE_FINAL_RECEIPT_NOT_REGISTERED'; END IF;

  WITH parsed AS (
    SELECT x.item->>'entityId' AS entity_id,
      btrim(x.item->>'displayName') AS name_snapshot,
      (x.item->>'value')::bigint AS value,
      coalesce((x.item->>'secondaryValue')::numeric,0) AS secondary_value
    FROM jsonb_array_elements(p_entries) x(item)
  ), ranked AS (
    SELECT p.*,rank() OVER (
      ORDER BY p.value DESC,p.secondary_value DESC
    ) AS final_rank FROM parsed p
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'entityId',r.entity_id,'entityType',v_expected,
    'nameSnapshot',r.name_snapshot,
    'rank',r.final_rank,'value',r.value,
    'secondaryValue',r.secondary_value
  ) ORDER BY r.value DESC,r.secondary_value DESC,r.entity_id),'[]'::jsonb)
  INTO v_rows FROM ranked r;

  INSERT INTO private.rankings_final_mode_archives_v1(
    mode,event_key,metric,bracket,source_receipt_id,event_ends_at,
    finalized_at,rows
  ) VALUES(
    p_mode,p_event_key,p_metric,p_bracket,p_receipt_id,p_ends_at,
    p_finalized_at,v_rows
  ) ON CONFLICT(mode,event_key,metric,bracket) DO NOTHING;
  -- The first successful settlement wins; retries never change final ranks.
  RETURN true;
END $seal$;
REVOKE ALL ON FUNCTION public.rankings_final_mode_seal_server_v1(
  text,text,text,text,uuid,timestamptz,timestamptz,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_final_mode_seal_server_v1(
  text,text,text,text,uuid,timestamptz,timestamptz,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.rankings_final_mode_history_server_v1(
  p_mode text,p_event_key text,p_metric text,p_bracket text,
  p_limit integer DEFAULT 50,p_offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $read$
DECLARE
  v_final private.rankings_final_mode_archives_v1%ROWTYPE;
  v_entries jsonb;
BEGIN
  IF p_mode NOT IN ('party_event','guild_pve') OR p_event_key IS NULL
    OR p_metric IS NULL OR p_bracket IS NULL
    OR p_limit IS NULL OR p_offset IS NULL
    OR p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 10000
  THEN RAISE EXCEPTION 'INVALID_FINAL_MODE_RANKING_REQUEST'; END IF;
  IF NOT EXISTS(SELECT 1 FROM private.rankings_final_mode_gates_v1
    WHERE mode=p_mode AND enabled)
  THEN RAISE EXCEPTION 'FINAL_MODE_RANKINGS_DISABLED'; END IF;
  SELECT * INTO v_final FROM private.rankings_final_mode_archives_v1
  WHERE mode=p_mode AND event_key=p_event_key
    AND metric=p_metric AND bracket=p_bracket;
  IF NOT FOUND THEN RAISE EXCEPTION 'FINAL_MODE_EVENT_NOT_SETTLED'; END IF;

  WITH visible AS (
    SELECT r.item,r.ordinality,g.id AS current_guild,
      coalesce(g.name,'Former Guild') AS current_guild_name
    FROM jsonb_array_elements(v_final.rows) WITH ORDINALITY AS r(item,ordinality)
    LEFT JOIN public.guilds g
      ON p_mode='guild_pve' AND g.id=(r.item->>'entityId')::uuid
    -- A disbanded guild's old tag/name is not exposed; party names are
    -- server-finalized group labels, not individual player identities.
    WHERE p_mode='party_event' OR g.id IS NOT NULL
  ), page AS (
    SELECT * FROM visible ORDER BY ordinality LIMIT p_limit OFFSET p_offset
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'rank',(p.item->>'rank')::integer,
    'entityType',p.item->>'entityType',
    'displayName',CASE WHEN p_mode='guild_pve' THEN p.current_guild_name
      ELSE p.item->>'nameSnapshot' END,
    'value',(p.item->>'value')::bigint,
    'secondaryValue',(p.item->>'secondaryValue')::numeric,
    'isSelf',false
  ) ORDER BY p.ordinality),'[]'::jsonb)
  INTO v_entries FROM page p;
  RETURN jsonb_build_object(
    'mode',p_mode,'eventKey',p_event_key,'metric',p_metric,
    'bracket',p_bracket,'prestigeOnly',true,
    'finalizedAtMs',floor(extract(epoch from v_final.finalized_at)*1000)::bigint,
    'generatedAtMs',floor(extract(epoch from clock_timestamp())*1000)::bigint,
    'entries',v_entries
  );
END $read$;
REVOKE ALL ON FUNCTION public.rankings_final_mode_history_server_v1(
  text,text,text,text,integer,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rankings_final_mode_history_server_v1(
  text,text,text,text,integer,integer) TO service_role;
COMMIT;
