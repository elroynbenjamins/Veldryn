-- V23 isolated resales: hard-off launch, no client-accessible RPC,
-- no seed offers, no removal of V1/V8 original escrow uniqueness.
begin;
set local statement_timeout='35s';
do $market_v23_security$
declare
 v_signature text;
begin
 if to_regclass('private.market_equipment_resale_offers_v23') is null
   or to_regclass('private.market_equipment_resale_chain_v23') is null
   or to_regclass('private.market_equipment_resale_deliveries_v23') is null
   or to_regclass('private.market_resale_gold_intents_v23') is null
   or to_regclass('private.market_resale_action_receipts_v23') is null
 then raise exception 'market_v23_schema_missing';end if;
 if not exists(select 1 from pg_catalog.pg_indexes
   where schemaname='private' and indexname='market_custody_equipment_instance_unique_v1')
   or not exists(select 1 from pg_catalog.pg_indexes
   where schemaname='private' and indexname='market_equipment_instance_escrow_v8')
   or not exists(select 1 from pg_catalog.pg_indexes
   where schemaname='private' and indexname='market_resale_one_open_copy_v23')
 then raise exception 'market_v23_uniqueness_guards_missing';end if;
 if (select count(*) from private.market_equipment_resale_offers_v23)<>0
   or (select count(*) from private.market_equipment_resale_chain_v23)<>0
   or (select count(*) from private.market_equipment_resale_deliveries_v23)<>0
   or (select count(*) from private.market_resale_gold_intents_v23)<>0
   or (select count(*) from private.market_resale_action_receipts_v23)<>0
 then raise exception 'market_v23_seeded_market_data';end if;
 if exists(select 1 from private.market_runtime_guard_v1
   where trading_enabled or snapshot_bridge_ready)
   or exists(select 1 from private.market_equipment_guard_v8
   where equipment_transfers_enabled)
   or exists(select 1 from private.market_acquisition_policy_v18
   where approved)
 then raise exception 'market_v23_release_gate_open';end if;
 if (select count(*) from pg_catalog.pg_proc
   where pronamespace='private'::regnamespace
     and proname in (
       'market_reserve_equipment_resale_v23',
       'market_cancel_equipment_resale_v23',
       'market_claim_resale_return_v23',
       'market_purchase_equipment_resale_v23',
       'market_claim_equipment_resale_v23'))<>5
 then raise exception 'market_v23_lifecycle_functions_missing';end if;

 for v_signature in select name from (values
  ('private.market_reserve_equipment_resale_v23(uuid,bigint,text,text,text,integer,bigint,text,text)'),
  ('private.market_cancel_equipment_resale_v23(uuid,uuid,text,text)'),
  ('private.market_claim_resale_return_v23(uuid,uuid,bigint,text,text,text,text)'),
  ('private.market_purchase_equipment_resale_v23(uuid,uuid,bigint,bigint,bigint,text,text)'),
  ('private.market_claim_equipment_resale_v23(uuid,uuid,bigint,text,text,text,text)')
 ) r(name)
 loop
   if has_function_privilege('anon',v_signature,'EXECUTE')
     or has_function_privilege('authenticated',v_signature,'EXECUTE')
     or has_function_privilege('service_role',v_signature,'EXECUTE')
   then raise exception 'market_v23_private_sql_exposed';end if;
 end loop;
 if has_table_privilege('authenticated','private.market_equipment_resale_offers_v23','SELECT')
   or has_table_privilege('service_role','private.market_equipment_resale_chain_v23','INSERT')
   or has_table_privilege('authenticated','private.market_resale_gold_intents_v23','SELECT')
   or has_table_privilege('service_role','private.market_equipment_resale_deliveries_v23','UPDATE')
   or has_table_privilege('service_role','private.market_resale_action_receipts_v23','SELECT')
 then raise exception 'market_v23_private_ledger_exposed';end if;
 if not (select prosecdef from pg_catalog.pg_proc
   where oid='private.market_guard_owned_equipment_snapshot_v19()'::regprocedure)
 then raise exception 'market_v23_snapshot_security_changed';end if;

 begin
   perform private.market_reserve_equipment_resale_v23(
      '00000000-0000-0000-0000-000000000001'::uuid,0,
      'unowned-v23-copy','unowned-char','inventory',0,125,
      'v23-unreleased',repeat('a',64));
   raise exception 'market_v23_active_when_disabled';
 exception when raise_exception then
   if sqlerrm<>'market_disabled' then raise;end if;
 end;
end
$market_v23_security$;
rollback;
