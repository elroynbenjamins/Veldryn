-- ISOLATED CI DATABASE ONLY: undo release CHECK gates in this disposable
-- database after loading *real* private market migrations. Never deploy this.
alter table private.market_runtime_guard_v1
  drop constraint market_runtime_guard_v1_trading_enabled_check;
alter table private.market_runtime_guard_v1
  drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check;
alter table private.market_item_policy_v1
  drop constraint market_item_policy_v1_tradable_check;
update private.market_runtime_guard_v1
  set trading_enabled=true,snapshot_bridge_ready=true;
insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
 values('COPPER_ORE','resource',true,'unbound');

insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','market-seller@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','market-buyer@example.invalid'),
 ('00000000-0000-4000-8000-000000000003','market-rival@example.invalid');
insert into public.characters(id,account_id,name,class_id,gold) values
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Seller','BASTION',100),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','Buyer','BASTION',500),
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000003','Rival','BASTION',800);
insert into public.character_wallets(character_id,gold) values
 ('00000000-0000-4000-8000-000000000101',100),
 ('00000000-0000-4000-8000-000000000102',500),
 ('00000000-0000-4000-8000-000000000103',800);
insert into public.online_game_states(account_id,character_id,revision,state) values
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',5,
  jsonb_build_object(
   'version',11,
   'character',jsonb_build_object('id','00000000-0000-4000-8000-000000000101','gold',100),
   'inventory',jsonb_build_object('capacity',30,'stacks',jsonb_build_array(
     jsonb_build_object('itemId','COPPER_ORE','quantity',30))),
   'bank',jsonb_build_object('capacity',50,'stacks','[]'::jsonb),
   'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb))),
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000102',7,
  jsonb_build_object(
   'version',11,
   'character',jsonb_build_object('id','00000000-0000-4000-8000-000000000102','gold',500),
   'inventory',jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
   'bank',jsonb_build_object('capacity',50,'stacks','[]'::jsonb),
   'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb))),
 ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000103',9,
  jsonb_build_object(
   'version',11,
   'character',jsonb_build_object('id','00000000-0000-4000-8000-000000000103','gold',800),
   'inventory',jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
   'bank',jsonb_build_object('capacity',50,'stacks','[]'::jsonb),
   'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb)));

-- Seed one real escrow and a seller-created offer using the actual functions.
do $seed$
declare v_res jsonb;
begin
  v_res:=private.market_reserve_stack_v2(
    '00000000-0000-4000-8000-000000000001',5,'inventory',
    '00000000-0000-4000-8000-000000000101',0,
    'COPPER_ORE',6,'reserve-race-01',repeat('a',64));
  perform private.market_publish_sale_offer_v5(
    '00000000-0000-4000-8000-000000000001',(v_res->>'holdId')::uuid,
    40,6,'publish-race-01',repeat('b',64));
end
$seed$;
