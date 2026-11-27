-- PRIVATE REVIEW ONLY. Not an active Supabase migration.
-- Depends on V70 chest receipt and account fence. No public grants or routes.
BEGIN;
CREATE TABLE private.world_boss_gathering_mints_v102(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_key text NOT NULL UNIQUE,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 event_id uuid NOT NULL,
 boss_id text NOT NULL CHECK(boss_id IN ('hollowroot','sunscar','frostmarch')),
 piece_id text NOT NULL,
 slot text NOT NULL CHECK(slot IN ('helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring')),
 roll jsonb NOT NULL CHECK(jsonb_typeof(roll)='object'),
 roll_digest text NOT NULL CHECK(roll_digest ~ '^[0-9a-f]{64}$'),
 chest_digest text NOT NULL CHECK(chest_digest ~ '^[0-9a-f]{64}$'),
 entropy_version text NOT NULL CHECK(entropy_version ~ '^[a-z0-9_-]{1,48}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(source_key,account_id) REFERENCES private.chest_reward_receipts_v70(source_key,account_id) ON DELETE CASCADE,
 CHECK(source_key ~ '^world-boss:[0-9a-f-]{36}:[0-9a-f-]{36}:(donations_goal|three_attempts|community_damage_goal|damage:[1-9][0-9]*)$'),
 CHECK(split_part(source_key,':',2)=event_id::text AND split_part(source_key,':',3)=account_id::text),
 CHECK((roll->>'itemId'=piece_id AND roll->>'slot'=slot
  AND roll->>'rollVersion'='96' AND roll->>'source'='world_boss_chest_only'
  AND roll->>'combatPowerBonus'='0' AND roll->>'primaryStat'='gathering_speed'
  AND roll->>'rarity' IN ('common','uncommon','rare','epic','legendary','mythic')
  AND (roll->>'quality')::integer BETWEEN 0 AND 100) IS TRUE),
 UNIQUE(id,account_id)
);
-- Mutable ownership lives separately from immutable mint. Initially unclaimed.
CREATE TABLE private.world_boss_gathering_custody_v102(
 instance_id uuid PRIMARY KEY,
 account_id uuid NOT NULL,
 location text NOT NULL DEFAULT 'unclaimed' CHECK(location IN ('unclaimed','bank','inventory','equipped')),
 holder_character_id uuid,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=1),
 FOREIGN KEY(instance_id,account_id) REFERENCES private.world_boss_gathering_mints_v102(id,account_id) ON DELETE CASCADE,
 CHECK((location IN ('unclaimed','bank') AND holder_character_id IS NULL) OR
       (location IN ('inventory','equipped') AND holder_character_id IS NOT NULL))
);
CREATE INDEX world_boss_gathering_mints_account_v102 ON private.world_boss_gathering_mints_v102(account_id);
CREATE FUNCTION private.world_boss_gathering_mint_immutable_v102() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
 BEGIN
  IF TG_OP='DELETE' AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id=OLD.account_id) THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'WB_GATHERING_MINT_V102_IMMUTABLE';
 END $$;
CREATE TRIGGER world_boss_gathering_mint_immutable_v102 BEFORE UPDATE OR DELETE ON private.world_boss_gathering_mints_v102
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_gathering_mint_immutable_v102();
ALTER TABLE private.world_boss_gathering_mints_v102 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_gathering_custody_v102 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_gathering_mints_v102,private.world_boss_gathering_custody_v102 FROM public,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_gathering_mint_immutable_v102() FROM public,anon,authenticated,service_role;
COMMIT;
