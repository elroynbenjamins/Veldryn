-- Run after candidate DDL and before its COMMIT. Never run on production.
select set_config('veldryn.test_account',(select account_id::text from public.online_game_states where jsonb_typeof(state->'character')='object' limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('veldryn.test_account'),true);
do $test$
declare uid uuid:=current_setting('veldryn.test_account')::uuid; c record; p jsonb; r jsonb; st jsonb; projected jsonb; ack jsonb; n integer;
begin
 if uid is null or auth.uid() is distinct from uid then raise exception 'FIXTURE_AUTH_FAILED';end if;
 if has_table_privilege('authenticated','private.ultra_luxe_collection_grants_v1','SELECT') or has_function_privilege('authenticated','public.set_ultra_luxe_grant_server_v1(uuid,text,boolean,text)','EXECUTE') or has_function_privilege('anon','public.ultra_luxe_grants_server_v1(uuid)','EXECUTE') or has_function_privilege('authenticated','private.ultra_luxe_project_public_v1(uuid,jsonb)','EXECUTE') then raise exception 'AUTHORITY_EXPOSED';end if;
 for c in select * from (values
 ('ascendant-celestial-sovereign','ascendant-celestial-astral-sanctum','ascendant-celestial-crown-of-the-cosmos','ascendant-celestial-aetherion','ascendant-celestial-title','Sovereign of the Stars','ascendant_sovereign_of_stars','ascendant-celestial-name'),
 ('ascendant-draconic-dominion','ascendant-draconic-dominion-of-ash','ascendant-draconic-throne-of-embers','ascendant-draconic-vharaxis','ascendant-draconic-title','Dragon Sovereign','ascendant_dragon_sovereign','ascendant-draconic-name'),
 ('ascendant-abyssal-majesty','ascendant-abyssal-forgotten-abyss','ascendant-abyssal-crown-of-the-depths','ascendant-abyssal-nhalzuun','ascendant-abyssal-title','Monarch of the Deep','ascendant_monarch_of_deep',null),
 ('ascendant-paradox-eternal','ascendant-paradox-beyond-the-veil','ascendant-paradox-fractured-eternity','ascendant-paradox-aeon','ascendant-paradox-title','Beyond Existence','ascendant_beyond_existence',null)
 ) as rows(id,bg,frame,pet,title_id,title_name,badge,preset) loop
 p:=jsonb_build_object('title',c.title_name,'ultraLuxeTitleId','spoof','backgroundId',c.bg,'borderId',c.frame,'petId',c.pet,'character',jsonb_build_object('classId','BASTION','profileIconId','class:BASTION'),'bio','keep','collectionShowcase',jsonb_build_array(jsonb_build_object('kind','pet','id',c.pet),jsonb_build_object('kind','pet','id','PET_001')));
 st:=jsonb_build_object('account',jsonb_build_object('unlockedProfileBackgroundIds',jsonb_build_array('event:bg',c.bg),'unlockedProfileIconIds',jsonb_build_array('ascendant-unknown'),'profileIconId','ascendant-unknown'),'character',jsonb_build_object('classId','BASTION','profileBackgroundId',c.bg,'profileBorderId',c.frame,'selectedCosmeticPetId',c.pet,'profileTitle',c.title_name,'gold',123));
 r:=private.ultra_luxe_project_public_v1(uid,p);
 if r->>'ultraLuxeAppearanceVerified' is distinct from 'true' or r ? 'ultraLuxeCollectionIds' or r->>'title' is distinct from 'New Adventurer' or r ? 'ultraLuxeTitleId' or r->>'backgroundId' is distinct from 'asterfall-night' or r->>'borderId' is not null or r->>'petId' is not null or jsonb_array_length(r->'collectionShowcase')<>1 then raise exception 'PUBLIC_SPOOF_%',c.id;end if;
 ack:=public.set_ultra_luxe_grant_server_v1(uid,c.id,true,'four set rollback fixture');
 if ack->>'changed' is distinct from 'true' then raise exception 'GRANT_FAILED_%',c.id;end if;
 ack:=public.set_ultra_luxe_grant_server_v1(uid,c.id,true,'duplicate fixture');
 if ack->>'changed' is distinct from 'false' then raise exception 'DUPLICATE_GRANT_%',c.id;end if;
 r:=private.ultra_luxe_project_public_v1(uid,p);
 if r->>'ultraLuxeTitleId' is distinct from c.title_id or r->>'petId' is distinct from c.pet or r->>'borderId' is distinct from c.frame or jsonb_array_length(r->'collectionShowcase')<>2 then raise exception 'PUBLIC_GRANT_%',c.id;end if;
 projected:=private.ultra_luxe_project_state_v1(st,public.ultra_luxe_grants_server_v1(uid));
 if projected#>>'{character,profileBackgroundId}' is distinct from c.bg or projected#>>'{character,profileTitle}' is distinct from c.title_name or projected#>>'{account,profileIconId}' is distinct from 'class:BASTION' or projected#>>'{character,gold}' is distinct from '123' then raise exception 'STATE_GRANT_%',c.id;end if;
 if not coalesce(c.badge=any(private.player_badge_unlocks_v1(uid)),false) then raise exception 'BADGE_GRANT_%',c.id;end if;
 if c.preset is null then
  if cardinality(private.ultra_luxe_owned_names_v1(uid))<>0 then raise exception 'FOREIGN_PRESET_%',c.id;end if;
 else
  if private.ultra_luxe_owned_names_v1(uid) is distinct from array[c.preset] then raise exception 'PRESET_GRANT_%',c.id;end if;
 end if;
 perform public.set_ultra_luxe_grant_server_v1(uid,c.id,false,'four set rollback fixture');
 r:=private.ultra_luxe_project_public_v1(uid,p);
 if r->>'title' is distinct from 'New Adventurer' or r ? 'ultraLuxeTitleId' or r->>'petId' is not null then raise exception 'PUBLIC_REVOKE_%',c.id;end if;
 projected:=private.ultra_luxe_project_state_v1(st,public.ultra_luxe_grants_server_v1(uid));
 if projected#>>'{character,profileBackgroundId}' is distinct from 'asterfall-night' or projected#>>'{character,profileTitle}' is distinct from 'New Adventurer' or projected#>>'{character,selectedCosmeticPetId}' is not null then raise exception 'STATE_REVOKE_%',c.id;end if;
 select count(*) into n from private.ultra_luxe_grant_audit_v1 where account_id=uid and collection_id=c.id;
 if n<>2 then raise exception 'AUDIT_COUNT_%',c.id;end if;
 end loop;
end $test$;
set local role authenticated;
do $test$
declare uid uuid:=auth.uid(); p jsonb; q jsonb;
begin
 p:=public.profile_public_v43(uid);q:=public.profile_character_public_v1(uid,null);
 if p is null or q is null or p->>'accountId' is distinct from uid::text or q->>'accountId' is distinct from uid::text then raise exception 'AUTHORIZED_PROFILE_FAILED';end if;
 if public.profile_character_public_v1(uid,'00000000-0000-0000-0000-000000000000'::uuid) is not null then raise exception 'FOREIGN_CHARACTER_EXPOSED';end if;
end $test$;
reset role;
rollback;
select 'four-collection grant, revoke, projection, badge, preset, ACL, audit and existing profile route passed' as result,to_regclass('private.ultra_luxe_collection_grants_v1') is null as rolled_back;
