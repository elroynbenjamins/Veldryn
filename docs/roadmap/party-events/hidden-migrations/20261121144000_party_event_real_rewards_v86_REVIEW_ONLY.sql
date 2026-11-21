-- Party Events V86: REVIEW ONLY. Never install in staging or production
-- before V11/V61/V65/V70 source, wallet/Inbox and account erasure approval.
-- This adds an immutable resource-grant audit for real existing wallets, not
-- a replacement for the one canonical Party Sigils V65 balance/ledger.
-- Every insert MUST occur on V70's same SERIALIZABLE account-locked session.
BEGIN;

CREATE TABLE private.party_event_chest_resource_grants_v86 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL,
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT party_event_v86_same_account_receipt
    FOREIGN KEY(source_key,account_id)
    REFERENCES private.chest_reward_receipts_v70(source_key,account_id)
    ON DELETE CASCADE,
  credited_character_id uuid NOT NULL,
  ordinal smallint NOT NULL CHECK (ordinal BETWEEN 0 AND 3),
  reward_id text NOT NULL CHECK (reward_id IN
    ('party_sigils','gold','gem_dust','companion_essence')),
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 2147483647),
  custody text NOT NULL CHECK (custody IN
    ('party_sigils','character_wallet','inventory','bank','account_state')),
  balance_before bigint NOT NULL CHECK (balance_before >= 0),
  balance_after bigint NOT NULL CHECK (balance_after >= balance_before),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT party_event_v86_exact_delta
    CHECK (balance_after-balance_before=quantity),
  CONSTRAINT party_event_v86_ordinal_reward CHECK (
    (ordinal=0 AND reward_id='party_sigils' AND custody='party_sigils') OR
    (ordinal=1 AND reward_id='gold' AND custody='character_wallet') OR
    (ordinal=2 AND reward_id='gem_dust' AND custody IN ('inventory','bank')) OR
    (ordinal=3 AND reward_id='companion_essence' AND custody='account_state')
  ),
  CONSTRAINT party_event_v86_one_grant_per_source_ordinal
    UNIQUE(source_key,ordinal)
);
CREATE INDEX party_event_v86_account_source
 ON private.party_event_chest_resource_grants_v86(account_id,source_key);
ALTER TABLE private.party_event_chest_resource_grants_v86
 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.party_event_chest_resource_grants_v86
 FROM public,anon,authenticated,service_role;
GRANT SELECT ON private.party_event_chest_resource_grants_v86 TO service_role;

-- Only a privileged audited worker could ever write these audit rows; normal
-- service_role and player callers get no write permissions or public RPC.
CREATE OR REPLACE FUNCTION private.party_event_v86_immutable_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $party_v86$
BEGIN
 RAISE EXCEPTION 'party_event_v86_immutable_audit';
END;
$party_v86$;
CREATE TRIGGER party_event_v86_no_update
 BEFORE UPDATE ON private.party_event_chest_resource_grants_v86
 FOR EACH ROW EXECUTE FUNCTION private.party_event_v86_immutable_update();
REVOKE ALL ON FUNCTION private.party_event_v86_immutable_update()
 FROM public,anon,authenticated,service_role;

-- DELETE is intentionally not blocked by trigger: auth.users erasure must
-- cascade through both V70 receipt and this child audit row.
COMMENT ON TABLE private.party_event_chest_resource_grants_v86 IS
 'UNDEPLOYED / REVIEW ONLY: physical Party V86 resource audit, V65 is the single Party Sigils currency owner. No public writer.';

COMMIT;
