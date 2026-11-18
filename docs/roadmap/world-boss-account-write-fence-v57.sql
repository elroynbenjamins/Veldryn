-- WORLD BOSS V57: PRIVATE ACCOUNT ERASURE WRITE FENCE — DISPOSABLE CI ONLY.
-- NOT A MIGRATION. NEVER APPLY TO STAGING OR PRODUCTION.
-- Depends on V17/V20/V21/V27/V28 and V36 schema audits.
-- Prevent new per-account receipts/claims/attempts/replays/wallet writes
-- after deletion is fenced. Does not change global HP or War Camp progress.
-- The real account-erasure service, Auth revocation, retention decision,
-- object-store purge and lock ordering across all workers remain unapproved.
BEGIN;

-- Fail closed if the known V36 identity-column contract has drifted.
DO $audit$
DECLARE
 expected text[]:=ARRAY[
  'world_boss_attempts_v17.account_id',
  'world_boss_milestones_v17.crossed_by_account',
  'world_boss_echo_consents_v20.owner_account_id',
  'world_boss_consent_commands_v21.owner_account_id',
  'world_boss_war_donations_v27.account_id',
  'world_boss_replay_proofs_v28.account_id',
  'world_boss_wallet_v28.account_id',
  'world_boss_reward_ledger_v28.account_id',
  'world_boss_claim_receipts_v28.account_id'
 ];
 actual text[];
BEGIN
 SELECT coalesce(array_agg(DISTINCT c.relname||'.'||a.attname ORDER BY
  c.relname||'.'||a.attname),ARRAY[]::text[]) INTO actual
 FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_attribute a ON a.attrelid=c.oid
 WHERE n.nspname='private' AND c.relname LIKE 'world_boss_%'
 AND c.relkind IN('r','p') AND NOT a.attisdropped
 AND a.attname IN('account_id','owner_account_id','crossed_by_account');
 IF actual<>(SELECT array_agg(v ORDER BY v) FROM unnest(expected) v)
 THEN RAISE EXCEPTION 'WB57_UNREVIEWED_ACCOUNT_IDENTITY_COLUMNS'; END IF;
END $audit$;

-- Rows exist ONLY while an account is blocked for privileged erasure.
-- No FK to auth.users: the fence must outlive Auth deletion until finalization.
-- Retention/removal of this UUID is subject to approved privacy policy.
CREATE TABLE private.world_boss_erasure_fences_v57(
 account_id uuid PRIMARY KEY,
 fenced_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 status text NOT NULL DEFAULT 'blocked' CHECK(status='blocked')
);
ALTER TABLE private.world_boss_erasure_fences_v57 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_erasure_fences_v57
 FROM PUBLIC,anon,authenticated,service_role;
-- Only a PRIVILEGED erasure owner may insert/remove a fence. Gameplay
-- service_role can read it but MUST NOT be allowed to clear/alter it.
GRANT SELECT ON private.world_boss_erasure_fences_v57 TO service_role;

-- Every account write and fence insertion competes on the exact same
-- transaction-scoped advisory lock, including when no fence row yet exists.
-- This closes the absent-row SELECT/INSERT race. A 64-bit hash collision
-- can serialize unrelated accounts but cannot authorize an erasing account.
CREATE FUNCTION private.world_boss_v57_account_lock(p_account uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $lock$
BEGIN
 IF p_account IS NULL THEN RAISE EXCEPTION 'WB57_ACCOUNT_REQUIRED'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_account::text,570057::bigint));
END
$lock$;

