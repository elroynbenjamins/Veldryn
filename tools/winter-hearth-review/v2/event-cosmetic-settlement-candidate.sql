-- REVIEW CANDIDATE ONLY: not a migration, never run on production or staging.
-- Promote via a new migration after staging validation; leave existing applied migrations intact.
-- Existing authoritative receipt table and ownership PK (guild_id,unlock_id) verified.
-- Awards run in the same transaction as the committed milestone.
BEGIN;
CREATE OR REPLACE FUNCTION private.frostfall_2026_milestone_cosmetics_review()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 INSERT INTO public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref)
 SELECT NEW.guild_id,r.cosmetic_id,'event','EVT_ANNUAL_012_2026'
 FROM (VALUES (50,'background_frostfall_winter_aurora_2026'),(75,'banner_frostfall_standard_2026'),(100,'border_frostfall_frozen_majesty_2026'),(100,'name_frostfall_aurora_2026')) AS r(percent,cosmetic_id)
 WHERE r.percent=NEW.percent
 ON CONFLICT(guild_id,unlock_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.frostfall_2026_milestone_cosmetics_review() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER frostfall_2026_milestone_cosmetics_review
 AFTER INSERT ON public.guild_winter_hearth_2026_milestones
 FOR EACH ROW EXECUTE FUNCTION private.frostfall_2026_milestone_cosmetics_review();
-- Reconcile only genuine existing milestone receipts, never raw client progress.
INSERT INTO public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref)
SELECT m.guild_id,r.cosmetic_id,'event','EVT_ANNUAL_012_2026'
FROM public.guild_winter_hearth_2026_milestones m
JOIN (VALUES (50,'background_frostfall_winter_aurora_2026'),(75,'banner_frostfall_standard_2026'),(100,'border_frostfall_frozen_majesty_2026'),(100,'name_frostfall_aurora_2026')) AS r(percent,cosmetic_id) ON r.percent=m.percent
ON CONFLICT(guild_id,unlock_id) DO NOTHING;
COMMIT;
