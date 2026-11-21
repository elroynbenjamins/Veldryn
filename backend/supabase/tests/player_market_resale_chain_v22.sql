-- V22 private resale-chain security regression. No real players,
-- no market approvals, no second-sale or active-market activation.
begin;
set local statement_timeout='35s';
do $market_v22_gate$
begin
  if to_regclass('private.market_equipment_sale_chain_v22') is null
    or not exists(select 1 from pg_catalog.pg_trigger
      where tgname='market_z_equipment_purchase_chain_v22' and not tgisinternal)
    or not exists(select 1 from pg_catalog.pg_trigger
      where tgname='market_block_second_equipment_reservation_v22' and not tgisinternal)
    or not exists(select 1 from pg_catalog.pg_trigger
      where tgname='market_sale_chain_no_mutation_v22' and not tgisinternal)
  then raise exception 'market_v22_schema_or_triggers_missing';end if;

  if not (select prosecdef from pg_catalog.pg_proc
     where oid='private.market_record_sale_chain_v22()'::regprocedure)
    or not (select prosecdef from pg_catalog.pg_proc
     where oid='private.market_block_resale_asset_reservation_v22()'::regprocedure)
  then raise exception 'market_v22_private_trigger_cannot_read_restricted_chain';end if;
  if has_function_privilege('anon',
       'private.market_resale_preflight_v22(uuid,text,text,text,integer)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('authenticated',
       'private.market_resale_preflight_v22(uuid,text,text,text,integer)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('service_role',
       'private.market_resale_preflight_v22(uuid,text,text,text,integer)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('service_role',
       'private.market_record_sale_chain_v22()'::regprocedure,'EXECUTE')
    or has_table_privilege('authenticated',
       'private.market_equipment_sale_chain_v22','SELECT')
    or has_table_privilege('service_role',
       'private.market_equipment_sale_chain_v22','UPDATE')
    or exists(select 1 from private.market_equipment_sale_chain_v22)
    or exists(select 1 from private.market_equipment_provenance_v19)
    or exists(select 1 from private.market_gold_intents_v2)
  then raise exception 'market_v22_data_or_privilege_exposure';end if;

  if exists(select 1 from private.market_runtime_guard_v1
       where trading_enabled or snapshot_bridge_ready)
    or exists(select 1 from private.market_equipment_guard_v8
       where equipment_transfers_enabled)
    or exists(select 1 from private.market_acquisition_policy_v18
       where approved)
  then raise exception 'market_v22_release_gate_enabled';end if;

  -- The preflight never produces an approved resale authorization, even for
  -- an unknown copy. It is deliberately only a private read-only preview.
  if (private.market_resale_preflight_v22(
     '00000000-0000-0000-0000-000000000001'::uuid,
     'unowned-example','unowned-char','inventory',0)->>'canRelistNow')<>'false'
  then raise exception 'market_v22_resale_preflight_authorized';end if;
end
$market_v22_gate$;
rollback;
