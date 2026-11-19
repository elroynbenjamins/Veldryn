-- V80 REVIEW-ONLY, DISABLED: immutable *earned* chest entitlement.
-- NOT a Supabase migration. NEVER deploy to staging/production, expose RPC,
-- or substitute this for an approved physical reward/Equipment 2.0 issuer.
-- Stores proof + 1%/12-24% table BEFORE users can open; no RNG, reward,
-- actual item, wallet, Inbox credit or World Sigils are ever issued here.
-- Earning and opening are separate: future V70 claim must lock this row,
-- preserve the frozen table and server-derived tier, and link old V61 receipts
-- before any currency/item grant. No generic "chest claim" SQL is installed.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.chest_earned_entitlements_v80(
 source_key text PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 family text NOT NULL CHECK(family IN('party_event','world_boss')),
 tier smallint NOT NULL CHECK(tier BETWEEN 1 AND 9),
 boss_id text CHECK(boss_id IN('hollowroot','sunscar','frostmarch')),
 proof_version text NOT NULL CHECK(length(proof_version) BETWEEN 3 AND 100),
 table_id text NOT NULL CHECK(table_id IN('party_event_chest','world_boss_chest')),
 table_version text NOT NULL CHECK(table_version ~ '^[a-z][a-z0-9:_-]{1,100}$'),
 frozen_loot_table jsonb NOT NULL CHECK(
  jsonb_typeof(frozen_loot_table)='object' AND
  octet_length(frozen_loot_table::text) BETWEEN 80 AND 262144),
 earned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((family='world_boss' AND boss_id IS NOT NULL AND
   table_id='world_boss_chest' AND
   source_key ~ '^world-boss:[0-9a-f-]{36}:[0-9a-f-]{36}:(donations_goal|three_attempts|community_damage_goal)$')
 OR (family='party_event' AND boss_id IS NULL AND
   table_id='party_event_chest' AND
   source_key ~ '^party-event:[0-9]{13}:[0-9a-f-]{36}:(participation|preparation|finale)$')),
 CHECK (position(':'||account_id::text||':' in source_key)>0),
 CHECK ((frozen_loot_table->>'tableId'=table_id AND
   frozen_loot_table->>'version'=table_version AND
   jsonb_typeof(frozen_loot_table->'guarantees')='array' AND
   jsonb_typeof(frozen_loot_table->'groups')='array') IS TRUE),
 UNIQUE(source_key,account_id)
);
CREATE INDEX chest_earned_entitlements_account_v80
 ON private.chest_earned_entitlements_v80(account_id,earned_at DESC);
CREATE FUNCTION private.chest_v80_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $lock$
BEGIN
 RAISE EXCEPTION 'CHEST_V80_ENTITLEMENT_IMMUTABLE';
END $lock$;
CREATE TRIGGER chest_v80_immutable
 BEFORE UPDATE ON private.chest_earned_entitlements_v80
 FOR EACH ROW EXECUTE FUNCTION private.chest_v80_immutable();
ALTER TABLE private.chest_earned_entitlements_v80 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.chest_earned_entitlements_v80
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.chest_v80_immutable()
 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE private.chest_earned_entitlements_v80 IS
 'UNMOUNTED V80 escrow of a verified earned chest; no open/reward writer and no public access';
-- Future approved private service role requires explicit audited grants and
-- V57 erasure integration. No GRANT, policy, auth RPC, job or activation here.
COMMIT;
