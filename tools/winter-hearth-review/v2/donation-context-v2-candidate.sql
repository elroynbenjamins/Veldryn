-- REVIEW CANDIDATE: not an applied migration. Keep release flags off.
-- Wrap existing authoritative transaction with expected account, guild, character
-- and UTC week. A delayed request cannot spend in a different context.
BEGIN;
CREATE OR REPLACE FUNCTION public.winter_hearth_2026_donate_v2(
 p_item_id text,p_quantity integer,p_request_key text,p_account_id uuid,
 p_guild_id uuid,p_character_id text,p_week_start date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_uid uuid:=auth.uid();v_existing public.guild_winter_hearth_2026_donations;
 v_gid uuid;v_character text;
BEGIN
 IF v_uid IS NULL OR v_uid IS DISTINCT FROM p_account_id THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('winter-hearth-account:'||v_uid::text,0));
 SELECT * INTO v_existing FROM public.guild_winter_hearth_2026_donations WHERE account_id=v_uid AND request_key=p_request_key;
 IF FOUND THEN
  IF v_existing.guild_id IS DISTINCT FROM p_guild_id OR v_existing.item_id IS DISTINCT FROM p_item_id OR v_existing.quantity IS DISTINCT FROM p_quantity OR v_existing.week_start IS DISTINCT FROM p_week_start THEN RAISE EXCEPTION 'WINTER_HEARTH_NONCE_CONFLICT';END IF;
  RETURN jsonb_set(v_existing.receipt,'{alreadyProcessed}','true'::jsonb);
 END IF;
 IF p_week_start IS DISTINCT FROM (date_trunc('week',now() AT TIME ZONE 'UTC'))::date THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED';END IF;
 -- Same lock order as the original writer; all locks last until settlement.
 SELECT m.guild_id INTO v_gid FROM public.guild_members m WHERE m.account_id=v_uid ORDER BY m.joined_at DESC LIMIT 1 FOR SHARE;
 IF v_gid IS NULL OR v_gid IS DISTINCT FROM p_guild_id THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED';END IF;
 SELECT g.character_id::text INTO v_character FROM public.online_game_states g WHERE g.account_id=v_uid FOR UPDATE;
 IF v_character IS NULL OR v_character IS DISTINCT FROM p_character_id THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED';END IF;
 RETURN public.winter_hearth_2026_donate_v1(p_item_id,p_quantity,p_request_key);
END $$;
REVOKE ALL ON FUNCTION public.winter_hearth_2026_donate_v2(text,integer,text,uuid,uuid,text,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.winter_hearth_2026_donate_v2(text,integer,text,uuid,uuid,text,date) TO authenticated;
COMMIT;
