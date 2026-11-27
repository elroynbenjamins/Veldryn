-- PRIVATE REVIEW ONLY. No active migration, producer, grants or route.
BEGIN;
CREATE TABLE private.world_boss_damage_policy_v105(
 event_id uuid NOT NULL REFERENCES private.world_boss_events_v17(id),
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 boss_id text NOT NULL CHECK(boss_id IN ('hollowroot','sunscar','frostmarch')),
 bracket_id text NOT NULL CHECK(bracket_id ~ '^[a-z0-9_-]{1,48}$'),
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 1000000000000),
 damage_per_roll bigint NOT NULL CHECK(damage_per_roll BETWEEN 1 AND 1000000000000),
 entropy_version text NOT NULL CHECK(entropy_version ~ '^[a-z0-9_-]{1,48}$'),
 PRIMARY KEY(event_id,account_id)
);
CREATE TABLE private.world_boss_damage_rolls_v105(
 event_id uuid NOT NULL,
 account_id uuid NOT NULL,
 ordinal integer NOT NULL CHECK(ordinal BETWEEN 1 AND 1000),
 threshold_damage bigint NOT NULL CHECK(threshold_damage BETWEEN 1 AND 1000000000000),
 roll integer NOT NULL CHECK(roll BETWEEN 0 AND 9999),
 hit boolean NOT NULL CHECK(hit=(roll<1000)),
 source_key text NOT NULL UNIQUE,
 PRIMARY KEY(event_id,account_id,ordinal),
 FOREIGN KEY(event_id,account_id) REFERENCES private.world_boss_damage_policy_v105(event_id,account_id) ON DELETE CASCADE,
 CHECK(source_key='world-boss:'||event_id::text||':'||account_id::text||':damage:'||ordinal::text)
);
CREATE FUNCTION private.world_boss_damage_immutable_v105() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $v105$
BEGIN
 IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=OLD.account_id) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'WB_DAMAGE_V105_IMMUTABLE';
END
$v105$;
CREATE TRIGGER wb_damage_policy_immutable_v105 BEFORE UPDATE OR DELETE ON private.world_boss_damage_policy_v105
FOR EACH ROW EXECUTE FUNCTION private.world_boss_damage_immutable_v105();
CREATE TRIGGER wb_damage_roll_immutable_v105 BEFORE UPDATE OR DELETE ON private.world_boss_damage_rolls_v105
FOR EACH ROW EXECUTE FUNCTION private.world_boss_damage_immutable_v105();
CREATE FUNCTION private.world_boss_damage_append_v105() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $v105$
DECLARE p private.world_boss_damage_policy_v105%ROWTYPE; n integer; wins integer;
BEGIN
 SELECT * INTO STRICT p FROM private.world_boss_damage_policy_v105 WHERE event_id=NEW.event_id AND account_id=NEW.account_id FOR UPDATE;
 SELECT count(*)::int,count(*) FILTER(WHERE hit)::int INTO n,wins FROM private.world_boss_damage_rolls_v105
 WHERE event_id=NEW.event_id AND account_id=NEW.account_id;
 IF NEW.ordinal<>n+1 OR wins>=3 OR NEW.threshold_damage<>p.damage_per_roll*NEW.ordinal THEN
  RAISE EXCEPTION 'WB_DAMAGE_V105_INVALID_APPEND';
 END IF;
 RETURN NEW;
END
$v105$;
CREATE TRIGGER wb_damage_roll_append_v105 BEFORE INSERT ON private.world_boss_damage_rolls_v105
FOR EACH ROW EXECUTE FUNCTION private.world_boss_damage_append_v105();
ALTER TABLE private.world_boss_damage_policy_v105 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_damage_rolls_v105 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_damage_policy_v105,private.world_boss_damage_rolls_v105 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_damage_immutable_v105(),private.world_boss_damage_append_v105() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
