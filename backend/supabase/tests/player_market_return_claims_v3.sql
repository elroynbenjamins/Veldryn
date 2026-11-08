-- Hidden Market V3 synthetic claim regression.
-- Uses synthetic auth users inside a single ROLLBACK transaction.
-- QA temporarily relaxes runtime gates ONLY within that transaction.
begin;
set local statement_timeout='40s';

do $market_claim_test$
declare
  v_seller uuid:=pg_catalog.gen_random_uuid();
  v_other uuid:=pg_catalog.gen_random_uuid();
  v_inactive text:='inactive-market-character';
  v_res jsonb;
  v_cancel jsonb;
  v_claim jsonb;
  v_gem jsonb;
  v_replay jsonb;
  v_delivery uuid;
  v_second_delivery uuid;
  v_revision bigint;
  v_error text;
begin
  insert into auth.users(id,email)
    values (v_seller,'market-claim-'||v_seller||'@example.invalid'),
      (v_other,'market-claim-'||v_other||'@example.invalid');

  insert into public.online_game_states(account_id,revision,state) values
  (v_seller,5,pg_catalog.jsonb_build_object(
    'version',11,
    'character',pg_catalog.jsonb_build_object('id',v_seller::text,'gold',1000),
    'inventory',pg_catalog.jsonb_build_object('capacity',1,'stacks',
      pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'itemId','COPPER_ORE','quantity',18))),
    'bank',pg_catalog.jsonb_build_object('capacity',1,'stacks',
      pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'itemId','OLD_LOG','quantity',1))),
    'account',pg_catalog.jsonb_build_object('gemPouch',
      pg_catalog.jsonb_build_object('capacity',2,'stacks',
        pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
          'itemId','TEST_GEM','quantity',4)))),
    'otherCharacters',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'character',pg_catalog.jsonb_build_object('id',v_inactive),
        'inventory',pg_catalog.jsonb_build_object('capacity',1,'stacks','[]'::jsonb))),
    'settings',pg_catalog.jsonb_build_object('lockedItemIds','[]'::jsonb,
      'favoriteItemIds','[]'::jsonb)
  )),
  (v_other,3,pg_catalog.jsonb_build_object(
    'version',11,'character',pg_catalog.jsonb_build_object('id',v_other::text,'gold',500),
    'inventory',pg_catalog.jsonb_build_object('capacity',1,'stacks','[]'::jsonb),
    'bank',pg_catalog.jsonb_build_object('capacity',1,'stacks','[]'::jsonb),
    'settings',pg_catalog.jsonb_build_object('lockedItemIds','[]'::jsonb,
      'favoriteItemIds','[]'::jsonb)
  ));

  begin
    perform private.market_claim_return_delivery_v3(
      v_seller,pg_catalog.gen_random_uuid(),5,'inventory',v_seller::text,
      'claim-disabled-01',pg_catalog.repeat('a',64));
    raise exception 'disabled claim unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;

  if pg_catalog.has_function_privilege('anon',
     'private.market_claim_return_delivery_v3(uuid,uuid,bigint,text,text,text,text)'::regprocedure,'EXECUTE')
    or pg_catalog.has_function_privilege('authenticated',
     'private.market_claim_return_delivery_v3(uuid,uuid,bigint,text,text,text,text)'::regprocedure,'EXECUTE')
    or pg_catalog.has_function_privilege('service_role',
     'private.market_claim_return_delivery_v3(uuid,uuid,bigint,text,text,text,text)'::regprocedure,'EXECUTE')
  then raise exception 'market claim is callable by API roles';end if;

  -- QA ONLY. The real migrations keep all three separate CHECK gates false.
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  update private.market_runtime_guard_v1
    set trading_enabled=true,snapshot_bridge_ready=true where singleton;
  insert into private.market_item_policy_v1(
      item_id,asset_kind,tradable,binding_policy)
    values('COPPER_ORE','resource',true,'unbound'),
      ('TEST_GEM','gem',true,'unbound');

  v_res:=private.market_reserve_stack_v2(
    v_seller,5,'inventory',v_seller::text,0,'COPPER_ORE',9,
    'reserve-claim-01',pg_catalog.repeat('b',64));
  v_cancel:=private.market_cancel_stack_hold_v2(
    v_seller,(v_res->>'holdId')::uuid,'cancel-claim-01',
    pg_catalog.repeat('c',64));
  v_delivery:=(v_cancel->>'deliveryId')::uuid;

  -- Bank has one different full slot; do not consume the delivery or bump
  -- the game revision when the destination is unavailable.
  begin
    perform private.market_claim_return_delivery_v3(
      v_seller,v_delivery,6,'bank',null,
      'claim-full-001',pg_catalog.repeat('d',64));
    raise exception 'full bank accepted a second stack';
  exception when raise_exception then
    if sqlerrm<>'market_destination_full' then raise;end if;
  end;
  if (select status from private.market_return_deliveries_v2
      where delivery_id=v_delivery)<>'pending'
    or (select revision from public.online_game_states
      where account_id=v_seller)<>6
    or exists(select 1 from private.market_action_receipts_v2
      where owner_account_id=v_seller and idempotency_key='claim-full-001')
  then raise exception 'full storage silently consumed the return';end if;

  begin
    perform private.market_claim_return_delivery_v3(
      v_seller,v_delivery,6,'gem_pouch',null,
      'claim-badkind1',pg_catalog.repeat('e',64));
    raise exception 'resource was inserted into Gem Pouch';
  exception when raise_exception then
    if sqlerrm<>'market_return_storage_invalid' then raise;end if;
  end;

  begin
    perform private.market_claim_return_delivery_v3(
      v_other,v_delivery,3,'inventory',v_other::text,
      'claim-foreign1',pg_catalog.repeat('f',64));
    raise exception 'other account claimed the return';
  exception when raise_exception then
    if sqlerrm<>'market_delivery_not_owned' then raise;end if;
  end;

  -- Inventory itself is at capacity, but an exact plain matching stack can
  -- merge without creating another slot.
  v_claim:=private.market_claim_return_delivery_v3(
    v_seller,v_delivery,6,'inventory',v_seller::text,
    'claim-merge-01',pg_catalog.repeat('0',64));
  if v_claim->>'createdSlot'<>'false'
    or (select state#>>'{inventory,stacks,0,quantity}'
      from public.online_game_states where account_id=v_seller)<>'18'
    or (select revision from public.online_game_states
      where account_id=v_seller)<>7
    or (select status from private.market_return_deliveries_v2
      where delivery_id=v_delivery)<>'claimed'
  then raise exception 'existing stack merge or revision failed';end if;

  v_replay:=private.market_claim_return_delivery_v3(
    v_seller,v_delivery,6,'inventory',v_seller::text,
    'claim-merge-01',pg_catalog.repeat('0',64));
  if v_replay->>'replayed'<>'true'
    or (select state#>>'{inventory,stacks,0,quantity}'
      from public.online_game_states where account_id=v_seller)<>'18'
  then raise exception 'duplicate return credit on retry';end if;

  begin
    perform private.market_claim_return_delivery_v3(
      v_seller,v_delivery,7,'inventory',v_seller::text,
      'claim-twice-01',pg_catalog.repeat('1',64));
    raise exception 'second return claim without original key accepted';
  exception when raise_exception then
    if sqlerrm<>'market_delivery_already_claimed' then raise;end if;
  end;

  begin
    perform private.market_claim_return_delivery_v3(
      v_seller,v_delivery,6,'inventory',v_seller::text,
      'claim-merge-01',pg_catalog.repeat('2',64));
    raise exception 'idempotency key reused with changed request';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;

  -- Reclaim a gem into the account-wide Gem Pouch.
  v_gem:=private.market_reserve_stack_v2(
    v_seller,7,'gem_pouch',null,0,'TEST_GEM',2,
    'reserve-gem-01',pg_catalog.repeat('3',64));
  v_cancel:=private.market_cancel_stack_hold_v2(
    v_seller,(v_gem->>'holdId')::uuid,'cancel-gem-01',
    pg_catalog.repeat('4',64));
  v_second_delivery:=(v_cancel->>'deliveryId')::uuid;
  v_claim:=private.market_claim_return_delivery_v3(
    v_seller,v_second_delivery,8,'gem_pouch',null,
    'claim-gem-0001',pg_catalog.repeat('5',64));
  if (select state#>>'{account,gemPouch,stacks,0,quantity}'
      from public.online_game_states where account_id=v_seller)<>'4'
    or v_claim->>'createdSlot'<>'false'
  then raise exception 'gem pouch merge failed';end if;

  -- Full-stack removal can be reclaimed into an inactive character's
  -- capacity-limited inventory, not only the active character.
  v_res:=private.market_reserve_stack_v2(
    v_seller,9,'inventory',v_seller::text,0,'COPPER_ORE',18,
    'reserve-full-01',pg_catalog.repeat('6',64));
  v_cancel:=private.market_cancel_stack_hold_v2(
    v_seller,(v_res->>'holdId')::uuid,'cancel-full-01',
    pg_catalog.repeat('7',64));
  v_claim:=private.market_claim_return_delivery_v3(
    v_seller,(v_cancel->>'deliveryId')::uuid,10,'inventory',v_inactive,
    'claim-roster01',pg_catalog.repeat('8',64));
  if v_claim->>'createdSlot'<>'true'
    or (select state#>>'{otherCharacters,0,inventory,stacks,0,quantity}'
      from public.online_game_states where account_id=v_seller)<>'18'
    or (select state#>>'{character,gold}'
      from public.online_game_states where account_id=v_seller)<>'1000'
    or (select revision from public.online_game_states
      where account_id=v_seller)<>11
  then raise exception 'inactive character return or Gold conservation failed';end if;

  -- Exactly one claimed delivery per hold; no wallet changes.
  if (select count(*) from private.market_return_deliveries_v2
      where recipient_account_id=v_seller and status='claimed')<>3
    or (select count(*) from private.market_action_receipts_v2
      where owner_account_id=v_seller and action='claim_return')<>3
  then raise exception 'unexpected duplicate delivery or missing receipts';end if;
end;
$market_claim_test$;

select 'PASS: hidden return claims are capacity safe, idempotent, account-locked, and revision-checked' as result;
rollback;
