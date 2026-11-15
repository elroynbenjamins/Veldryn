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
  guild_receipt uuid:=gen_random_uuid();
  party_ends timestamptz:=clock_timestamp()-interval '1 day';
  party_final timestamptz:=clock_timestamp();
  guild_ends timestamptz:=clock_timestamp()-interval '1 day';
  guild_final timestamptz:=clock_timestamp();
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
  IF has_table_privilege('anon',
       'private.rankings_final_mode_settlement_receipts_v1','INSERT')
     OR has_table_privilege('authenticated',
       'private.rankings_final_mode_settlement_receipts_v1','INSERT')
  THEN RAISE EXCEPTION 'FINAL_RECEIPTS_CLIENT_WRITABLE'; END IF;

  party_rows:=jsonb_build_array(
    jsonb_build_object('entityId',party_one,'entityType','party','displayName','Alpha Party',
      'value',900,'secondaryValue',20,'rank',999),
    jsonb_build_object('entityId',party_two,'entityType','party','displayName','Bravo Party',
      'value',900,'secondaryValue',20,'rank',888),
    jsonb_build_object('entityId',third_party,'entityType','party','displayName','Charlie Party',
      'value',100,'secondaryValue',0,'rank',1)
  );
  -- Even a syntactically valid final score set must be refused if no
  -- trusted Day-8 settlement receipt has been registered.
  BEGIN
    PERFORM public.rankings_final_mode_seal_server_v1(
      'party_event',event_id,'damage','standard:4',receipt,
      party_ends,party_final,party_rows);
    RAISE EXCEPTION 'PROVISIONAL_PARTY_RESULT_WAS_SEALED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'COMPETITIVE_FINAL_RECEIPT_NOT_REGISTERED' THEN RAISE; END IF;
  END;

  -- Synthetic staging-only stand-in for a FUTURE verified mode finalizer.
  INSERT INTO private.rankings_final_mode_settlement_receipts_v1(
    id,mode,event_key,metric,bracket,event_ends_at,finalized_at,
    source_version,entries_digest
  ) VALUES(
    receipt,'party_event',event_id,'damage','standard:4',
    party_ends,party_final,1,pg_catalog.md5(party_rows::text)
  );
  PERFORM public.rankings_final_mode_seal_server_v1(
    'party_event',event_id,'damage','standard:4',receipt,
    party_ends,party_final,party_rows);
  SELECT rows INTO original FROM private.rankings_final_mode_archives_v1
  WHERE mode='party_event' AND event_key=event_id
    AND metric='damage' AND bracket='standard:4';
  IF (original->0->>'rank')::integer<>1
    OR (original->1->>'rank')::integer<>1
    OR (original->2->>'rank')::integer<>3
  THEN RAISE EXCEPTION 'PARTY_FINAL_SHARED_RANKS_INVALID'; END IF;

  -- A retried genuine settlement is harmless and cannot replace the seal.
  PERFORM public.rankings_final_mode_seal_server_v1(
    'party_event',event_id,'damage','standard:4',receipt,
    party_ends,party_final,party_rows);
  BEGIN
    PERFORM public.rankings_final_mode_seal_server_v1(
      'party_event',event_id,'damage','standard:4',receipt,
      party_ends,party_final,
      jsonb_build_array(jsonb_build_object('entityId',party_one,
        'entityType','party','displayName','Injected Party','value',999999)));
    RAISE EXCEPTION 'FORGED_PARTY_RESULT_WAS_SEALED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'COMPETITIVE_FINAL_RECEIPT_NOT_REGISTERED' THEN RAISE; END IF;
  END;
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
  -- Equal final scores share the same rank; UUID is the internal
  -- deterministic order, so Alpha and Bravo may appear in either position.
  IF jsonb_array_length(snap->'entries')<>3
    OR (snap->'entries'->0->>'rank')::integer<>1
    OR (snap->'entries'->1->>'rank')::integer<>1
    OR (snap->'entries'->2->>'rank')::integer<>3
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snap->'entries') e
      WHERE e.value->>'displayName'='Alpha Party')
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(snap->'entries') e
      WHERE e.value->>'displayName'='Bravo Party')
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
  INSERT INTO private.rankings_final_mode_settlement_receipts_v1(
    id,mode,event_key,metric,bracket,event_ends_at,finalized_at,
    source_version,entries_digest
  ) VALUES(
    guild_receipt,'guild_pve',guild_event,'campaign_score','tier1',
    guild_ends,guild_final,1,pg_catalog.md5(guild_rows::text)
  );
  PERFORM public.rankings_final_mode_seal_server_v1(
    'guild_pve',guild_event,'campaign_score','tier1',guild_receipt,
    guild_ends,guild_final,guild_rows);
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
      party_ends,party_final,
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

  -- Even a privileged accidental UPDATE/DELETE cannot rewrite an official
  -- finalized result or its matching settlement receipt.
  BEGIN
    UPDATE private.rankings_final_mode_archives_v1
    SET rows='[]'::jsonb
    WHERE mode='party_event' AND event_key=event_id
      AND metric='damage' AND bracket='standard:4';
    RAISE EXCEPTION 'PUBLISHED_ARCHIVE_MUTATION_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'FINAL_RANKING_RECORD_IMMUTABLE' THEN RAISE; END IF;
  END;
  BEGIN
    DELETE FROM private.rankings_final_mode_settlement_receipts_v1
    WHERE id=receipt;
    RAISE EXCEPTION 'CERTIFIED_RECEIPT_DELETION_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'FINAL_RANKING_RECORD_IMMUTABLE' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE private.rankings_final_mode_settlement_receipts_v1
    SET entries_digest=repeat('0',32) WHERE id=receipt;
    RAISE EXCEPTION 'CERTIFIED_RECEIPT_TAMPER_ACCEPTED';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'FINAL_RANKING_RECORD_IMMUTABLE' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'Party and Guild finalized archive gating, ties, immutability and identity passed';
END $final_modes$;
