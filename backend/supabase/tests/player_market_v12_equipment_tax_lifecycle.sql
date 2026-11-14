-- Hidden Market V12 with V10/V11 rules: no real accounts, no persistence, no runtime activation.
-- All synthetic identities, gate loosening, Gold and equipment are ROLLBACK.
begin;
set local statement_timeout='65s';
do $v9_test$
declare
  v_seller uuid:=gen_random_uuid();
  v_buyer uuid:=gen_random_uuid();
  v_rival uuid:=gen_random_uuid();
  v_seller_char uuid:=gen_random_uuid();
  v_buyer_main uuid:=gen_random_uuid();
  v_buyer_alt uuid:=gen_random_uuid();
  v_rival_char uuid:=gen_random_uuid();
  v_item text:='FORGE_T1_BASTION';
  v_instance text:='forge-v9-mythic-001';
  v_stack jsonb;
  v_receipt jsonb;
  v_result jsonb;
  v_retry jsonb;
  v_hold uuid;
  v_offer uuid;
  v_delivery uuid;
  v_rebound jsonb;
  v_claim jsonb;
  v_inbox jsonb;
  v_browse jsonb;
  v_other_instance text:='forge-v9-mythic-002';
  v_hold2 uuid;
  v_offer2 uuid;
  v_return_id uuid;
  v_resale_id uuid;
  v_resale_again uuid;
  v_resale_delivery uuid;
  v_second_delivery uuid;
  v_second_resale_id uuid;
  v_resource_asset uuid;
  v_resource_hold uuid;
  v_resource_offer uuid;
  v_chain_receipt jsonb;
