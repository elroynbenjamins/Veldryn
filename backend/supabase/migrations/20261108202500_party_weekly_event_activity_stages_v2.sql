-- Hidden Party Events v2, pass 2: server-only enrollment, verified settlement,
-- stage transitions. No client grants, scheduled events or rewards.
BEGIN;

-- Track the true finale state independently from reaching the EP target.
ALTER TABLE private.party_weekly_event_instances_v2
  ADD COLUMN IF NOT EXISTS finale_cleared_at timestamptz;

-- All mutations below are private, service-role-only, release-gated and
-- transactionally serialized. No client can supply trusted activity seconds.
CREATE OR REPLACE FUNCTION private.party_weekly_event_enroll_v2(
  p_event_id uuid, p_account_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $enroll$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_count integer;
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_gate_v2
    WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  IF p_event_id IS NULL OR p_account_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_PARTY_WEEKLY_ENROLLMENT';
  END IF;
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status<>'active'
    OR now()<v_event.starts_at OR now()>=v_event.ends_at THEN
    RAISE EXCEPTION 'PARTY_EVENT_ENROLLMENT_CLOSED';
  END IF;
  -- A party event is only valid for an eligible real persistent party.
  IF NOT EXISTS (
    SELECT 1 FROM public.party_members
    WHERE party_id=v_event.party_id AND account_id=p_account_id AND left_at IS NULL
  ) THEN RAISE EXCEPTION 'PARTY_EVENT_MEMBER_NOT_IN_PARTY'; END IF;
  SELECT COUNT(*) INTO v_count FROM private.party_weekly_event_members_v2
    WHERE event_id=p_event_id;
  IF v_count>=v_event.member_count AND NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_members_v2
    WHERE event_id=p_event_id AND account_id=p_account_id
  ) THEN RAISE EXCEPTION 'PARTY_EVENT_ROSTER_FULL'; END IF;

  INSERT INTO private.party_weekly_event_members_v2(event_id,account_id,week_start)
  VALUES(p_event_id,p_account_id,v_event.starts_at)
  ON CONFLICT (event_id,account_id) DO NOTHING;
  RETURN jsonb_build_object('eventId',p_event_id,'accountId',p_account_id,
    'weekStart',v_event.starts_at);
