-- WORLD BOSS V36: PRIVATE read-only erasure preflight, CI fixture ONLY.
-- Not a migration. Never apply to staging or production without review.
-- Not an account-deletion endpoint, retention policy, or authorization layer.
-- V17/V20/V21/V27/V28 draft schemas must already exist.
-- For a verified account, report ONLY aggregate counts; do not expose IDs.
BEGIN;
CREATE FUNCTION private.world_boss_v36_erasure_preflight(p_account uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path=''
AS $preflight$
DECLARE
 expected_account_columns text[]:=ARRAY[
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
 actual_account_columns text[];
 attempts bigint;
 milestones bigint;
 consents bigint;
 consent_commands bigint;
 donations bigint;
 replays bigint;
 wallets bigint;
 ledger bigint;
 receipts bigint;
 outstanding bigint;
BEGIN
 IF p_account IS NULL
 THEN RAISE EXCEPTION 'WB36_ACCOUNT_REQUIRED'; END IF;
 -- V57 adds one explicitly reviewed identity column on the private
 -- erasure-tombstone table. It is not a gameplay receipt, but it must be
 -- recognized to preserve fail-closed schema drift checks after V57.
 IF pg_catalog.to_regclass('private.world_boss_erasure_fences_v57')
    IS NOT NULL THEN
  expected_account_columns:=array_append(expected_account_columns,
   'world_boss_erasure_fences_v57.account_id');
 END IF;
 -- V59 private erasure recovery records survive Auth deletion until a
 -- separately approved finalizer. Treat them as explicit identity columns.
 IF pg_catalog.to_regclass('private.world_boss_erasure_jobs_v59')
    IS NOT NULL THEN
  expected_account_columns:=array_append(expected_account_columns,
   'world_boss_erasure_jobs_v59.account_id');
 END IF;
 IF pg_catalog.to_regclass('private.world_boss_erasure_objects_v59')
    IS NOT NULL THEN
  expected_account_columns:=array_append(expected_account_columns,
   'world_boss_erasure_objects_v59.account_id');
 END IF;
 -- Every player-linked private World Boss table must be explicitly
 -- reviewed. Addition, deletion, renaming, or silent new account columns
 -- makes the preflight fail closed, rather than approving an incomplete wipe.
 SELECT coalesce(array_agg(DISTINCT (c.relname||'.'||a.attname)
            ORDER BY (c.relname||'.'||a.attname)),
                 ARRAY[]::text[]) INTO actual_account_columns
 FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_attribute a ON a.attrelid=c.oid
 WHERE n.nspname='private' AND c.relname LIKE 'world_boss_%'
 AND c.relkind IN ('r','p')
 AND NOT a.attisdropped
 AND a.attname IN ('account_id','owner_account_id','crossed_by_account');
 IF actual_account_columns<>(
   SELECT array_agg(x ORDER BY x) FROM unnest(expected_account_columns) x)
 THEN RAISE EXCEPTION 'WB36_UNREVIEWED_ACCOUNT_DATA'; END IF;

 SELECT count(*) INTO attempts FROM private.world_boss_attempts_v17
 WHERE account_id=p_account;
 SELECT count(*) INTO milestones FROM private.world_boss_milestones_v17
 WHERE crossed_by_account=p_account;
 SELECT count(*) INTO consents FROM private.world_boss_echo_consents_v20
 WHERE owner_account_id=p_account;
 SELECT count(*) INTO consent_commands
 FROM private.world_boss_consent_commands_v21
 WHERE owner_account_id=p_account;
 SELECT count(*) INTO donations FROM private.world_boss_war_donations_v27
 WHERE account_id=p_account;
 SELECT count(*) INTO replays FROM private.world_boss_replay_proofs_v28
 WHERE account_id=p_account;
 SELECT count(*) INTO wallets FROM private.world_boss_wallet_v28
 WHERE account_id=p_account;
 SELECT count(*) INTO ledger FROM private.world_boss_reward_ledger_v28
 WHERE account_id=p_account;
 SELECT count(*) INTO receipts FROM private.world_boss_claim_receipts_v28
 WHERE account_id=p_account;
 outstanding:=attempts+milestones+consents+consent_commands+
  donations+replays+wallets+ledger+receipts;
 RETURN jsonb_build_object(
  'schema','world-boss-v36-erasure-preflight',
  'status',CASE WHEN outstanding=0 THEN 'no_world_boss_rows'
   ELSE 'blocked_pending_reconciliation' END,
  'requiresReconciliation',outstanding>0,
  'counts',jsonb_build_object(
   'attempts',attempts,'milestones',milestones,
   'retiredConsents',consents,'retiredConsentCommands',consent_commands,
   'donations',donations,'replays',replays,'walletRows',wallets,
   'rewardLedgerEntries',ledger,'claimReceipts',receipts),
  'externalReplayReviewRequired',replays>0,
  'note','World Boss data preflight only; does not authorize account deletion'
 );
END
$preflight$;
REVOKE ALL ON FUNCTION private.world_boss_v36_erasure_preflight(uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v36_erasure_preflight(uuid)
 TO service_role;
COMMIT;
