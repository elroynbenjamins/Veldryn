-- VELDRYN WORLD BOSSES V9 — REVIEW-ONLY SQL PROPOSAL.
-- NOT A MIGRATION. DO NOT EXECUTE/DEPLOY UNTIL NEW SCHEMA IS REVIEWED,
-- GAMEPLAY GATES ARE APPROVED, STAGING TESTS PASS, AND A SUPABASE CLI
-- MIGRATION IS GENERATED THROUGH THE NORMAL RELEASE PROCESS.
--
-- Assumes existing private schema, auth.users and public.characters
-- (character.account_id UUID) consistent with hidden Party Events.
--
-- NO events are inserted or activated. NO job/scheduler, client grants,
-- earned currency, rewards, or public API/RPC appears here.
BEGIN;

CREATE TABLE IF NOT EXISTS private.world_boss_event_instances_v1(
 id uuid PRIMARY KEY,
 boss_id text NOT NULL CHECK(boss_id IN ('hollowroot','sunscar','frostmarch')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 rules_version text NOT NULL CHECK(length(rules_version) BETWEEN 3 AND 80),
 max_hp bigint NOT NULL CHECK(max_hp>0),
 remaining_hp bigint NOT NULL CHECK(remaining_hp>=0 AND remaining_hp<=max_hp),
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at),
 CHECK(ends_at-starts_at<=interval '7 days')
);
CREATE INDEX IF NOT EXISTS world_boss_event_by_status_v1
 ON private.world_boss_event_instances_v1(status,starts_at,ends_at);

