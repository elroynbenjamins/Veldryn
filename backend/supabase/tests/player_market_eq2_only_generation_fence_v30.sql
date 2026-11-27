-- Disposable PG17 / rollback-only V30 safety regression.
-- It does not grant EQ2 trade permissions or mint real items.
begin;
do $eq2_only_v30$
declare
 v_triggers integer;
 v_blocked boolean;
begin
 select count(*) into v_triggers
 from pg_catalog.pg_trigger t
 join pg_catalog.pg_class c on c.oid=t.tgrelid
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='private' and not t.tgisinternal and
   t.tgname in (
     'market_eq2_only_assets_v30',
     'market_eq2_only_offers_v30',
     'market_eq2_only_escrows_v30',
     'market_eq2_only_first_delivery_v30',
     'market_eq2_only_first_sale_v30',
     'market_eq2_only_resale_offers_v30',
     'market_eq2_only_resale_chain_v30',
     'market_eq2_only_resale_delivery_v30'
   ) and t.tgenabled = 'O'
   and t.tgfoid='private.market_reject_legacy_equipment_v30()'::regprocedure;
 if v_triggers <> 8 then
   raise exception 'market_eq2_missing_transaction_fences: %',v_triggers;
 end if;
 if pg_catalog.has_function_privilege(
     'authenticated','private.market_reject_legacy_equipment_v30()','EXECUTE')
   or pg_catalog.has_function_privilege(
     'anon','private.market_reject_legacy_equipment_v30()','EXECUTE')
   or pg_catalog.has_function_privilege(
     'service_role','private.market_reject_legacy_equipment_v30()','EXECUTE')
 then raise exception 'market_eq2_fence_unexpected_execute_grant'; end if;
 if exists(select 1 from private.market_runtime_guard_v1
      where trading_enabled or snapshot_bridge_ready)
   or exists(select 1 from private.market_equipment_guard_v8
      where equipment_transfers_enabled)
   or exists(select 1 from private.market_item_policy_v1
      where asset_kind='equipment' and tradable)
 then raise exception 'market_eq2_no_release_invariant_broken'; end if;

 -- A recognizable OLD Forge copy must never be insertable, even if it
 -- comes from an otherwise valid existing character with matching tier.
 v_blocked:=false;
 begin
   insert into private.market_custody_assets_v1(
      owner_account_id,source_revision,source_location,source_character_id,
      source_locator,item_id,asset_kind,exact_instance_id,quantity
   ) values (
      '40000000-0000-4000-8000-000000000010'::uuid,1,'inventory','forged-char',
      'legacy-stack','OLD_V33_HELMET','equipment','legacy-v33-instance',1
   );
 exception when raise_exception then
   if sqlerrm='market_legacy_equipment_denied' then v_blocked:=true;
   else raise;end if;
 end;
 if not v_blocked then raise exception 'market_eq2_legacy_asset_accepted'; end if;

 -- Even an EQ2-looking item name and client-provided generation tag cannot
 -- act as original mint provenance through the old Forge transaction tables.
 v_blocked:=false;
 begin
   insert into private.market_custody_assets_v1(
      owner_account_id,source_revision,source_location,source_character_id,
      source_locator,item_id,asset_kind,exact_instance_id,quantity,
      immutable_attributes
   ) values (
      '40000000-0000-4000-8000-000000000010'::uuid,1,'inventory','forged-char',
      '0','EQ2_FIELDBORN_GUARD_HELMET','equipment','fake-eq2-instance',1,
      '{"generation":"eq2","exactReceipt":{"manifestVersion":"eq2"}}'::jsonb
   );
 exception when raise_exception then
   if sqlerrm='market_legacy_equipment_denied' then v_blocked:=true;
   else raise;end if;
 end;
 if not v_blocked then raise exception 'market_eq2_spoofed_asset_accepted'; end if;

 v_blocked:=false;
 begin
   insert into private.market_equipment_resale_offers_v23(
      exact_instance_id,first_source_hold_id,last_sale_ordinal,
      seller_account_id,seller_character_id,item_id,source_location,
      source_index,source_revision,receipt_payload,stack_payload,unit_price
   ) values (
      'fake-eq2-instance',pg_catalog.gen_random_uuid(),1,
      '40000000-0000-4000-8000-000000000010'::uuid,'forged-char',
      'EQ2_FIELDBORN_GUARD_HELMET','inventory',0,1,
      '{"generation":"eq2"}'::jsonb,'{"quantity":1}'::jsonb,100
   );
 exception when raise_exception then
   if sqlerrm='market_legacy_equipment_denied' then v_blocked:=true;
   else raise;end if;
 end;
 if not v_blocked then raise exception 'market_eq2_spoofed_resale_accepted'; end if;

 -- Resources must retain their separate Market path; with a fake account,
 -- its FK should fail, not the equipment-only version fence.
 begin
   insert into private.market_custody_assets_v1(
      owner_account_id,source_revision,source_location,source_character_id,
      source_locator,item_id,asset_kind,quantity
   ) values (
      '40000000-0000-4000-8000-000000000010'::uuid,1,'inventory',
      'forged-char','1','COPPER_ORE','resource',1
   );
   raise exception 'market_eq2_unexpected_resource_insert';
 exception
   when foreign_key_violation then null;
   when raise_exception then
     if sqlerrm='market_legacy_equipment_denied'
     then raise exception 'market_eq2_resource_path_blocked';
     else raise;end if;
 end;

 if exists(select 1 from private.market_custody_assets_v1
      where exact_instance_id='fake-eq2-instance')
   or exists(select 1 from private.market_equipment_resale_offers_v23
      where exact_instance_id='fake-eq2-instance')
 then raise exception 'market_eq2_test_asset_leaked';end if;
end;
$eq2_only_v30$;
rollback;
