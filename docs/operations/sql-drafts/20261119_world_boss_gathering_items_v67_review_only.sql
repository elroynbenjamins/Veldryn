-- World Boss V67 durable gathering-item custody — REVIEW-ONLY DDL.
-- NOT A MIGRATION. Requires approved V17/V57/V61 private schema, erasure
-- teardown, resource ledgers, independent Equipment 2.0 review and PG16 CI.
-- No Supabase Data API/RPC access and no staging/production execution.
BEGIN;
CREATE TABLE private.world_boss_gathering_items_v67(
 instance_id uuid PRIMARY KEY,
 source_key text NOT NULL UNIQUE,
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id)
  ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 boss_id text NOT NULL CHECK(boss_id IN('hollowroot','sunscar','frostmarch')),
 slot text NOT NULL CHECK(slot IN
  ('helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring')),
 equipment_slot text NOT NULL CHECK(equipment_slot IN
  ('Helmet','Chest','Gloves','Legs','Boots','Weapon','Off-hand','Cape','Amulet','Ring')),
 piece_id text NOT NULL CHECK(piece_id LIKE 'WB64\_%' ESCAPE '\'),
 set_id text NOT NULL CHECK(set_id IN
  ('WB64_ROOTBOUND_HARVESTER','WB64_SUNFORGED_PROSPECTOR','WB64_RIMEBOUND_ANGLER')),
 tier text NOT NULL CHECK(tier IN
  ('T1','T2','T3','T4','T5','T6','T7','T8','T9')),
 rarity text NOT NULL CHECK(rarity IN
  ('common','uncommon','rare','epic','legendary','mythic')),
 quality integer NOT NULL CHECK(quality BETWEEN 0 AND 100),
 base_speed_bps integer NOT NULL CHECK(base_speed_bps BETWEEN 1 AND 500),
 roll jsonb NOT NULL CHECK(jsonb_typeof(roll)='object'),
 custody text NOT NULL DEFAULT 'account_bound_unclaimed_inventory'
  CHECK(custody IN('account_bound_unclaimed_inventory','equipped')),
 equipped_character_id uuid,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(source_key IN (
  'world-boss:'||event_id::text||':'||account_id::text||':donations_goal',
  'world-boss:'||event_id::text||':'||account_id::text||':three_attempts',
  'world-boss:'||event_id::text||':'||account_id::text||':community_damage_goal'
 )),
 CHECK(piece_id=set_id||'_'||upper(slot)),
 CHECK((custody='account_bound_unclaimed_inventory' AND equipped_character_id IS NULL)
    OR (custody='equipped' AND equipped_character_id IS NOT NULL)),
 CHECK(equipment_slot=CASE slot WHEN 'offhand' THEN 'Off-hand'
    ELSE initcap(slot) END),
 CHECK((boss_id='hollowroot' AND set_id='WB64_ROOTBOUND_HARVESTER'
         AND roll->>'skill'='woodcutting')
    OR (boss_id='sunscar' AND set_id='WB64_SUNFORGED_PROSPECTOR'
         AND roll->>'skill'='mining')
    OR (boss_id='frostmarch' AND set_id='WB64_RIMEBOUND_ANGLER'
         AND roll->>'skill'='fishing')),
 CHECK(roll->>'itemId'=piece_id AND roll->>'setId'=set_id AND
       roll->>'slot'=slot AND roll->>'rarity'=rarity AND
       (roll->>'quality')::integer=quality AND
       (roll->>'gatheringSpeedBasisPoints')::integer=base_speed_bps AND
       roll->>'primaryStat'='gathering_speed' AND
       (roll->>'combatPowerBonus')::integer=0 AND
       jsonb_typeof(roll->'bonusStats')='array' AND
       jsonb_array_length(roll->'bonusStats') BETWEEN 1 AND 2)
);
-- A committed V61 chest with gear must point at an actual exact item.
ALTER TABLE private.world_boss_chest_receipts_v61
 ADD CONSTRAINT world_boss_chest_v67_issued_item_fk
 FOREIGN KEY (gear_instance_id)
 REFERENCES private.world_boss_gathering_items_v67(instance_id)
 ON DELETE RESTRICT;

-- An eventual equip handler may change only custody and equipped owner;
-- it cannot reroll rarity, quality, affixes, tier, source, item or set.
CREATE FUNCTION private.world_boss_v67_immutable_roll_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $guard$
BEGIN
 IF ROW(NEW.instance_id,NEW.source_key,NEW.event_id,NEW.account_id,
    NEW.boss_id,NEW.slot,NEW.equipment_slot,NEW.piece_id,NEW.set_id,
    NEW.tier,NEW.rarity,NEW.quality,NEW.base_speed_bps,NEW.roll,NEW.created_at)
    IS DISTINCT FROM
    ROW(OLD.instance_id,OLD.source_key,OLD.event_id,OLD.account_id,
    OLD.boss_id,OLD.slot,OLD.equipment_slot,OLD.piece_id,OLD.set_id,
    OLD.tier,OLD.rarity,OLD.quality,OLD.base_speed_bps,OLD.roll,OLD.created_at)
 THEN RAISE EXCEPTION 'WB67_IMMUTABLE_ROLLED_ITEM'; END IF;
 RETURN NEW;
END
$guard$;
CREATE TRIGGER world_boss_v67_immutable_gear
 BEFORE UPDATE ON private.world_boss_gathering_items_v67
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v67_immutable_roll_guard();
REVOKE ALL ON FUNCTION private.world_boss_v67_immutable_roll_guard()
 FROM PUBLIC,anon,authenticated,service_role;

CREATE INDEX world_boss_gathering_owner_boss_v67
 ON private.world_boss_gathering_items_v67(account_id,boss_id,slot);
-- Source receipt and custody must commit in ONE transaction; inserting a
-- loose item without the final V61 source receipt must rollback completely.
-- The initial insert is unclaimed. Equipping requires a separately reviewed
-- owner-character, level/tier and anti-duplication service.
ALTER TABLE private.world_boss_gathering_items_v67 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_gathering_items_v67
 FROM PUBLIC,anon,authenticated,service_role;
-- No INSERT/UPDATE/DELETE grant or SECURITY DEFINER. Gameplay cannot write.
-- Include this account_id column in V57 identity audit and V55/V56 erasure
-- before any migration review. Treat pending account-wide gear as private.
COMMIT;
