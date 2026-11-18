-- WORLD BOSS V59 — PRIVATE, DISPOSABLE ERASURE LEASE AND OBJECT LEDGER.
-- NOT A SUPABASE MIGRATION. DO NOT RUN ON STAGING/PRODUCTION.
-- Requires V17-V36 AND V57 private drafts in disposable PostgreSQL CI.
-- No Auth Admin deletion, Storage API, user account erasure or release flag.
-- Actual retention/purge policy and privileged worker NOT YET APPROVED.
BEGIN;

-- This table deliberately has NO FK to auth.users: recovery must survive
-- authorized Auth deletion and a lost network acknowledgment.
CREATE TABLE private.world_boss_erasure_jobs_v59(
 account_id uuid PRIMARY KEY,
 ticket_digest text NOT NULL CHECK(ticket_digest ~ '^[a-f0-9]{64}$'),
 stage text NOT NULL DEFAULT 'fenced' CHECK(
  stage IN ('fenced','replays_purged','rows_purged','auth_deleted','complete')),
 policy_review_approved boolean NOT NULL DEFAULT false,
 manifest_sealed boolean NOT NULL DEFAULT false,
 lease_owner text CHECK(
  lease_owner IS NULL OR lease_owner ~ '^[A-Za-z0-9_-]{8,128}$'),
 lease_generation bigint NOT NULL DEFAULT 0 CHECK(lease_generation>=0),
 lease_expires_at timestamptz,
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((lease_owner IS NULL)=(lease_expires_at IS NULL))
);
CREATE TABLE private.world_boss_erasure_objects_v59(
 account_id uuid NOT NULL REFERENCES private.world_boss_erasure_jobs_v59(account_id)
  ON DELETE RESTRICT,
 object_key text NOT NULL CHECK(length(object_key) BETWEEN 8 AND 512),
 deleted_at timestamptz,
 PRIMARY KEY(account_id,object_key),
 UNIQUE(object_key)
);
-- Replay object paths are personal metadata. No API or gameplay-role rights.
ALTER TABLE private.world_boss_erasure_jobs_v59 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_erasure_objects_v59 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_erasure_jobs_v59,
 private.world_boss_erasure_objects_v59
 FROM PUBLIC,anon,authenticated,service_role;

-- Prevent a late replay key from appearing after the manifest is sealed,
-- and prevent a replay key from being silently reassigned to another user.
-- Each manifest edit locks the parent job, so stage-advance and edits
-- cannot interleave inside independent PostgreSQL transactions.
CREATE FUNCTION private.world_boss_v59_object_manifest_guard()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $manifest$
DECLARE
 j private.world_boss_erasure_jobs_v59%ROWTYPE;
 owner_key uuid;
