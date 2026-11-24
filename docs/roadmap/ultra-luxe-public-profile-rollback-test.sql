-- Rollback-only validation fixture. Run after the candidate DDL, before its COMMIT.
-- Use an existing staging profile only within this rollback transaction.
select set_config('veldryn.test_account',(select account_id::text from public.online_game_states where jsonb_typeof(state->'character')='object' limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('veldryn.test_account'),true);
do $test$
declare uid uuid:=current_setting('veldryn.test_account')::uuid; p jsonb; r jsonb; c text:='ascendant-celestial-sovereign';
begin
 if uid is null or auth.uid() is distinct from uid then raise exception 'FIXTURE_AUTH_FAILED';end if;
 p:='{"title":"Sovereign of the Stars","ultraLuxeTitleId":"spoof","backgroundId":"ascendant-celestial-astral-sanctum","borderId":"ascendant-celestial-crown-of-the-cosmos","petId":"ascendant-celestial-aetherion","character":{"classId":"BASTION","profileIconId":"ascendant-celestial-crown-icon"},"bio":"keep","collectionShowcase":[{"kind":"pet","id":"ascendant-celestial-aetherion"},{"kind":"pet","id":"PET_001"}]}';
 r:=private.ultra_luxe_project_public_v1(uid,p);
 if r->>'title'<>'New Adventurer' or r ? 'ultraLuxeTitleId' or r->>'backgroundId'<>'asterfall-night' or r->>'borderId' is not null or r->>'petId' is not null or r#>>'{character,profileIconId}'<>'class:BASTION' or r->>'bio'<>'keep' or jsonb_array_length(r->'collectionShowcase')<>1 then raise exception 'PUBLIC_SANITIZE_FAILED %',r;end if;
 perform public.set_ultra_luxe_grant_server_v1(uid,c,true,'rollback public fixture');
 r:=private.ultra_luxe_project_public_v1(uid,p);
 if r->>'ultraLuxeTitleId'<>'ascendant-celestial-title' or r->>'petId'<>'ascendant-celestial-aetherion' or jsonb_array_length(r->'collectionShowcase')<>2 then raise exception 'PUBLIC_GRANT_FAILED';end if;
 perform public.set_ultra_luxe_grant_server_v1(uid,c,false,'rollback public fixture');
 r:=private.ultra_luxe_project_public_v1(uid,p);
 if r->>'title'<>'New Adventurer' or r ? 'ultraLuxeTitleId' then raise exception 'PUBLIC_REVOKE_FAILED';end if;
 if has_function_privilege('authenticated','private.ultra_luxe_project_public_v1(uuid,jsonb)','EXECUTE') then raise exception 'HELPER_EXPOSED';end if;
end $test$;
set local role authenticated;
do $test$
declare uid uuid:=auth.uid(); p jsonb; q jsonb;
begin
 p:=public.profile_public_v43(uid);
 q:=public.profile_character_public_v1(uid,null);
 if p is null or q is null or p->>'accountId'<>uid::text or q->>'accountId'<>uid::text then raise exception 'AUTHORIZED_PROFILE_FAILED';end if;
 if public.profile_character_public_v1(uid,'00000000-0000-0000-0000-000000000000'::uuid) is not null then raise exception 'FOREIGN_CHARACTER_EXPOSED';end if;
end $test$;
reset role;
rollback;
select 'public projection, title grant/revoke, unauthorized helper, existing public routes passed' as result,to_regclass('private.ultra_luxe_collection_grants_v1') is null as rolled_back;
