-- V20 gate/ACL regression for the hidden direct-recipient transfer API.
-- No player transfers, permissions, policy approvals or commits.
begin;
set local statement_timeout='30s';
do $market_v20$
begin
 if not exists(select 1 from pg_catalog.pg_proc
   where oid='private.market_transfer_purchased_equipment_v20(uuid,text,text,text,integer,text,text,bigint,text,text)'::regprocedure)
   or not exists(select 1 from pg_catalog.pg_class
     where oid='private.market_equipment_recipient_transfers_v20'::regclass)
 then raise exception 'market_v20_schema_missing';end if;
 -- A public.online_game_states write can run under service_role, but the
 -- V19 trigger must read private provenance without granting API access.
 if not (select prosecdef from pg_catalog.pg_proc
   where oid='private.market_guard_owned_equipment_snapshot_v19()'::regprocedure)
   or has_function_privilege('service_role',
     'private.market_guard_owned_equipment_snapshot_v19()'::regprocedure,
     'EXECUTE')
 then raise exception 'market_v20_snapshot_definer_boundary_invalid';end if;
 if has_function_privilege('anon',
     'private.market_transfer_purchased_equipment_v20(uuid,text,text,text,integer,text,text,bigint,text,text)'::regprocedure,
     'EXECUTE')
   or has_function_privilege('authenticated',
     'private.market_transfer_purchased_equipment_v20(uuid,text,text,text,integer,text,text,bigint,text,text)'::regprocedure,
     'EXECUTE')
   or has_function_privilege('service_role',
     'private.market_transfer_purchased_equipment_v20(uuid,text,text,text,integer,text,text,bigint,text,text)'::regprocedure,
     'EXECUTE')
   or has_table_privilege('service_role',
     'private.market_equipment_recipient_transfers_v20','INSERT')
   or has_table_privilege('authenticated',
     'private.market_equipment_recipient_transfers_v20','SELECT')
   or exists(select 1 from private.market_equipment_recipient_transfers_v20)
   or exists(select 1 from private.market_equipment_provenance_v19)
 then raise exception 'market_v20_transfer_exposed_or_seeded';end if;
 if exists(select 1 from private.market_runtime_guard_v1
     where trading_enabled or snapshot_bridge_ready)
   or exists(select 1 from private.market_equipment_guard_v8
     where equipment_transfers_enabled)
 then raise exception 'market_v20_global_release_gate_bypassed';end if;
 begin
   perform private.market_transfer_purchased_equipment_v20(
     '00000000-0000-0000-0000-000000000001'::uuid,
     'v20-no-real-instance',
     '00000000-0000-0000-0000-000000000002',
     'equipment_pouch',0,
     '00000000-0000-0000-0000-000000000003',
     'inventory',0,'v20-closed-gate',repeat('a',64));
   raise exception 'market_v20_transfer_succeeded_while_disabled';
 exception when raise_exception then
   if sqlerrm<>'market_disabled' then raise;end if;
 end;
end
$market_v20$;
rollback;
