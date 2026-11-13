-- WORLD BOSS V18 — REVIEW-ONLY, PRIVATE POSTGRES TRANSACTION FUNCTIONS.
-- NOT A MIGRATION. DO NOT APPLY TO ANY SUPABASE PROJECT.
-- Depends on V17 disposable schema; no endpoint imports or calls this file.
--
-- IMPORTANT AUTHORITY BOUNDARY: These SECURITY INVOKER routines trust their
-- arguments and DO NOT authenticate account, validate the 14-round battle,
-- verify a cryptographic roster digest or constrain which service may resolve
-- source GameStates. They are safe ONLY behind an audited private server
-- service resolving the principal, owner-bound roster, combat result and seed
-- before invoking SQL, with the private schema excluded from PostgREST.
-- No event is created or activated, and no World Sigils are granted.
BEGIN;

-- Event-row-first lock ordering serializes reservation ordinals, lifecycle,
-- and settlement across distinct Postgres sessions / application processes.
-- A duplicate request returns its original result BEFORE the event-close
-- guard and ignores a newly supplied nonce (read-before-prepare in V16).
CREATE FUNCTION private.world_boss_v18_reserve(
 p_event uuid,p_account uuid,p_character uuid,p_request text,
 p_order text,p_seed text,p_digest text,p_squad jsonb,
 p_engine text,p_worker text,p_camp_digest text DEFAULT NULL,
 p_profile_digest text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $reserve$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 a private.world_boss_attempts_v17%ROWTYPE;
 ordinal_slot integer;
 phase_at_start text;
 selected_profile_digest text;
 now_at timestamptz := clock_timestamp();
 hard_until timestamptz;
BEGIN
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB18_EVENT_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.world_boss_attempts_v17
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
  FOR UPDATE;
 IF FOUND THEN
  IF a.character_id IS DISTINCT FROM p_character OR
     a.war_order IS DISTINCT FROM p_order
  THEN RAISE EXCEPTION 'WB18_REQUEST_ID_REUSED'; END IF;
  RETURN jsonb_build_object('status',a.status,'ordinal',a.ordinal,
   'phase',a.phase,'generation',a.lease_generation,'repeated',true);
 END IF;
 IF e.status<>'active' OR now_at<e.starts_at OR now_at>=e.ends_at
 THEN RAISE EXCEPTION 'WB18_EVENT_CLOSED'; END IF;
 IF p_account IS NULL OR p_character IS NULL OR p_request IS NULL OR
    p_request !~ '^[A-Za-z0-9_-]{8,128}$' OR
    p_order NOT IN ('hold_line','steady_assault','break_armor') OR
    p_seed IS NULL OR length(p_seed) NOT BETWEEN 24 AND 512 OR
    p_seed !~ '^[A-Za-z0-9:_-]+$' OR
    p_digest !~ '^[0-9a-f]{64}$' OR
    p_engine IS NULL OR length(p_engine) NOT BETWEEN 3 AND 80 OR
    p_worker !~ '^[A-Za-z0-9:_-]{8,160}$' OR
    p_squad IS NULL OR jsonb_typeof(p_squad)<>'object' OR
    octet_length(p_squad::text) NOT BETWEEN 128 AND 262144 OR
    (p_camp_digest IS NOT NULL AND p_camp_digest !~ '^[0-9a-f]{64}$') OR
    (p_profile_digest IS NOT NULL AND p_profile_digest !~ '^[0-9a-f]{64}$')
 THEN RAISE EXCEPTION 'WB18_INVALID_SERVER_RESERVATION'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.characters
  WHERE id=p_character AND account_id=p_account)
 THEN RAISE EXCEPTION 'WB18_CHARACTER_NOT_OWNED'; END IF;

 -- Voiding an expired active attempt permits a different request ID to
 -- reuse its slot; the old unique request key is permanently retained.
 UPDATE private.world_boss_attempts_v17
 SET status='voided',voided_at=now_at
 WHERE event_id=p_event AND account_id=p_account
  AND status='reserved' AND hard_expires_at < now_at;

 SELECT s INTO ordinal_slot FROM generate_series(1,3) AS s
 WHERE NOT EXISTS (
  SELECT 1 FROM private.world_boss_attempts_v17 t
  WHERE t.event_id=p_event AND t.account_id=p_account
   AND t.ordinal=s AND t.status IN ('reserved','committed')
 ) ORDER BY s LIMIT 1;
 IF ordinal_slot IS NULL THEN RAISE EXCEPTION 'WB18_ACCOUNT_ATTEMPT_LIMIT'; END IF;
 phase_at_start:=CASE
  WHEN e.remaining_hp::numeric/e.max_hp<=0.3 THEN 'enraged'
  WHEN e.remaining_hp::numeric/e.max_hp<=0.7 THEN 'exposed'
  ELSE 'armored' END;
 -- V20 chooses the locked event phase after other settlements, then
 -- binds the matching server-frozen profile digest to this reservation.
 IF p_squad->>'schema'='world-boss-v20-serialized-v9' THEN
  IF p_camp_digest IS NULL OR
     p_camp_digest IS DISTINCT FROM p_squad->'warCamp'->>'digest' OR
     jsonb_typeof(p_squad->'encounterProfiles')<>'object'
  THEN RAISE EXCEPTION 'WB20_MISSING_FROZEN_MODIFIERS'; END IF;
  selected_profile_digest:=p_squad->'encounterProfiles'->phase_at_start->>'digest';
  IF selected_profile_digest IS NULL OR
     selected_profile_digest !~ '^[a-f0-9]{64}$' OR
     (p_profile_digest IS NOT NULL AND
      p_profile_digest IS DISTINCT FROM selected_profile_digest)
  THEN RAISE EXCEPTION 'WB20_FROZEN_PHASE_PROFILE_MISMATCH'; END IF;
 ELSE
  selected_profile_digest:=p_profile_digest;
 END IF;
 hard_until:=LEAST(now_at+interval '15 minutes',e.ends_at+interval '15 minutes');
 INSERT INTO private.world_boss_attempts_v17(
  event_id,account_id,request_id,ordinal,character_id,war_order,phase,
  rules_version,engine_version,server_seed,squad_digest,frozen_squad,
  war_camp_digest,encounter_profile_digest,
  reserved_at,lease_owner,lease_expires_at,hard_expires_at
 ) VALUES (
  p_event,p_account,p_request,ordinal_slot,p_character,p_order,phase_at_start,
  e.rules_version,p_engine,p_seed,p_digest,p_squad,
  p_camp_digest,selected_profile_digest,
  now_at,p_worker,LEAST(now_at+interval '2 minutes',hard_until),hard_until
 );
 RETURN jsonb_build_object('status','reserved','ordinal',ordinal_slot,
  'phase',phase_at_start,'generation',1,'repeated',false);