END $enroll$;
REVOKE ALL ON FUNCTION private.party_weekly_event_enroll_v2(uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_enroll_v2(uuid,uuid)
  TO service_role;

-- Deliberately refuses to complete stage III. A finale must first be
-- simulated and verified by a separate trusted event-specific pathway.
CREATE OR REPLACE FUNCTION private.party_weekly_event_maybe_advance_v2(
  p_event_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $advance$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_goal integer;
  v_pending integer;
  v_vote_status text;
  v_updated boolean:=false;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status<>'active' THEN
    RAISE EXCEPTION 'PARTY_EVENT_NOT_ACTIVE';
  END IF;
  IF now()<v_event.starts_at OR now()>=v_event.ends_at+interval '1 hour' THEN
    RAISE EXCEPTION 'PARTY_EVENT_OUTSIDE_SETTLEMENT_WINDOW';
  END IF;

  LOOP
    EXIT WHEN v_event.stage>=3;
    v_goal:=round(v_event.target_points*0.25)::integer
      + CASE WHEN v_event.stage=2
        THEN round(v_event.target_points*0.50)::integer ELSE 0 END;
    EXIT WHEN v_event.event_points<v_goal;

    SELECT count(*) INTO v_pending
    FROM private.party_weekly_event_supply_orders_v2 o
    WHERE o.event_id=p_event_id AND o.stage=v_event.stage
      AND o.kind='required' AND o.donated_quantity<o.target_quantity;
    -- Empty orders must never allow free progress: a prepared party event
    -- needs a genuine supply sink in every stage.
    IF NOT EXISTS (
      SELECT 1 FROM private.party_weekly_event_supply_orders_v2 o
      WHERE o.event_id=p_event_id AND o.stage=v_event.stage AND o.kind='required'
    ) THEN EXIT; END IF;
    EXIT WHEN v_pending>0;

    IF v_event.stage=2 THEN
      SELECT v.status INTO v_vote_status
      FROM private.party_weekly_event_votes_v2 v
      WHERE v.event_id=p_event_id AND v.stage=2;
      EXIT WHEN v_vote_status IS DISTINCT FROM 'resolved';
    END IF;
    UPDATE private.party_weekly_event_instances_v2
      SET stage=stage+1 WHERE id=p_event_id
      RETURNING * INTO v_event;
    v_updated:=true;
  END LOOP;
  RETURN jsonb_build_object('eventId',p_event_id,'stage',v_event.stage,
    'progress',v_event.event_points,'target',v_event.target_points,
    'advanced',v_updated,'completed',false);
END $advance$;
REVOKE ALL ON FUNCTION private.party_weekly_event_maybe_advance_v2(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_maybe_advance_v2(uuid)
  TO service_role;

-- The source record must already exist in the authoritative settlement
-- outbox. The activity values, account, party and timestamps are never passed
-- by clients or reconstructed from an unverified notification.
CREATE OR REPLACE FUNCTION private.party_weekly_event_record_activity_v2(
  p_event_id uuid, p_source_event_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $record$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_member private.party_weekly_event_members_v2%ROWTYPE;
  v_source public.social_contribution_outbox%ROWTYPE;
  v_seconds numeric;
  v_elapsed numeric;
  v_occurred_at timestamptz;
  v_credit integer;
  v_max_credit integer;
  v_remaining numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  IF p_event_id IS NULL OR p_source_event_id IS NULL
    OR length(p_source_event_id)<8 OR length(p_source_event_id)>160 THEN
    RAISE EXCEPTION 'INVALID_PARTY_EVENT_SOURCE';
  END IF;
  SELECT * INTO v_source FROM public.social_contribution_outbox
    WHERE source_event_id=p_source_event_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_EVENT_UNVERIFIED_SOURCE'; END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('weekly-party-activity:'||v_source.account_id::text,0)
  );
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status<>'active' THEN
    RAISE EXCEPTION 'PARTY_EVENT_NOT_ACTIVE';
  END IF;
  IF now()<v_event.starts_at OR now()>=v_event.ends_at+interval '1 hour' THEN
    RAISE EXCEPTION 'PARTY_EVENT_OUTSIDE_SETTLEMENT_WINDOW';
  END IF;
  IF v_source.party_id_at_settlement IS DISTINCT FROM v_event.party_id THEN
    RAISE EXCEPTION 'PARTY_EVENT_SOURCE_PARTY_MISMATCH';
  END IF;
  SELECT * INTO v_member FROM private.party_weekly_event_members_v2
    WHERE event_id=p_event_id AND account_id=v_source.account_id FOR UPDATE;
  IF NOT FOUND OR v_member.week_start IS DISTINCT FROM v_event.starts_at THEN
    RAISE EXCEPTION 'PARTY_EVENT_ACCOUNT_NOT_ENROLLED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM private.party_weekly_event_activity_receipts_v2
    WHERE event_id=p_event_id AND account_id=v_source.account_id
      AND source_event_id=p_source_event_id
  ) THEN
    RETURN jsonb_build_object('alreadyProcessed',true,'creditedPoints',0,
      'memberWeeklyPoints',v_member.activity_points,'partyPoints',v_event.event_points);
  END IF;

  -- All data below originates in the immutable server transaction outbox.
  IF coalesce(v_source.event_json->>'accountId','')<>v_source.account_id::text
    OR coalesce(v_source.event_json->>'sourceEventId','')<>p_source_event_id
    OR coalesce(v_source.event_json->>'partyIdAtSettlement','')<>v_event.party_id::text
    OR coalesce(v_source.event_json#>>'{profile,category}','') NOT IN ('combat','skilling')
    OR jsonb_typeof(v_source.event_json->'units')<>'number'
    OR jsonb_typeof(v_source.event_json#>'{profile,expectedSecondsPerUnit}')<>'number'
    OR jsonb_typeof(v_source.event_json->'occurredAtMs')<>'number' THEN
    RAISE EXCEPTION 'PARTY_EVENT_INVALID_SETTLEMENT_PAYLOAD';
  END IF;

  v_seconds:=(v_source.event_json#>>'{profile,expectedSecondsPerUnit}')::numeric;
  v_elapsed:=(v_source.event_json->>'units')::numeric;
  IF v_seconds<=0 OR v_seconds>3600
    OR v_elapsed<1 OR v_elapsed>100000 OR v_elapsed<>trunc(v_elapsed)
    OR v_seconds*v_elapsed>108000 THEN
    RAISE EXCEPTION 'PARTY_EVENT_INVALID_ACTIVITY_DURATION';
  END IF;
  v_occurred_at:=to_timestamp(
    (v_source.event_json->>'occurredAtMs')::numeric / 1000
  );
  IF v_occurred_at<v_event.starts_at OR v_occurred_at>=v_event.ends_at
    OR v_source.created_at<v_event.starts_at
    OR v_source.created_at>=v_event.ends_at
    OR v_source.created_at<v_member.joined_at
    OR v_occurred_at<v_member.joined_at THEN
    RAISE EXCEPTION 'PARTY_EVENT_SOURCE_OUTSIDE_MEMBERSHIP_WINDOW';
  END IF;

  v_max_credit:=greatest(0,40-v_member.activity_points);
  v_elapsed:=v_elapsed*v_seconds + v_member.verified_seconds_remainder;
  v_credit:=least(v_max_credit,floor(v_elapsed/900)::integer);
  v_remaining:=CASE WHEN v_credit>=v_max_credit THEN 0
    ELSE v_elapsed-900*v_credit END;

  INSERT INTO private.party_weekly_event_activity_receipts_v2(
    event_id,account_id,source_event_id,credited_points
  ) VALUES (p_event_id,v_source.account_id,p_source_event_id,v_credit);
  UPDATE private.party_weekly_event_members_v2 SET
    activity_points=activity_points+v_credit,
    verified_seconds_remainder=v_remaining
    WHERE event_id=p_event_id AND account_id=v_source.account_id;
  UPDATE private.party_weekly_event_instances_v2 SET
    event_points=least(target_points,event_points+v_credit)
    WHERE id=p_event_id RETURNING * INTO v_event;

  RETURN jsonb_build_object(
    'alreadyProcessed',false,'creditedPoints',v_credit,
    'memberWeeklyPoints',v_member.activity_points+v_credit,
    'partyPoints',v_event.event_points,'weekStart',v_event.starts_at
  );
END $record$;
REVOKE ALL ON FUNCTION private.party_weekly_event_record_activity_v2(uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_record_activity_v2(uuid,text)
  TO service_role;

COMMENT ON FUNCTION private.party_weekly_event_record_activity_v2(uuid,text) IS
 'Disabled until release. Reads verified settlement outbox only. No daily cap; 40 EP/week/account.';
COMMIT;
