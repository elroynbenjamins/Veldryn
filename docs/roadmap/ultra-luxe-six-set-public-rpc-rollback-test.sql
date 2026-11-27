-- STAGING ONLY, after all candidate DDL in one open transaction. Never production.
-- Use two explicit, disposable fixture account UUIDs in transaction-local
-- veldryn.fixture_owner and veldryn.fixture_viewer; both need a real active hero.
-- This test changes only fixture data and rolls back ALL changes, including DDL.
-- On failure abort and rollback; never commit. Run with psql ON_ERROR_STOP=1.
do $public_rpc$
declare a uuid:=nullif(current_setting('veldryn.fixture_owner',true),'')::uuid;
 b uuid:=nullif(current_setting('veldryn.fixture_viewer',true),'')::uuid;
 cid uuid; other_cid uuid; c record; p jsonb; q jsonb; k int:=0;
begin
 if a is null or b is null or a=b then raise exception 'EXPLICIT_DISTINCT_FIXTURES_REQUIRED';end if;
 select (s.state#>>'{character,id}')::uuid into cid from public.online_game_states s
 join public.characters h on h.id=(s.state#>>'{character,id}')::uuid and h.account_id=s.account_id where s.account_id=a;
 select (s.state#>>'{character,id}')::uuid into other_cid from public.online_game_states s
 join public.characters h on h.id=(s.state#>>'{character,id}')::uuid and h.account_id=s.account_id where s.account_id=b;
 if cid is null or other_cid is null or cid=other_cid then raise exception 'FIXTURE_HERO_MISSING';end if;
 if exists(select 1 from private.ultra_luxe_collection_grants_v1 where account_id in (a,b))
 then raise exception 'FIXTURE_NOT_CLEAN';end if;
 if not has_function_privilege('authenticated','public.profile_public_v43(uuid)','execute')
 or not has_function_privilege('authenticated','public.profile_character_public_v1(uuid,uuid)','execute')
 then raise exception 'PROFILE_AUTHENTICATED_ACL';end if;
 insert into public.player_profile_extensions(account_id,visibility,selected_character_id)
 values(a,'public',cid) on conflict(account_id) do update set visibility='public',selected_character_id=excluded.selected_character_id;
 delete from public.player_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a);
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 for c in select id,d.* from unnest(array[
 'ascendant-celestial-sovereign','ascendant-draconic-dominion','ascendant-abyssal-majesty',
 'ascendant-paradox-eternal','ascendant-sakura-enchantment','ascendant-stormforged-sovereign'
 ]) x(id) cross join lateral private.ultra_luxe_full_set_definition_v1(id) d loop
  -- Deliberately write the raw fixture snapshot, not an actual player command.
  -- This tests that stale persisted claims cannot bypass public read authority.
  update public.online_game_states set state=jsonb_set(state,'{character}',(state->'character')||
   jsonb_build_object('profileTitle',c.title_name,'profileBackgroundId',c.background_id,
   'profileBorderId',c.border_id,'selectedCosmeticPetId',c.pet_id,'profileEffectId','ascendant-forged-effect'))
   where account_id=a;
  perform public.set_ultra_luxe_grant_server_v1(a,c.id,true,'isolated public RPC fixture');
  execute 'set local role authenticated';
  p:=public.profile_public_v43(a);q:=public.profile_character_public_v1(a,cid);
  if public.profile_character_public_v1(a,other_cid) is not null then raise exception 'FOREIGN_CHARACTER_VISIBLE';end if;
  execute 'reset role';
  if p is null or q is null or p#>>'{character,id}' is distinct from cid::text or q#>>'{character,id}' is distinct from cid::text
   or p->>'backgroundId' is distinct from c.background_id or q->>'backgroundId' is distinct from c.background_id
   or p->>'borderId' is distinct from c.border_id or q->>'borderId' is distinct from c.border_id
   or p->>'petId' is distinct from c.pet_id or q->>'petId' is distinct from c.pet_id
   or p->>'title' is distinct from c.title_name or q->>'title' is distinct from c.title_name
   or p->>'ultraLuxeAppearanceVersion' is distinct from '2' or q->>'ultraLuxeAppearanceVersion' is distinct from '2'
   or p->>'ultraLuxeTitleId' is distinct from replace(c.preset_id,'-name','-title')
   or q->>'ultraLuxeTitleId' is distinct from replace(c.preset_id,'-name','-title')
   or p->>'effectId' is not null or q->>'effectId' is not null
   then raise exception 'OWNED_RPC_APPEARANCE_%',c.id;end if;
  perform public.set_ultra_luxe_grant_server_v1(a,c.id,false,'isolated public RPC revoke');
  execute 'set local role authenticated';
  p:=public.profile_public_v43(a);q:=public.profile_character_public_v1(a,cid);
  execute 'reset role';
  if p is null or q is null or p->>'backgroundId' is distinct from 'asterfall-night' or q->>'backgroundId' is distinct from 'asterfall-night'
   or p->>'borderId' is not null or q->>'borderId' is not null or p->>'petId' is not null or q->>'petId' is not null
   or p->>'title' is distinct from 'New Adventurer' or q->>'title' is distinct from 'New Adventurer'
   or p ? 'ultraLuxeTitleId' or q ? 'ultraLuxeTitleId'
   then raise exception 'REVOKED_RPC_APPEARANCE_%',c.id;end if;
  k:=k+1;
 end loop;
 if k<>6 then raise exception 'FIXTURE_COUNT';end if;
 update public.player_profile_extensions set visibility='private' where account_id=a;
 execute 'set local role authenticated';
 if public.profile_public_v43(a) is not null or public.profile_character_public_v1(a,cid) is not null
 then raise exception 'PRIVATE_PROFILE_VISIBLE';end if;
 execute 'reset role';
 update public.player_profile_extensions set visibility='public' where account_id=a;
 insert into public.player_blocks(blocker_id,blocked_id) values(a,b);
 execute 'set local role authenticated';
 if public.profile_public_v43(a) is not null or public.profile_character_public_v1(a,cid) is not null
 then raise exception 'BLOCKED_PROFILE_VISIBLE';end if;
 execute 'reset role';
 delete from public.player_blocks where blocker_id=a and blocked_id=b;
 insert into public.player_blocks(blocker_id,blocked_id) values(b,a);
 execute 'set local role authenticated';
 if public.profile_public_v43(a) is not null or public.profile_character_public_v1(a,cid) is not null
 then raise exception 'REVERSE_BLOCK_PROFILE_VISIBLE';end if;
 execute 'reset role';
end $public_rpc$;
rollback;
select 'six-set authenticated public and per-character RPCs, revocation, privacy, blocks and wrong-character tests completed' as result,
 to_regclass('private.ultra_luxe_collection_grants_v1') is null as grants_rolled_back;
