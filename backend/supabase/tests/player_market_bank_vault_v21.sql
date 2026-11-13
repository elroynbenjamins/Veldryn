-- Hidden Market V21 bank: private function, private vault ledger,
-- hard-disabled trading and no seeded provenance or bank operations.
begin;
set local statement_timeout='30s';
do $market_v21$
begin
  if not exists(select 1 from pg_catalog.pg_proc
      where oid='private.market_move_purchased_equipment_bank_v21(uuid,text,text,text,text,integer,integer,bigint,text,text)'::regprocedure)
    or not exists(select 1 from pg_catalog.pg_proc
      where oid='private.market_owned_banked_copy_valid_v21(jsonb,text,text,text,jsonb)'::regprocedure)
    or not exists(select 1 from pg_catalog.pg_class
      where oid='private.market_equipment_bank_actions_v21'::regclass)
    or not exists(select 1 from information_schema.columns
      where table_schema='private' and table_name='market_equipment_provenance_v19'
        and column_name='storage_state')
  then raise exception 'market_v21_schema_missing';end if;
  if has_function_privilege('anon',
       'private.market_move_purchased_equipment_bank_v21(uuid,text,text,text,text,integer,integer,bigint,text,text)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('authenticated',
       'private.market_move_purchased_equipment_bank_v21(uuid,text,text,text,text,integer,integer,bigint,text,text)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('service_role',
       'private.market_move_purchased_equipment_bank_v21(uuid,text,text,text,text,integer,integer,bigint,text,text)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('service_role',
       'private.market_owned_banked_copy_valid_v21(jsonb,text,text,text,jsonb)'::regprocedure,
       'EXECUTE')
    or has_table_privilege('service_role',
       'private.market_equipment_bank_actions_v21','SELECT')
    or has_table_privilege('authenticated',
       'private.market_equipment_bank_actions_v21','INSERT')
    or exists(select 1 from private.market_equipment_bank_actions_v21)
    or exists(select 1 from private.market_equipment_provenance_v19)
  then raise exception 'market_v21_vault_exposed_or_seeded';end if;
  if exists(select 1 from private.market_runtime_guard_v1
      where trading_enabled or snapshot_bridge_ready)
    or exists(select 1 from private.market_equipment_guard_v8
      where equipment_transfers_enabled)
    or exists(select 1 from private.market_acquisition_policy_v18 where approved)
  then raise exception 'market_v21_release_gates_open';end if;
  begin
    perform private.market_move_purchased_equipment_bank_v21(
      '00000000-0000-0000-0000-000000000001'::uuid,
      'v21-gate-closed','deposit',
      '00000000-0000-0000-0000-000000000002',
      'equipment_pouch',0,0,0,
      'v21-gate-closed',repeat('a',64));
    raise exception 'market_v21_bank_accepted_with_trading_disabled';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;
  if not (select prosecdef from pg_catalog.pg_proc
      where oid='private.market_guard_owned_equipment_snapshot_v19()'::regprocedure)
    or has_function_privilege('service_role',
      'private.market_guard_owned_equipment_snapshot_v19()'::regprocedure,
      'EXECUTE')
  then raise exception 'market_v21_snapshot_trigger_privilege_invalid';end if;
end
$market_v21$;
rollback;
