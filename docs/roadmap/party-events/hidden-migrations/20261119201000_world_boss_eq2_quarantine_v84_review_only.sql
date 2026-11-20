-- V84: review-only, separate **unclaimed/quarantined** EQ2 World Boss
-- item custody draft. NOT yet wearable inventory, player-accessible, or live.
-- Never deploy without independent EQ2 manifest import/transfer/equip hooks.
BEGIN;
CREATE TABLE private.world_boss_eq2_event_manifest_v84(
 template_key text PRIMARY KEY,
 piece_id text NOT NULL,
 set_id text NOT NULL,
 boss_id text NOT NULL CHECK(boss_id IN('hollowroot','sunscar','frostmarch')),
 slot text NOT NULL CHECK(slot IN('helmet','chest','gloves','legs','boots',
  'weapon','offhand','cape','amulet','ring')),
 tier smallint NOT NULL CHECK(tier BETWEEN 1 AND 5),
 stat_family text NOT NULL DEFAULT 'gathering_speed_only'
  CHECK(stat_family='gathering_speed_only'),
 enabled boolean NOT NULL DEFAULT false,
 UNIQUE(piece_id,tier)
);
CREATE TABLE private.world_boss_eq2_unclaimed_items_v84(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 source_key text NOT NULL UNIQUE,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 event_id uuid NOT NULL,
 drop_index smallint NOT NULL CHECK(drop_index BETWEEN 0 AND 19),
 template_key text NOT NULL REFERENCES private.world_boss_eq2_event_manifest_v84(template_key),
 piece_id text NOT NULL,set_id text NOT NULL,
 boss_id text NOT NULL CHECK(boss_id IN('hollowroot','sunscar','frostmarch')),
 slot text NOT NULL,
 tier smallint NOT NULL CHECK(tier BETWEEN 1 AND 5),
 rarity text NOT NULL CHECK(rarity IN('common','uncommon','rare','epic','legendary','mythic')),
 quality smallint NOT NULL CHECK(quality BETWEEN 0 AND 100),
 roll jsonb NOT NULL CHECK(jsonb_typeof(roll)='object'),
 snapshot_hash text NOT NULL CHECK(snapshot_hash ~ '^[a-f0-9]{64}$'),
 custody text NOT NULL DEFAULT 'quarantined_unclaimed' CHECK(
  custody='quarantined_unclaimed'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(source_key,account_id)
  REFERENCES private.chest_reward_receipts_v70(source_key,account_id)
  ON DELETE CASCADE,
 CHECK(source_key ~ '^world-boss:[0-9a-f-]{36}:[0-9a-f-]{36}:(donations_goal|three_attempts|community_damage_goal)$'
  AND position(':'||account_id::text||':' in source_key)>0
  AND position('world-boss:'||event_id::text||':' in source_key)=1),
 CHECK((roll->>'itemId'=piece_id AND roll->>'setId'=set_id
   AND roll->>'slot'=slot AND roll->>'rarity'=rarity AND
   (roll->>'quality')::integer=quality AND
   (roll->>'rollVersion')::integer=65 AND
   roll->>'combatPowerBonus'='0' AND
   roll->>'primaryStat'='gathering_speed') IS TRUE)
);
CREATE INDEX world_boss_eq2_unclaimed_account_v84
 ON private.world_boss_eq2_unclaimed_items_v84(account_id,created_at);
CREATE FUNCTION private.world_boss_eq2_v84_no_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $v84$
BEGIN RAISE EXCEPTION 'WB_EQ2_V84_QUARANTINE_IMMUTABLE'; END $v84$;
CREATE TRIGGER world_boss_eq2_v84_no_update
 BEFORE UPDATE ON private.world_boss_eq2_unclaimed_items_v84
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_eq2_v84_no_update();
ALTER TABLE private.world_boss_eq2_event_manifest_v84 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_eq2_unclaimed_items_v84 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_eq2_event_manifest_v84,
 private.world_boss_eq2_unclaimed_items_v84 FROM public,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_eq2_v84_no_update()
 FROM public,anon,authenticated,service_role;
-- No enabled records, public RPC, gameplay inventory, claim, or physical
-- transfer writer is created. This is a quarantined proof, NOT a usable item.
COMMIT;