END
$reserve$;

-- Return the original frozen job ONLY to a trusted backend worker. A
-- DIFFERENT worker cannot take over before the 2-min lease expires.
-- Lease recovery increments generation; stale generations cannot settle.
CREATE FUNCTION private.world_boss_v18_checkout(
 p_event uuid,p_account uuid,p_request text,p_worker text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $checkout$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 a private.world_boss_attempts_v17%ROWTYPE;
 now_at timestamptz:=clock_timestamp();
BEGIN
 IF p_worker IS NULL OR p_worker !~ '^[A-Za-z0-9:_-]{8,160}$'
 THEN RAISE EXCEPTION 'WB18_INVALID_WORKER'; END IF;
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB18_EVENT_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.world_boss_attempts_v17
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB18_REQUEST_NOT_FOUND'; END IF;
 IF a.status IN ('committed','voided') THEN
  RETURN jsonb_build_object('status',a.status,'ordinal',a.ordinal,
   'generation',a.lease_generation,'repeated',true);
 END IF;
 IF now_at>=a.hard_expires_at THEN
  UPDATE private.world_boss_attempts_v17
   SET status='voided',voided_at=now_at
   WHERE event_id=p_event AND account_id=p_account AND request_id=p_request;
  RETURN jsonb_build_object('status','voided','ordinal',a.ordinal,
   'generation',a.lease_generation,'repeated',false);
 END IF;
 IF now_at<=a.lease_expires_at AND p_worker<>a.lease_owner
 THEN RAISE EXCEPTION 'WB18_LEASE_HELD'; END IF;
 IF now_at>a.lease_expires_at THEN
  UPDATE private.world_boss_attempts_v17 SET
   lease_generation=lease_generation+1,lease_owner=p_worker,
   lease_expires_at=LEAST(now_at+interval '2 minutes',hard_expires_at)
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
  RETURNING * INTO a;
 END IF;
 -- Internal trusted job only: never expose seed/squad in an app response.
 RETURN jsonb_build_object('status',a.status,'ordinal',a.ordinal,
  'generation',a.lease_generation,'repeated',false,
  'seed',a.server_seed,'squad',a.frozen_squad,'digest',a.squad_digest,
  'order',a.war_order,'phase',a.phase,'engine',a.engine_version,
  'warCampDigest',a.war_camp_digest,'encounterDigest',a.encounter_profile_digest);
END
$checkout$;

CREATE FUNCTION private.world_boss_v18_heartbeat(
 p_event uuid,p_account uuid,p_request text,p_worker text,p_generation bigint
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $heartbeat$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 a private.world_boss_attempts_v17%ROWTYPE;
 now_at timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB18_EVENT_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.world_boss_attempts_v17
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB18_REQUEST_NOT_FOUND'; END IF;
 IF a.status<>'reserved' OR a.lease_owner IS DISTINCT FROM p_worker OR
    a.lease_generation IS DISTINCT FROM p_generation OR
    now_at>a.lease_expires_at OR now_at>=a.hard_expires_at
 THEN RAISE EXCEPTION 'WB18_STALE_WORKER'; END IF;
 UPDATE private.world_boss_attempts_v17
  SET lease_expires_at=LEAST(now_at+interval '2 minutes',hard_expires_at)
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request;
 RETURN jsonb_build_object('generation',a.lease_generation,'renewed',true);
END
$heartbeat$;

-- The app MUST NOT supply p_raw_damage or p_replay. Only the trusted
-- simulation service can call this private function after replay verification.
-- Lock event first; settle global HP and attempt in ONE DB transaction.
CREATE FUNCTION private.world_boss_v18_settle(
 p_event uuid,p_account uuid,p_request text,p_worker text,p_generation bigint,
 p_squad_digest text,p_engine text,p_replay_digest text,p_replay_key text,
 p_raw_damage numeric,p_guard_damage numeric
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $settle$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 a private.world_boss_attempts_v17%ROWTYPE;
 now_at timestamptz:=clock_timestamp();
 credited bigint;
 after_hp bigint;
BEGIN
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB18_EVENT_NOT_FOUND'; END IF;
 SELECT * INTO a FROM private.world_boss_attempts_v17
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB18_REQUEST_NOT_FOUND'; END IF;
 IF a.status='committed' THEN
  IF a.lease_owner IS DISTINCT FROM p_worker OR
     a.lease_generation IS DISTINCT FROM p_generation OR
     a.squad_digest IS DISTINCT FROM p_squad_digest OR
     a.engine_version IS DISTINCT FROM p_engine OR
     a.replay_digest IS DISTINCT FROM p_replay_digest OR
     a.replay_object_key IS DISTINCT FROM p_replay_key OR
     a.raw_boss_damage IS DISTINCT FROM p_raw_damage OR
     a.local_guard_damage IS DISTINCT FROM p_guard_damage
  THEN RAISE EXCEPTION 'WB18_SETTLEMENT_CONFLICT'; END IF;
  RETURN jsonb_build_object('status','committed','repeated',true,
   'ordinal',a.ordinal,'creditedHp',a.credited_hp,'hpAfter',a.hp_after,
   'residualEcho',a.residual_echo);
 END IF;
 IF a.status<>'reserved' OR e.status NOT IN ('active','closed') OR
    a.lease_owner IS DISTINCT FROM p_worker OR
    a.lease_generation IS DISTINCT FROM p_generation OR
    now_at>a.lease_expires_at OR now_at>=a.hard_expires_at
 THEN RAISE EXCEPTION 'WB18_STALE_WORKER'; END IF;
 IF a.squad_digest IS DISTINCT FROM p_squad_digest OR
    a.engine_version IS DISTINCT FROM p_engine OR
    p_replay_digest !~ '^[a-f0-9]{64}$' OR
    p_replay_key IS NULL OR length(p_replay_key) NOT BETWEEN 8 AND 256 OR
    p_raw_damage IS NULL OR p_guard_damage IS NULL OR
    p_raw_damage::text IN ('NaN','Infinity','-Infinity') OR
    p_guard_damage::text IN ('NaN','Infinity','-Infinity') OR
    p_raw_damage<0 OR p_raw_damage>1000000000000 OR
    p_guard_damage<0 OR p_guard_damage>1000000000000
 THEN RAISE EXCEPTION 'WB18_INVALID_SERVER_RESULT'; END IF;
 credited:=LEAST(e.remaining_hp,FLOOR(p_raw_damage)::bigint);
 after_hp:=e.remaining_hp-credited;
 UPDATE private.world_boss_events_v17 SET
  remaining_hp=after_hp,revision=revision+1 WHERE id=p_event;
 UPDATE private.world_boss_attempts_v17 SET
  status='committed',committed_at=now_at,
  replay_digest=p_replay_digest,replay_object_key=p_replay_key,
  raw_boss_damage=p_raw_damage,local_guard_damage=p_guard_damage,
  hp_before=e.remaining_hp,hp_after=after_hp,
  credited_hp=credited,residual_echo=(e.remaining_hp=0)
 WHERE event_id=p_event AND account_id=p_account AND request_id=p_request;
 INSERT INTO private.world_boss_milestones_v17(
  event_id,threshold,crossed_by_account,crossed_by_request)
 SELECT p_event,threshold,p_account,p_request
 FROM (VALUES(70),(30),(0)) AS milestones(threshold)
 WHERE e.remaining_hp::numeric/e.max_hp>threshold/100.0
  AND after_hp::numeric/e.max_hp<=threshold/100.0
 ON CONFLICT(event_id,threshold) DO NOTHING;
 RETURN jsonb_build_object('status','committed','repeated',false,
  'ordinal',a.ordinal,'creditedHp',credited,'hpAfter',after_hp,
  'residualEcho',(e.remaining_hp=0));
END
$settle$;

-- No generic public RPC, no default PUBLIC EXECUTE. Functions are not
-- reachable through PostgREST if private remains unexposed; service-only.
REVOKE ALL ON FUNCTION private.world_boss_v18_reserve(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v18_checkout(uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v18_heartbeat(uuid,uuid,text,text,bigint)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v18_settle(
 uuid,uuid,text,text,bigint,text,text,text,text,numeric,numeric)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v18_reserve(
 uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v18_checkout(uuid,uuid,text,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v18_heartbeat(uuid,uuid,text,text,bigint)
 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v18_settle(
 uuid,uuid,text,text,bigint,text,text,text,text,numeric,numeric)
 TO service_role;
COMMIT;
