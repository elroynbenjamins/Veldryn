-- VELDRYN World Boss V28: private, NOT DEPLOYED reward-ledger prototype.
-- Disposable Postgres 16 CI only. Depends on V17/V18 and V27 schemas.
-- Never bind public/anon/authenticated API to these functions.
-- Currency is private draft world_boss_v28_wallet, NOT live game wallet.
-- Max theoretical event entitlement 100; currently impact payouts OFF
-- until approved per-role/world-boss-bracket normalization is evidenced.
BEGIN;

CREATE TABLE private.world_boss_replay_proofs_v28 (
 event_id uuid NOT NULL,
 account_id uuid NOT NULL,
 request_id text NOT NULL,
 replay_digest text NOT NULL CHECK(replay_digest ~ '^[a-f0-9]{64}$'),
 survived boolean NOT NULL,
 boss_hp_damage numeric(18,2) NOT NULL CHECK(boss_hp_damage BETWEEN 0 AND 1000000000000),
 local_guard_damage numeric(18,2) NOT NULL CHECK(local_guard_damage BETWEEN 0 AND 1000000000000),
 character_ledger jsonb NOT NULL CHECK(jsonb_typeof(character_ledger)='array'
  AND jsonb_array_length(character_ledger) BETWEEN 1 AND 5),
 rounds_completed integer NOT NULL CHECK(rounds_completed BETWEEN 1 AND 14),
 impact_status text NOT NULL DEFAULT 'pending_balance_approval'
  CHECK(impact_status='pending_balance_approval'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(event_id,account_id,request_id),
 FOREIGN KEY(event_id,account_id,request_id)
  REFERENCES private.world_boss_attempts_v17(event_id,account_id,request_id) ON DELETE RESTRICT
);

CREATE TABLE private.world_boss_wallet_v28 (
 account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 balance bigint NOT NULL DEFAULT 0 CHECK(balance>=0),
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0)
);

CREATE TABLE private.world_boss_reward_ledger_v28 (
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 source_key text NOT NULL CHECK(source_key ~ '^(battle:[123]|supply:[12]|global:(70|30|0))$'),
 amount integer NOT NULL CHECK(amount IN(5,10,15)),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(event_id,account_id,source_key)
);
CREATE INDEX world_boss_v28_reward_by_account
 ON private.world_boss_reward_ledger_v28(account_id,event_id);

