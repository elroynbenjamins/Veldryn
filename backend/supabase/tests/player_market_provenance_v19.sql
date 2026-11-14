-- Hidden Market V19: no public provenance or claim bypass after migrations.
-- All checks are read-only and the top-level transaction is rolled back.
begin;
set local statement_timeout='30s';
do $market_v19_security$
begin
  if not exists(select 1 from pg_catalog.pg_trigger
      where tgname='market_equipment_purchase_provenance_v19' and not tgisinternal)
    or not exists(select 1 from pg_catalog.pg_trigger
      where tgname='market_equipment_purchase_claim_guard_v19' and not tgisinternal)
    or not exists(select 1 from pg_catalog.pg_trigger
      where tgname='market_guard_online_equipment_provenance_v19' and not tgisinternal)
  then raise exception 'market_v19_triggers_missing';end if;
  if exists(select 1 from private.market_equipment_provenance_v19)
    or has_table_privilege('anon','private.market_equipment_provenance_v19','SELECT')
    or has_table_privilege('authenticated','private.market_equipment_provenance_v19','INSERT')
    or has_table_privilege('service_role','private.market_equipment_provenance_v19','UPDATE')
    or has_function_privilege('authenticated',
      'private.market_owned_copy_valid_v19(jsonb,text,text,text,jsonb)'::regprocedure,
      'EXECUTE')
    or has_function_privilege('service_role',
      'private.market_enforce_equipment_delivery_v19()'::regprocedure,'EXECUTE')
  then raise exception 'market_v19_exposure_or_seeded_provenance';end if;
  if exists(select 1 from private.market_runtime_guard_v1
       where trading_enabled or snapshot_bridge_ready)
    or exists(select 1 from private.market_equipment_guard_v8
       where equipment_transfers_enabled)
    or exists(select 1 from private.market_acquisition_policy_v18
       where approved)
  then raise exception 'market_v19_release_gate_not_disabled';end if;
end
$market_v19_security$;
rollback;
