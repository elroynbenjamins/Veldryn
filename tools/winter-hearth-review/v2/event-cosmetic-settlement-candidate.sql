-- REVIEW CANDIDATE ONLY. Promote to a new migration after isolated QA.
-- This script never enables the event or releases a cosmetic.
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

-- Extend only the five verified CHECK constraints. Preserve every existing
-- allowed value, including construction and prior event cosmetics.
DO $constraints$
DECLARE r record; old_expr text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('public.guilds','guilds_background_id_check','background_id','background_frostfall_winter_aurora_2026'),
  ('public.guild_appearance','guild_appearance_background_id_check','background_id','background_frostfall_winter_aurora_2026'),
  ('public.guilds','guilds_banner_id_v52_check','banner_id','banner_frostfall_standard_2026'),
  ('public.guilds','guilds_profile_frame_id_v52_check','profile_frame_id','border_frostfall_frozen_majesty_2026'),
  ('public.guilds','guilds_name_color_id_v52_check','name_color_id','name_frostfall_aurora_2026')
 ) AS x(table_name,constraint_name,column_name,new_id) LOOP
  SELECT pg_get_expr(c.conbin,c.conrelid) INTO STRICT old_expr FROM pg_constraint c
  WHERE c.conrelid=r.table_name::regclass AND c.conname=r.constraint_name AND c.contype='c';
  IF position(r.new_id in old_expr)=0 THEN
   EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I CHECK ((%s) OR %I=%L)',r.table_name::regclass,r.constraint_name,r.constraint_name,old_expr,r.column_name,r.new_id);
  END IF;
 END LOOP;
END $constraints$;

-- Read release metadata without exposing the private catalogue. A release is
-- permanent across season expiry; no check of the current live event window.
CREATE OR REPLACE FUNCTION public.guild_frostfall_cosmetic_releases_v1()
RETURNS text[] LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.guild_members m WHERE m.account_id=auth.uid()) THEN RAISE EXCEPTION 'NOT_IN_GUILD';END IF;
 RETURN coalesce((SELECT array_agg(c.cosmetic_id ORDER BY c.cosmetic_id)
 FROM private.guild_event_cosmetic_catalog c WHERE c.event_id='EVT_ANNUAL_012_2026' AND c.released),'{}'::text[]);
END $$;
REVOKE ALL ON FUNCTION public.guild_frostfall_cosmetic_releases_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_frostfall_cosmetic_releases_v1() TO authenticated;

-- Dedicated seasonal wrapper. The existing validators still check all normal,
-- construction and Halloween selections, and increment revision exactly once.
CREATE OR REPLACE FUNCTION public.update_guild_appearance_with_frostfall_v1(
 p_banner_id text,p_border_id text,p_name_color_id text,p_tag_color_id text,
 p_nameplate_id text,p_motto text,p_background_id text
) RETURNS TABLE(guild_id uuid,banner_id text,border_id text,name_color_id text,tag_color_id text,nameplate_id text,motto text,revision bigint,background_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_uid uuid:=auth.uid();v_gid uuid;v_role text;r record;
 v_banner text:=p_banner_id;v_border text:=p_border_id;
 v_name text:=p_name_color_id;v_background text:=p_background_id;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED';END IF;
 IF coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'LINK_ACCOUNT_REQUIRED';END IF;
 IF p_banner_id IS NULL OR p_border_id IS NULL OR p_name_color_id IS NULL OR p_tag_color_id IS NULL OR p_nameplate_id IS NULL OR p_background_id IS NULL THEN RAISE EXCEPTION 'INVALID_GUILD_APPEARANCE';END IF;
 SELECT m.guild_id INTO v_gid FROM public.guild_members m WHERE m.account_id=v_uid LIMIT 1;
 IF v_gid IS NULL THEN RAISE EXCEPTION 'NOT_IN_GUILD';END IF;
 PERFORM 1 FROM public.guilds g WHERE g.id=v_gid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_IN_GUILD';END IF;
 SELECT m.role INTO v_role FROM public.guild_members m WHERE m.guild_id=v_gid AND m.account_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_role IS NULL OR v_role NOT IN ('leader','officer') THEN RAISE EXCEPTION 'GUILD_OFFICER_REQUIRED';END IF;
 FOR r IN SELECT * FROM (VALUES (p_banner_id,'banner'),(p_border_id,'border'),(p_name_color_id,'name_color'),(p_background_id,'background')) AS x(id,kind) LOOP
  IF EXISTS(SELECT 1 FROM private.guild_event_cosmetic_catalog c WHERE c.cosmetic_id=r.id) THEN
   IF NOT EXISTS(
    SELECT 1 FROM private.guild_event_cosmetic_catalog c
    JOIN public.guild_cosmetic_unlocks u ON u.unlock_id=c.cosmetic_id AND u.source_kind='event' AND u.source_ref=c.event_id
    WHERE c.cosmetic_id=r.id AND c.cosmetic_kind=r.kind AND c.event_id='EVT_ANNUAL_012_2026' AND c.released AND u.guild_id=v_gid
   ) THEN RAISE EXCEPTION 'GUILD_EVENT_COSMETIC_LOCKED_OR_WRONG_SLOT';END IF;
  END IF;
 END LOOP;
 IF p_banner_id='banner_frostfall_standard_2026' THEN v_banner:='world_tree_green';END IF;
 IF p_border_id='border_frostfall_frozen_majesty_2026' THEN v_border:='classic';END IF;
 IF p_name_color_id='name_frostfall_aurora_2026' THEN v_name:='name_ivory';END IF;
 IF p_background_id='background_frostfall_winter_aurora_2026' THEN v_background:='plain';END IF;
 IF v_banner='guild_banner_stormwatch' OR v_border='guild_frame_verdant' THEN
  PERFORM public.update_guild_appearance_with_construction_v1(v_banner,v_border,v_name,p_tag_color_id,p_nameplate_id,p_motto,v_background);
 ELSE
  PERFORM public.update_guild_appearance_with_background_v3(v_banner,v_border,v_name,p_tag_color_id,p_nameplate_id,p_motto,v_background);
 END IF;
 UPDATE public.guilds g SET banner_id=p_banner_id,profile_frame_id=p_border_id,name_color_id=p_name_color_id,background_id=p_background_id WHERE g.id=v_gid;
 UPDATE public.guild_appearance a SET banner_id=p_banner_id,border_id=p_border_id,name_color_id=p_name_color_id,background_id=p_background_id WHERE a.guild_id=v_gid;
 RETURN QUERY SELECT g.id,g.banner_id,g.profile_frame_id,g.name_color_id,g.tag_color_id,g.nameplate_id,g.motto,a.revision,g.background_id
 FROM public.guilds g JOIN public.guild_appearance a ON a.guild_id=g.id WHERE g.id=v_gid;
END $$;
REVOKE ALL ON FUNCTION public.update_guild_appearance_with_frostfall_v1(text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_guild_appearance_with_frostfall_v1(text,text,text,text,text,text,text) TO authenticated;
COMMIT;
