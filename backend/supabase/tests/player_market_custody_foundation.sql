-- Inert private custody/escrow regression. Run AFTER the foundation migration.
-- All fixture writes are in one transaction and rolled back.
begin;
set local statement_timeout='30s';

do $test$
declare
  v_table text;
  v_guard private.market_runtime_guard_v1%rowtype;
  v_a uuid:=gen_random_uuid();
  v_b uuid:=gen_random_uuid();
  v_gear uuid;
  v_resource uuid;
  v_rejected boolean;
begin
  foreach v_table in array array[
    'market_runtime_guard_v1','market_item_policy_v1',
    'market_custody_assets_v1','market_custody_holds_v1'
  ] loop
    if not exists(
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='private' and c.relname=v_table and c.relrowsecurity
    ) then raise exception 'market private table missing RLS: %',v_table; end if;
    if has_table_privilege('anon',format('private.%I',v_table),'SELECT')
      or has_table_privilege('anon',format('private.%I',v_table),'INSERT')
      or has_table_privilege('authenticated',format('private.%I',v_table),'SELECT')
      or has_table_privilege('authenticated',format('private.%I',v_table),'UPDATE')
      or has_table_privilege('service_role',format('private.%I',v_table),'INSERT')
    then raise exception 'market private ACL incorrectly exposed: %',v_table; end if;
  end loop;

  select * into v_guard from private.market_runtime_guard_v1 where singleton;
  if not found or v_guard.trading_enabled or v_guard.snapshot_bridge_ready
    then raise exception 'market is not hard-disabled'; end if;

  v_rejected:=false;
  begin
    update private.market_runtime_guard_v1 set trading_enabled=true where singleton;
  exception when check_violation then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'release flag bypassed hard-lock'; end if;

  v_rejected:=false;
  begin
    insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
    values('FAKE_TEST_RESOURCE','resource',true,'unbound');
  exception when check_violation then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'tradability policy bypassed default-deny'; end if;

  -- Realistic account source rows; no gameplay snapshots or live wallets change.
  insert into auth.users(id,email)
  values(v_a,'market-test-'||v_a||'@example.invalid'),
        (v_b,'market-test-'||v_b||'@example.invalid');
  insert into public.online_game_states(account_id) values(v_a),(v_b);

  insert into private.market_custody_assets_v1(
    owner_account_id,source_revision,source_location,source_character_id,
    source_locator,item_id,asset_kind,exact_instance_id,source_receipt_key,quantity
  ) values(
    v_a,6,'equipment_pouch',v_a::text,'pouch:0',
    'T1_TEST_EQUIPMENT','equipment','gear:stable-unique-1','craft-receipt',1
  ) returning asset_id into v_gear;
  if (select verification_state from private.market_custody_assets_v1 where asset_id=v_gear)<>'unverified'
    or (select source_bound from private.market_custody_assets_v1 where asset_id=v_gear) is not true
    then raise exception 'asset verified/unbound without authoritative reconciliation'; end if;

  v_rejected:=false;
  begin
    insert into private.market_custody_assets_v1(
      owner_account_id,source_revision,source_location,source_locator,
      item_id,asset_kind,exact_instance_id,quantity
    ) values(
      v_b,6,'equipment_pouch','pouch:0','T1_TEST_EQUIPMENT','equipment',
      'gear:stable-unique-1',1
    );
  exception when unique_violation then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'duplicate gear could belong to multiple accounts';end if;

  v_rejected:=false;
  begin
    insert into private.market_custody_assets_v1(
      owner_account_id,source_revision,source_location,source_locator,
      item_id,asset_kind,quantity
    ) values(v_a,6,'equipment_pouch','pouch:1','T1_TEST_EQUIPMENT','equipment',1);
  exception when check_violation then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'equipment without an exact receipt accepted'; end if;

  insert into private.market_custody_assets_v1(
    owner_account_id,source_revision,source_location,source_character_id,
    source_locator,item_id,asset_kind,quantity
  ) values(v_a,6,'inventory',v_a::text,'inventory:2','COPPER_ORE','resource',50)
  returning asset_id into v_resource;

  -- A malicious/stale hold cannot refer to a different seller's asset.
  v_rejected:=false;
  begin
    insert into private.market_custody_holds_v1(
      asset_id,owner_account_id,request_key,request_hash,held_quantity,source_revision
    ) values(
      v_resource,v_b,'market-test-owner',repeat('c',64),1,6
    );
  exception when foreign_key_violation then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'hold can cross account ownership'; end if;

  v_rejected:=false;
  begin
    update private.market_custody_assets_v1 set held_quantity=12 where asset_id=v_resource;
  exception when check_violation then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'asset quantity entered escrow before bridge'; end if;

  v_rejected:=false;
  begin
    insert into private.market_custody_holds_v1(
      asset_id,owner_account_id,request_key,request_hash,held_quantity,status,source_revision
    ) values(
      v_resource,v_a,'market-test-0001',repeat('a',64),12,'held',6
    );
  exception when check_violation then v_rejected:=true;
  end;
  if not v_rejected then raise exception 'live escrow hold accepted while market disabled'; end if;

  if exists(
    select 1 from information_schema.tables
    where table_schema='public' and table_name in ('market_orders','market_trades')
  ) then raise exception 'retired public market book was recreated'; end if;
end
$test$;

select 'PASS: market custody stays private, disabled, exact-copy and fail-closed' as result;
rollback;
