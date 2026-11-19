-- V70 Universal Chest Settlement: PRIVATE REVIEW-ONLY SQL DRAFT.
-- Not a migration. DO NOT apply to staging/production or expose an RPC.
-- This intentionally does not overlap with private.party_event_reward_receipts_v61
-- or private.world_boss_chest_receipts_v61. A future approved migration must
-- reconcile older committed receipts without opening the same source twice.
-- Claims require a separate authenticated DB worker and physical reward ports.
BEGIN;
CREATE TABLE private.chest_account_fence_v70 (
 account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.chest_reward_receipts_v70 (
 source_key text PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 recipient_character_id uuid,
 proof_version text NOT NULL CHECK (length(proof_version) BETWEEN 3 AND 100),
 table_id text NOT NULL CHECK (table_id ~ '^[a-z][a-z0-9:_-]{1,100}$'),
 table_version text NOT NULL CHECK (table_version ~ '^[a-z][a-z0-9:_-]{1,100}$'),
 rules_version text NOT NULL DEFAULT 'chest-settlement-v69'
   CHECK (rules_version='chest-settlement-v69'),
 receipt jsonb NOT NULL CHECK (jsonb_typeof(receipt)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_key,account_id),
 CHECK (length(source_key) BETWEEN 20 AND 220 AND
  source_key ~ '^[a-z0-9:_-]+$' AND
  position(':'||account_id::text||':' in source_key)>0),
 CHECK (receipt->>'sourceKey'=source_key AND
  receipt->>'accountId'=account_id::text AND
  receipt->>'rulesVersion'=rules_version AND
  receipt->>'proofVersion'=proof_version AND
  receipt->>'tableId'=table_id AND
  receipt->>'tableVersion'=table_version AND
  receipt->>'committed'='true' AND
  jsonb_typeof(receipt->'guaranteed')='array' AND
  jsonb_typeof(receipt->'groups')='array' AND
  jsonb_typeof(receipt->'drops')='array' AND
  (recipient_character_id IS NULL AND receipt->'recipientCharacterId'='null'::jsonb
   OR recipient_character_id IS NOT NULL AND
    receipt->>'recipientCharacterId'=recipient_character_id::text))
);
CREATE INDEX chest_reward_receipts_account_v70
 ON private.chest_reward_receipts_v70(account_id,created_at);

CREATE TABLE private.chest_reward_grant_legs_v70 (
 source_key text NOT NULL,
 account_id uuid NOT NULL,
 leg_kind text NOT NULL CHECK(leg_kind IN ('guarantee','drop','inbox')),
 ordinal integer NOT NULL CHECK (ordinal BETWEEN 0 AND 39),
 reward_id text NOT NULL CHECK(length(reward_id) BETWEEN 1 AND 220),
 quantity bigint NOT NULL CHECK(quantity BETWEEN 0 AND 2147483647),
 grant_id text NOT NULL CHECK(length(grant_id) BETWEEN 1 AND 200),
 item_instance_id uuid UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(source_key,leg_kind,ordinal),
 UNIQUE(leg_kind,grant_id),
 FOREIGN KEY (source_key,account_id)
  REFERENCES private.chest_reward_receipts_v70(source_key,account_id)
  ON DELETE RESTRICT,
 CHECK (leg_kind='drop' OR item_instance_id IS NULL),
 CHECK (leg_kind<>'inbox' OR (ordinal=0 AND quantity=1))
);
CREATE INDEX chest_reward_grant_legs_account_v70
 ON private.chest_reward_grant_legs_v70(account_id,source_key);

/**/ -- Each grant leg must match its immutable canonical receipt.
CREATE FUNCTION private.chest_v70_leg_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE
 r private.chest_reward_receipts_v70%ROWTYPE;
 expectation jsonb;
 expected_type text;
BEGIN
 SELECT * INTO r FROM private.chest_reward_receipts_v70
 WHERE source_key=NEW.source_key AND account_id=NEW.account_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CHEST_V70_RECEIPT_NOT_FOUND'; END IF;
 IF NEW.leg_kind='inbox' THEN
  IF NEW.ordinal<>0 OR NEW.reward_id<>('inbox:'||NEW.source_key) OR
   NEW.quantity<>1 OR NEW.item_instance_id IS NOT NULL
  THEN RAISE EXCEPTION 'CHEST_V70_INVALID_INBOX_LEG'; END IF;
 ELSIF NEW.leg_kind='guarantee' THEN
  expectation:=r.receipt->'guaranteed'->NEW.ordinal;
  IF expectation IS NULL OR NEW.reward_id IS DISTINCT FROM expectation->>'id'
   OR NEW.quantity IS DISTINCT FROM (expectation->>'quantity')::bigint
   OR NEW.item_instance_id IS NOT NULL
  THEN RAISE EXCEPTION 'CHEST_V70_INVALID_GUARANTEE_LEG'; END IF;
 ELSE
  expectation:=r.receipt->'drops'->NEW.ordinal;
  IF expectation IS NULL THEN RAISE EXCEPTION 'CHEST_V70_INVALID_DROP_LEG'; END IF;
  expected_type:=expectation->>'type';
  IF NEW.reward_id IS DISTINCT FROM expectation->>'entryId'
   OR NEW.quantity IS DISTINCT FROM (expectation->>'quantity')::bigint
   OR (expected_type='equipment' AND NEW.item_instance_id IS NULL)
   OR (expected_type<>'equipment' AND NEW.item_instance_id IS NOT NULL)
  THEN RAISE EXCEPTION 'CHEST_V70_INVALID_DROP_LEG'; END IF;
 END IF;
 RETURN NEW;
END
$$;
CREATE TRIGGER chest_v70_guard_ledger_insert
 BEFORE INSERT ON private.chest_reward_grant_legs_v70
 FOR EACH ROW EXECUTE FUNCTION private.chest_v70_leg_insert_guard();

CREATE FUNCTION private.chest_v70_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
 RAISE EXCEPTION 'CHEST_V70_IMMUTABLE';
END
$$;
CREATE TRIGGER chest_v70_receipt_immutable
 BEFORE UPDATE OR DELETE ON private.chest_reward_receipts_v70
 FOR EACH ROW EXECUTE FUNCTION private.chest_v70_immutable();
CREATE TRIGGER chest_v70_grant_immutable
 BEFORE UPDATE OR DELETE ON private.chest_reward_grant_legs_v70
 FOR EACH ROW EXECUTE FUNCTION private.chest_v70_immutable();

ALTER TABLE private.chest_account_fence_v70 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.chest_reward_receipts_v70 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.chest_reward_grant_legs_v70 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.chest_account_fence_v70,
 private.chest_reward_receipts_v70,private.chest_reward_grant_legs_v70
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.chest_v70_immutable(),
 private.chest_v70_leg_insert_guard()
 FROM PUBLIC,anon,authenticated,service_role;
-- NO player/authenticated/service-role INSERT, UPDATE, DELETE or function
-- EXECUTE grants. Future private settlement role and erasure integration
-- must be audited, and each grant_id must reference a *real physical grant*.
COMMENT ON TABLE private.chest_reward_receipts_v70 IS
 'REVIEW-ONLY unified chest receipts. Do not deploy or enable public grants.';
COMMIT;