BEGIN
 IF TG_OP='DELETE' THEN owner_key:=OLD.account_id;
 ELSE owner_key:=NEW.account_id; END IF;
 SELECT * INTO j FROM private.world_boss_erasure_jobs_v59
 WHERE account_id=owner_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB59_JOB_MISSING_FOR_OBJECT'; END IF;
 IF TG_OP='INSERT' THEN
  IF j.manifest_sealed OR j.stage<>'fenced'
  THEN RAISE EXCEPTION 'WB59_MANIFEST_ALREADY_SEALED'; END IF;
  RETURN NEW;
 ELSIF TG_OP='UPDATE' THEN
  IF NEW.account_id IS DISTINCT FROM OLD.account_id OR
    NEW.object_key IS DISTINCT FROM OLD.object_key OR
    (OLD.deleted_at IS NOT NULL AND
     NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
  THEN RAISE EXCEPTION 'WB59_IMMUTABLE_OBJECT_RECEIPT'; END IF;
  IF j.stage<>'fenced'
  THEN RAISE EXCEPTION 'WB59_OBJECT_ACK_AFTER_STAGE_ADVANCE'; END IF;
  IF NEW.deleted_at IS NOT NULL AND NOT j.manifest_sealed
  THEN RAISE EXCEPTION 'WB59_OBJECT_ACK_BEFORE_MANIFEST_SEAL'; END IF;
  RETURN NEW;
 END IF;
 -- Purging durable object references during a stage transition would make
 -- lost-ACK retries unsafe. Final retention cleanup is a separate approval.
 RAISE EXCEPTION 'WB59_OBJECT_DELETE_REQUIRES_PRIVACY_FINALIZER';
END
$manifest$;
CREATE TRIGGER world_boss_v59_object_manifest_guard
 BEFORE INSERT OR UPDATE OR DELETE
 ON private.world_boss_erasure_objects_v59
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v59_object_manifest_guard();

-- Acquire a GENERATION-FENCED, 90-second worker lease on an EXISTING,
-- privately authorized job. This routine NEVER initiates a deletion.
-- Ticket authorization and the V57 deletion fence must already exist.
CREATE FUNCTION private.world_boss_v59_acquire(
 p_account uuid,p_ticket_digest text,p_worker text
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $acquire$
DECLARE j private.world_boss_erasure_jobs_v59%ROWTYPE;
BEGIN
 IF p_account IS NULL OR p_ticket_digest IS NULL OR
  p_ticket_digest !~ '^[a-f0-9]{64}$' OR p_worker IS NULL OR
  p_worker !~ '^[A-Za-z0-9_-]{8,128}$'
 THEN RAISE EXCEPTION 'WB59_INVALID_PRIVATE_LEASE_REQUEST'; END IF;
 SELECT * INTO j FROM private.world_boss_erasure_jobs_v59
 WHERE account_id=p_account FOR UPDATE;
 IF NOT FOUND OR j.ticket_digest IS DISTINCT FROM p_ticket_digest
 THEN RAISE EXCEPTION 'WB59_PRIVACY_TICKET_NOT_AUTHORIZED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
  WHERE account_id=p_account)
 THEN RAISE EXCEPTION 'WB59_ACCOUNT_NOT_FENCED'; END IF;
 IF j.stage='complete' THEN RETURN jsonb_build_object(
  'kind','complete','stage','complete'); END IF;
 IF j.lease_owner IS NOT NULL AND j.lease_expires_at>clock_timestamp()
 THEN RETURN jsonb_build_object('kind','busy'); END IF;
 IF j.lease_generation=9223372036854775807
 THEN RAISE EXCEPTION 'WB59_LEASE_GENERATION_EXHAUSTED'; END IF;
 UPDATE private.world_boss_erasure_jobs_v59 SET
  lease_owner=p_worker,lease_generation=lease_generation+1,
  lease_expires_at=clock_timestamp()+interval '90 seconds',
  revision=revision+1,updated_at=clock_timestamp()
 WHERE account_id=p_account RETURNING * INTO j;
 RETURN jsonb_build_object(
  'kind','acquired','stage',j.stage,'generation',j.lease_generation);
END
$acquire$;

-- The caller is a separately authenticated, privileged privacy worker.
-- This function checks lease generation AND worker ID in the same row lock.
CREATE FUNCTION private.world_boss_v59_assert_lease(
 p_account uuid,p_worker text,p_generation bigint,p_stage text
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $guard$
DECLARE j private.world_boss_erasure_jobs_v59%ROWTYPE;
BEGIN
 IF p_account IS NULL OR p_worker IS NULL OR
  p_generation IS NULL OR p_generation<1
 THEN RAISE EXCEPTION 'WB59_INVALID_LEASE'; END IF;
 SELECT * INTO j FROM private.world_boss_erasure_jobs_v59
  WHERE account_id=p_account FOR UPDATE;
 IF NOT FOUND OR j.lease_owner IS DISTINCT FROM p_worker OR
   j.lease_generation IS DISTINCT FROM p_generation OR
   j.lease_expires_at IS NULL OR j.lease_expires_at<=clock_timestamp()
 THEN RAISE EXCEPTION 'WB59_STALE_OR_MISSING_WORKER_LEASE'; END IF;
 IF j.stage IS DISTINCT FROM p_stage
 THEN RAISE EXCEPTION 'WB59_STAGE_NOT_CURRENT'; END IF;
 IF j.policy_review_approved IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'WB59_PRIVACY_POLICY_UNAPPROVED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
  WHERE account_id=p_account)
 THEN RAISE EXCEPTION 'WB59_ACCOUNT_NOT_FENCED'; END IF;
END
$guard$;

CREATE FUNCTION private.world_boss_v59_heartbeat(
 p_account uuid,p_worker text,p_generation bigint,p_stage text
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $heartbeat$
BEGIN
 PERFORM private.world_boss_v59_assert_lease(
  p_account,p_worker,p_generation,p_stage);
 UPDATE private.world_boss_erasure_jobs_v59 SET
  lease_expires_at=clock_timestamp()+interval '90 seconds',
  updated_at=clock_timestamp()
 WHERE account_id=p_account;
END
$heartbeat$;

-- This function is called ONLY AFTER a verified external Storage deletion.
-- It does NOT call Storage, delete objects or assume missing-key success.
CREATE FUNCTION private.world_boss_v59_mark_object_deleted(
 p_account uuid,p_worker text,p_generation bigint,p_object_key text
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $ack$
BEGIN
 PERFORM private.world_boss_v59_assert_lease(
  p_account,p_worker,p_generation,'fenced');
 IF p_object_key IS NULL OR length(p_object_key) NOT BETWEEN 8 AND 512
 THEN RAISE EXCEPTION 'WB59_INVALID_REPLAY_OBJECT_KEY'; END IF;
 UPDATE private.world_boss_erasure_objects_v59 SET
  deleted_at=COALESCE(deleted_at,clock_timestamp())
 WHERE account_id=p_account AND object_key=p_object_key;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB59_OBJECT_NOT_IN_SEALED_MANIFEST'; END IF;
END
$ack$;

CREATE FUNCTION private.world_boss_v59_advance(
 p_account uuid,p_worker text,p_generation bigint,
 p_from text,p_to text
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $advance$
DECLARE
 j private.world_boss_erasure_jobs_v59%ROWTYPE;
 preflight jsonb;
BEGIN
 PERFORM private.world_boss_v59_assert_lease(
  p_account,p_worker,p_generation,p_from);
 SELECT * INTO j FROM private.world_boss_erasure_jobs_v59
  WHERE account_id=p_account FOR UPDATE;
 IF (p_from='fenced' AND p_to='replays_purged') THEN
  IF NOT j.manifest_sealed THEN
   RAISE EXCEPTION 'WB59_REPLAY_MANIFEST_NOT_SEALED'; END IF;
  IF EXISTS(SELECT 1 FROM private.world_boss_erasure_objects_v59
   WHERE account_id=p_account AND deleted_at IS NULL)
  THEN RAISE EXCEPTION 'WB59_REPLAY_OBJECTS_NOT_CONFIRMED_DELETED'; END IF;
 ELSIF (p_from='replays_purged' AND p_to='rows_purged') THEN
  preflight:=private.world_boss_v36_erasure_preflight(p_account);
  IF (preflight->>'requiresReconciliation')::boolean IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'WB59_ACCOUNT_GAMEPLAY_RECEIPTS_STILL_PRESENT'; END IF;
 ELSIF (p_from='rows_purged' AND p_to='auth_deleted') THEN
  IF EXISTS(SELECT 1 FROM auth.users WHERE id=p_account)
  THEN RAISE EXCEPTION 'WB59_AUTH_IDENTITY_STILL_PRESENT'; END IF;
 ELSIF (p_from='auth_deleted' AND p_to='complete') THEN
  -- Final tombstone/manifest retention still requires a separate policy.
  -- This fixture advances the stage but never drops the fence or keys.
  NULL;
 ELSE RAISE EXCEPTION 'WB59_ILLEGAL_STAGE_TRANSITION'; END IF;
 UPDATE private.world_boss_erasure_jobs_v59 SET
  stage=p_to,revision=revision+1,updated_at=clock_timestamp()
 WHERE account_id=p_account;
END
$advance$;

CREATE FUNCTION private.world_boss_v59_release(
 p_account uuid,p_worker text,p_generation bigint
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $release$
DECLARE j private.world_boss_erasure_jobs_v59%ROWTYPE;
BEGIN
 SELECT * INTO j FROM private.world_boss_erasure_jobs_v59
  WHERE account_id=p_account FOR UPDATE;
 IF NOT FOUND OR j.lease_owner IS DISTINCT FROM p_worker OR
   j.lease_generation IS DISTINCT FROM p_generation
 THEN RAISE EXCEPTION 'WB59_STALE_OR_MISSING_WORKER_LEASE'; END IF;
 UPDATE private.world_boss_erasure_jobs_v59
 SET lease_owner=NULL,lease_expires_at=NULL,
  revision=revision+1,updated_at=clock_timestamp()
 WHERE account_id=p_account;
 -- The external V57 erasure fence remains in effect.
END
$release$;

REVOKE ALL ON FUNCTION private.world_boss_v59_object_manifest_guard(),
 private.world_boss_v59_acquire(uuid,text,text),
 private.world_boss_v59_assert_lease(uuid,text,bigint,text),
 private.world_boss_v59_heartbeat(uuid,text,bigint,text),
 private.world_boss_v59_mark_object_deleted(uuid,text,bigint,text),
 private.world_boss_v59_advance(uuid,text,bigint,text,text),
 private.world_boss_v59_release(uuid,text,bigint)
 FROM PUBLIC,anon,authenticated,service_role;
-- No grants to mobile users or gameplay server. Fixture executes as owner.
-- No creation/activation/deletion of any event, user or wallet.
COMMIT;