CREATE FUNCTION private.world_boss_v57_assert_write_open(p_account uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $guard$
BEGIN
 PERFORM private.world_boss_v57_account_lock(p_account);
 IF EXISTS (SELECT 1 FROM private.world_boss_erasure_fences_v57
   WHERE account_id=p_account)
 THEN RAISE EXCEPTION 'WB57_ACCOUNT_ERASURE_FENCED'; END IF;
END
$guard$;

-- Fence writers must also lock the account. No mutation can "unblock"
-- an account while it still exists in Auth. No gameplay writer is granted
-- a fence table INSERT/UPDATE/DELETE privilege by this prototype.
CREATE FUNCTION private.world_boss_v57_fence_row_guard()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $fence$
DECLARE account_key uuid;
BEGIN
 account_key:=CASE WHEN TG_OP='DELETE' THEN OLD.account_id ELSE NEW.account_id END;
 PERFORM private.world_boss_v57_account_lock(account_key);
 IF TG_OP='UPDATE' AND
    (NEW.account_id IS DISTINCT FROM OLD.account_id OR
     NEW.status IS DISTINCT FROM OLD.status OR
     NEW.fenced_at IS DISTINCT FROM OLD.fenced_at)
 THEN RAISE EXCEPTION 'WB57_FENCE_IMMUTABLE'; END IF;
 IF TG_OP='DELETE' THEN
  IF EXISTS(SELECT 1 FROM auth.users WHERE id=OLD.account_id)
  THEN RAISE EXCEPTION 'WB57_CANNOT_UNFENCE_EXISTING_AUTH_ACCOUNT'; END IF;
  RETURN OLD;
 END IF;
 RETURN NEW;
END
$fence$;
CREATE TRIGGER world_boss_v57_fence_row_guard
 BEFORE INSERT OR UPDATE OR DELETE
 ON private.world_boss_erasure_fences_v57
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_fence_row_guard();

-- One trigger function covers all nine V36-reviewed identity columns.
-- Deletion is deliberately handled separately by the V55/V56 privileged
-- erasure plan; V35 retired-consent cascades must keep working.
CREATE FUNCTION private.world_boss_v57_personal_write_guard()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=''
AS $personal$
DECLARE
 field_name text:=TG_ARGV[0];
 next_owner uuid;
 previous_owner uuid;
BEGIN
 next_owner:=NULLIF(pg_catalog.to_jsonb(NEW)->>field_name,'')::uuid;
 IF TG_OP='UPDATE' THEN
  previous_owner:=NULLIF(pg_catalog.to_jsonb(OLD)->>field_name,'')::uuid;
  IF next_owner IS DISTINCT FROM previous_owner THEN
   -- The shared milestone keeps its one-time crossing fact but can be
   -- de-identified ONLY after the original owner's erasure fence exists.
   IF field_name='crossed_by_account' AND next_owner IS NULL AND
      previous_owner IS NOT NULL AND
      pg_catalog.to_jsonb(NEW)->>'crossed_by_request'='REDACTED'
   THEN
    PERFORM private.world_boss_v57_account_lock(previous_owner);
    IF NOT EXISTS(
      SELECT 1 FROM private.world_boss_erasure_fences_v57
      WHERE account_id=previous_owner)
    THEN RAISE EXCEPTION 'WB57_MILESTONE_REDACTION_REQUIRES_FENCE'; END IF;
    RETURN NEW;
   END IF;
   RAISE EXCEPTION 'WB57_ACCOUNT_OWNER_REASSIGNMENT_FORBIDDEN';
  END IF;
 END IF;
 IF next_owner IS NULL THEN
  IF field_name='crossed_by_account' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'WB57_ACCOUNT_REQUIRED';
 END IF;
 PERFORM private.world_boss_v57_assert_write_open(next_owner);
 RETURN NEW;
END
$personal$;

CREATE TRIGGER world_boss_v57_attempt_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_attempts_v17
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('account_id');
CREATE TRIGGER world_boss_v57_milestone_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_milestones_v17
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('crossed_by_account');
CREATE TRIGGER world_boss_v57_echo_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_echo_consents_v20
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('owner_account_id');
CREATE TRIGGER world_boss_v57_echo_command_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_consent_commands_v21
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('owner_account_id');
CREATE TRIGGER world_boss_v57_supply_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_war_donations_v27
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('account_id');
CREATE TRIGGER world_boss_v57_replay_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_replay_proofs_v28
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('account_id');
CREATE TRIGGER world_boss_v57_wallet_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_wallet_v28
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('account_id');
CREATE TRIGGER world_boss_v57_ledger_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_reward_ledger_v28
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('account_id');
CREATE TRIGGER world_boss_v57_claim_owner_write
 BEFORE INSERT OR UPDATE ON private.world_boss_claim_receipts_v28
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v57_personal_write_guard('account_id');

REVOKE ALL ON FUNCTION private.world_boss_v57_account_lock(uuid),
 private.world_boss_v57_assert_write_open(uuid),
 private.world_boss_v57_fence_row_guard(),
 private.world_boss_v57_personal_write_guard()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v57_account_lock(uuid),
 private.world_boss_v57_assert_write_open(uuid),
 private.world_boss_v57_fence_row_guard(),
 private.world_boss_v57_personal_write_guard()
 TO service_role;
COMMIT;
