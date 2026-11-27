-- STAGING ONLY. Run in the same open transaction as all unified candidate DDL
-- (omit its outer BEGIN/COMMIT when assembling the isolated test transaction).
-- Never run against production. Use two explicitly provisioned disposable auth
-- accounts with no existing collection grants. Set these transaction-local
-- settings before including this fixture:
--   select set_config('veldryn.fixture_owner','<fixture uuid>',true);
--   select set_config('veldryn.fixture_viewer','<different fixture uuid>',true);
-- Use psql ON_ERROR_STOP=1 and ROLLBACK on any failure. This file rolls back
-- all candidate DDL and all writes on success; do not append COMMIT.
do $preflight$
declare a uuid:=nullif(current_setting('veldryn.fixture_owner',true),'')::uuid;
 b uuid:=nullif(current_setting('veldryn.fixture_viewer',true),'')::uuid;
begin
 if a is null or b is null or a=b then raise exception 'EXPLICIT_DISTINCT_FIXTURES_REQUIRED';end if;
 if (select count(*) from auth.users where id in (a,b))<>2 then raise exception 'FIXTURE_USERS_MISSING';end if;
 if exists(select 1 from private.ultra_luxe_collection_grants_v1 where account_id in (a,b))
 or exists(select 1 from private.ultra_luxe_name_selection_v1 where account_id in (a,b))
 then raise exception 'FIXTURE_NOT_CLEAN';end if;
 if has_table_privilege('authenticated','private.ultra_luxe_collection_grants_v1','select')
 or has_table_privilege('anon','private.ultra_luxe_collection_grants_v1','select')
 or has_function_privilege('authenticated','public.ultra_luxe_grants_server_v1(uuid)','execute')
 or has_function_privilege('authenticated','private.ultra_luxe_project_public_v1(uuid,jsonb)','execute')
 or has_function_privilege('anon','public.ultra_luxe_collection_self_v1()','execute')
 or has_function_privilege('anon','public.ultra_luxe_name_select_v1(text)','execute')
 then raise exception 'SIX_SET_ACL';end if;
end $preflight$;

set local role service_role;
do $projection$
declare a uuid:=current_setting('veldryn.fixture_owner')::uuid;
 b uuid:=current_setting('veldryn.fixture_viewer')::uuid;
 c record; raw jsonb; outp jsonb; n int:=0;
begin
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 for c in select id,d.* from unnest(array[
 'ascendant-celestial-sovereign','ascendant-draconic-dominion','ascendant-abyssal-majesty',
 'ascendant-paradox-eternal','ascendant-sakura-enchantment','ascendant-stormforged-sovereign'
 ]) x(id) cross join lateral private.ultra_luxe_full_set_definition_v1(id) d loop
  raw:=jsonb_build_object('title',c.title_name,'backgroundId',c.background_id,
   'borderId',c.border_id,'petId',c.pet_id,'effectId','ascendant-forged-effect',
   'character',jsonb_build_object('classId','IRONWARDEN','profileIconId','ascendant-forged-icon'),
   'ultraLuxeAppearanceVersion',999,'ultraLuxeTitleId','forged-title',
   'collectionShowcase',jsonb_build_array(jsonb_build_object('id',c.pet_id),
     jsonb_build_object('id','ascendant-forged-pet'),jsonb_build_object('id','ordinary-pet')));
  perform public.set_ultra_luxe_grant_server_v1(a,c.id,true,'isolated six-set projection fixture');
  outp:=private.ultra_luxe_project_public_v1(a,raw);
  if outp->>'backgroundId' is distinct from c.background_id
   or outp->>'borderId' is distinct from c.border_id or outp->>'petId' is distinct from c.pet_id
   or outp->>'title' is distinct from c.title_name
   or outp->>'ultraLuxeTitleId' is distinct from replace(c.preset_id,'-name','-title')
   or outp->>'ultraLuxeAppearanceVersion' is distinct from '2'
   or outp->>'ultraLuxeAppearanceVerified' is distinct from 'true'
   or outp->>'effectId' is not null or outp#>>'{character,profileIconId}' is distinct from 'class:IRONWARDEN'
   or outp->'collectionShowcase' is distinct from jsonb_build_array(jsonb_build_object('id',c.pet_id),jsonb_build_object('id','ordinary-pet'))
   then raise exception 'OWNED_PUBLIC_PROJECTION_%',c.id;end if;
  -- Same claimed appearance for an unentitled account must fail closed even
  -- when a different authenticated account owns that exact collection.
  outp:=private.ultra_luxe_project_public_v1(b,raw);
  if outp->>'backgroundId' is distinct from 'asterfall-night'
   or outp->>'borderId' is not null or outp->>'petId' is not null
   or outp->>'title' is distinct from 'New Adventurer' or outp ? 'ultraLuxeTitleId'
   or outp->'collectionShowcase' is distinct from jsonb_build_array(jsonb_build_object('id','ordinary-pet'))
   then raise exception 'UNOWNED_PUBLIC_PROJECTION_%',c.id;end if;
  n:=n+1;
 end loop;
 if n<>6 then raise exception 'FIXTURE_COUNT';end if;
