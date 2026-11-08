-- This fixture is exclusively for a disposable GitHub CI PostgreSQL service.
-- Hard-disabled production gates are temporarily unlocked ONLY in this
-- throwaway database after the exact committed migrations have been applied.
alter table private.market_runtime_guard_v1
 drop constraint market_runtime_guard_v1_trading_enabled_check;
alter table private.market_runtime_guard_v1
 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check;
alter table private.market_item_policy_v1
 drop constraint market_item_policy_v1_tradable_check;
alter table private.market_equipment_guard_v8
 drop constraint market_equipment_guard_v8_equipment_transfers_enabled_check;
update private.market_runtime_guard_v1 set trading_enabled=true,snapshot_bridge_ready=true;
update private.market_equipment_guard_v8 set equipment_transfers_enabled=true;
insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
 values('FORGE_T1_BASTION','equipment',true,'unbound'),
  ('gem:stat_might:g2','gem',true,'unbound'),
  ('gem:effect_momentum:g1','gem',true,'unbound');

insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000001','gear-seller@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','gear-buyer@example.invalid'),
 ('00000000-0000-4000-8000-000000000003','gear-rival@example.invalid');
insert into public.characters(id,account_id,name,class_id,gold) values
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Seller','BASTION',100),
 ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000002','Buyer','BASTION',500),
 ('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000003','Rival','BASTION',700);
insert into public.character_wallets(character_id,gold) values
 ('00000000-0000-4000-8000-000000000101',100),
 ('00000000-0000-4000-8000-000000000102',500),
 ('00000000-0000-4000-8000-000000000103',700);

do $gear_seed$
declare
  seller uuid:='00000000-0000-4000-8000-000000000001';
  sc text:='00000000-0000-4000-8000-000000000101';
  b uuid:='00000000-0000-4000-8000-000000000002';
  r uuid:='00000000-0000-4000-8000-000000000003';
  item text:='FORGE_T1_BASTION';
  gear_stacks jsonb:='[]'::jsonb;
  receipts jsonb:='[]'::jsonb;
  ins text;
  i integer;
  response jsonb;
begin
  for i in 1..3 loop
    ins:='gear-v9-race-'||i;
    gear_stacks:=gear_stacks||jsonb_build_array(
      jsonb_build_object('itemId',item,'quantity',1,'instanceId',ins));
    receipts:=receipts||jsonb_build_array(jsonb_build_object(
      'id',ins,'itemId',item,'ownerCharacterId',sc,'rarity','mythic',
      'quality',93,'statRoll',0.732,'locked',false,
      'acquireSource','craft','sourceReceiptKey','race-v9-'||i,
      'createdAtMs',1234,'enhancement',jsonb_build_object(
        'rank',3,'failures',2,'statGemId','gem:stat_might:g2',
        'effectGemId','gem:effect_momentum:g1',
        'gemIds',jsonb_build_array('gem:stat_might:g2','gem:effect_momentum:g1'))));
  end loop;
  insert into public.online_game_states(account_id,character_id,revision,state) values
   (seller,sc::uuid,5,jsonb_build_object(
     'character',jsonb_build_object('id',sc,'gold',100,'equipment','{}'::jsonb,
       'savedLoadouts','[]'::jsonb),
     'account',jsonb_build_object('craftedGearInstances',receipts),
     'inventory',jsonb_build_object('capacity',10,'stacks',gear_stacks),
     'bank',jsonb_build_object('capacity',10,'stacks','[]'::jsonb),
     'otherCharacters','[]'::jsonb,
     'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
       'favoriteItemIds','[]'::jsonb))),
   (b,'00000000-0000-4000-8000-000000000102',7,jsonb_build_object(
     'character',jsonb_build_object(
        'id','00000000-0000-4000-8000-000000000102','gold',500),
     'account',jsonb_build_object('craftedGearInstances','[]'::jsonb),
     'inventory',jsonb_build_object('capacity',10,'stacks','[]'::jsonb),
     'bank',jsonb_build_object('capacity',10,'stacks','[]'::jsonb))),
   (r,'00000000-0000-4000-8000-000000000103',9,jsonb_build_object(
     'character',jsonb_build_object(
       'id','00000000-0000-4000-8000-000000000103','gold',700),
     'account',jsonb_build_object('craftedGearInstances','[]'::jsonb),
     'inventory',jsonb_build_object('capacity',10,'stacks','[]'::jsonb),
     'bank',jsonb_build_object('capacity',10,'stacks','[]'::jsonb)));
  response:=private.market_reserve_exact_equipment_v8(
    seller,5,'inventory',sc,0,item,'gear-v9-race-1',
    'reserve-race-1',repeat('a',64));
  perform private.market_publish_equipment_offer_v9(
    seller,(response->>'holdId')::uuid,80,1,'publish-race-1',repeat('b',64));
end
$gear_seed$;
