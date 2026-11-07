BEGIN;

-- Daily Guild Token Activity should accept ordinary, server-settled gameplay.
-- Gameplay receipts are written by commit_online_game_server_v1 after engine
-- validation. Client-side opens, taps and unclaimed idle timers never qualify.
CREATE OR REPLACE FUNCTION private.guild_daily_token_verified_gameplay_credit_v1(
 p_account_id uuid,
 p_created_at timestamptz,
 p_response jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $verified$
DECLARE
 v_kind text := p_response #>> '{result,activity,kind}';
 v_reward jsonb := p_response #> '{result,reward}';
 v_xp numeric := 0;
 v_kills numeric := 0;
 v_elapsed numeric := 0;
 v_combat integer := 0;
 v_skilling integer := 0;
 v_guild uuid;
 v_day_guild uuid;
 v_day date;
BEGIN
 IF p_account_id IS NULL OR p_created_at IS NULL OR jsonb_typeof(v_reward) IS DISTINCT FROM 'object' THEN
  RETURN;
 END IF;
 IF jsonb_typeof(v_reward->'xp')='number' THEN v_xp:=(v_reward->>'xp')::numeric; END IF;
 IF jsonb_typeof(v_reward->'kills')='number' THEN v_kills:=(v_reward->>'kills')::numeric; END IF;
 IF jsonb_typeof(v_reward->'elapsedSeconds')='number' THEN v_elapsed:=(v_reward->>'elapsedSeconds')::numeric; END IF;
 -- A successfully completed reward, never an activity start, idle wait or open.
 IF v_elapsed<=0 OR (v_xp<=0 AND v_kills<=0) THEN RETURN; END IF;

 IF v_kind='combat' THEN
  v_combat:=1;
 ELSIF v_kind IN (
  'woodcutting','mining','fishing','herbalism','processing','alchemy',
  'cooking','smithing','tailoring','crafting','exploration','faith'
 ) THEN
  v_skilling:=1;
 ELSE
  RETURN;
 END IF;

 -- Earned only while a member; never retroactively after joining a guild.
 SELECT gm.guild_id INTO v_guild
 FROM public.guild_members gm
 WHERE gm.account_id=p_account_id AND gm.joined_at<=p_created_at
 ORDER BY gm.joined_at DESC LIMIT 1;
 IF v_guild IS NULL THEN RETURN; END IF;

 v_day:=(p_created_at AT TIME ZONE 'UTC')::date;
 INSERT INTO private.guild_muster_day_bindings(account_id,activity_date,guild_id)
 VALUES(p_account_id,v_day,v_guild)
 ON CONFLICT(account_id,activity_date) DO NOTHING;
 SELECT b.guild_id INTO v_day_guild
 FROM private.guild_muster_day_bindings b
 WHERE b.account_id=p_account_id AND b.activity_date=v_day;
 IF v_day_guild IS DISTINCT FROM v_guild THEN RETURN; END IF;

 -- One minimal Muster activity marker per type/day. Do not mint Guild Tokens
 -- here, bypass the separate check-in, or inflate existing contribution totals.
 INSERT INTO public.guild_muster_daily(
  guild_id,account_id,activity_date,contribution_points,check_in_points,
  combat_points,skilling_points,first_contribution_at,last_contribution_at
 ) VALUES (
  v_guild,p_account_id,v_day,1,0,v_combat,v_skilling,p_created_at,p_created_at
 )
 ON CONFLICT(guild_id,account_id,activity_date) DO UPDATE SET
  contribution_points=GREATEST(public.guild_muster_daily.contribution_points,1),
  combat_points=GREATEST(public.guild_muster_daily.combat_points,EXCLUDED.combat_points),
  skilling_points=GREATEST(public.guild_muster_daily.skilling_points,EXCLUDED.skilling_points),
  first_contribution_at=COALESCE(public.guild_muster_daily.first_contribution_at,EXCLUDED.first_contribution_at),
  last_contribution_at=GREATEST(public.guild_muster_daily.last_contribution_at,EXCLUDED.last_contribution_at)
 WHERE public.guild_muster_daily.contribution_points<1
    OR public.guild_muster_daily.combat_points<EXCLUDED.combat_points
    OR public.guild_muster_daily.skilling_points<EXCLUDED.skilling_points;
END
$verified$;

REVOKE ALL ON FUNCTION private.guild_daily_token_verified_gameplay_credit_v1(uuid,timestamptz,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.guild_daily_token_verified_gameplay_credit_v1(uuid,timestamptz,jsonb)
 TO service_role;

CREATE OR REPLACE FUNCTION private.guild_daily_token_verified_gameplay_trigger_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $verified_trigger$
BEGIN
 IF NEW.action='online_game_v1' THEN
  PERFORM private.guild_daily_token_verified_gameplay_credit_v1(NEW.account_id,NEW.created_at,NEW.response);
 END IF;
 RETURN NEW;
END
$verified_trigger$;

REVOKE ALL ON FUNCTION private.guild_daily_token_verified_gameplay_trigger_v1()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.guild_daily_token_verified_gameplay_trigger_v1()
 TO service_role;

DROP TRIGGER IF EXISTS trg_guild_daily_token_verified_gameplay_v1 ON public.server_action_receipts;
CREATE TRIGGER trg_guild_daily_token_verified_gameplay_v1
AFTER INSERT ON public.server_action_receipts
FOR EACH ROW EXECUTE FUNCTION private.guild_daily_token_verified_gameplay_trigger_v1();

-- Make already-completed qualifying activity claimable on the deployment day.
-- The same server-proof, membership and UTC-day guards above apply. No prior
-- days are reopened and all standard 10-token/weekly-cap claim rules remain.
DO $today$
DECLARE rec record;
BEGIN
 FOR rec IN
  SELECT r.account_id,r.created_at,r.response
  FROM public.server_action_receipts r
  WHERE r.action='online_game_v1'
   AND r.created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
  ORDER BY r.created_at
 LOOP
  PERFORM private.guild_daily_token_verified_gameplay_credit_v1(rec.account_id,rec.created_at,rec.response);
 END LOOP;
END
$today$;

COMMIT;