begin
  insert into auth.users(id,email) values
    (v_seller,'v9-seller-'||v_seller||'@example.invalid'),
    (v_buyer,'v9-buyer-'||v_buyer||'@example.invalid'),
    (v_rival,'v9-rival-'||v_rival||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,gold) values
    (v_seller_char,v_seller,'GearTrader','BASTION',100),
    (v_buyer_main,v_buyer,'GearBuyer','BASTION',500),
    (v_buyer_alt,v_buyer,'GearAlt','BASTION',0),
    (v_rival_char,v_rival,'GearRival','BASTION',300);
  insert into public.character_wallets(character_id,gold) values
    (v_seller_char,100),(v_buyer_main,500),(v_buyer_alt,0),(v_rival_char,300);
  v_stack:=jsonb_build_object(
    'itemId',v_item,'quantity',1,'instanceId',v_instance);
  v_receipt:=jsonb_build_object(
    'id',v_instance,'itemId',v_item,'ownerCharacterId',v_seller_char::text,
    'rarity','mythic','quality',93,'statRoll',0.732,'locked',false,
    'acquireSource','craft','sourceReceiptKey','craft-v9-first',
    'createdAtMs',1234,'enhancement',jsonb_build_object(
      'rank',3,'failures',2,'statGemId','gem:stat_might:g2',
      'statGemRollPercent',115,'effectGemRollPercent',85,
      'effectGemId','gem:effect_momentum:g1',
      'gemIds',jsonb_build_array('gem:stat_might:g2','gem:effect_momentum:g1')));
  insert into public.online_game_states(account_id,character_id,revision,state) values
    (v_seller,v_seller_char,5,jsonb_build_object(
      'character',jsonb_build_object('id',v_seller_char::text,'gold',100,
        'equipment','{}'::jsonb,'savedLoadouts','[]'::jsonb),
      'account',jsonb_build_object('craftedGearInstances',jsonb_build_array(v_receipt)),
      'inventory',jsonb_build_object('capacity',20,'stacks',jsonb_build_array(v_stack,
        jsonb_build_object('itemId','COPPER_ORE','quantity',7))),
      'bank',jsonb_build_object('capacity',20,'stacks','[]'::jsonb),
      'otherCharacters','[]'::jsonb,
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
        'favoriteItemIds','[]'::jsonb))),
    (v_buyer,v_buyer_main,7,jsonb_build_object(
      'character',jsonb_build_object('id',v_buyer_main::text,'gold',500,
        'xp',10000000,'classId','BASTION','equipment','{}'::jsonb,
        'equipmentPouch',jsonb_build_object('capacity',2,'stacks','[]'::jsonb)),
      'account',jsonb_build_object('craftedGearInstances','[]'::jsonb),
      'inventory',jsonb_build_object('capacity',1,'stacks',jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',1))),
      'bank',jsonb_build_object('capacity',2,'stacks',jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',1))),
      'otherCharacters',jsonb_build_array(jsonb_build_object(
        'character',jsonb_build_object('id',v_buyer_alt::text,
           'xp',0,'classId','BASTION',
           'equipmentPouch',jsonb_build_object('capacity',3,'stacks','[]'::jsonb),
           'equipment','{}'::jsonb),
        'inventory',jsonb_build_object('capacity',2,'stacks','[]'::jsonb))),
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb))),
    (v_rival,v_rival_char,4,jsonb_build_object(
      'character',jsonb_build_object('id',v_rival_char::text,'gold',300),
      'account',jsonb_build_object('craftedGearInstances','[]'::jsonb),
      'inventory',jsonb_build_object('capacity',10,'stacks','[]'::jsonb),
      'bank',jsonb_build_object('capacity',10,'stacks','[]'::jsonb)));

  -- Function ACLs and hard-false gate deny all live operations.
  if has_function_privilege('anon',
       'private.market_publish_equipment_offer_v9(uuid,uuid,bigint,integer,text,text)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('authenticated',
       'private.market_purchase_equipment_offer_v9(uuid,uuid,bigint,integer,bigint,bigint,text,text)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('service_role',
       'private.market_claim_equipment_purchase_v9(uuid,uuid,bigint,text,text,text,text)'::regprocedure,
       'EXECUTE')
  then raise exception 'market_v9_exposed_to_api';end if;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,gen_random_uuid(),125,1,7,6,'gear-v9-disabled',repeat('a',64));
    raise exception 'disabled equipment purchase was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;

  -- QA ONLY. Every row & gate change below ends in transaction ROLLBACK.
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  execute 'alter table private.market_equipment_guard_v8 drop constraint market_equipment_guard_v8_equipment_transfers_enabled_check';
  update private.market_runtime_guard_v1 set trading_enabled=true,snapshot_bridge_ready=true;
  update private.market_equipment_guard_v8 set equipment_transfers_enabled=true;
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
    values(v_item,'equipment',true,'unbound'),
      ('gem:stat_might:g2','gem',true,'unbound'),
      ('gem:effect_momentum:g1','gem',true,'unbound');
  execute 'alter table private.market_acquisition_policy_v18 drop constraint market_acquisition_v18_approved_check';
  insert into private.market_acquisition_policy_v18(
    item_id,asset_kind,source_tier,item_required_level,required_class_id,approved)
    values(v_item,'equipment','T1',2,'BASTION',true);
  insert into private.market_price_bands_v10
    (item_id,asset_kind,min_unit_price,max_unit_price,approved)
    values(v_item,'equipment',5,30,true);
  if private.market_quote_price_band_v10(v_item,'equipment',
      jsonb_build_object('exactReceipt',v_receipt))->>'approved'<>'true'
  then raise exception 'exact_gear_price_band_not_approved';end if;

  v_result:=private.market_reserve_exact_equipment_v8(
    v_seller,5,'inventory',v_seller_char::text,0,v_item,v_instance,
    'gear-v9-reserve',repeat('b',64));
  v_hold:=(v_result->>'holdId')::uuid;
  begin
    perform private.market_publish_equipment_offer_v9(
      v_seller,v_hold,30,1,'gear-v12-underfloor',repeat('0',64));
    raise exception 'gear under-floor listing accepted';
  exception when raise_exception then
    if sqlerrm<>'market_price_out_of_range' then raise;end if;
  end;
  v_result:=private.market_publish_equipment_offer_v9(
    v_seller,v_hold,125,1,'gear-v9-list',repeat('c',64));
  v_offer:=(v_result->>'offerId')::uuid;
  -- V24 unified source displays the existing first-sale listing exactly once.
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',null,null,25,0);
  if (v_browse->>'total')::integer<>1
    or v_browse#>>'{entries,0,sourceKind}'<>'original'
    or v_browse#>>'{entries,0,offerId}'<>v_offer::text
    or v_browse#>>'{entries,0,rarity}'<>'mythic'
    or v_browse#>>'{entries,0,quality}'<>'93'
    or v_browse::text like '%sourceReceiptKey%'
    or v_browse::text like '%ownerCharacterId%'
    or v_browse::text like '%sellerAccountId%'
  then raise exception 'V24 unified browse broke original Forge listing';end if;
  v_browse:=private.market_browse_verified_offers_v12(
    'equipment',v_item,'T1','newest',null,null,25,0);
  if (v_browse->>'total')::integer<>1
    or v_browse#>>'{entries,0,offerId}'<>v_offer::text
    or v_browse#>>'{entries,0,rarity}'<>'mythic'
    or v_browse#>>'{entries,0,quality}'<>'93'
    or v_browse#>>'{entries,0,enhancementRank}'<>'3'
    or v_browse#>>'{entries,0,statGemRollPercent}'<>'115'
    or v_browse#>>'{entries,0,effectGemRollPercent}'<>'85'
    or v_browse::text like '%sourceReceiptKey%'
    or v_browse::text like '%ownerCharacterId%'
    or v_browse::text like '%sellerAccountId%'
  then raise exception 'market_gear_browse_missing_or_exposes_full_receipt';end if;
  if v_result->>'instanceId'<>v_instance
    or (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'active'
  then raise exception 'exact equipment offer was not published';end if;

  -- Ordinary resource-only buy must NOT claim a gear listing.
  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer,125,1,7,6,'v9-stack-wrong-type',repeat('d',64));
    raise exception 'resource purchase wrongly accepted exact equipment';
  exception when raise_exception then
    if sqlerrm<>'market_asset_not_eligible' then raise;end if;
  end;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_seller,v_offer,125,1,6,6,'gear-v9-self',repeat('e',64));
    raise exception 'self-buy of gear was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_self_trade_denied' then raise;end if;
  end;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,124,1,7,6,'gear-v9-stale-price',repeat('f',64));
    raise exception 'buyer stale price was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;

  -- A missing account Forge ledger would make a paid purchase unclaimable.
  -- Reject before charging Gold, rather than leaving a stranded delivery.
  update public.online_game_states set state=state #- '{account,craftedGearInstances}'
    where account_id=v_buyer;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,125,1,7,6,'gear-v9-no-ledger',repeat('a',64));
    raise exception 'buyer without Forge ledger was charged';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_buyer_ledger_unavailable' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{account,craftedGearInstances}','[]'::jsonb,true) where account_id=v_buyer;
  -- A socket gem whose policy was revoked must halt an outstanding sale.
  update private.market_item_policy_v1 set tradable=false
    where item_id='gem:stat_might:g2';
  if (private.market_browse_verified_offers_v12(
      'equipment',v_item,null,'price_asc',null,null,25,0)->>'total')::integer<>0
  then raise exception 'revoked socket gear still appears in Market search';end if;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,125,1,7,6,'gear-v9-gem-block',repeat('b',64));
    raise exception 'revoked socket gem was sold';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_socket_policy_changed' then raise;end if;
  end;
  update private.market_item_policy_v1 set tradable=true
    where item_id='gem:stat_might:g2';
  if (private.market_browse_verified_offers_v12(
      'equipment',v_item,null,'price_asc',null,null,25,0)->>'total')::integer<>1
  then raise exception 'valid socket gear not restored to Market search';end if;

  -- Buyer already holding the same exact instance ID cannot be charged.
  update public.online_game_states set state=jsonb_set(state,
    '{account,craftedGearInstances}',jsonb_build_array(v_receipt),false)
    where account_id=v_buyer;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,125,1,7,6,'gear-v9-collision',repeat('b',64));
    raise exception 'buyer identity collision was charged';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_buyer_identity_collision' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{account,craftedGearInstances}','[]'::jsonb,false)
    where account_id=v_buyer;

  -- V18: exact Mythic gear must be rejected with a level-1 active buyer.
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','0'::jsonb,false) where account_id=v_buyer;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,125,1,7,6,'gear-v18-level-denied',repeat('c',64));
    raise exception 'under-level Mythic gear was purchased';
  exception when raise_exception then
    if sqlerrm<>'market_level_required' then raise;end if;
  end;
  if (select gold from public.character_wallets where character_id=v_buyer_main)<>500
    or (select count(*) from private.market_purchase_receipts_v3)<>0
    or (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'active'
  then raise exception 'rejected Mythic purchase mutated Gold, offer, or receipts';end if;
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','10000000'::jsonb,false) where account_id=v_buyer;
  v_result:=private.market_purchase_equipment_offer_v9(
    v_buyer,v_offer,125,1,7,6,'gear-v9-purchase',repeat('1',64));
  v_delivery:=(v_result->>'deliveryId')::uuid;
  -- V22 permanent first-sale history is tied to the exact settled Gold
  -- intent and never replaces the current-owner provenance ledger.
  if (select count(*) from private.market_equipment_sale_chain_v22
      where exact_instance_id=v_instance and sale_ordinal=1
        and source_hold_id=v_hold and previous_source_hold_id is null
        and seller_account_id=v_seller and buyer_account_id=v_buyer
        and buyer_character_id=v_buyer_main and item_id=v_item
        and original_receipt=v_receipt and gross_gold=125
        and fee_gold=7 and seller_payout_gold=118)<>1
  then raise exception 'V22 exact first-sale chain was not recorded';end if;
  if (select status from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'pending'
    or (select required_character_level from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>14
  then raise exception 'Market V19 purchase provenance not saved atomically';end if;
  if (select count(*) from private.market_completed_sale_history_v13
    where offer_id=v_offer and item_id=v_item and asset_kind='equipment'
      and rarity='mythic' and quality=93 and enchant_rank=3
      and unit_gold=125 and quantity=1 and gross_gold=125
      and fee_gold=7 and seller_payout_gold=118)<>1
  then raise exception 'exact_forged_gear_sale_history_missing_traits_or_gold';end if;
  if private.market_completed_price_chart_v13(v_item,'equipment',30,'mythic')->>'hasEnoughData'<>'false'
  then raise exception 'single_gear_sale_created_misleading_graph';end if;
  if v_result->>'itemStatus'<>'pending_equipment_delivery'
    or v_result->>'goldSpent'<>'125'
    or v_result->>'feeGold'<>'7'
    or v_result->>'sellerGoldReceived'<>'118'
    or (select fee_gold from private.market_gold_intents_v2 where status='settled')<>7
    or (select seller_payout_gold from private.market_gold_intents_v2 where status='settled')<>118
    or v_result->>'instanceId'<>v_instance
    or (select status from private.market_equipment_escrows_v8 where source_hold_id=v_hold)<>'sold'
    or (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'sold'
    or (select status from private.market_equipment_purchase_deliveries_v9
        where delivery_id=v_delivery)<>'pending'
    or (select receipt_payload from private.market_equipment_purchase_deliveries_v9
        where delivery_id=v_delivery) is distinct from v_receipt
    or (select receipt_payload#>>'{enhancement,statGemRollPercent}' from private.market_equipment_purchase_deliveries_v9
        where delivery_id=v_delivery) <> '115'
    or (select gold from public.character_wallets where character_id=v_buyer_main)<>375
    or (select gold from public.characters where id=v_buyer_main)<>375
    or (select (state#>>'{character,gold}')::bigint from public.online_game_states
        where account_id=v_buyer)<>375
    or (select gold from public.character_wallets where character_id=v_seller_char)<>218
    or (select gold from public.characters where id=v_seller_char)<>218
    or (select (state#>>'{character,gold}')::bigint from public.online_game_states
        where account_id=v_seller)<>218
    or (select count(*) from private.market_gold_intents_v2 where status='settled')<>1
    or (select count(*) from private.market_purchase_deliveries_v3)<>0
  then raise exception 'equipment purchase did not conserve Forge receipt and Gold';end if;
  if (private.market_browse_verified_offers_v12(
      'equipment',v_item,null,'price_asc',null,null,25,0)->>'total')::integer<>0
  then raise exception 'sold exact equipment remains listed';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_buyer,false,0);
  if (v_inbox->>'pendingCount')::integer<>1
    or v_inbox#>>'{entries,0,kind}'<>'purchased'
    or v_inbox#>>'{entries,0,assetKind}'<>'equipment'
    or v_inbox#>>'{entries,0,deliveryId}'<>v_delivery::text
    or v_inbox#>>'{entries,0,goldChange}'<>'-125'
  then raise exception 'bought equipment not queued in Market Inbox';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_seller,true,0);
  if v_inbox#>>'{entries,0,kind}'<>'sold'
    or v_inbox#>>'{entries,0,status}'<>'credited'
    or v_inbox#>>'{entries,0,goldChange}'<>'118'
  then raise exception 'seller sold equipment Gold receipt missing';end if;
  v_retry:=private.market_purchase_equipment_offer_v9(
    v_buyer,v_offer,125,1,7,6,'gear-v9-purchase',repeat('1',64));
  if v_retry->>'replayed'<>'true'
    or (select count(*) from private.market_equipment_purchase_deliveries_v9)<>1
  then raise exception 'equipment purchase replay double-charged or duplicated';end if;
  begin
    perform private.market_cancel_equipment_offer_v9(
      v_seller,v_offer,'gear-v9-cancel-sold',repeat('2',64));
    raise exception 'sold Forge copy was returned to seller';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_cancelable' then raise;end if;
  end;

  -- Claims into full inventory fail without losing the item entitlement.
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,8,'inventory',v_buyer_main::text,
      'gear-v9-full-inv',repeat('3',64));
    raise exception 'equipment claim bypassed inventory capacity';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_destination_full' then raise;end if;
  end;
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,8,'equipment_pouch',v_rival_char::text,
      'gear-v9-foreign-char',repeat('4',64));
    raise exception 'another account character accepted for equipment';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_buyer_character_not_owned' then raise;end if;
  end;
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_rival,v_delivery,4,'inventory',v_rival_char::text,
      'gear-v9-foreign-account',repeat('5',64));
    raise exception 'other account claimed equipment';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_delivery_not_owned' then raise;end if;
  end;
  if (select status from private.market_equipment_purchase_deliveries_v9
        where delivery_id=v_delivery)<>'pending'
    or (select revision from public.online_game_states where account_id=v_buyer)<>8
    or (select gold from public.character_wallets where character_id=v_buyer_main)<>375
  then raise exception 'failed buyer claim consumed equipment or moved Gold';end if;

  -- V19: an eligible buyer main cannot deliver to a level-1 alt.
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,8,'equipment_pouch',v_buyer_alt::text,
      'v19-claim-underlevel',repeat('7',64));
    raise exception 'V19 low-level alt claim succeeded';
  exception when raise_exception then
    if sqlerrm<>'market_level_required' then raise;end if;
  end;
  if (select status from private.market_equipment_purchase_deliveries_v9
      where delivery_id=v_delivery)<>'pending'
    or (select status from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'pending'
    or (select revision from public.online_game_states where account_id=v_buyer)<>8
  then raise exception 'V19 under-level claim consumed delivery or changed state';end if;
  -- V19: pending bought gear cannot enter a shared bank even with capacity.
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,8,'bank',v_buyer_main::text,
      'v19-claim-bank',repeat('8',64));
    raise exception 'V19 shared bank claim succeeded';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_shared_bank_restricted' then raise;end if;
  end;
  -- Verify a spoofed class in the inactive roster cannot pass the
  -- canonical relational owner/class check even with adequate XP.
  update public.online_game_states set state=jsonb_set(
    jsonb_set(state,'{otherCharacters,0,character,xp}',
      '10000000'::jsonb,false),
    '{otherCharacters,0,character,classId}','"IRONWARDEN"'::jsonb,false)
    where account_id=v_buyer;
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,8,'equipment_pouch',v_buyer_alt::text,
      'v19-claim-wrong-class',repeat('a',64));
    raise exception 'V19 class-mismatch alt claim succeeded';
  exception when raise_exception then
    if sqlerrm<>'market_class_or_recipient_required' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{otherCharacters,0,character,classId}','"BASTION"'::jsonb,false)
    where account_id=v_buyer;
  v_claim:=private.market_claim_equipment_purchase_v9(
    v_buyer,v_delivery,8,'equipment_pouch',v_buyer_alt::text,
    'gear-v9-claim-alt',repeat('6',64));
  v_rebound:=jsonb_set(v_receipt,'{ownerCharacterId}',to_jsonb(v_buyer_alt::text),false);
  if (select status from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'claimed'
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_alt::text
  then raise exception 'Market V19 provenance not tied to exact claim recipient';end if;
  if v_claim->>'status'<>'claimed'
    or v_claim->>'buyerCharacterId'<>v_buyer_alt::text
    or (select state#>'{account,craftedGearInstances,0}' from public.online_game_states
         where account_id=v_buyer) is distinct from v_rebound
    or (select state#>'{otherCharacters,0,character,equipmentPouch,stacks,0}'
         from public.online_game_states where account_id=v_buyer) is distinct from v_stack
    or (select state#>'{account,craftedGearInstances}' from public.online_game_states
         where account_id=v_seller)<>'[]'::jsonb
    or (select status from private.market_equipment_purchase_deliveries_v9
         where delivery_id=v_delivery)<>'claimed'
    or (select gold from public.character_wallets where character_id=v_buyer_main)<>375
    or (select gold from public.character_wallets where character_id=v_seller_char)<>218
  then raise exception 'buyer claim changed Forge metadata, sockets or Gold';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_buyer,true,0);
  if v_inbox#>>'{entries,0,kind}'<>'purchased'
    or v_inbox#>>'{entries,0,status}'<>'claimed'
    or v_inbox#>>'{entries,0,assetKind}'<>'equipment'
  then raise exception 'claimed equipment missing from Market Inbox history';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_buyer,false,0);
  if (v_inbox->>'pendingCount')::integer<>0
  then raise exception 'equipment claimed twice on Market Inbox';end if;
  v_retry:=private.market_claim_equipment_purchase_v9(
    v_buyer,v_delivery,8,'equipment_pouch',v_buyer_alt::text,
    'gear-v9-claim-alt',repeat('6',64));
  if v_retry->>'replayed'<>'true' then raise exception 'buyer gear claim replay not idempotent';end if;
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,9,'equipment_pouch',v_buyer_alt::text,
      'gear-v9-claim-twice',repeat('7',64));
    raise exception 'buyer received duplicate Forge gear';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_delivery_already_claimed' then raise;end if;
  end;

  -- V19: normal game-state writes must not bank-transfer or rebind gear.
  begin
    update public.online_game_states set state=jsonb_set(
      jsonb_set(state,'{otherCharacters,0,character,equipmentPouch,stacks}',
        '[]'::jsonb,false),'{bank,stacks}',
      jsonb_build_array(v_stack),false) where account_id=v_buyer;
    raise exception 'V19 bank transfer bypassed snapshot guard';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  begin
    update public.online_game_states set state=jsonb_set(
      jsonb_set(
        jsonb_set(state,'{otherCharacters,0,character,equipmentPouch,stacks}',
          '[]'::jsonb,false),'{inventory,stacks}',jsonb_build_array(v_stack),false),
      '{account,craftedGearInstances,0,ownerCharacterId}',
      to_jsonb(v_buyer_main::text),false) where account_id=v_buyer;
    raise exception 'V19 owner transfer bypassed snapshot guard';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  if (select status from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'claimed'
    or (select revision from public.online_game_states where account_id=v_buyer)<>9
  then raise exception 'V19 rejected transfer changed snapshot/provenance';end if;
  -- Forged rarity is rejected even when instance ID and current owner match.
  begin
    update public.online_game_states set state=jsonb_set(state,
      '{account,craftedGearInstances,0,rarity}','"common"'::jsonb,false)
      where account_id=v_buyer;
    raise exception 'V19 rarity forgery passed saved-state guard';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  -- A legitimate same-character pouch-to-inventory move preserves custody.
  update public.online_game_states set state=jsonb_set(
    jsonb_set(state,'{otherCharacters,0,character,equipmentPouch,stacks}',
      '[]'::jsonb,false),
    '{otherCharacters,0,inventory,stacks}',jsonb_build_array(v_stack),false)
    where account_id=v_buyer;
  update public.online_game_states set state=jsonb_set(
    jsonb_set(state,'{otherCharacters,0,inventory,stacks}',
      '[]'::jsonb,false),
    '{otherCharacters,0,character,equipmentPouch,stacks}',
    jsonb_build_array(v_stack),false) where account_id=v_buyer;
  -- Benign XP updates remain possible, even when another character holds it.
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','11000000'::jsonb,false) where account_id=v_buyer;

  -- V20: exact-copy transfers are private and never a public Market RPC.
  if has_function_privilege('authenticated',
      'private.market_transfer_purchased_equipment_v20(uuid,text,text,text,integer,text,text,bigint,text,text)'::regprocedure,
      'EXECUTE')
    or has_table_privilege('service_role',
      'private.market_equipment_recipient_transfers_v20','SELECT')
  then raise exception 'V20 recipient-transfer privilege leaked';end if;
  -- The active main has an unusable (level-1) state; the purchased exact
  -- Mythic copy must remain held by the high-level alternate character.
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','0'::jsonb,false) where account_id=v_buyer;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
      v_buyer_main::text,'equipment_pouch',9,'v20-low-level',repeat('1',64));
    raise exception 'V20 transferred to a lower-level character';
  exception when raise_exception then
    if sqlerrm<>'market_level_required' then raise;end if;
  end;
  if (select count(*) from private.market_equipment_recipient_transfers_v20)<>0
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_alt::text
    or (select revision from public.online_game_states
      where account_id=v_buyer)<>9
  then raise exception 'V20 denied transfer changed state, ledger or revision';end if;
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','11000000'::jsonb,false) where account_id=v_buyer;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
      v_buyer_main::text,'inventory',9,'v20-dest-full',repeat('2',64));
    raise exception 'V20 transferred into a full inventory';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_destination_full' then raise;end if;
  end;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_main::text,'inventory',0,
      v_buyer_alt::text,'equipment_pouch',9,'v20-not-owner',repeat('3',64));
    raise exception 'V20 transferred from a non-owner character';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_source_not_owned' then raise;end if;
  end;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
      v_buyer_main::text,'bank',9,'v20-bank-blocked',repeat('4',64));
    raise exception 'V20 transferred via shared Bank';
  exception when raise_exception then
    if sqlerrm<>'market_transfer_invalid_request' then raise;end if;
  end;
  -- Saved loadouts that reference the item type must not be detached.
  update public.online_game_states set state=jsonb_set(state,
    '{otherCharacters,0,character,savedLoadouts}',
    jsonb_build_array(jsonb_build_object(
      'equipment',jsonb_build_object('weapon',v_item))),
    true) where account_id=v_buyer;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
      v_buyer_main::text,'equipment_pouch',9,'v20-reserved',repeat('5',64));
    raise exception 'V20 transferred equipment reserved in a loadout';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_transfer_reserved' then raise;end if;
  end;
  update public.online_game_states set state=state
    #- '{otherCharacters,0,character,savedLoadouts}'
    where account_id=v_buyer;
  -- Locked, strictly owned, idempotent transfer of one instance, its Forge
  -- receipt and the provenance recipient in the SAME SQL transaction.
  v_result:=private.market_transfer_purchased_equipment_v20(
    v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
    v_buyer_main::text,'equipment_pouch',9,'v20-first-transfer',repeat('6',64));
  if v_result->>'status'<>'transferred' or v_result->>'revision'<>'10'
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_main::text
    or (select state#>>'{account,craftedGearInstances,0,ownerCharacterId}'
      from public.online_game_states where account_id=v_buyer)<>v_buyer_main::text
    or (select state#>'{character,equipmentPouch,stacks,0}'
      from public.online_game_states where account_id=v_buyer)
       is distinct from v_stack
    or (select state#>'{otherCharacters,0,character,equipmentPouch,stacks}'
      from public.online_game_states where account_id=v_buyer)<>'[]'::jsonb
    or (select revision from public.online_game_states where account_id=v_buyer)<>10
    or (select count(*) from private.market_equipment_recipient_transfers_v20)<>1
  then raise exception 'V20 valid transfer lost copy or exact Forge receipt';end if;
  v_retry:=private.market_transfer_purchased_equipment_v20(
    v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
    v_buyer_main::text,'equipment_pouch',9,'v20-first-transfer',repeat('6',64));
  if v_retry->>'replayed'<>'true' or
    (select count(*) from private.market_equipment_recipient_transfers_v20)<>1
  then raise exception 'V20 transfer idempotency duplicated equipment';end if;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
      v_buyer_main::text,'equipment_pouch',9,'v20-first-transfer',repeat('7',64));
    raise exception 'V20 request hash collision accepted';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_main::text,'equipment_pouch',0,
      v_buyer_alt::text,'equipment_pouch',9,'v20-stale-revision',repeat('8',64));
    raise exception 'V20 stale revision accepted';
  exception when raise_exception then
    if sqlerrm<>'market_stale_state' then raise;end if;
  end;
  -- Both characters meet the policy; a second direct transfer is allowed.
  v_result:=private.market_transfer_purchased_equipment_v20(
    v_buyer,v_instance,v_buyer_main::text,'equipment_pouch',0,
    v_buyer_alt::text,'equipment_pouch',10,'v20-second-transfer',repeat('9',64));
  if v_result->>'revision'<>'11'
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_alt::text
    or (select state#>'{otherCharacters,0,character,equipmentPouch,stacks,0}'
      from public.online_game_states where account_id=v_buyer)
      is distinct from v_stack
    or (select state#>'{character,equipmentPouch,stacks}'
      from public.online_game_states where account_id=v_buyer)<>'[]'::jsonb
    or (select count(*) from private.market_equipment_recipient_transfers_v20)<>2
  then raise exception 'V20 second eligible direct transfer failed';end if;
  -- Even after legitimate owner transfers, direct bank bypass is still denied.
  begin
    update public.online_game_states set state=jsonb_set(
      jsonb_set(state,'{otherCharacters,0,character,equipmentPouch,stacks}',
        '[]'::jsonb,false),'{bank,stacks}',jsonb_build_array(v_stack),false)
      where account_id=v_buyer;
    raise exception 'V20 normal bank save bypassed recipient provenance';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;

  -- V21: the normal save path is still barred from sneaking bought gear
  -- into shared storage without a matching private custody transition.
  update public.online_game_states set state=jsonb_set(state,
    '{bank,capacity}','1'::jsonb,false) where account_id=v_buyer;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'deposit',v_buyer_alt::text,'equipment_pouch',
      0,0,11,'v21-bank-full',repeat('1',64));
    raise exception 'V21 deposited purchased equipment into full bank';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_destination_full' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{bank,capacity}','2'::jsonb,false) where account_id=v_buyer;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'deposit',v_buyer_main::text,'equipment_pouch',
      0,0,11,'v21-wrong-holder',repeat('2',64));
    raise exception 'V21 non-owner made bank deposit';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_custody_state_invalid' then raise;end if;
  end;
  v_result:=private.market_move_purchased_equipment_bank_v21(
    v_buyer,v_instance,'deposit',v_buyer_alt::text,'equipment_pouch',
    0,0,11,'v21-deposit',repeat('3',64));
  if v_result->>'revision'<>'12'
    or v_result->>'storageState'<>'bank'
    or (select storage_state from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'bank'
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_alt::text
    or (select state#>'{bank,stacks,1}' from public.online_game_states
      where account_id=v_buyer) is distinct from v_stack
    or (select state#>'{otherCharacters,0,character,equipmentPouch,stacks}'
      from public.online_game_states where account_id=v_buyer)<>'[]'::jsonb
    or (select state#>>'{account,craftedGearInstances,0,ownerCharacterId}'
      from public.online_game_states where account_id=v_buyer)<>v_buyer_alt::text
    or (select count(*) from private.market_equipment_bank_actions_v21)<>1
  then raise exception 'V21 deposit lost Forge copy, receipt or provenance';end if;
  -- Bank custody is never a saleable source, even though the same item
  -- was previously purchased and has a valid historical sale chain.
  v_result:=private.market_resale_preflight_v22(
    v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0);
  if v_result->>'candidate'<>'false'
    or v_result->>'canRelistNow'<>'false'
  then raise exception 'V22 treated bank-held Forge gear as a resale candidate';end if;
  v_retry:=private.market_move_purchased_equipment_bank_v21(
    v_buyer,v_instance,'deposit',v_buyer_alt::text,'equipment_pouch',
    0,0,11,'v21-deposit',repeat('3',64));
  if v_retry->>'replayed'<>'true'
    or (select count(*) from private.market_equipment_bank_actions_v21)<>1
  then raise exception 'V21 deposit replay duplicated bank copy';end if;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'deposit',v_buyer_alt::text,'equipment_pouch',
      0,0,11,'v21-deposit',repeat('4',64));
    raise exception 'V21 replay accepted conflicting request hash';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;
  begin
    perform private.market_transfer_purchased_equipment_v20(
      v_buyer,v_instance,v_buyer_alt::text,'equipment_pouch',0,
      v_buyer_main::text,'equipment_pouch',12,'v21-bank-v20-blocked',repeat('5',64));
    raise exception 'V21 banked gear bypassed V20 direct transfer';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_source_identity_invalid' then raise;end if;
  end;
  -- Only the bank may hold this exact copy in custody mode bank.
  begin
    update public.online_game_states set state=jsonb_set(
      jsonb_set(state,'{bank,stacks}',jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',1)),false),
      '{otherCharacters,0,character,equipmentPouch,stacks}',
        jsonb_build_array(v_stack),false) where account_id=v_buyer;
    raise exception 'V21 unauthorized bank withdrawal bypassed snapshot guard';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  begin
    update public.online_game_states set state=jsonb_set(state,
      '{account,craftedGearInstances,0,rarity}','"common"'::jsonb,false)
      where account_id=v_buyer;
    raise exception 'V21 banked receipt rarity forgery accepted';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  begin
    update public.online_game_states set state=jsonb_set(state,
      '{bank,stacks}',(state#>'{bank,stacks}')||jsonb_build_array(v_stack),
      false) where account_id=v_buyer;
    raise exception 'V21 bank copy was duplicated by normal snapshot update';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  begin
    update public.online_game_states set state=jsonb_set(state,
      '{account,craftedGearInstances,0,ownerCharacterId}',
      to_jsonb(v_buyer_main::text),false) where account_id=v_buyer;
    raise exception 'V21 banked receipt ownership spoof succeeded';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  -- Withdrawal is checked at the time of release, NOT just the purchase
  -- or bank deposit time. Main character's XP was previously 11M.
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','0'::jsonb,false) where account_id=v_buyer;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'withdraw',v_buyer_main::text,'equipment_pouch',
      0,1,12,'v21-underlevel-withdraw',repeat('6',64));
    raise exception 'V21 bank released high-tier gear to level-1 main';
  exception when raise_exception then
    if sqlerrm<>'market_level_required' then raise;end if;
  end;
  if (select storage_state from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'bank'
    or (select revision from public.online_game_states where account_id=v_buyer)<>12
    or (select count(*) from private.market_equipment_bank_actions_v21)<>1
  then raise exception 'V21 denied withdrawal consumed bank custody';end if;
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','11000000'::jsonb,false) where account_id=v_buyer;
  update public.online_game_states set state=jsonb_set(state,
    '{character,classId}','"KNIFE_DANCER"'::jsonb,false)
    where account_id=v_buyer;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'withdraw',v_buyer_main::text,'equipment_pouch',
      0,1,12,'v21-wrong-class',repeat('e',64));
    raise exception 'V21 forged class allowed bank withdrawal';
  exception when raise_exception then
    if sqlerrm<>'market_class_or_recipient_required' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{character,classId}','"BASTION"'::jsonb,false)
    where account_id=v_buyer;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'withdraw',v_buyer_main::text,'inventory',
      0,1,12,'v21-inventory-full',repeat('7',64));
    raise exception 'V21 withdrew into full main inventory';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_destination_full' then raise;end if;
  end;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'withdraw',v_rival_char::text,'equipment_pouch',
      0,1,12,'v21-foreign-target',repeat('8',64));
    raise exception 'V21 bank withdrawal to foreign character';
  exception when raise_exception then
    if sqlerrm<>'market_class_or_recipient_required' then raise;end if;
  end;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'withdraw',v_buyer_main::text,'equipment_pouch',
      0,0,12,'v21-wrong-bank-index',repeat('9',64));
    raise exception 'V21 withdrew wrong stack instead of exact Forge copy';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_storage_location_invalid' then raise;end if;
  end;
  v_result:=private.market_move_purchased_equipment_bank_v21(
    v_buyer,v_instance,'withdraw',v_buyer_main::text,'equipment_pouch',
    0,1,12,'v21-withdraw',repeat('a',64));
  if v_result->>'revision'<>'13'
    or v_result->>'storageState'<>'character'
    or (select storage_state from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'character'
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_main::text
    or (select state#>'{character,equipmentPouch,stacks,0}' from public.online_game_states
      where account_id=v_buyer) is distinct from v_stack
    or (select state#>>'{account,craftedGearInstances,0,ownerCharacterId}'
      from public.online_game_states where account_id=v_buyer)<>v_buyer_main::text
    or (select state#>'{bank,stacks}' from public.online_game_states
      where account_id=v_buyer) is distinct from jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',1))
    or (select count(*) from private.market_equipment_bank_actions_v21)<>2
    or (select count(*) from private.market_gold_intents_v2 where status='settled')<>1
  then raise exception 'V21 withdrawal lost copy, Forge receipt, Gold or provenance';end if;
  v_retry:=private.market_move_purchased_equipment_bank_v21(
    v_buyer,v_instance,'withdraw',v_buyer_main::text,'equipment_pouch',
    0,1,12,'v21-withdraw',repeat('a',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'V21 withdrawal replay failed';end if;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'withdraw',v_buyer_main::text,'equipment_pouch',
      0,0,13,'v21-double-withdraw',repeat('b',64));
    raise exception 'V21 withdrew item already absent from bank';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_custody_state_invalid' then raise;end if;
  end;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      v_buyer,v_instance,'deposit',v_buyer_main::text,'equipment_pouch',
      0,0,12,'v21-stale-revision',repeat('c',64));
    raise exception 'V21 stale revision accepted';
  exception when raise_exception then
    if sqlerrm<>'market_stale_state' then raise;end if;
  end;

  -- V22 read-only resale preflight can verify the copy, but cannot grant
  -- resale approval or mutate any character/escrow ownership.
  v_result:=private.market_resale_preflight_v22(
    v_buyer,v_instance,v_buyer_main::text,'equipment_pouch',0);
  if v_result->>'candidate'<>'true'
    or v_result->>'canRelistNow'<>'false'
    or v_result->>'reason'<>'market_resale_escrow_not_ready'
    or v_result->>'lastSaleOrdinal'<>'1'
    or v_result->>'requiredCharacterLevel'<>'14'
  then raise exception 'V22 resale preflight changed the release gate or copy eligibility';end if;
  v_result:=private.market_resale_preflight_v22(
    v_rival,v_instance,v_rival_char::text,'inventory',0);
  if v_result->>'candidate'<>'false'
    or v_result->>'canRelistNow'<>'false'
  then raise exception 'V22 foreign account passed resale preflight';end if;
  begin
    perform private.market_reserve_exact_equipment_v8(
      v_buyer,13,'equipment_pouch',v_buyer_main::text,0,v_item,v_instance,
      'v22-resale-before-approval',repeat('d',64));
    raise exception 'V22 second-sale reserved without lifecycle approval';
  exception when raise_exception then
    if sqlerrm<>'market_resale_escrow_not_ready' then raise;end if;
  end;
  if (select count(*) from private.market_equipment_sale_chain_v22
        where exact_instance_id=v_instance)<>1
    or (select count(*) from private.market_equipment_escrows_v8
        where exact_instance_id=v_instance)<>1
    or (select count(*) from private.market_gold_intents_v2
        where status='settled')<>1
    or (select count(*) from private.market_equipment_provenance_v19
        where exact_instance_id=v_instance and status='claimed')<>1
    or (select revision from public.online_game_states
        where account_id=v_buyer)<>13
  then raise exception 'V22 denied resale mutated custody, Gold, history or revision';end if;
  begin
    update private.market_equipment_sale_chain_v22
      set gross_gold=200 where source_hold_id=v_hold;
    raise exception 'V22 historical sale chain accepted mutation';
  exception when raise_exception then
    if sqlerrm<>'market_sale_chain_immutable' then raise;end if;
  end;

  -- V23. Simulate a complete second-sale lifecycle using only synthetic
  -- accounts, including cancelled listing, return, relist, pending buyer
  -- claim and a third sale of the SAME immutable exact Forge instance.
  -- Resale offers share the twenty-open-offer ceiling with normal Market
  -- listings. Synthetic fake rows exist ONLY within this rollback test.
  insert into private.market_equipment_resale_offers_v23(
    exact_instance_id,first_source_hold_id,last_sale_ordinal,
    seller_account_id,seller_character_id,item_id,source_location,
    source_index,source_revision,receipt_payload,stack_payload,unit_price)
  select 'v23-cap-synthetic-'||n,v_hold,1,v_buyer,v_buyer_main::text,
    v_item,'equipment_pouch',0,13,v_receipt,v_stack,125
  from generate_series(1,20) n;
  begin
    perform private.market_reserve_equipment_resale_v23(
      v_buyer,13,v_instance,v_buyer_main::text,'equipment_pouch',0,125,
      'v23-cap-rejected',repeat('0',64));
    raise exception 'V23 resale bypassed twenty-listing ceiling';
  exception when raise_exception then
    if sqlerrm<>'market_offer_limit_reached' then raise;end if;
  end;
  delete from private.market_equipment_resale_offers_v23
    where exact_instance_id like 'v23-cap-synthetic-%';
  if (select count(*) from private.market_equipment_resale_offers_v23)<>0
  then raise exception 'V23 synthetic cap test left listings behind';end if;
  v_result:=private.market_reserve_equipment_resale_v23(
    v_buyer,13,v_instance,v_buyer_main::text,'equipment_pouch',0,125,
    'v23-resale-first-reserve',repeat('1',64));
  v_resale_id:=(v_result->>'resaleId')::uuid;
  if v_result->>'status'<>'active'
    or (select storage_state from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'resale'
    or (select state#>'{character,equipmentPouch,stacks}' from public.online_game_states
      where account_id=v_buyer)<>'[]'::jsonb
    or (select state#>'{account,craftedGearInstances}' from public.online_game_states
      where account_id=v_buyer)<>'[]'::jsonb
    or (select revision from public.online_game_states where account_id=v_buyer)<>14
    or (select count(*) from private.market_equipment_resale_offers_v23)<>1
  then raise exception 'V23 first resale reserve failed atomic Forge custody';end if;
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'1'
    or v_browse#>>'{entries,0,sourceKind}'<>'resale'
    or v_browse#>>'{entries,0,resaleId}'<>v_resale_id::text
    or v_browse#>>'{entries,0,offerId}'<>v_resale_id::text
    or v_browse#>>'{entries,0,rarity}'<>'mythic'
    or v_browse#>>'{entries,0,statGemRollPercent}'<>'115'
    or v_browse::text like '%sourceReceiptKey%'
    or v_browse::text like '%ownerCharacterId%'
    or v_browse::text like '%sellerAccountId%'
    or v_browse::text like '%firstSourceHoldId%'
  then raise exception 'V24 unified resale browse lost display data or leaked receipt';end if;
  v_browse:=private.market_browse_combined_v24(
    'resource',v_item,null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'0'
  then raise exception 'V24 equipment resale visible in resource browse';end if;
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',126,null,25,0);
  if v_browse->>'total'<>'0'
  then raise exception 'V24 price floor filter ignored on resale';end if;
  v_inbox:=private.market_inbox_unified_v24(v_rival,false,0);
  if exists(select 1 from jsonb_array_elements(v_inbox->'entries') e(value)
    where e.value->>'id'='resale-list:'||v_resale_id::text)
  then raise exception 'V24 private seller listing leaked to foreign Inbox';end if;
  v_inbox:=private.market_inbox_unified_v24(v_buyer,false,0);
  if not exists(select 1 from jsonb_array_elements(v_inbox->'entries') e(value)
      where e.value->>'id'='resale-list:'||v_resale_id::text
        and e.value->>'kind'='listed' and e.value->>'status'='listed')
  then raise exception 'V24 active resale absent from seller Inbox';end if;
  -- V24 combined browse pagination is tested with a synthetic, server-only
  -- resource escrow row and the REAL resale offer. The synthetic resource
  -- does not represent actual inventory and is removed before any trade.
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
    values('COPPER_ORE','resource',true,'unbound');
  update private.market_price_bands_v10 set approved=true where item_id='COPPER_ORE';
  update private.market_listing_lot_policies_v11
    set approved=true where item_id='COPPER_ORE';
  insert into private.market_custody_assets_v1(
    owner_account_id,source_revision,source_location,source_character_id,
    source_locator,item_id,asset_kind,quantity,held_quantity,
    source_bound,verification_state,immutable_attributes)
  values(v_seller,999,'inventory',v_seller_char::text,
    'v24-mixed-resource','COPPER_ORE','resource',10,10,
    false,'verified','{}'::jsonb)
  returning asset_id into v_resource_asset;
  insert into private.market_custody_holds_v1(
    asset_id,owner_account_id,request_key,request_hash,
    held_quantity,status,source_revision)
  values(v_resource_asset,v_seller,'v24-mixed-resource-hold',repeat('a',64),
    10,'held',999)
  returning hold_id into v_resource_hold;
  insert into private.market_sale_offers_v3(
    source_hold_id,seller_account_id,unit_price,quantity,status)
  values(v_resource_hold,v_seller,10,10,'active')
  returning offer_id into v_resource_offer;
  v_browse:=private.market_browse_combined_v24(
    'all',null,null,'price_asc',null,null,1,0);
  if v_browse->>'total'<>'2' or v_browse->>'hasMore'<>'true'
    or v_browse#>>'{entries,0,offerId}'<>v_resource_offer::text
    or v_browse#>>'{entries,0,sourceKind}'<>'original'
  then raise exception 'V24 combined browse failed source-sort or first-page count';end if;
  v_browse:=private.market_browse_combined_v24(
    'all',null,null,'price_asc',null,null,1,1);
  if v_browse->>'total'<>'2' or v_browse->>'hasMore'<>'false'
    or v_browse#>>'{entries,0,offerId}'<>v_resale_id::text
    or v_browse#>>'{entries,0,sourceKind}'<>'resale'
  then raise exception 'V24 combined browse failed second-page cursor';end if;
  v_browse:=private.market_browse_combined_v24(
    'all',null,null,'price_asc',120,null,25,0);
  if v_browse->>'total'<>'1'
    or v_browse#>>'{entries,0,resaleId}'<>v_resale_id::text
  then raise exception 'V24 mixed-origin total-price filtering failed';end if;
  v_browse:=private.market_browse_combined_v24(
    'resource','COPPER_ORE',null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'1'
    or v_browse#>>'{entries,0,offerId}'<>v_resource_offer::text
  then raise exception 'V24 resource-only browsing lost original listing';end if;
  -- Unit-test fixture cleanup, still within the global SQL ROLLBACK.
  delete from private.market_sale_offers_v3 where offer_id=v_resource_offer;
  delete from private.market_custody_holds_v1 where hold_id=v_resource_hold;
  delete from private.market_custody_assets_v1 where asset_id=v_resource_asset;
  delete from private.market_item_policy_v1 where item_id='COPPER_ORE';
  update private.market_price_bands_v10 set approved=false where item_id='COPPER_ORE';
  update private.market_listing_lot_policies_v11
    set approved=false where item_id='COPPER_ORE';
  v_retry:=private.market_reserve_equipment_resale_v23(
    v_buyer,13,v_instance,v_buyer_main::text,'equipment_pouch',0,125,
    'v23-resale-first-reserve',repeat('1',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'V23 reserve retry double-listed';end if;
  begin
    update public.online_game_states set state=jsonb_set(state,
      '{character,equipmentPouch,stacks}',jsonb_build_array(v_stack),false)
      where account_id=v_buyer;
    raise exception 'V23 regular save fabricated an escrowed copy';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_provenance_transfer_blocked' then raise;end if;
  end;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_buyer,v_resale_id,125,14,14,'v23-self-buy',repeat('2',64));
    raise exception 'V23 self-resale was permitted';
  exception when raise_exception then
    if sqlerrm<>'market_self_trade_denied' then raise;end if;
  end;
  v_result:=private.market_cancel_equipment_resale_v23(
    v_buyer,v_resale_id,'v23-cancel-first',repeat('3',64));
  if v_result->>'status'<>'return_pending'
    or (select status from private.market_equipment_resale_offers_v23
      where resale_id=v_resale_id)<>'return_pending'
  then raise exception 'V23 cancellation did not create safe return entitlement';end if;
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'0'
  then raise exception 'V24 cancelled resale visible in browse';end if;
  v_inbox:=private.market_inbox_unified_v24(v_buyer,false,0);
  if (v_inbox->>'pendingCount')::integer<1
    or not exists(select 1 from jsonb_array_elements(v_inbox->'entries') e(value)
      where e.value->>'id'='resale-return:'||v_resale_id::text
        and e.value->>'status'='ready')
  then raise exception 'V24 cancelled resale return not claimable from Inbox';end if;
  v_retry:=private.market_cancel_equipment_resale_v23(
    v_buyer,v_resale_id,'v23-cancel-first',repeat('3',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'V23 cancel replay created second entitlement';end if;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_rival,v_resale_id,125,4,14,'v23-purchase-cancelled',repeat('4',64));
    raise exception 'V23 cancelled resale was bought';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;
  -- A cancelled resale is not lost when the original holder's pouch is
  -- full. Its pending return entitlement survives until space is available.
  update public.online_game_states set state=jsonb_set(state,
    '{character,equipmentPouch,stacks}',jsonb_build_array(
      jsonb_build_object('itemId','COPPER_ORE','quantity',1),
      jsonb_build_object('itemId','COPPER_ORE','quantity',2)),false)
    where account_id=v_buyer;
  begin
    perform private.market_claim_resale_return_v23(
      v_buyer,v_resale_id,14,v_buyer_main::text,'equipment_pouch',
      'v23-full-return',repeat('4',64));
    raise exception 'V23 returned Forge gear into a full pouch';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_destination_full' then raise;end if;
  end;
  if (select status from private.market_equipment_resale_offers_v23
    where resale_id=v_resale_id)<>'return_pending'
  then raise exception 'V23 full return lost escrow entitlement';end if;
  update public.online_game_states set state=jsonb_set(state,
    '{character,equipmentPouch,stacks}','[]'::jsonb,false)
    where account_id=v_buyer;
  v_result:=private.market_claim_resale_return_v23(
    v_buyer,v_resale_id,14,v_buyer_main::text,'equipment_pouch',
    'v23-return-first',repeat('5',64));
  if v_result->>'status'<>'returned'
    or (select storage_state from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'character'
    or (select state#>'{character,equipmentPouch,stacks,0}' from public.online_game_states
      where account_id=v_buyer) is distinct from v_stack
    or (select state#>>'{account,craftedGearInstances,0,ownerCharacterId}'
      from public.online_game_states where account_id=v_buyer)<>v_buyer_main::text
    or (select revision from public.online_game_states where account_id=v_buyer)<>15
    or (select count(*) from private.market_equipment_resale_chain_v23)<>0
    or (select count(*) from private.market_resale_gold_intents_v23)<>0
  then raise exception 'V23 cancellation return lost original Forge copy';end if;
  v_inbox:=private.market_inbox_unified_v24(v_buyer,true,0);
  if not exists(select 1 from jsonb_array_elements(v_inbox->'entries') e(value)
    where e.value->>'id'='resale-return:'||v_resale_id::text
      and e.value->>'status'='claimed')
  then raise exception 'V24 claimed return missing from historical Inbox';end if;

  v_retry:=private.market_claim_resale_return_v23(
    v_buyer,v_resale_id,14,v_buyer_main::text,'equipment_pouch',
    'v23-return-first',repeat('5',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'V23 return replay duplicated Forge receipt';end if;
  begin
    perform private.market_claim_resale_return_v23(
      v_buyer,v_resale_id,15,v_buyer_main::text,'equipment_pouch',
      'v23-second-return',repeat('6',64));
    raise exception 'V23 cancelled item returned twice';
  exception when raise_exception then
    if sqlerrm<>'market_resale_return_not_ready' then raise;end if;
  end;
  v_result:=private.market_reserve_equipment_resale_v23(
    v_buyer,15,v_instance,v_buyer_main::text,'equipment_pouch',0,125,
    'v23-resale-second-reserve',repeat('6',64));
  v_resale_again:=(v_result->>'resaleId')::uuid;
  v_second_resale_id:=v_resale_again;
  if v_resale_again=v_resale_id or (select count(*) from
     private.market_equipment_resale_offers_v23)<>2
  then raise exception 'V23 cancelled generation was reused';end if;
  -- Actual purchaser must be qualified. Rival's class and XP in relational
  -- record + authoritative online state must match before charging Gold.
  update public.online_game_states set state=jsonb_set(
    jsonb_set(state,'{character,xp}','0'::jsonb,true),
    '{character,classId}','"BASTION"'::jsonb,true)
    where account_id=v_rival;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_rival,v_resale_again,125,4,16,'v23-low-level-buy',repeat('7',64));
    raise exception 'V23 low-level reseller charged Gold';
  exception when raise_exception then
    if sqlerrm<>'market_level_required' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','10000000'::jsonb,true) where account_id=v_rival;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_rival,v_resale_again,124,4,16,'v23-stale-price',repeat('8',64));
    raise exception 'V23 accepted stale resale offer price';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;
  -- Enforce class and socket eligibility just before settlement, even
  -- though the listing was valid when created.
  update public.online_game_states set state=jsonb_set(state,
    '{character,classId}','"IRONWARDEN"'::jsonb,false) where account_id=v_rival;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_rival,v_resale_again,125,4,16,'v23-wrong-class',repeat('0',64));
    raise exception 'V23 class mismatch bought a resale';
  exception when raise_exception then
    if sqlerrm<>'market_class_required' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{character,classId}','"BASTION"'::jsonb,false) where account_id=v_rival;
  update private.market_item_policy_v1 set tradable=false
    where item_id='gem:stat_might:g2';
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'0'
  then raise exception 'V24 revoked socket gem remained in resale browse';end if;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_rival,v_resale_again,125,4,16,'v23-revoked-socket',repeat('1',64));
    raise exception 'V23 revoked socket was sold in resale';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_socket_policy_changed' then raise;end if;
  end;
  update private.market_item_policy_v1 set tradable=true
    where item_id='gem:stat_might:g2';
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'1'
    or v_browse#>>'{entries,0,resaleId}'<>v_resale_again::text
  then raise exception 'V24 valid resale did not reappear after socket approval';end if;
  -- Before touching either Gold surface, reject a duplicate exact instance
  -- already present in the buyer's authoritative saved game state.
  update public.online_game_states set state=jsonb_set(state,
    '{inventory,stacks}',jsonb_build_array(v_stack),false) where account_id=v_rival;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_rival,v_resale_again,125,4,16,'v23-buyer-copy-collision',repeat('2',64));
    raise exception 'V23 duplicate buyer copy was charged';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_buyer_identity_collision' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{inventory,stacks}','[]'::jsonb,false) where account_id=v_rival;
  v_result:=private.market_purchase_equipment_resale_v23(
    v_rival,v_resale_again,125,4,16,'v23-second-purchase',repeat('9',64));
  v_resale_delivery:=(v_result->>'deliveryId')::uuid;
  if v_result->>'saleOrdinal'<>'2'
    or v_result->>'goldSpent'<>'125' or v_result->>'feeGold'<>'7'
    or v_result->>'sellerGoldReceived'<>'118'
    or (select count(*) from private.market_equipment_resale_chain_v23
      where exact_instance_id=v_instance and sale_ordinal=2
        and resale_id=v_resale_again
        and buyer_account_id=v_rival and seller_account_id=v_buyer
        and previous_resale_id is null
        and first_source_hold_id=v_hold)<>1
    or (select status from private.market_equipment_resale_deliveries_v23
      where delivery_id=v_resale_delivery)<>'pending'
    or (select status from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'pending'
    or (select buyer_account_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_rival
    or (select gold from public.character_wallets where character_id=v_rival_char)<>175
    or (select gold from public.character_wallets where character_id=v_buyer_main)<>493
    or (select revision from public.online_game_states where account_id=v_buyer)<>17
    or (select revision from public.online_game_states where account_id=v_rival)<>5
  then raise exception 'V23 second sale did not preserve Gold, chain or pending claim';end if;
  v_inbox:=private.market_inbox_unified_v24(v_rival,false,0);
  if not exists(select 1 from jsonb_array_elements(v_inbox->'entries') e(value)
    where e.value->>'id'='resale-purchase:'||v_resale_delivery::text
      and e.value->>'kind'='purchased'
      and e.value->>'status'='ready'
      and e.value->>'goldChange'='-125')
  then raise exception 'V24 resale buyer delivery missing or Gold wrong in Inbox';end if;
  v_inbox:=private.market_inbox_unified_v24(v_buyer,true,0);
  if not exists(select 1 from jsonb_array_elements(v_inbox->'entries') e(value)
    where e.value->>'id'='resale-sale:'||v_resale_again::text
      and e.value->>'kind'='sold'
      and e.value->>'goldChange'='118'
      and e.value->>'status'='credited')
  then raise exception 'V24 seller resale fee payout missing from Inbox';end if;
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'0'
  then raise exception 'V24 settled resale still visible as active';end if;
  v_retry:=private.market_purchase_equipment_resale_v23(
    v_rival,v_resale_again,125,4,16,'v23-second-purchase',repeat('9',64));
  if v_retry->>'replayed'<>'true'
    or (select count(*) from private.market_resale_gold_intents_v23)<>1
  then raise exception 'V23 purchase replay caused duplicate Gold';end if;
  begin
    perform private.market_cancel_equipment_resale_v23(
      v_buyer,v_resale_again,'v23-cancel-sold',repeat('a',64));
    raise exception 'V23 sold resale was cancelled';
  exception when raise_exception then
    if sqlerrm<>'market_resale_not_cancelable' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','0'::jsonb,false) where account_id=v_rival;
  begin
    perform private.market_claim_equipment_resale_v23(
      v_rival,v_resale_delivery,5,v_rival_char::text,'inventory',
      'v23-underlevel-claim',repeat('b',64));
    raise exception 'V23 pending resale ignored current recipient level';
  exception when raise_exception then
    if sqlerrm<>'market_level_required' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{character,xp}','10000000'::jsonb,false) where account_id=v_rival;
  v_result:=private.market_claim_equipment_resale_v23(
    v_rival,v_resale_delivery,5,v_rival_char::text,'inventory',
    'v23-second-claim',repeat('c',64));
  if v_result->>'status'<>'claimed'
    or (select state#>'{inventory,stacks,0}' from public.online_game_states
      where account_id=v_rival) is distinct from v_stack
    or (select state#>>'{account,craftedGearInstances,0,ownerCharacterId}'
      from public.online_game_states where account_id=v_rival)<>v_rival_char::text
    or (select status from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>'claimed'
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_rival_char::text
    or (select revision from public.online_game_states where account_id=v_rival)<>6
  then raise exception 'V23 second buyer claim did not bind exact gear';end if;
  v_retry:=private.market_claim_equipment_resale_v23(
    v_rival,v_resale_delivery,5,v_rival_char::text,'inventory',
    'v23-second-claim',repeat('c',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'V23 buyer claim replay duplicated exact instance';end if;

  -- Third sale demonstrates the unbroken genealogy and atomic multi-cycle
  -- settlement. The initial V22 sale record must remain untouched.
  v_result:=private.market_reserve_equipment_resale_v23(
    v_rival,6,v_instance,v_rival_char::text,'inventory',0,125,
    'v23-third-reserve',repeat('d',64));
  v_resale_again:=(v_result->>'resaleId')::uuid;
  if v_result->>'lastSaleOrdinal'<>'2'
  then raise exception 'V23 third offer ignored the preceding sale';end if;
  v_result:=private.market_purchase_equipment_resale_v23(
    v_buyer,v_resale_again,125,17,7,'v23-third-purchase',repeat('e',64));
  v_second_delivery:=(v_result->>'deliveryId')::uuid;
  if v_result->>'saleOrdinal'<>'3'
    or (select count(*) from private.market_equipment_resale_chain_v23
      where exact_instance_id=v_instance)<>2
    or (select count(*) from private.market_equipment_resale_chain_v23
      where resale_id=v_resale_again and sale_ordinal=3
        and buyer_account_id=v_buyer and seller_account_id=v_rival
        and previous_resale_id=v_second_resale_id)<>1
    or (select count(*) from private.market_equipment_sale_chain_v22
      where exact_instance_id=v_instance and sale_ordinal=1)<>1
    or (select count(*) from private.market_resale_gold_intents_v23)<>2
    or (select gold from public.character_wallets
      where character_id=v_buyer_main)<>368
    or (select gold from public.character_wallets
      where character_id=v_rival_char)<>293
  then raise exception 'V23 third sale broke the exact genealogy or fee conservation';end if;
  v_result:=private.market_claim_equipment_resale_v23(
    v_buyer,v_second_delivery,18,v_buyer_main::text,'equipment_pouch',
    'v23-third-claim',repeat('f',64));
  if v_result->>'status'<>'claimed'
    or (select state#>'{character,equipmentPouch,stacks,0}'
      from public.online_game_states where account_id=v_buyer)
      is distinct from v_stack
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_main::text
    or (select count(*) from private.market_equipment_sale_chain_v22
      where exact_instance_id=v_instance)<>1
  then raise exception 'V23 third-sale claim lost exact Forge copy';end if;

  -- V24: expired resale is hidden, cannot settle, and can be safely moved
  -- to an actionable return. No automatic worker is activated in this test.
  v_result:=private.market_reserve_equipment_resale_v23(
    v_buyer,19,v_instance,v_buyer_main::text,'equipment_pouch',0,125,
    'v24-expiring-reserve',repeat('0',64));
  v_resale_again:=(v_result->>'resaleId')::uuid;
  if v_result->>'sellerRevision'<>'20'
  then raise exception 'V24 expiry precondition source revision wrong';end if;
  begin
    perform private.market_expire_resale_v24(
      v_resale_again,'v24-too-early',repeat('1',64));
    raise exception 'V24 prematurely expired an active resale';
  exception when raise_exception then
    if sqlerrm<>'market_resale_not_expired_or_not_open' then raise;end if;
  end;
  update private.market_equipment_resale_offers_v23
    set expires_at=now()-interval '1 second'
    where resale_id=v_resale_again and status='active';
  if not found then raise exception 'V24 expiry test offer missing';end if;
  v_browse:=private.market_browse_combined_v24(
    'equipment',v_item,null,'price_asc',null,null,25,0);
  if v_browse->>'total'<>'0'
  then raise exception 'V24 expired item visible in unified browse';end if;
  v_browse:=private.market_due_resales_v24(10);
  if not exists(select 1 from jsonb_array_elements(v_browse->'entries') e(value)
      where e.value->>'resaleId'=v_resale_again::text
        and e.value->>'sellerAccountId'=v_buyer::text)
  then raise exception 'V24 due expiry worker failed to find open expired item';end if;
  begin
    perform private.market_purchase_equipment_resale_v23(
      v_rival,v_resale_again,125,8,20,'v24-expired-buy',repeat('2',64));
    raise exception 'V24 expired resale was purchased';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;
  v_result:=private.market_expire_resale_v24(
    v_resale_again,'v24-expire-now',repeat('3',64));
  if v_result->>'expired'<>'true'
    or v_result->>'status'<>'return_pending'
    or (select status from private.market_equipment_resale_offers_v23
      where resale_id=v_resale_again)<>'return_pending'
    or (select count(*) from private.market_resale_gold_intents_v23)<>2
    or (select count(*) from private.market_equipment_resale_chain_v23)<>2
    or (select revision from public.online_game_states where account_id=v_buyer)<>20
  then raise exception 'V24 expired resale consumed Gold or lost return';end if;
  v_retry:=private.market_expire_resale_v24(
    v_resale_again,'v24-expire-now',repeat('3',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'V24 expiry did not replay idempotently';end if;
  v_browse:=private.market_due_resales_v24(10);
  if exists(select 1 from jsonb_array_elements(v_browse->'entries') e(value)
       where e.value->>'resaleId'=v_resale_again::text)
  then raise exception 'V24 expired return still selected for worker';end if;
  v_inbox:=private.market_inbox_unified_v24(v_buyer,false,0);
  if not exists(select 1 from jsonb_array_elements(v_inbox->'entries') e(value)
     where e.value->>'id'='resale-return:'||v_resale_again::text
       and e.value->>'status'='ready')
  then raise exception 'V24 expired resale return not visible in Inbox';end if;
  v_result:=private.market_claim_resale_return_v23(
    v_buyer,v_resale_again,20,v_buyer_main::text,'equipment_pouch',
    'v24-expire-return',repeat('4',64));
  if v_result->>'status'<>'returned'
    or (select state#>'{character,equipmentPouch,stacks,0}'
      from public.online_game_states where account_id=v_buyer) is distinct from v_stack
    or (select recipient_character_id from private.market_equipment_provenance_v19
      where exact_instance_id=v_instance)<>v_buyer_main::text
    or (select count(*) from private.market_equipment_resale_chain_v23)<>2
    or (select count(*) from private.market_equipment_sale_chain_v22
      where exact_instance_id=v_instance)<>1
    or (select revision from public.online_game_states where account_id=v_buyer)<>21
  then raise exception 'V24 expired seller return lost Forge copy or history';end if;

  -- Separate unsold listing: seller cancellation returns original copy.
  -- A sold listing can never enter this path.
  update public.online_game_states set state=jsonb_set(
    jsonb_set(state,'{inventory,stacks}',
      (state#>'{inventory,stacks}')||jsonb_build_array(
        jsonb_set(v_stack,'{instanceId}',to_jsonb(v_other_instance),false)),false),
    '{account,craftedGearInstances}',jsonb_build_array(
      jsonb_set(jsonb_set(v_receipt,'{id}',to_jsonb(v_other_instance),false),
        '{sourceReceiptKey}',to_jsonb('craft-v9-second'::text),false)),false)
   where account_id=v_seller;
  v_result:=private.market_reserve_exact_equipment_v8(
    v_seller,7,'inventory',v_seller_char::text,1,v_item,v_other_instance,
    'gear-v9-second-reserve',repeat('8',64));
  v_hold2:=(v_result->>'holdId')::uuid;
  v_result:=private.market_publish_equipment_offer_v9(
    v_seller,v_hold2,75,1,'gear-v9-second-list',repeat('9',64));
  v_offer2:=(v_result->>'offerId')::uuid;
  v_result:=private.market_cancel_equipment_offer_v9(
    v_seller,v_offer2,'gear-v9-second-cancel',repeat('a',64));
  v_return_id:=(v_result->>'returnDeliveryId')::uuid;
  if (select count(*) from private.market_completed_sale_history_v13)<>1
  then raise exception 'cancelled_equipment_offer_creates_historical_sale';end if;
  if (select status from private.market_sale_offers_v3 where offer_id=v_offer2)<>'cancelled'
    or (select status from private.market_custody_holds_v1 where hold_id=v_hold2)<>'released'
    or (select status from private.market_equipment_return_deliveries_v8
         where delivery_id=v_return_id)<>'pending'
    or (select count(*) from private.market_equipment_purchase_deliveries_v9)<>1
    or (select gold from public.character_wallets where character_id=v_seller_char)<>218
  then raise exception 'seller cancellation after equipment listing did not preserve custody';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_seller,false,0);
  if v_inbox#>>'{entries,0,kind}'<>'returned'
    or v_inbox#>>'{entries,0,assetKind}'<>'equipment'
    or v_inbox#>>'{entries,0,deliveryId}'<>v_return_id::text
  then raise exception 'cancelled equipment missing from Market Inbox';end if;
  v_retry:=private.market_cancel_equipment_offer_v9(
    v_seller,v_offer2,'gear-v9-second-cancel',repeat('a',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'equipment offer cancellation not idempotent';end if;
  if (select count(*) from private.market_equipment_sale_chain_v22
      where exact_instance_id=v_instance)<>1
    or exists(select 1 from private.market_equipment_sale_chain_v22
      where exact_instance_id=v_other_instance)
  then raise exception 'V22 cancelled/returned unsold Forge gear created false sale history';end if;
end
$v9_test$;
select 'PASS V12: price-bound equipment sale with 5% tax, all Gold views, alternate-character receipt rebind, full storage and seller return and Inbox history' as result;
rollback;
