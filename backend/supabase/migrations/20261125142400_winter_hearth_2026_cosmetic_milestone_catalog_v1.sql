-- Staging-only permanent milestone settlement; all catalog releases are off.
BEGIN;
CREATE TABLE IF NOT EXISTS private.guild_event_cosmetic_catalog (
 cosmetic_id text PRIMARY KEY,
 event_id text NOT NULL,
 cosmetic_kind text NOT NULL CHECK (cosmetic_kind IN ('background','banner','border','name_color')),
 milestone_percent integer NOT NULL CHECK (milestone_percent IN (25,50,75,100)),
 released boolean NOT NULL DEFAULT false
);
ALTER TABLE private.guild_event_cosmetic_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.guild_event_cosmetic_catalog FROM PUBLIC,anon,authenticated;
INSERT INTO private.guild_event_cosmetic_catalog(cosmetic_id,event_id,cosmetic_kind,milestone_percent)
VALUES
 ('background_frostfall_winter_aurora_2026','EVT_ANNUAL_012_2026','background',50),
 ('banner_frostfall_standard_2026','EVT_ANNUAL_012_2026','banner',75),
 ('border_frostfall_frozen_majesty_2026','EVT_ANNUAL_012_2026','border',100),
 ('name_frostfall_aurora_2026','EVT_ANNUAL_012_2026','name_color',100)
ON CONFLICT(cosmetic_id) DO NOTHING;

-- Ownership originates only in the committed joint-track milestone receipt.
CREATE OR REPLACE FUNCTION private.frostfall_2026_milestone_cosmetics_review()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 INSERT INTO public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref)
 SELECT NEW.guild_id,c.cosmetic_id,'event',c.event_id
 FROM private.guild_event_cosmetic_catalog c
 WHERE c.event_id='EVT_ANNUAL_012_2026' AND c.milestone_percent=NEW.percent
 ON CONFLICT(guild_id,unlock_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.frostfall_2026_milestone_cosmetics_review() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS frostfall_2026_milestone_cosmetics_review ON public.guild_winter_hearth_2026_milestones;
CREATE TRIGGER frostfall_2026_milestone_cosmetics_review
 AFTER INSERT ON public.guild_winter_hearth_2026_milestones
 FOR EACH ROW EXECUTE FUNCTION private.frostfall_2026_milestone_cosmetics_review();
INSERT INTO public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref)
SELECT m.guild_id,c.cosmetic_id,'event',c.event_id
FROM public.guild_winter_hearth_2026_milestones m
JOIN private.guild_event_cosmetic_catalog c ON c.event_id='EVT_ANNUAL_012_2026' AND c.milestone_percent=m.percent
ON CONFLICT(guild_id,unlock_id) DO NOTHING;

COMMIT;
