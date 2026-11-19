-- WORLD BOSS V61/V62: ISOLATED DESIGN DDL, NOT AN EXECUTABLE MIGRATION.
-- DO NOT APPLY TO STAGING OR PRODUCTION. DO NOT mount a claim RPC/route.
-- Requires approved private V17/V18/V27/V28 and V57 erasure fences, and a
-- transactional Equipment 2.0 issuer. This schema alone CANNOT grant items.
-- Execute ONLY in disposable, authorized PostgreSQL integration fixtures.
BEGIN;

CREATE TABLE private.world_boss_chest_receipts_v61 (
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 boss_id text NOT NULL CHECK (boss_id IN ('hollowroot','sunscar','frostmarch')),
 chest_kind text NOT NULL CHECK (
  chest_kind IN ('donations_goal','three_attempts','community_damage_goal')),
 source_key text NOT NULL UNIQUE,
 rules_version text NOT NULL DEFAULT 'world-boss-chest-receipt-v61'
  CHECK (rules_version='world-boss-chest-receipt-v61'),
 status text NOT NULL DEFAULT 'committed' CHECK(status='committed'),
 gear_hit boolean NOT NULL,
 gear_instance_id uuid UNIQUE,
 gear_tier text CHECK(gear_tier IN
  ('T1','T2','T3','T4','T5','T6','T7','T8','T9')),
 gear_roll jsonb,
 gold integer NOT NULL CHECK(gold>=0),
 gem_dust integer NOT NULL CHECK(gem_dust>=0),
 tempering_dust integer NOT NULL CHECK(tempering_dust>=0),
 companion_essence integer NOT NULL CHECK(companion_essence>=0),
 world_sigils_delta integer NOT NULL DEFAULT 0 CHECK(world_sigils_delta=0),
 inbox_source_key text NOT NULL UNIQUE,
 immutable_receipt jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(event_id,account_id,chest_kind),
 CHECK (source_key =
  'world-boss:'||event_id::text||':'||account_id::text||':'||chest_kind),
 CHECK(inbox_source_key=source_key),
 CHECK (gear_hit = (gear_instance_id IS NOT NULL)),
 CHECK ((NOT gear_hit AND gear_tier IS NULL AND gear_roll IS NULL) OR
  (gear_hit AND gear_tier IS NOT NULL AND
   gear_roll IS NOT NULL AND jsonb_typeof(gear_roll)='object')),
 CHECK(jsonb_typeof(immutable_receipt)='object')
);
CREATE INDEX world_boss_v61_claims_account_event
 ON private.world_boss_chest_receipts_v61(account_id,event_id);
-- Separate per-source effects to prevent a duplicate resource, equipment
-- or Inbox grant even if an adapter accidentally repeats a successful step.
CREATE TABLE private.world_boss_chest_grant_sources_v61(
 source_key text NOT NULL REFERENCES
  private.world_boss_chest_receipts_v61(source_key) ON DELETE RESTRICT,
 component text NOT NULL CHECK(component IN
  ('gold','gem_dust','tempering_dust','companion_essence','equipment','inbox')),
 grant_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(source_key,component),
 UNIQUE(component,grant_id)
);
-- This table does NOT substitute for unique source columns on real inventory,
-- account wallets and Inbox. Those must enforce the same sourceKey in their
-- final released schemas inside ONE database transaction.
CREATE FUNCTION private.world_boss_chest_v61_immutable_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
 RAISE EXCEPTION 'WB61_IMMUTABLE_RECEIPT';
END;
$$;
CREATE TRIGGER world_boss_v61_receipt_immutable
 BEFORE UPDATE OR DELETE ON private.world_boss_chest_receipts_v61
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_chest_v61_immutable_guard();
CREATE TRIGGER world_boss_v61_grant_immutable
 BEFORE UPDATE OR DELETE ON private.world_boss_chest_grant_sources_v61
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_chest_v61_immutable_guard();
ALTER TABLE private.world_boss_chest_receipts_v61 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_chest_grant_sources_v61 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_chest_receipts_v61,
 private.world_boss_chest_grant_sources_v61
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_chest_v61_immutable_guard()
 FROM PUBLIC,anon,authenticated,service_role;
-- No service-role write grant is provided. A future explicit private role
-- grant + V57 write-fence trigger MUST be reviewed as part of the migration.
COMMIT;

-- Mandatory migration blockers:
-- 1. Integrate into V57 account-erasure lock-order/column inventory and
--    private V55/V56 erase/redaction with a data-retention decision.
-- 2. Implement one private READ COMMITTED tx account fence -> account/event
--    lock -> immutable receipt lookup -> trusted V18/V27/V28 proof -> owned
--    slots/tier -> HMAC result -> 2.0 issuer -> all resource/equipment/Inbox
--    grants -> commit. A crash anywhere must roll EVERYTHING back.
-- 3. Enforce exact item instance uniqueness on actual Equipment 2.0 storage,
--    account-wide ownership and tier policy. This draft does not do it.
-- 4. Run two-session PG16 races, key rotation and delete/claim races before
--    any deployment; prove that the unique receipt/Inbox/instance constraints
--    hold and secret rotation never recomputes a committed result.