end $projection$;
reset role;

-- Use the actual authenticated client role and self-only RPCs, not an
-- owner/service-role shortcut. JWT claims are local to the fixture transaction.
select set_config('request.jwt.claim.sub',current_setting('veldryn.fixture_owner'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('veldryn.fixture_owner'),'role','authenticated')::text,true);
set local role authenticated;
do $owner$
declare a text:=current_setting('veldryn.fixture_owner'); g jsonb; n jsonb; preset text; count_presets int:=0;
begin
 g:=public.ultra_luxe_collection_self_v1(); n:=public.ultra_luxe_name_self_v1();
 if g->>'accountId' is distinct from a or n->>'accountId' is distinct from a
 or jsonb_array_length(g->'collectionIds') is distinct from 6
 or jsonb_array_length(n->'ownedIds') is distinct from 6 then raise exception 'OWNER_SELF_SCOPE';end if;
 foreach preset in array array['ascendant-celestial-name','ascendant-draconic-name','ascendant-abyssal-name',
 'ascendant-paradox-name','ascendant-sakura-name','ascendant-stormforged-name'] loop
  n:=public.ultra_luxe_name_select_v1(preset);
  if n->>'selectedId' is distinct from preset or public.ultra_luxe_name_self_v1()->>'selectedId' is distinct from preset
  then raise exception 'NAME_READBACK_%',preset;end if;
  count_presets:=count_presets+1;
 end loop;
 if count_presets<>6 then raise exception 'NAME_COUNT';end if;
end $owner$;
reset role;

select set_config('request.jwt.claim.sub',current_setting('veldryn.fixture_viewer'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('veldryn.fixture_viewer'),'role','authenticated')::text,true);
set local role authenticated;
do $viewer$
declare b text:=current_setting('veldryn.fixture_viewer'); g jsonb; n jsonb;
begin
 g:=public.ultra_luxe_collection_self_v1(); n:=public.ultra_luxe_name_self_v1();
 if g->>'accountId' is distinct from b or n->>'accountId' is distinct from b
 or g->'collectionIds' is distinct from '[]'::jsonb or n->'ownedIds' is distinct from '[]'::jsonb
 or n->>'selectedId' is not null then raise exception 'VIEWER_SELF_SCOPE';end if;
 begin
  perform public.ultra_luxe_name_select_v1('ascendant-stormforged-name');
  raise exception 'UNOWNED_SELECTION_ACCEPTED';
 exception when others then if sqlerrm<>'ULTRA_LUXE_NAME_NOT_OWNED' then raise;end if;end;
end $viewer$;
reset role;

set local role service_role;
do $revoke$
declare a uuid:=current_setting('veldryn.fixture_owner')::uuid; c record; raw jsonb; outp jsonb;
begin
 for c in select id,d.* from unnest(array[
 'ascendant-celestial-sovereign','ascendant-draconic-dominion','ascendant-abyssal-majesty',
 'ascendant-paradox-eternal','ascendant-sakura-enchantment','ascendant-stormforged-sovereign'
 ]) x(id) cross join lateral private.ultra_luxe_full_set_definition_v1(id) d loop
  perform public.set_ultra_luxe_grant_server_v1(a,c.id,false,'isolated six-set revoke fixture');
  raw:=jsonb_build_object('title',c.title_name,'backgroundId',c.background_id,'borderId',c.border_id,'petId',c.pet_id);
  outp:=private.ultra_luxe_project_public_v1(a,raw);
  if outp->>'backgroundId' is distinct from 'asterfall-night' or outp->>'borderId' is not null
   or outp->>'petId' is not null or outp->>'title' is distinct from 'New Adventurer'
   or outp ? 'ultraLuxeTitleId' then raise exception 'REVOKED_PUBLIC_PROJECTION_%',c.id;end if;
 end loop;
 if private.ultra_luxe_selected_name_v1(a) is not null then raise exception 'REVOKED_NAME_RETAINED';end if;
end $revoke$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('veldryn.fixture_owner'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('veldryn.fixture_owner'),'role','authenticated')::text,true);
set local role authenticated;
do $after_revoke$
begin
 if public.ultra_luxe_collection_self_v1()->'collectionIds' is distinct from '[]'::jsonb
 or public.ultra_luxe_name_self_v1()->'ownedIds' is distinct from '[]'::jsonb
 or public.ultra_luxe_name_self_v1()->>'selectedId' is not null
 then raise exception 'REVOKED_SELF_SCOPE';end if;
end $after_revoke$;
reset role;
rollback;
-- These are helper-level public projection tests; actual public RPC visibility,
-- blocks, per-character ownership, and real device rendering remain separate gates.
select 'six-set authenticated self and projection rollback fixture completed' as result,
 to_regclass('private.ultra_luxe_collection_grants_v1') is null as grants_rolled_back;
