-- Guild Activity earn-rate balance, October 2026.
-- Every new source award is halved and rounded UP to the next 5 Activity units.
-- Existing Guild Activity meters, completed quests and immutable receipts are
-- untouched; their original credited values must never be retroactively changed.
-- This affects Guild Quest completion, qualified Muster days and Guild Projects.
-- The reward display reads guild_quest_rarity_reward_v3, so it stays in sync.
BEGIN;

CREATE OR REPLACE FUNCTION public.guild_quest_rarity_reward_v3(r text)
RETURNS integer LANGUAGE sql IMMUTABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
 SELECT CASE r
  WHEN 'common' THEN 25       -- ceil(45 / 2 / 5) * 5
  WHEN 'uncommon' THEN 40     -- ceil(75 / 2 / 5) * 5
  WHEN 'rare' THEN 60         -- ceil(120 / 2 / 5) * 5
  WHEN 'epic' THEN 90         -- ceil(180 / 2 / 5) * 5
  ELSE 135                   -- ceil(270 / 2 / 5) * 5
 END
$$;
COMMENT ON FUNCTION public.guild_quest_rarity_reward_v3(text)
IS 'Guild Quest completion Activity units: 25/40/60/90/135; previous 45/75/120/180/270 halved, each rounded up to 5.';

CREATE OR REPLACE FUNCTION public.guild_activity_from_muster_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
 v_before_qualified boolean:=false;
 v_after_qualified boolean:=false;
 v_source_id text;
BEGIN
 v_before_qualified:=CASE WHEN tg_op='INSERT' THEN false ELSE coalesce(old.contribution_points,0)>=25 END;
 v_after_qualified:=coalesce(new.contribution_points,0)>=25;
 IF v_before_qualified OR NOT v_after_qualified THEN RETURN new; END IF;
 v_source_id:=new.account_id::text||':'||new.activity_date::text;
 PERFORM * FROM public.guild_activity_award_v1(
   new.guild_id, 'muster_day', v_source_id,
   15, -- ceil(25 / 2 / 5) * 5 = 15
   coalesce(new.last_contribution_at,clock_timestamp())
 );
 RETURN new;
END
$$;

CREATE OR REPLACE FUNCTION public.guild_activity_from_project_completion_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_units integer:=0;
BEGIN
 IF tg_op<>'UPDATE' OR old.status='completed' OR new.status<>'completed' THEN RETURN new; END IF;
 v_units:=CASE new.kind
   WHEN 'development' THEN 125 -- 250 => 125
   WHEN 'event' THEN 100       -- 200 => 100
   ELSE 75                    -- 150 => 75
 END;
 PERFORM * FROM public.guild_activity_award_v1(
  new.guild_id,'guild_project',new.id::text,v_units,coalesce(new.completed_at,clock_timestamp())
 );
 RETURN new;
END
$$;

COMMIT;
