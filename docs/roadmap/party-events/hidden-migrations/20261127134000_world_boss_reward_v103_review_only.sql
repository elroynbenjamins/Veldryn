-- V103 physical World Boss resource grant journal. REVIEW-ONLY / UNMOUNTED.
-- Uses EXISTING public.character_wallets / public.online_game_states /
-- private.reward_inbox_v1. Does not create a substitute game wallet.
-- DO NOT copy into backend/supabase/migrations or deploy.
BEGIN;
CREATE TABLE private.world_boss_chest_resource_grants_v103(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_key text NOT NULL,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 character_id uuid NOT NULL,
 ordinal smallint NOT NULL CHECK(ordinal BETWEEN 0 AND 4),
 reward_id text NOT NULL CHECK(reward_id IN (
  'gold','companion_essence','gem_dust','tempering_dust','IRONWOOD_LOG','SUNSTONE_ORE','ICEFIN')),
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 2147483647),
 balance_before bigint NOT NULL CHECK(balance_before >= 0),
 balance_after bigint NOT NULL CHECK(
  balance_after >= balance_before AND balance_after - balance_before = quantity),
 custody text NOT NULL CHECK(custody IN (
  'character_wallet','account_state','inventory','bank')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source_key,ordinal),
 FOREIGN KEY(source_key,account_id)
  REFERENCES private.chest_reward_receipts_v70(source_key,account_id)
  ON DELETE CASCADE,
 CHECK(source_key ~ '^world-boss:[0-9a-f-]{36}:[0-9a-f-]{36}:(donations_goal|three_attempts|community_damage_goal|damage:[1-9][0-9]*)$'
  AND position(':'||account_id::text||':' in source_key)>0),
 CHECK((reward_id='gold' AND custody='character_wallet') OR
  (reward_id='companion_essence' AND custody='account_state') OR
  (reward_id IN ('gem_dust','tempering_dust','IRONWOOD_LOG','SUNSTONE_ORE','ICEFIN') AND
   custody IN ('inventory','bank')))
);
CREATE INDEX world_boss_chest_resource_grants_account_v103
 ON private.world_boss_chest_resource_grants_v103(account_id,source_key);
CREATE FUNCTION private.world_boss_chest_v103_no_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $v103$
BEGIN
 IF TG_OP='DELETE' AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id=OLD.account_id) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'WB_CHEST_V103_IMMUTABLE'; END $v103$;
CREATE TRIGGER world_boss_chest_v103_immutable
 BEFORE UPDATE OR DELETE ON private.world_boss_chest_resource_grants_v103
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_chest_v103_no_updates();
ALTER TABLE private.world_boss_chest_resource_grants_v103 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_chest_resource_grants_v103
 FROM public,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_chest_v103_no_updates()
 FROM public,anon,authenticated,service_role;
COMMENT ON TABLE private.world_boss_chest_resource_grants_v103 IS
 'Private review-only audit of verified physical chest credits to existing state and character wallet; no permission to claim';
-- Account erasure needs reviewed V57 archiving/deletion policy first.
COMMIT;
