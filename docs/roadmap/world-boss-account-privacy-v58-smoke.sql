-- World Boss V58 private read-scope regression — disposable PG ONLY.
-- Requires V17/V57 fixtures already installed by hidden World Boss CI.
-- No staging/production connection, Auth Admin call or read endpoint.
-- All synthetic rows are inside BEGIN/ROLLBACK.
BEGIN;
INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000158'),
 ('10000000-0000-4000-8000-000000000159'),
 ('10000000-0000-4000-8000-000000000160');

DO $test$
DECLARE
 available_account uuid:='10000000-0000-4000-8000-000000000158';
 fenced_account uuid:='10000000-0000-4000-8000-000000000159';
 deleted_account uuid:='10000000-0000-4000-8000-000000000160';
 can_read boolean;
BEGIN
 -- Identical private query shape to the V58 TS adapter. One parameterized
 -- account UUID, no event selector and no client-supplied account name.
 SELECT (EXISTS(SELECT 1 FROM auth.users WHERE id=available_account)
  AND NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
   WHERE account_id=available_account)) INTO can_read;
 IF can_read IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'WB58_AUTHENTICATED_UNFENCED_ACCOUNT_BLOCKED'; END IF;

 INSERT INTO private.world_boss_erasure_fences_v57(account_id)
 VALUES(fenced_account);
 SELECT (EXISTS(SELECT 1 FROM auth.users WHERE id=fenced_account)
  AND NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
   WHERE account_id=fenced_account)) INTO can_read;
 IF can_read IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'WB58_FENCED_ACCOUNT_STILL_READABLE'; END IF;

 -- An old JWT must not expose receipts after the Auth identity is deleted,
 -- even if the privacy fence has already been finalized.
 DELETE FROM auth.users WHERE id=deleted_account;
 SELECT (EXISTS(SELECT 1 FROM auth.users WHERE id=deleted_account)
  AND NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
   WHERE account_id=deleted_account)) INTO can_read;
 IF can_read IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'WB58_DELETED_AUTH_IDENTITY_STILL_READABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=available_account)
 THEN RAISE EXCEPTION 'WB58_OTHER_AUTH_ACCOUNT_WAS_CHANGED'; END IF;

 IF has_table_privilege('anon',
  'private.world_boss_erasure_fences_v57','SELECT') OR
  has_table_privilege('authenticated',
  'private.world_boss_erasure_fences_v57','SELECT')
 THEN RAISE EXCEPTION 'WB58_FENCE_LEAKED_TO_MOBILE_ROLES'; END IF;

 RAISE NOTICE 'WORLD_BOSS_V58_PRIVATE_AUTH_AND_ERASURE_READ=PASS';
END
$test$;
ROLLBACK;