CREATE TABLE private.world_boss_claim_receipts_v28 (
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 request_id text NOT NULL CHECK(request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 amount bigint NOT NULL CHECK(amount BETWEEN 0 AND 100),
 balance_after bigint NOT NULL CHECK(balance_after>=0),
 account_revision bigint NOT NULL CHECK(account_revision>=0),
 claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(event_id,account_id,request_id)
);

-- Trusted service passes the exact immutable UTF8 replay content originally
-- uploaded BEFORE the V18 event HP commit. SQL recomputes SHA256 and checks
-- it against the committed V18 attempt. No player-supplied result accepted.
-- An identical repeat is a read-only receipt; any different digest aborts.
CREATE FUNCTION private.world_boss_v28_record_replay(
 p_event uuid,p_account uuid,p_request text,p_content text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $record$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 a private.world_boss_attempts_v17%ROWTYPE;
 old private.world_boss_replay_proofs_v28%ROWTYPE;
 payload jsonb;
 replay jsonb;
 digest text;
 guard numeric;
 damage numeric;
 survived boolean;
 rounds integer;
 n integer;
 ledger jsonb;
 participant jsonb;
 participant_ids text[]:=ARRAY[]::text[];
 participant_id text;
 participant_role text;
 damage_sum numeric:=0;
 guard_sum numeric:=0;
BEGIN
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB28_EVENT_MISSING'; END IF;
 SELECT * INTO a FROM private.world_boss_attempts_v17
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request FOR UPDATE;
 IF NOT FOUND OR a.status<>'committed'
 THEN RAISE EXCEPTION 'WB28_UNCOMMITTED_BATTLE'; END IF;
 IF p_content IS NULL OR octet_length(p_content) NOT BETWEEN 128 AND 1048576
 THEN RAISE EXCEPTION 'WB28_INVALID_REPLAY_BYTES'; END IF;
 digest:=encode(sha256(convert_to(p_content,'UTF8')),'hex');
 IF digest IS DISTINCT FROM a.replay_digest OR
    a.engine_version<>'world-boss-account-rounds-v25-prototype'
 THEN RAISE EXCEPTION 'WB28_UNVERIFIED_REPLAY'; END IF;
 SELECT * INTO old FROM private.world_boss_replay_proofs_v28
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request;
 IF FOUND THEN
  IF old.replay_digest IS DISTINCT FROM digest
  THEN RAISE EXCEPTION 'WB28_REPLAY_PROOF_CONFLICT'; END IF;
  RETURN jsonb_build_object('eventId',p_event::text,'accountId',p_account::text,
   'requestId',p_request,'repeated',true,'survived',old.survived,
   'status',old.impact_status);
 END IF;
 BEGIN payload:=p_content::jsonb;
 EXCEPTION WHEN others THEN RAISE EXCEPTION 'WB28_INVALID_REPLAY_JSON'; END;
 replay:=payload->'replay';
 IF payload->>'version'<>'world-boss-account-rounds-v25-prototype'
    OR payload->>'eventId' IS DISTINCT FROM p_event::text
    OR payload->>'accountId' IS DISTINCT FROM p_account::text
    OR payload->>'requestId' IS DISTINCT FROM p_request
    OR payload->>'rosterDigest' IS DISTINCT FROM a.squad_digest
    OR payload->>'phase' IS DISTINCT FROM a.phase
    OR payload->>'warCampDigest' IS DISTINCT FROM a.war_camp_digest
    OR payload->>'encounterDigest' IS DISTINCT FROM a.encounter_profile_digest
    OR replay->>'schema'<>'world-boss-v25-authored-account-rounds'
    OR replay->>'engineVersion'<>'world-boss-account-rounds-v25-prototype'
    OR replay->>'eventId' IS DISTINCT FROM p_event::text
    OR replay->>'accountId' IS DISTINCT FROM p_account::text
    OR replay->>'requestId' IS DISTINCT FROM p_request
    OR replay->>'rosterDigest' IS DISTINCT FROM a.squad_digest
    OR jsonb_typeof(replay->'characterLedger')<>'array'
    OR jsonb_typeof(replay->'events')<>'array'
    OR jsonb_typeof(replay->'survived')<>'boolean'
 THEN RAISE EXCEPTION 'WB28_REPLAY_ACCOUNT_PROOF_MISMATCH'; END IF;
 n:=jsonb_array_length(replay->'characterLedger');
 IF n NOT BETWEEN 1 AND 5
 THEN RAISE EXCEPTION 'WB28_INVALID_REPLAY_CHARACTERS'; END IF;
 IF (replay->>'roundsCompleted') !~ '^[0-9]{1,2}$'
    OR (replay->>'rawBossHpDamage') !~ '^[0-9]+(\.[0-9]+)?$'
    OR (replay->>'localGuardDamage') !~ '^[0-9]+(\.[0-9]+)?$'
    OR (replay->>'proposedWorldHpDamage') !~ '^[0-9]+(\.[0-9]+)?$'
 THEN RAISE EXCEPTION 'WB28_INVALID_REPLAY_NUMBERS'; END IF;
 rounds:=(replay->>'roundsCompleted')::integer;
 guard:=(replay->>'localGuardDamage')::numeric;
 damage:=(replay->>'proposedWorldHpDamage')::numeric;
 survived:=(replay->>'survived')::boolean;
 ledger:=replay->'characterLedger';
 IF rounds<1 OR rounds>14 OR
    damage IS DISTINCT FROM a.raw_boss_damage OR
    round(guard,2) IS DISTINCT FROM a.local_guard_damage OR
    (replay->>'rawBossHpDamage')::numeric<damage OR
    jsonb_array_length(replay->'events')<1 OR
    (replay->'result'->>'survived')::boolean IS DISTINCT FROM survived
 THEN RAISE EXCEPTION 'WB28_REPLAY_COMBAT_PROOF_MISMATCH'; END IF;
 FOR participant IN SELECT value FROM jsonb_array_elements(ledger) LOOP
  participant_id:=participant->>'characterId';
  participant_role:=participant->>'role';
  IF jsonb_typeof(participant)<>'object' OR
     participant_id IS NULL OR
     participant_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' OR
     participant_id=ANY(participant_ids) OR
     participant_role NOT IN('tank','damage','support') OR
     jsonb_typeof(participant->'survived')<>'boolean' OR
     jsonb_typeof(participant->'interrupts')<>'number'
  THEN RAISE EXCEPTION 'WB28_INVALID_ROLE_EVIDENCE'; END IF;
  participant_ids:=array_append(participant_ids,participant_id);
  IF (participant->>'bossHpDamage') !~ '^[0-9]+([.][0-9]+)?$'
     OR (participant->>'localGuardDamage') !~ '^[0-9]+([.][0-9]+)?$'
     OR (participant->>'effectiveHealing') !~ '^[0-9]+([.][0-9]+)?$'
     OR (participant->>'shieldConsumed') !~ '^[0-9]+([.][0-9]+)?$'
     OR (participant->>'tankProtection') !~ '^[0-9]+([.][0-9]+)?$'
     OR (participant->>'cleansePrevented') !~ '^[0-9]+([.][0-9]+)?$'
     OR (participant->>'interrupts') !~ '^[0-9]{1,6}$'
  THEN RAISE EXCEPTION 'WB28_INVALID_ROLE_METRICS'; END IF;
  damage_sum:=damage_sum+(participant->>'bossHpDamage')::numeric;
  guard_sum:=guard_sum+(participant->>'localGuardDamage')::numeric;
 END LOOP;
 IF abs(damage_sum-(replay->>'rawBossHpDamage')::numeric)>.05 OR
    abs(guard_sum-guard)>.05
 THEN RAISE EXCEPTION 'WB28_ROLE_DAMAGE_RECONCILIATION_FAILED'; END IF;
 INSERT INTO private.world_boss_replay_proofs_v28(
  event_id,account_id,request_id,replay_digest,survived,
  boss_hp_damage,local_guard_damage,character_ledger,rounds_completed)
 VALUES(p_event,p_account,p_request,digest,survived,damage,guard,ledger,rounds);
 RETURN jsonb_build_object('eventId',p_event::text,'accountId',p_account::text,
  'requestId',p_request,'repeated',false,'survived',survived,
  'status','pending_balance_approval');
END
$record$;

-- Event lock first (same ordering as V18 settlement / V27 donations).
-- Wallet row lock then protects a shared cross-event balance. Each source
-- has a unique per-account-per-event key; two parallel claims never mint
-- twice, even when called with different request ids.
CREATE FUNCTION private.world_boss_v28_claim(
 p_event uuid,p_account uuid,p_request text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $claim$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 existing private.world_boss_claim_receipts_v28%ROWTYPE;
 wallet private.world_boss_wallet_v28%ROWTYPE;
 source_row record;
 newly_paid integer;
 delta bigint:=0;
 event_total bigint;
 ledger_count integer;
BEGIN
 IF p_request IS NULL OR p_request !~ '^[A-Za-z0-9_-]{8,128}$'
 THEN RAISE EXCEPTION 'WB28_INVALID_CLAIM_KEY'; END IF;
 SELECT * INTO e FROM private.world_boss_events_v17
  WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB28_EVENT_MISSING'; END IF;
 INSERT INTO private.world_boss_wallet_v28(account_id)
 VALUES(p_account) ON CONFLICT(account_id) DO NOTHING;
 SELECT * INTO wallet FROM private.world_boss_wallet_v28
  WHERE account_id=p_account FOR UPDATE;
 SELECT * INTO existing FROM private.world_boss_claim_receipts_v28
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request;
 IF FOUND THEN
  RETURN jsonb_build_object('eventId',p_event::text,'accountId',p_account::text,
   'requestId',p_request,'repeated',true,
   'creditedSigils',existing.amount,'balanceAfter',existing.balance_after,
   'walletRevision',existing.account_revision);
 END IF;

 FOR source_row IN (
  -- Every earned battle must have a committed event attempt AND a replay
  -- whose exact bytes were independently matched to the immutable receipt.
  SELECT 'battle:'||a.ordinal::text AS source_key,
   CASE WHEN r.survived THEN 10 ELSE 5 END AS amount
   FROM private.world_boss_attempts_v17 a
   JOIN private.world_boss_replay_proofs_v28 r
     ON r.event_id=a.event_id AND r.account_id=a.account_id
      AND r.request_id=a.request_id AND r.replay_digest=a.replay_digest
   WHERE a.event_id=p_event AND a.account_id=p_account AND a.status='committed'
  UNION ALL
  -- War Supplies can pay even if the account never fought. Two is the
  -- absolute DB-unique ordinal cap across all supply tracks and characters.
  SELECT 'supply:'||d.ordinal::text AS source_key,5 AS amount
   FROM private.world_boss_war_donations_v27 d
   WHERE d.event_id=p_event AND d.account_id=p_account
  UNION ALL
  -- Global milestone income needs >=1 verified completed account battle.
  SELECT 'global:'||m.threshold::text AS source_key,
   CASE m.threshold WHEN 70 THEN 5 WHEN 30 THEN 10 ELSE 15 END AS amount
   FROM private.world_boss_milestones_v17 m
   WHERE m.event_id=p_event AND EXISTS(
    SELECT 1 FROM private.world_boss_replay_proofs_v28 r
    JOIN private.world_boss_attempts_v17 a ON
     a.event_id=r.event_id AND a.account_id=r.account_id
     AND a.request_id=r.request_id
    WHERE a.event_id=p_event AND a.account_id=p_account
     AND a.status='committed')
 ) LOOP
  newly_paid:=NULL;
  INSERT INTO private.world_boss_reward_ledger_v28(
   event_id,account_id,source_key,amount)
  VALUES(p_event,p_account,source_row.source_key,source_row.amount)
  ON CONFLICT(event_id,account_id,source_key) DO NOTHING
  RETURNING amount INTO newly_paid;
  IF newly_paid IS NOT NULL THEN delta:=delta+newly_paid; END IF;
 END LOOP;

 SELECT coalesce(sum(amount),0),count(*) INTO event_total,ledger_count
 FROM private.world_boss_reward_ledger_v28
 WHERE event_id=p_event AND account_id=p_account;
 IF event_total>100 OR ledger_count>11 OR delta>100
 THEN RAISE EXCEPTION 'WB28_EVENT_SIGIL_CAP_EXCEEDED'; END IF;
 UPDATE private.world_boss_wallet_v28
 SET balance=balance+delta,revision=revision+(CASE WHEN delta>0 THEN 1 ELSE 0 END)
 WHERE account_id=p_account
 RETURNING * INTO wallet;
 INSERT INTO private.world_boss_claim_receipts_v28(
  event_id,account_id,request_id,amount,balance_after,account_revision)
 VALUES(p_event,p_account,p_request,delta,wallet.balance,wallet.revision);
 RETURN jsonb_build_object('eventId',p_event::text,'accountId',p_account::text,
  'requestId',p_request,'repeated',false,
  'creditedSigils',delta,'balanceAfter',wallet.balance,
  'walletRevision',wallet.revision);
END
$claim$;

CREATE FUNCTION private.world_boss_v28_view(
 p_account uuid,p_event uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $view$
DECLARE
 current_balance bigint;
 current_revision bigint;
 earned bigint;
 proofs jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_events_v17 WHERE id=p_event)
 THEN RAISE EXCEPTION 'WB28_EVENT_MISSING'; END IF;
 SELECT coalesce(balance,0),coalesce(revision,0) INTO
  current_balance,current_revision
 FROM private.world_boss_wallet_v28 WHERE account_id=p_account;
 SELECT coalesce(sum(amount),0) INTO earned
 FROM private.world_boss_reward_ledger_v28
 WHERE event_id=p_event AND account_id=p_account;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'attempt',a.ordinal,'survived',r.survived,
  'worldHpContribution',r.boss_hp_damage,
  'localGuardDamage',r.local_guard_damage,
  'characterLedger',r.character_ledger,
  'impactStatus',r.impact_status)
  ORDER BY a.ordinal),'[]'::jsonb) INTO proofs
 FROM private.world_boss_replay_proofs_v28 r
 JOIN private.world_boss_attempts_v17 a ON
  a.event_id=r.event_id AND a.account_id=r.account_id AND
  a.request_id=r.request_id
 WHERE a.event_id=p_event AND a.account_id=p_account;
 RETURN jsonb_build_object(
  'accountId',p_account::text,'eventId',p_event::text,
  'balance',coalesce(current_balance,0),
  'walletRevision',coalesce(current_revision,0),
  'claimedThisEvent',earned,'eventCap',100,
  'impactStatus','pending_balance_approval',
  'impactMilestonesCredited',false,
  'roleContributions',proofs);
END
$view$;

ALTER TABLE private.world_boss_replay_proofs_v28 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_wallet_v28 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_reward_ledger_v28 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_claim_receipts_v28 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_replay_proofs_v28,
 private.world_boss_wallet_v28,
 private.world_boss_reward_ledger_v28,
 private.world_boss_claim_receipts_v28 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v28_record_replay(
 uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v28_claim(
 uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v28_view(
 uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON private.world_boss_replay_proofs_v28,
 private.world_boss_reward_ledger_v28,
 private.world_boss_claim_receipts_v28 TO service_role;
GRANT SELECT,INSERT,UPDATE ON private.world_boss_wallet_v28 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v28_record_replay(
 uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v28_claim(
 uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v28_view(
 uuid,uuid) TO service_role;
COMMIT;
