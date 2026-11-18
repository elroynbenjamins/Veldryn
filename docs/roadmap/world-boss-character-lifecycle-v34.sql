-- World Boss V34 PRIVATE / DISPOSABLE CI contract. NOT A LIVE MIGRATION.
-- Preserve immutable event history after player character deletion, without
-- relaxing account-owner verification at the INSERT boundary.
-- Apply AFTER V17 and V27 tables, BEFORE the V34 lifecycle regression.
BEGIN;
CREATE FUNCTION private.world_boss_v34_check_owned_character()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $check$
BEGIN
 IF NEW.account_id IS NULL OR NEW.character_id IS NULL THEN
  RAISE EXCEPTION 'WB34_MISSING_ACCOUNT_CHARACTER';
 END IF;
 -- KEY SHARE also serializes against concurrent DELETE/owner reassignment
 -- until the receipt INSERT commits. A later delete is allowed, retaining
 -- the historical UUID without an FK to public.characters.
 PERFORM 1 FROM public.characters c
 WHERE c.id=NEW.character_id AND c.account_id=NEW.account_id
 FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB34_CHARACTER_NOT_OWNED'; END IF;
 RETURN NEW;
END
$check$;
CREATE TRIGGER world_boss_v34_attempt_owner_guard
 BEFORE INSERT ON private.world_boss_attempts_v17
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v34_check_owned_character();
CREATE TRIGGER world_boss_v34_donation_owner_guard
 BEFORE INSERT ON private.world_boss_war_donations_v27
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v34_check_owned_character();
REVOKE ALL ON FUNCTION private.world_boss_v34_check_owned_character()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v34_check_owned_character()
 TO service_role;
COMMIT;
