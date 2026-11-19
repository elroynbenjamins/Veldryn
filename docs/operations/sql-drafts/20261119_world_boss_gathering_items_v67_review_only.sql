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
 CHECK(source_key LIKE 'world-boss:'||event_id::text||':'||account_id::text||':%'),
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
