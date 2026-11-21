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

-- Simulate an ordinary backend online-game save made as service_role, with
-- zero Market items. It must not lose access to private V19 provenance when
-- the global snapshot-integrity trigger fires.
do $market_v20_prepare_role$
declare
  v_account uuid:=gen_random_uuid();
  v_character uuid:=gen_random_uuid();
begin
  perform pg_catalog.set_config('market.v20_test_account',v_account::text,true);
  insert into auth.users(id,email)
    values(v_account,'v20-probe-'||v_account::text||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,gold)
    values(v_character,v_account,'TransferProbe','BASTION',1);
  insert into public.online_game_states(account_id,character_id,revision,state)
  values(v_account,v_character,0,pg_catalog.jsonb_build_object(
    'character',pg_catalog.jsonb_build_object(
      'id',v_character::text,'xp',0,'classId','BASTION','gold',1),
    'account',pg_catalog.jsonb_build_object(
      'craftedGearInstances','[]'::jsonb),
    'inventory',pg_catalog.jsonb_build_object(
      'capacity',5,'stacks','[]'::jsonb),
    'otherCharacters','[]'::jsonb));
end
$market_v20_prepare_role$;
set local role service_role;
do $market_v20_role_save$
begin
  update public.online_game_states set state=state
    where account_id=pg_catalog.current_setting('market.v20_test_account')::uuid;
  if not found then
    raise exception 'market_v20_service_role_online_save_not_permitted';
  end if;
end
$market_v20_role_save$;
reset role;
rollback;
