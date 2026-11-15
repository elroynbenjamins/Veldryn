-- Staging-only synthetic finalized Party Event and Guild PvE archive contract.
-- Run with the proposal inside ONE explicit BEGIN / ROLLBACK transaction.
DO $final_modes$
DECLARE
  event_id text:='qa-party-'||substr(md5(clock_timestamp()::text),1,12);
  guild_event text:='qa-guild-'||substr(md5(random()::text),1,12);
  guild_id uuid;
  party_one uuid:=gen_random_uuid();
  party_two uuid:=gen_random_uuid();
  third_party uuid:=gen_random_uuid();
  receipt uuid:=gen_random_uuid();
  snap jsonb;
  original jsonb;
  party_rows jsonb;
  guild_rows jsonb;
BEGIN
  IF has_function_privilege('anon',
    'public.rankings_final_mode_seal_server_v1(text,text,text,text,uuid,timestamptz,timestamptz,jsonb)','EXECUTE')
    OR has_function_privilege('authenticated',
    'public.rankings_final_mode_history_server_v1(text,text,text,text,integer,integer)','EXECUTE')
  THEN RAISE EXCEPTION 'FINAL_ARCHIVE_FUNCTION_EXPOSED'; END IF;

  party_rows:=jsonb_build_array(
    jsonb_build_object('entityId',party_one,'entityType','party','displayName','Alpha Party',
      'value',900,'secondaryValue',20,'rank',999),
    jsonb_build_object('entityId',party_two,'entityType','party','displayName','Bravo Party',
      'value',900,'secondaryValue',20,'rank',888),
    jsonb_build_object('entityId',third_party,'entityType','party','displayName','Charlie Party',
      'value',100,'secondaryValue',0,'rank',1)
  );
  PERFORM public.rankings_final_mode_seal_server_v1(
    'party_event',event_id,'damage','standard:4',receipt,
    clock_timestamp()-interval '1 day',clock_timestamp(),party_rows);
  SELECT rows INTO original FROM private.rankings_final_mode_archives_v1
  WHERE mode='party_event' AND event_key=event_id
    AND metric='damage' AND bracket='standard:4';
  IF (original->0->>'rank')::integer<>1
    OR (original->1->>'rank')::integer<>1
    OR (original->2->>'rank')::integer<>3
  THEN RAISE EXCEPTION 'PARTY_FINAL_SHARED_RANKS_INVALID'; END IF;

  PERFORM public.rankings_final_mode_seal_server_v1(
    'party_event',event_id,'damage','standard:4',receipt,
    clock_timestamp()-interval '1 day',clock_timestamp(),
    jsonb_build_array(jsonb_build_object('entityId',party_one,'entityType','party',
      'displayName','Injected Party','value',999999)));
  SELECT rows INTO snap FROM private.rankings_final_mode_archives_v1
  WHERE mode='party_event' AND event_key=event_id
    AND metric='damage' AND bracket='standard:4';
  IF snap IS DISTINCT FROM original
  THEN RAISE EXCEPTION 'PARTY_FINAL_ARCHIVE_OVERWRITTEN'; END IF;

  BEGIN
    PERFORM public.rankings_final_mode_history_server_v1(
      'party_event',event_id,'damage','standard:4',50,0);
    RAISE EXCEPTION 'PARTY_RANKINGS_PUBLIC_WHILE_GATED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'FINAL_MODE_RANKINGS_DISABLED' THEN RAISE; END IF;
  END;
  UPDATE private.rankings_final_mode_gates_v1 SET enabled=true
  WHERE mode='party_event';
  SELECT public.rankings_final_mode_history_server_v1(
    'party_event',event_id,'damage','standard:4',50,0) INTO snap;
  IF jsonb_array_length(snap->'entries')<>3
    OR snap->'entries'->0->>'displayName'<>'Alpha Party'
  THEN RAISE EXCEPTION 'PARTY_FINAL_HISTORY_READ_INVALID'; END IF;
  IF position(party_one::text IN snap::text)>0
  THEN RAISE EXCEPTION 'PARTY_FINAL_HISTORY_LEAKED_ENTITY_UUID'; END IF;

  SELECT id INTO guild_id FROM public.guilds ORDER BY id LIMIT 1;
  IF guild_id IS NULL THEN
    guild_id:=gen_random_uuid();
    INSERT INTO public.guilds(id,name,owner_account_id,level,xp,member_cap)
    SELECT guild_id,'QA Guild',account_id,1,0,12
    FROM public.player_profiles ORDER BY account_id LIMIT 1;
  END IF;
  guild_rows:=jsonb_build_array(jsonb_build_object(
    'entityId',guild_id,'entityType','guild','displayName','Guild Final Label',
    'value',800,'secondaryValue',7));
  PERFORM public.rankings_final_mode_seal_server_v1(
    'guild_pve',guild_event,'campaign_score','tier1',gen_random_uuid(),
    clock_timestamp()-interval '1 day',clock_timestamp(),guild_rows);
  UPDATE private.rankings_final_mode_gates_v1 SET enabled=true
  WHERE mode='guild_pve';
  SELECT public.rankings_final_mode_history_server_v1(
    'guild_pve',guild_event,'campaign_score','tier1',50,0) INTO snap;
  IF jsonb_array_length(snap->'entries')<>1
    OR (snap->'entries'->0->>'value')::integer<>800
  THEN RAISE EXCEPTION 'GUILD_PVE_FINAL_HISTORY_READ_INVALID'; END IF;

  BEGIN
    PERFORM public.rankings_final_mode_seal_server_v1(
      'party_event',event_id,'damage','standard:4',receipt,
      clock_timestamp()-interval '1 day',clock_timestamp(),
      jsonb_build_array(
        jsonb_build_object('entityId',party_one,'entityType','party',
          'displayName','Alpha Party','value',100),
        jsonb_build_object('entityId',party_one,'entityType','party',
          'displayName','Duplicate Party','value',999)
      ));
    RAISE EXCEPTION 'DUPLICATE_PARTY_SETTLEMENT_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'INVALID_COMPETITIVE_FINAL_ENTRIES' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'Party and Guild finalized archive gating, ties, immutability and identity passed';
END $final_modes$;
