-- Hidden weekly Party Events v2, pass 2b: durable asynchronous party voting.
-- Choices are frozen for the six-hour window and cannot demand live attendance.
BEGIN;

ALTER TABLE private.party_weekly_event_votes_v2
  ADD COLUMN IF NOT EXISTS eligible_account_ids uuid[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION private.party_weekly_event_open_vote_v2(
  p_event_id uuid, p_stage smallint, p_options text[], p_default_choice text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $open$
DECLARE
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_vote private.party_weekly_event_votes_v2%ROWTYPE;
  v_eligible uuid[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled)
    THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  IF p_event_id IS NULL OR p_stage IS NULL OR p_stage NOT IN (2,3)
    OR p_options IS NULL OR cardinality(p_options) NOT BETWEEN 2 AND 4
    OR p_default_choice IS NULL OR NOT p_default_choice=ANY(p_options)
    OR EXISTS(SELECT 1 FROM unnest(p_options) x WHERE x IS NULL OR length(x) NOT BETWEEN 2 AND 64)
    OR (SELECT count(DISTINCT x) FROM unnest(p_options) x)<>cardinality(p_options)
  THEN RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_INVALID_OPTIONS'; END IF;
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=p_event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status<>'active' OR v_event.stage<>p_stage
    OR now()<v_event.starts_at OR now()>=v_event.ends_at THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_STAGE_CLOSED';
  END IF;
  SELECT * INTO v_vote FROM private.party_weekly_event_votes_v2
    WHERE event_id=p_event_id AND stage=p_stage;
  IF FOUND THEN
    IF v_vote.options IS DISTINCT FROM to_jsonb(p_options)
      OR v_vote.default_choice IS DISTINCT FROM p_default_choice THEN
      RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_CONFLICT';
    END IF;
    RETURN jsonb_build_object('voteId',v_vote.id,'stage',p_stage,
      'closesAt',v_vote.closes_at,'alreadyOpen',true);
  END IF;
  SELECT array_agg(m.account_id ORDER BY m.account_id) INTO v_eligible
  FROM private.party_weekly_event_members_v2 m
  WHERE m.event_id=p_event_id;
  IF coalesce(cardinality(v_eligible),0) NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_ROSTER_INCOMPLETE';
  END IF;
  INSERT INTO private.party_weekly_event_votes_v2
    (event_id,stage,options,default_choice,closes_at,eligible_account_ids)
  VALUES(p_event_id,p_stage,to_jsonb(p_options),p_default_choice,
    least(now()+interval '6 hours',v_event.ends_at),v_eligible)
  RETURNING * INTO v_vote;
  RETURN jsonb_build_object('voteId',v_vote.id,'stage',p_stage,
    'closesAt',v_vote.closes_at,'alreadyOpen',false);
END $open$;
REVOKE ALL ON FUNCTION private.party_weekly_event_open_vote_v2(uuid,smallint,text[],text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_open_vote_v2(uuid,smallint,text[],text)
  TO service_role;

CREATE OR REPLACE FUNCTION private.party_weekly_event_vote_maybe_resolve_v2(
  p_vote_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $resolve$
DECLARE
  v_vote private.party_weekly_event_votes_v2%ROWTYPE;
  v_majority text;
  v_threshold integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled)
    THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  SELECT * INTO v_vote FROM private.party_weekly_event_votes_v2
    WHERE id=p_vote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_NOT_FOUND'; END IF;
  IF v_vote.status='resolved' THEN
    RETURN jsonb_build_object('resolved',true,'choice',v_vote.resolved_choice,
      'alreadyProcessed',true);
  END IF;
  v_threshold:=cardinality(v_vote.eligible_account_ids)/2+1;
  SELECT b.choice INTO v_majority
  FROM private.party_weekly_event_ballots_v2 b
  WHERE b.vote_id=p_vote_id AND b.account_id=ANY(v_vote.eligible_account_ids)
  GROUP BY b.choice HAVING count(*)>=v_threshold
  ORDER BY count(*) DESC,b.choice LIMIT 1;

  IF v_majority IS NOT NULL THEN
    UPDATE private.party_weekly_event_votes_v2 SET status='resolved',
      resolved_choice=v_majority WHERE id=p_vote_id;
    RETURN jsonb_build_object('resolved',true,'choice',v_majority,'reason','majority');
  END IF;
  IF now()>=v_vote.closes_at THEN
    UPDATE private.party_weekly_event_votes_v2 SET status='resolved',
      resolved_choice=v_vote.default_choice WHERE id=p_vote_id;
    RETURN jsonb_build_object('resolved',true,'choice',v_vote.default_choice,'reason','timeout');
  END IF;
  RETURN jsonb_build_object('resolved',false,'votesRequired',v_threshold,
    'closesAt',v_vote.closes_at);
END $resolve$;
REVOKE ALL ON FUNCTION private.party_weekly_event_vote_maybe_resolve_v2(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_vote_maybe_resolve_v2(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION private.party_weekly_event_cast_vote_v2(
  p_vote_id uuid, p_account_id uuid, p_choice text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $cast$
DECLARE
  v_vote private.party_weekly_event_votes_v2%ROWTYPE;
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_previous text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled)
    THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  IF p_vote_id IS NULL OR p_account_id IS NULL OR p_choice IS NULL
    THEN RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_INVALID'; END IF;
  -- Consistent event -> vote locking order matches stage transitions.
  SELECT v.event_id INTO v_vote.event_id
    FROM private.party_weekly_event_votes_v2 v WHERE v.id=p_vote_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_NOT_FOUND'; END IF;
  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=v_vote.event_id FOR SHARE;
  SELECT * INTO v_vote FROM private.party_weekly_event_votes_v2
    WHERE id=p_vote_id FOR UPDATE;
  IF NOT p_account_id=ANY(v_vote.eligible_account_ids)
    OR NOT EXISTS (
      SELECT 1 FROM private.party_weekly_event_members_v2 m
      WHERE m.event_id=v_vote.event_id AND m.account_id=p_account_id
    ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_VOTER_INELIGIBLE'; END IF;
  IF NOT (v_vote.options ? p_choice) THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_INVALID_CHOICE';
  END IF;

  SELECT choice INTO v_previous FROM private.party_weekly_event_ballots_v2
    WHERE vote_id=p_vote_id AND account_id=p_account_id;
  IF FOUND THEN
    IF v_previous<>p_choice THEN RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_ALREADY_CAST'; END IF;
    RETURN private.party_weekly_event_vote_maybe_resolve_v2(p_vote_id);
  END IF;
  IF v_event.status<>'active' OR v_event.stage<>v_vote.stage
    OR now()<v_event.starts_at OR now()>=v_event.ends_at
    OR now()>=v_vote.closes_at OR v_vote.status<>'open' THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_VOTE_CLOSED';
  END IF;
  INSERT INTO private.party_weekly_event_ballots_v2(vote_id,account_id,choice)
  VALUES(p_vote_id,p_account_id,p_choice);
  RETURN private.party_weekly_event_vote_maybe_resolve_v2(p_vote_id);
END $cast$;
REVOKE ALL ON FUNCTION private.party_weekly_event_cast_vote_v2(uuid,uuid,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_cast_vote_v2(uuid,uuid,text)
  TO service_role;

COMMENT ON FUNCTION private.party_weekly_event_cast_vote_v2(uuid,uuid,text) IS
  'Private, disabled and service-only. Future authenticated Edge layer must derive account identity from JWT.';
COMMIT;