CREATE TABLE IF NOT EXISTS private.world_boss_attempt_receipts_v1(
 event_id uuid NOT NULL REFERENCES private.world_boss_event_instances_v1(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id text NOT NULL CHECK(length(request_id) BETWEEN 8 AND 128),
 ordinal smallint NOT NULL CHECK(ordinal BETWEEN 1 AND 3),
 character_id uuid NOT NULL REFERENCES public.characters(id),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','committed')),
 phase text NOT NULL CHECK(phase IN ('armored','exposed','enraged')),
 rules_version text NOT NULL CHECK(length(rules_version) BETWEEN 3 AND 80),
 squad_digest text NOT NULL CHECK(squad_digest ~ '^[a-f0-9]{64}$'),
 server_seed text NOT NULL CHECK(length(server_seed) BETWEEN 24 AND 512),
 squad_snapshot jsonb NOT NULL CHECK(
  jsonb_typeof(squad_snapshot)='object' AND octet_length(squad_snapshot::text) BETWEEN 128 AND 262144
 ),
 reserved_at timestamptz NOT NULL DEFAULT now(),
 committed_at timestamptz,
 replay_digest text CHECK(replay_digest IS NULL OR replay_digest ~ '^[a-f0-9]{64}$'),
 replay_json jsonb CHECK(replay_json IS NULL OR
  (jsonb_typeof(replay_json)='object' AND octet_length(replay_json::text) BETWEEN 16 AND 262144)),
 personal_boss_damage numeric(18,2) CHECK(personal_boss_damage IS NULL OR personal_boss_damage>=0),
 local_guard_damage numeric(18,2) CHECK(local_guard_damage IS NULL OR local_guard_damage>=0),
 hp_before bigint CHECK(hp_before IS NULL OR hp_before>=0),
 hp_after bigint CHECK(hp_after IS NULL OR hp_after>=0),
 credited_hp bigint CHECK(credited_hp IS NULL OR credited_hp>=0),
 residual_echo boolean,
 PRIMARY KEY(event_id,account_id,request_id),
 UNIQUE(event_id,account_id,ordinal),
 CHECK((state='reserved' AND committed_at IS NULL AND credited_hp IS NULL)
    OR (state='committed' AND committed_at IS NOT NULL AND replay_digest IS NOT NULL
        AND hp_before IS NOT NULL AND hp_after IS NOT NULL AND credited_hp IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS world_boss_receipt_by_account_v1
 ON private.world_boss_attempt_receipts_v1(account_id,event_id);
CREATE INDEX IF NOT EXISTS world_boss_receipt_by_event_v1
 ON private.world_boss_attempt_receipts_v1(event_id,state,committed_at);

CREATE TABLE IF NOT EXISTS private.world_boss_milestone_crossings_v1(
 event_id uuid NOT NULL REFERENCES private.world_boss_event_instances_v1(id) ON DELETE RESTRICT,
 threshold smallint NOT NULL CHECK(threshold IN (70,30,0)),
 crossed_by_account uuid REFERENCES auth.users(id),
 crossed_by_request text,
 crossed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(event_id,threshold)
);
-- This table only records crossing facts; it never grants Sigils.

ALTER TABLE private.world_boss_event_instances_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_attempt_receipts_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_milestone_crossings_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_event_instances_v1,
 private.world_boss_attempt_receipts_v1,
 private.world_boss_milestone_crossings_v1 FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.world_boss_event_instances_v1,
 private.world_boss_attempt_receipts_v1,
 private.world_boss_milestone_crossings_v1 TO service_role;

-- Only a server-side service holding the service role may call these private RPCs.
-- Assumes the service authenticated the caller and resolved/trusted the snapshot
-- using the verified-roster adapter BEFORE calling this function.
CREATE OR REPLACE FUNCTION private.world_boss_reserve_attempt_v1(
 p_event_id uuid,p_account_id uuid,p_character_id uuid,p_request_id text,
 p_squad_digest text,p_server_seed text,p_squad_snapshot jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $reserve$
DECLARE
 v_event private.world_boss_event_instances_v1%ROWTYPE;
 v_prior private.world_boss_attempt_receipts_v1%ROWTYPE;
 v_ordinal integer;
 v_phase text;
BEGIN
 SELECT * INTO v_event FROM private.world_boss_event_instances_v1
 WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB_EVENT_NOT_FOUND'; END IF;

 SELECT * INTO v_prior FROM private.world_boss_attempt_receipts_v1
 WHERE event_id=p_event_id AND account_id=p_account_id AND request_id=p_request_id;
 IF FOUND THEN
  IF v_prior.character_id IS DISTINCT FROM p_character_id OR
     v_prior.squad_digest IS DISTINCT FROM p_squad_digest OR
     v_prior.server_seed IS DISTINCT FROM p_server_seed
  THEN RAISE EXCEPTION 'WB_IDEMPOTENCY_PAYLOAD_MISMATCH'; END IF;
  RETURN jsonb_build_object('repeated',true,'status',v_prior.state,
   'ordinal',v_prior.ordinal,'phase',v_prior.phase,'digest',v_prior.squad_digest);
 END IF;

 IF v_event.status<>'active' OR now()<v_event.starts_at OR now()>=v_event.ends_at
 THEN RAISE EXCEPTION 'WB_EVENT_CLOSED'; END IF;
 IF p_account_id IS NULL OR p_character_id IS NULL OR p_request_id IS NULL OR
  p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$' OR
  p_squad_digest !~ '^[a-f0-9]{64}$' OR
  length(p_server_seed) NOT BETWEEN 24 AND 512 OR
  p_squad_snapshot IS NULL OR jsonb_typeof(p_squad_snapshot)<>'object'
 THEN RAISE EXCEPTION 'WB_RESERVATION_PAYLOAD_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.characters c
    WHERE c.id=p_character_id AND c.account_id=p_account_id)
 THEN RAISE EXCEPTION 'WB_CHARACTER_NOT_OWNED'; END IF;

 SELECT COALESCE(MAX(ordinal),0)+1 INTO v_ordinal
 FROM private.world_boss_attempt_receipts_v1
 WHERE event_id=p_event_id AND account_id=p_account_id;
 IF v_ordinal>3 THEN RAISE EXCEPTION 'WB_ATTEMPT_LIMIT'; END IF;
 v_phase:=CASE
  WHEN v_event.remaining_hp::numeric/v_event.max_hp<=0.30 THEN 'enraged'
  WHEN v_event.remaining_hp::numeric/v_event.max_hp<=0.70 THEN 'exposed'
  ELSE 'armored' END;

 INSERT INTO private.world_boss_attempt_receipts_v1(
  event_id,account_id,request_id,ordinal,character_id,state,phase,
  rules_version,squad_digest,server_seed,squad_snapshot
 ) VALUES(
  p_event_id,p_account_id,p_request_id,v_ordinal,p_character_id,'reserved',
  v_phase,v_event.rules_version,p_squad_digest,p_server_seed,p_squad_snapshot
 );
 RETURN jsonb_build_object('repeated',false,'status','reserved',
  'ordinal',v_ordinal,'phase',v_phase,'digest',p_squad_digest);
END $reserve$;

REVOKE ALL ON FUNCTION private.world_boss_reserve_attempt_v1(
 uuid,uuid,uuid,text,text,text,jsonb
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_reserve_attempt_v1(
 uuid,uuid,uuid,text,text,text,jsonb
) TO service_role;

-- The server runs the deterministic 14-round simulation OUTSIDE the lock
-- using the previously reserved phase, seed and immutable roster.
-- The finalization transaction alone clips event HP under a row lock.
CREATE OR REPLACE FUNCTION private.world_boss_finalize_attempt_v1(
 p_event_id uuid,p_account_id uuid,p_request_id text,
 p_squad_digest text,p_replay_digest text,p_replay jsonb,
 p_boss_damage numeric,p_guard_damage numeric
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $finalize$
DECLARE
 v_event private.world_boss_event_instances_v1%ROWTYPE;
 v_receipt private.world_boss_attempt_receipts_v1%ROWTYPE;
 v_credited bigint;
 v_remaining bigint;
BEGIN
 SELECT * INTO v_event FROM private.world_boss_event_instances_v1
 WHERE id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB_EVENT_NOT_FOUND'; END IF;
 SELECT * INTO v_receipt FROM private.world_boss_attempt_receipts_v1
 WHERE event_id=p_event_id AND account_id=p_account_id AND request_id=p_request_id
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB_RESERVATION_NOT_FOUND'; END IF;
 IF v_receipt.state='committed' THEN
  IF v_receipt.squad_digest IS DISTINCT FROM p_squad_digest OR
    v_receipt.replay_digest IS DISTINCT FROM p_replay_digest
  THEN RAISE EXCEPTION 'WB_FINALIZATION_PAYLOAD_MISMATCH'; END IF;
  RETURN jsonb_build_object('repeated',true,'creditedHp',v_receipt.credited_hp,
   'remainingHp',v_receipt.hp_after,'residualEcho',v_receipt.residual_echo,
   'ordinal',v_receipt.ordinal);
 END IF;
 IF v_receipt.state<>'reserved' OR v_receipt.squad_digest IS DISTINCT FROM p_squad_digest
 THEN RAISE EXCEPTION 'WB_SNAPSHOT_MISMATCH'; END IF;
 IF p_replay_digest IS NULL OR p_replay_digest !~ '^[a-f0-9]{64}$'
  OR p_replay IS NULL OR jsonb_typeof(p_replay)<>'object'
  OR p_boss_damage IS NULL OR p_boss_damage::text IN ('NaN','Infinity','-Infinity')
  OR p_boss_damage<0 OR p_boss_damage>1000000000000
  OR p_guard_damage IS NULL OR p_guard_damage::text IN ('NaN','Infinity','-Infinity')
  OR p_guard_damage<0 OR p_guard_damage>1000000000000
 THEN RAISE EXCEPTION 'WB_INVALID_SERVER_COMBAT_RESULT'; END IF;

 v_credited:=LEAST(v_event.remaining_hp,FLOOR(p_boss_damage)::bigint);
 v_remaining:=v_event.remaining_hp-v_credited;
 UPDATE private.world_boss_event_instances_v1
 SET remaining_hp=v_remaining,revision=revision+1
 WHERE id=p_event_id;
 UPDATE private.world_boss_attempt_receipts_v1 SET
  state='committed',committed_at=now(),replay_digest=p_replay_digest,
  replay_json=p_replay,personal_boss_damage=p_boss_damage,
  local_guard_damage=p_guard_damage,hp_before=v_event.remaining_hp,
  hp_after=v_remaining,credited_hp=v_credited,residual_echo=(v_event.remaining_hp=0)
 WHERE event_id=p_event_id AND account_id=p_account_id AND request_id=p_request_id;

 INSERT INTO private.world_boss_milestone_crossings_v1(
  event_id,threshold,crossed_by_account,crossed_by_request
 ) SELECT p_event_id,threshold,p_account_id,p_request_id
 FROM (VALUES (70),(30),(0)) AS milestones(threshold)
 WHERE v_event.remaining_hp::numeric/v_event.max_hp>milestones.threshold/100.0
   AND v_remaining::numeric/v_event.max_hp<=milestones.threshold/100.0
 ON CONFLICT(event_id,threshold) DO NOTHING;

 RETURN jsonb_build_object('repeated',false,'creditedHp',v_credited,
  'remainingHp',v_remaining,'residualEcho',(v_event.remaining_hp=0),
  'ordinal',v_receipt.ordinal);
END $finalize$;

REVOKE ALL ON FUNCTION private.world_boss_finalize_attempt_v1(
 uuid,uuid,text,text,text,jsonb,numeric,numeric
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_finalize_attempt_v1(
 uuid,uuid,text,text,text,jsonb,numeric,numeric
) TO service_role;

-- No grants, item minting, Sigil wallets, scheduled tasks, or active rows.
COMMIT;
