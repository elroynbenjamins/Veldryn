-- Hidden Market V24: private combined browsing/Inbox, safe expiry and
-- canonical V12 socket roll predicates. No actual trades or policy approvals.
begin;
set local statement_timeout='35s';
do $market_v24_security$
declare
 v_signature text;
 v_name text;
begin
 if to_regprocedure('private.market_browse_combined_v24(text,text,text,text,bigint,bigint,integer,integer)') is null
   or to_regprocedure('private.market_inbox_unified_v24(uuid,boolean,integer)') is null
   or to_regprocedure('private.market_due_resales_v24(integer)') is null
   or to_regprocedure('private.market_expire_resale_v24(uuid,text,text)') is null
   or not exists(select 1 from pg_catalog.pg_indexes
     where schemaname='private' and indexname='market_resale_due_expiry_v24')
   or not exists(select 1 from pg_catalog.pg_indexes
     where schemaname='private' and indexname='market_resale_browse_active_v24')
 then raise exception 'market_v24_schema_missing';end if;
 if not (
   pg_catalog.pg_get_functiondef(
     'private.market_browse_verified_offers_v12(text,text,text,text,bigint,bigint,integer,integer)'::regprocedure)
   like '%gem_socket%')
   or not (
   pg_catalog.pg_get_functiondef(
     'private.market_browse_verified_offers_v12(text,text,text,text,bigint,bigint,integer,integer)'::regprocedure)
   like '%statGemRollPercent%')
 then raise exception 'market_v24_stale_v12_verified_browse_not_reconciled';end if;
 if exists(select 1 from private.market_runtime_guard_v1
     where trading_enabled or snapshot_bridge_ready)
   or exists(select 1 from private.market_equipment_guard_v8
     where equipment_transfers_enabled)
   or exists(select 1 from private.market_acquisition_policy_v18 where approved)
   or exists(select 1 from private.market_equipment_resale_offers_v23)
   or exists(select 1 from private.market_resale_gold_intents_v23)
   or exists(select 1 from private.market_equipment_resale_deliveries_v23)
 then raise exception 'market_v24_live_or_seeded';end if;
 for v_signature in select name from (values
   ('private.market_browse_combined_v24(text,text,text,text,bigint,bigint,integer,integer)'),
   ('private.market_inbox_unified_v24(uuid,boolean,integer)'),
   ('private.market_due_resales_v24(integer)'),
   ('private.market_expire_resale_v24(uuid,text,text)')
 ) funcs(name)
 loop
   if has_function_privilege('anon',v_signature,'EXECUTE')
     or has_function_privilege('authenticated',v_signature,'EXECUTE')
     or has_function_privilege('service_role',v_signature,'EXECUTE')
     or (select prosecdef from pg_catalog.pg_proc where oid=v_signature::regprocedure)
   then raise exception 'market_v24_read_or_expiry_function_exposed';end if;
 end loop;
 if has_table_privilege('authenticated','private.market_equipment_resale_offers_v23','SELECT')
   or has_table_privilege('service_role','private.market_equipment_resale_offers_v23','SELECT')
 then raise exception 'market_v24_private_listing_ledger_exposed';end if;

 begin
   perform private.market_browse_combined_v24();
   raise exception 'market_v24_disabled_browse_succeeded';
 exception when raise_exception then
   if sqlerrm<>'market_disabled' then raise;end if;
 end;
 begin
   perform private.market_inbox_unified_v24(
     '00000000-0000-0000-0000-000000000001'::uuid,false,0);
   raise exception 'market_v24_disabled_inbox_succeeded';
 exception when raise_exception then
   if sqlerrm<>'market_disabled' then raise;end if;
 end;
 begin
   perform private.market_due_resales_v24(10);
   raise exception 'market_v24_disabled_expiry_queue_visible';
 exception when raise_exception then
   if sqlerrm<>'market_disabled' then raise;end if;
 end;
 begin
   perform private.market_expire_resale_v24(
     '00000000-0000-0000-0000-000000000001'::uuid,
     'v24-disabled-expiry',repeat('a',64));
   raise exception 'market_v24_disabled_expiration_succeeded';
 exception when raise_exception then
   if sqlerrm<>'market_disabled' then raise;end if;
 end;
end
$market_v24_security$;
rollback;