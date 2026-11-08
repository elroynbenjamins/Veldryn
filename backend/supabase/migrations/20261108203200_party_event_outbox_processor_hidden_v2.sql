-- Hidden Party Events v2: service-only verified outbox processor.
-- No cron/job scheduled. All changes remain disabled behind the private gate.
BEGIN;
CREATE TABLE IF NOT EXISTS private.party_event_outbox_rejections_v2(
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id)
    ON DELETE CASCADE,
  source_event_id text NOT NULL,
  failure_reason text NOT NULL,
  attempts integer NOT NULL DEFAULT 1 CHECK(attempts BETWEEN 1 AND 10000),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id,source_event_id)
);
ALTER TABLE private.party_event_outbox_rejections_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.party_event_outbox_rejections_v2
  FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.party_event_outbox_rejections_v2 TO service_role;

-- The existing social contribution outbox is already transactionally tied
-- to verified gameplay settlement. Read it here; do NOT rewrite its routing
-- targets or interfere with v17 LiveOps/Party Contract processing.
CREATE INDEX IF NOT EXISTS social_contribution_outbox_party_week_lookup_v2
  ON public.social_contribution_outbox(party_id_at_settlement,created_at DESC)
  WHERE party_id_at_settlement IS NOT NULL;

CREATE OR REPLACE FUNCTION private.party_event_process_verified_outbox_v2(
  p_limit integer DEFAULT 100
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $process$
DECLARE
  v_source record;
  v_response jsonb;
  v_processed integer:=0;
  v_duplicates integer:=0;
  v_rejected integer:=0;
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500
  THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_BATCH_LIMIT'; END IF;
  FOR v_source IN
    SELECT o.source_event_id,e.id AS event_id
    FROM public.social_contribution_outbox o
    JOIN private.party_weekly_event_instances_v2 e
      ON e.party_id=o.party_id_at_settlement
      AND o.created_at>=e.starts_at AND o.created_at<e.ends_at
    JOIN private.party_weekly_event_members_v2 m
      ON m.event_id=e.id AND m.account_id=o.account_id
      AND o.created_at>=m.joined_at
    WHERE e.status='active'
      AND o.created_at>=now()-interval '8 days'
      AND o.status IN ('processed','processing','pending')
      AND NOT EXISTS(
        SELECT 1 FROM private.party_weekly_event_activity_receipts_v2 r
        WHERE r.event_id=e.id AND r.account_id=o.account_id
          AND r.source_event_id=o.source_event_id
      )
      AND NOT EXISTS(
        SELECT 1 FROM private.party_event_outbox_rejections_v2 bad
        WHERE bad.event_id=e.id AND bad.source_event_id=o.source_event_id
          AND bad.attempts>=3
      )
    ORDER BY o.created_at,o.source_event_id
    LIMIT p_limit
  LOOP
    BEGIN
      v_response:=private.party_weekly_event_record_activity_v2(
        v_source.event_id,v_source.source_event_id
      );
      IF coalesce((v_response->>'alreadyProcessed')::boolean,false) THEN
        v_duplicates:=v_duplicates+1;
      ELSE
        v_processed:=v_processed+1;
      END IF;
      PERFORM private.party_weekly_event_maybe_advance_v2(v_source.event_id);
    EXCEPTION WHEN OTHERS THEN
      -- Preserve the failed source for ops review without blocking legitimate
      -- contributions from other players. Never include event payloads/PII.
      INSERT INTO private.party_event_outbox_rejections_v2(
        event_id,source_event_id,failure_reason
      ) VALUES(
        v_source.event_id,v_source.source_event_id,left(SQLERRM,200)
      ) ON CONFLICT(event_id,source_event_id) DO UPDATE SET
        attempts=least(10000,private.party_event_outbox_rejections_v2.attempts+1),
        failure_reason=excluded.failure_reason,last_attempt_at=now();
      v_rejected:=v_rejected+1;
    END;
  END LOOP;
  RETURN jsonb_build_object('processed',v_processed,
    'duplicates',v_duplicates,'rejected',v_rejected);
END $process$;
REVOKE ALL ON FUNCTION private.party_event_process_verified_outbox_v2(integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_process_verified_outbox_v2(integer)
  TO service_role;

COMMENT ON FUNCTION private.party_event_process_verified_outbox_v2(integer) IS
  'Server-only disabled worker; no cron created. Converts existing verified outbox sources into Party Event EP.';
COMMIT;
