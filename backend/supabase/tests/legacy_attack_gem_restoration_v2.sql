-- Staging integration test for 2.0 historical ATK gem restoration.
-- Uses one existing staging save but restores it via ROLLBACK, including
-- temporary backup/receipt/gate mutations. NEVER run on production.
-- Requires the v2 migration installed and the gate initially disabled.
begin;
do $tests$
declare
  v_account uuid;
  v_state jsonb;
  v_backup jsonb;
  v_revision bigint;
  v_request uuid:=gen_random_uuid();
  v_response jsonb;
  v_retry jsonb;
  v_preview jsonb;
  v_new_state jsonb;
  v_n bigint;
begin
  if exists (select 1 from private.legacy_attack_gem_restoration_settings_v2 where singleton and enabled) then
    raise exception 'test_requires_disabled_gate';
  end if;
  select account_id,state,revision into v_account,v_state,v_revision
    from public.online_game_states where state is not null and state ? 'account'
      and state ? 'settings' order by updated_at asc limit 1 for update;
  if not found then raise exception 'test_requires_staging_account'; end if;
  if exists (select 1 from private.legacy_gem_conversion_backup_v1 where account_id=v_account) then
    raise exception 'test_requires_unconverted_fixture_account';
  end if;

  v_backup:=jsonb_set(v_state,'{account,gemPouch}',jsonb_build_object(
    'capacity',20,'stacks',jsonb_build_array(
      jsonb_build_object('itemId','EMBER_SHARD','quantity',3),
      jsonb_build_object('itemId','EMBERHEART_GEM','quantity',1)
    )
  ),true);
  insert into private.legacy_gem_conversion_backup_v1(account_id,previous_revision,original_state)
    values(v_account,v_revision,v_backup);

  v_state:=jsonb_set(v_state,'{account,gemPouch}',jsonb_build_object(
    'capacity',20,'stacks',jsonb_build_array(
      jsonb_build_object('itemId','gem:stat_might:g1','quantity',9),
      jsonb_build_object('itemId','gem:stat_might:g3','quantity',4)
    )
  ),true);
  v_state:=jsonb_set(v_state,'{settings,lockedItemIds}','[]'::jsonb,true);
  v_state:=jsonb_set(v_state,'{settings,favoriteItemIds}','[]'::jsonb,true);
  update public.online_game_states set state=v_state,revision=revision+1
    where account_id=v_account;
  select revision into v_revision from public.online_game_states where account_id=v_account;

  perform set_config('request.jwt.claim.sub',v_account::text,true);
  v_preview:=public.preview_legacy_attack_gem_restoration_v2();
  if v_preview->>'enabled'<>'false' or
     v_preview#>>'{restorations,0,canRestoreNow}'<>'3' or
     v_preview#>>'{restorations,1,canRestoreNow}'<>'1' then
    raise exception 'preview_not_consistent_with_verified_backup: %',v_preview;
  end if;

  begin
    perform public.claim_legacy_attack_gem_restoration_v2('EMBER_SHARD',1,v_request,v_revision);
    raise exception 'disabled_gate_must_reject_claim';
  exception when others then
    if SQLERRM<>'v2_restoration_not_enabled' then raise; end if;
  end;

  update private.legacy_attack_gem_restoration_settings_v2
    set enabled=true,updated_at=clock_timestamp() where singleton=true;
  v_response:=public.claim_legacy_attack_gem_restoration_v2('EMBER_SHARD',2,v_request,v_revision);
  if v_response->>'status'<>'restored'
     or v_response#>>'{consumed,quantity}'<>'6'
     or v_response#>>'{granted,itemId}'<>'gem:stat_might:g3' then
    raise exception 'incorrect_claim_receipt: %',v_response;
  end if;
  select revision,state into v_n,v_new_state from public.online_game_states where account_id=v_account;
  if v_n<>v_revision+1 or
    private.v2_legacy_attack_gem_quantity_v2(v_new_state,'gem:stat_might:g1',true)<>3 or
    private.v2_legacy_attack_gem_quantity_v2(v_new_state,'gem:stat_might:g3',true)<>6 then
    raise exception 'claim_must_atomically_consume_and_grant';
  end if;

  v_retry:=public.claim_legacy_attack_gem_restoration_v2('EMBER_SHARD',2,v_request,v_revision);
  if v_retry<>v_response then raise exception 'same_request_must_be_idempotent';end if;
  if (select revision from public.online_game_states where account_id=v_account)<>v_n then
    raise exception 'retry_must_not_modify_revision';end if;

  begin
    perform public.claim_legacy_attack_gem_restoration_v2('EMBER_SHARD',1,v_request,v_revision);
    raise exception 'request_uuid_reuse_must_conflict';
  exception when others then
    if SQLERRM<>'v2_restoration_idempotency_conflict' then raise;end if;
  end;
  begin
    perform public.claim_legacy_attack_gem_restoration_v2('EMBER_SHARD',1,gen_random_uuid(),v_revision);
    raise exception 'stale_revision_must_reject';
  exception when others then
    if SQLERRM<>'stale_state' then raise;end if;
  end;
  begin
    perform public.claim_legacy_attack_gem_restoration_v2('EMBER_SHARD',2,gen_random_uuid(),v_n);
    raise exception 'historical_cap_must_reject';
  exception when others then
    if SQLERRM<>'v2_restoration_exceeds_historical_balance' then raise;end if;
  end;

  v_response:=public.claim_legacy_attack_gem_restoration_v2(
    'EMBERHEART_GEM',1,gen_random_uuid(),v_n
  );
  if v_response#>>'{granted,itemId}'<>'LEGACY_EMBERHEART_GEM_V2' then
    raise exception 'must_use_protected_emberheart_id';
  end if;
  select state,revision into v_new_state,v_n
    from public.online_game_states where account_id=v_account;
  if private.v2_legacy_attack_gem_quantity_v2(v_new_state,'LEGACY_EMBERHEART_GEM_V2',true)<>1
     or private.v2_legacy_attack_gem_quantity_v2(v_new_state,'EMBERHEART_GEM',true)<>0 then
    raise exception 'restored_emberheart_must_survive_on_save_legacy_trigger';
  end if;
  v_preview:=public.preview_legacy_attack_gem_restoration_v2();
  if v_preview#>>'{restorations,1,status}'<>'already_restored' or
     v_preview#>>'{restorations,0,remainingEligible}'<>'1' then
    raise exception 'preview_receipts_not_reconciled: %',v_preview;
  end if;
  if (select sum(quantity) from private.legacy_attack_gem_restoration_receipts_v2
      where account_id=v_account)<>3 then
    raise exception 'receipts_must_count_cumulative_originals';
  end if;
end;
$tests$;
rollback;
-- Only the migration itself should remain: gate OFF, no new receipts/backups.
select (select enabled from private.legacy_attack_gem_restoration_settings_v2 where singleton) as gate_enabled,
       (select count(*) from private.legacy_attack_gem_restoration_receipts_v2) as receipt_count,
       (select count(*) from private.legacy_gem_conversion_backup_v1) as staged_backup_count;
