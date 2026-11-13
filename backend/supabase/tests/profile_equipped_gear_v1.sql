-- Run against staging after the gear RPC migration. All fixtures roll back.
begin;
create or replace function pg_temp.assert_equipped_gear(ok boolean,message text)
returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'PROFILE GEAR FAIL: %',message;end if;end $$;

do $$
declare
 owner_id uuid:=gen_random_uuid();
 viewer_id uuid:=gen_random_uuid();
 owner_a uuid:=gen_random_uuid();
 owner_b uuid:=gen_random_uuid();
 instance_id text:='profile-gear-fixture-1';
 payload jsonb;
begin
 perform pg_temp.assert_equipped_gear(not has_function_privilege('anon','public.profile_equipped_gear_v1(uuid)','EXECUTE'),'anonymous callers cannot execute gear read');
 perform pg_temp.assert_equipped_gear(has_function_privilege('authenticated','public.profile_equipped_gear_v1(uuid)','EXECUTE'),'authenticated callers may use privacy-gated read');
 insert into auth.users(id,email) values
  (owner_id,'profile-gear-owner-'||owner_id||'@example.invalid'),
  (viewer_id,'profile-gear-viewer-'||viewer_id||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id) values
  (owner_a,owner_id,'First Fighter','IRONWARDEN'),
  (owner_b,owner_id,'Featured Fighter','WAYFINDER'),
  (gen_random_uuid(),viewer_id,'Reader','IRONWARDEN');

 insert into public.online_game_states(account_id,character_id,state) values(
  owner_id,owner_a,
  jsonb_build_object(
   'character',jsonb_build_object('id',owner_a::text,'equipment',jsonb_build_object('helmet','basic_sword')),
   'otherCharacters',jsonb_build_array(jsonb_build_object('character',jsonb_build_object(
    'id',owner_b::text,'equipment',jsonb_build_object('weapon','basic_sword'),
    'equipmentInstanceIds',jsonb_build_object('weapon',instance_id)))),
   'account',jsonb_build_object('craftedGearInstances',jsonb_build_array(jsonb_build_object(
    'id',instance_id,'ownerCharacterId',owner_b::text,'itemId','basic_sword',
    'rarity','epic','quality',88,'enhancement',jsonb_build_object(
      'rank',3,'statGemId','EMBER_SHARD','effectGemId','BOSSBANE_SIGIL','gemIds',jsonb_build_array('EMBER_SHARD','BOSSBANE_SIGIL')))))
  )
 );

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.profile_extension_update_v43('public',false,owner_b,'Gear profile',null,null,'{}','[]','{}','{}');

 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 payload:=public.profile_equipped_gear_v1(owner_id);
 perform pg_temp.assert_equipped_gear(payload->>'characterId'=owner_b::text,'selected character ID echoed');
 perform pg_temp.assert_equipped_gear(jsonb_array_length(payload->'items')=1,'only one selected-character equipment slot');
 perform pg_temp.assert_equipped_gear(payload#>>'{items,0,slot}'='weapon','selected loadout, not active loadout');
 perform pg_temp.assert_equipped_gear(payload#>>'{items,0,rarity}'='epic','specific crafted instance rarity');
 perform pg_temp.assert_equipped_gear(payload#>>'{items,0,quality}'='88','specific crafted instance quality');
 perform pg_temp.assert_equipped_gear(payload#>>'{items,0,rank}'='3','specific crafted instance enchant rank');
 perform pg_temp.assert_equipped_gear(payload#>>'{items,0,statGemId}'='EMBER_SHARD','equipped stat gem');
 perform pg_temp.assert_equipped_gear(jsonb_array_length(payload#>'{items,0,gemIds}')=2,'legacy gem-array bridge');
 perform pg_temp.assert_equipped_gear(not (payload ? 'state') and not (payload ? 'inventory'),'no inventory or state disclosed');
 perform pg_temp.assert_equipped_gear(not (payload#>'{items,0}' ? 'ownerCharacterId'),'no internal owner IDs disclosed');

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.profile_extension_update_v43('private',false,owner_b,'Private gear',null,null,'{}','[]','{}','{}');
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 perform pg_temp.assert_equipped_gear(public.profile_equipped_gear_v1(owner_id) is null,'private profile hidden');

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform pg_temp.assert_equipped_gear(public.profile_equipped_gear_v1(owner_id) is not null,'owner can inspect private profile');

 perform public.profile_extension_update_v43('public',false,owner_b,'Gear profile',null,null,'{}','[]','{}','{}');
 insert into public.player_blocks(blocker_id,blocked_id) values(viewer_id,owner_id);
 perform set_config('request.jwt.claim.sub',viewer_id::text,true);
 perform pg_temp.assert_equipped_gear(public.profile_equipped_gear_v1(owner_id) is null,'blocked profile hidden');
end $$;

select 'PASS: equipped gear selected character, instance metadata, privacy and block gating' as result;
rollback;
