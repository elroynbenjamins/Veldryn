-- Hidden-market atomic resource-stack regression. Synthetic accounts only.
-- All changes, INCLUDING temporary removal of false CHECK gates for exercising
-- the private functions, occur inside one transaction and ROLLBACK.
-- NEVER run the gate-relaxation block outside this rollback test.

begin;
set local statement_timeout='35s';

do $market_reservation_test$
declare
  v_a uuid:=gen_random_uuid();
  v_b uuid:=gen_random_uuid();
  v_first jsonb;
  v_second jsonb;
  v_bank jsonb;
  v_gem jsonb;
  v_cancel jsonb;
  v_replay jsonb;
  v_hold uuid;
  v_second_hold uuid;
  v_bank_hold uuid;
  v_before_gold bigint;
  v_return uuid;
  v_failed boolean;
  v_action text;
begin
  -- New random rows do not touch real player accounts and roll back at end.
  insert into auth.users(id,email) values
    (v_a,'market-reserve-'||v_a||'@example.invalid'),
    (v_b,'market-reserve-'||v_b||'@example.invalid');

  insert into public.online_game_states(account_id,revision,state) values
  (v_a,10,jsonb_build_object(
    'version',11,
    'character',jsonb_build_object('id',v_a::text,'gold',1000,'progressionGoals','[]'::jsonb),
    'inventory',jsonb_build_object('capacity',30,'stacks',jsonb_build_array(
      jsonb_build_object('itemId','COPPER_ORE','quantity',50),
      jsonb_build_object('itemId','DEWLEAF','quantity',20)
    )),
    'bank',jsonb_build_object('capacity',120,'stacks','[]'::jsonb),
    'account',jsonb_build_object('gemPouch',jsonb_build_object('capacity',30,
      'stacks',jsonb_build_array(jsonb_build_object('itemId','TEST_GEM','quantity',10)))),
    'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
      'favoriteItemIds',jsonb_build_array('DEWLEAF'))
  )),
  (v_b,20,jsonb_build_object(
    'version',11,
    'character',jsonb_build_object('id',v_b::text,'gold',700),
    'inventory',jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
    'bank',jsonb_build_object('capacity',120,'stacks',jsonb_build_array(
      jsonb_build_object('itemId','COPPER_ORE','quantity',8))),
    'account',jsonb_build_object('gemPouch',jsonb_build_object('capacity',30,'stacks','[]'::jsonb)),
    'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb)
  ));

  begin
    perform private.market_reserve_stack_v2(
      v_a,10,'inventory',v_a::text,0,'COPPER_ORE',12,
      'reserve-test-a1',repeat('a',64));
    raise exception 'disabled reserve accepted';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;
  if has_function_privilege('authenticated',
     'private.market_reserve_stack_v2(uuid,bigint,text,text,integer,text,integer,text,text)'::regprocedure,'EXECUTE')
    or has_function_privilege('service_role',
     'private.market_reserve_stack_v2(uuid,bigint,text,text,integer,text,integer,text,text)'::regprocedure,'EXECUTE')
    or has_function_privilege('anon',
     'private.market_cancel_stack_hold_v2(uuid,uuid,text,text,boolean)'::regprocedure,'EXECUTE')
  then raise exception 'mutating market RPC unexpectedly exposed';end if;

  -- QA only: remove hard false constraints within this never-committed txn.
  -- The committed migration retains these false constraints permanently.
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  update private.market_runtime_guard_v1
    set trading_enabled=true,snapshot_bridge_ready=true where singleton;
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
  values
    ('COPPER_ORE','resource',true,'unbound'),
    ('DEWLEAF','resource',true,'unbound'),
    ('TEST_GEM','gem',true,'unbound');

  select (state#>>'{character,gold}')::bigint into v_before_gold
  from public.online_game_states where account_id=v_a;
  v_first:=private.market_reserve_stack_v2(
    v_a,10,'inventory',v_a::text,0,'COPPER_ORE',12,
    'reserve-test-a1',repeat('a',64));
  v_hold:=(v_first->>'holdId')::uuid;
  if v_first->>'quantity'<>'12' or v_first->>'remaining'<>'38'
    or (select revision from public.online_game_states where account_id=v_a)<>11
    or (select state#>>'{inventory,stacks,0,quantity}' from public.online_game_states
        where account_id=v_a)<>'38'
  then raise exception 'atomic partial-stack debit or snapshot revision incorrect';end if;

  v_replay:=private.market_reserve_stack_v2(
    v_a,10,'inventory',v_a::text,0,'COPPER_ORE',12,
    'reserve-test-a1',repeat('a',64));
  if v_replay->>'replayed'<>'true'
    or v_replay->>'holdId' is distinct from v_first->>'holdId'
    or (select revision from public.online_game_states where account_id=v_a)<>11
  then raise exception 'reservation replay duplicated inventory debit';end if;

  begin
    perform private.market_reserve_stack_v2(
      v_a,10,'inventory',v_a::text,0,'COPPER_ORE',12,
      'reserve-test-a1',repeat('b',64));
    raise exception 'idempotency conflict accepted';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;
  begin
    perform private.market_reserve_stack_v2(
      v_a,10,'inventory',v_a::text,0,'COPPER_ORE',12,
      'reserve-test-old',repeat('b',64));
    raise exception 'stale revision accepted';
  exception when raise_exception then
    if sqlerrm<>'market_stale_state' then raise;end if;
  end;
  begin
    perform private.market_reserve_stack_v2(
      v_a,11,'inventory',v_a::text,0,'COPPER_ORE',39,
      'reserve-test-over',repeat('c',64));
    raise exception 'insufficient quantity accepted';
  exception when raise_exception then
    if sqlerrm<>'market_insufficient_quantity' then raise;end if;
  end;
  begin
    perform private.market_reserve_stack_v2(
      v_a,11,'inventory',v_a::text,1,'DEWLEAF',1,
      'reserve-test-fav',repeat('d',64));
    raise exception 'favorite resource accepted';
  exception when raise_exception then
    if sqlerrm<>'market_item_protected' then raise;end if;
  end;
  begin
    perform private.market_reserve_stack_v2(
      v_b,20,'inventory',v_a::text,0,'COPPER_ORE',1,
      'reserve-test-own',repeat('e',64));
    raise exception 'cross-account resource accepted';
  exception when raise_exception then
    if sqlerrm<>'market_source_missing' then raise;end if;
  end;

  -- Gem Pouch and Bank use account storage paths; none can spoof holder IDs.
  v_gem:=private.market_reserve_stack_v2(
    v_a,11,'gem_pouch',null,0,'TEST_GEM',2,
    'reserve-test-gem',repeat('f',64));
  if (select state#>>'{account,gemPouch,stacks,0,quantity}'
      from public.online_game_states where account_id=v_a)<>'8'
  then raise exception 'gem pouch debit incorrect';end if;
  v_bank:=private.market_reserve_stack_v2(
    v_b,20,'bank',null,0,'COPPER_ORE',3,
    'reserve-test-bank',repeat('1',64));
  v_bank_hold:=(v_bank->>'holdId')::uuid;
  if (select state#>>'{bank,stacks,0,quantity}' from public.online_game_states
       where account_id=v_b)<>'5'
  then raise exception 'bank quantity was not debited';end if;

  -- Same item ID from multiple places is never one pooled balance.
  v_second:=private.market_reserve_stack_v2(
    v_a,12,'inventory',v_a::text,0,'COPPER_ORE',38,
    'reserve-test-a2',repeat('2',64));
  v_second_hold:=(v_second->>'holdId')::uuid;
  if (select state#>>'{inventory,stacks,0,itemId}' from public.online_game_states
       where account_id=v_a)<>'DEWLEAF'
  then raise exception 'full-stack removal did not remove exact array element';end if;
  if (select count(*) from private.market_custody_holds_v1
      where owner_account_id=v_a and status='held')<>3
  then raise exception 'partial stacks or gems did not have distinct holds';end if;

  begin
    perform private.market_cancel_stack_hold_v2(
      v_b,v_hold,'cancel-test-foreign',repeat('3',64));
    raise exception 'cross-account refund accepted';
  exception when raise_exception then
    if sqlerrm<>'market_hold_not_owned' then raise;end if;
  end;

  v_cancel:=private.market_cancel_stack_hold_v2(
    v_a,v_hold,'cancel-test-a1',repeat('4',64));
  v_return:=(v_cancel->>'deliveryId')::uuid;
  if v_cancel->>'status'<>'pending_return'
    or (select quantity from private.market_return_deliveries_v2
        where delivery_id=v_return)<>12
    or (select status from private.market_custody_holds_v1
        where hold_id=v_hold)<>'released'
    or (select held_quantity from private.market_custody_assets_v1
        where asset_id=(v_first->>'assetId')::uuid)<>0
  then raise exception 'safe cancellation failed to transfer into return outbox';end if;
  v_replay:=private.market_cancel_stack_hold_v2(
    v_a,v_hold,'cancel-test-a1',repeat('4',64));
  if v_replay->>'replayed'<>'true' or v_replay->>'deliveryId'<>v_cancel->>'deliveryId'
    or (select count(*) from private.market_return_deliveries_v2
        where source_hold_id=v_hold)<>1
  then raise exception 'cancellation replay duplicated return entitlement';end if;

  -- Expiry is a server-only queue, not an inventory/Gold mutation.
  update private.market_custody_holds_v1 set expires_at=now()-interval '1 minute'
  where hold_id=v_second_hold;
  if private.market_queue_due_returns_v2(10)<>1 then
    raise exception 'one expired hold was not queued';end if;
  if private.market_queue_due_returns_v2(10)<>0 then
    raise exception 'expired hold was refunded twice';end if;
  if (select count(*) from private.market_return_deliveries_v2
      where recipient_account_id=v_a)<>2
  then raise exception 'expired and cancelled deliveries not durable';end if;

  -- Funds never move in this pass. A future purchase must satisfy these
  -- conservation and ownership checks before any wallet transaction.
  begin
    insert into private.market_gold_intents_v2(
      source_hold_id,buyer_account_id,seller_account_id,buyer_character_id,
      unit_price,quantity,gross_gold,fee_gold,seller_payout_gold
    ) values(v_bank_hold,v_a,v_b,v_a,100,3,300,30,271);
    raise exception 'unbalanced Gold split accepted';
  exception when check_violation then null;
  end;
  insert into private.market_gold_intents_v2(
    source_hold_id,buyer_account_id,seller_account_id,buyer_character_id,
    unit_price,quantity,gross_gold,fee_gold,seller_payout_gold
  ) values(v_bank_hold,v_a,v_b,v_a,100,3,300,30,270);

  if (select state#>>'{character,gold}' from public.online_game_states
       where account_id=v_a)<>v_before_gold::text
    or (select state#>>'{character,gold}' from public.online_game_states
       where account_id=v_b)<>'700'
  then raise exception 'reservation/Gold intent unexpectedly moved Gold';end if;

  if exists(select 1 from private.market_return_deliveries_v2
    where status<>'pending')
  then raise exception 'unclaimed delivery became externally spendable';end if;
end
$market_reservation_test$;

select 'PASS: hidden market atomic resource reservation, replay, return, expiry and Gold draft safety' as result;
rollback;
