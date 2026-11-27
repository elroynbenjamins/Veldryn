-- Staging only: insert after candidate DDL and before its COMMIT.
select set_config('veldryn.test_account',(select account_id::text from public.online_game_states where jsonb_typeof(state->'character')='object' and character_id is not null and (state->>'version')::int in (6,11) limit 1),true);
set local role service_role;
do $test$
declare uid uuid:=current_setting('veldryn.test_account')::uuid; c record; l jsonb; st jsonb; resp jsonb; ack jsonb; replay jsonb; gr jsonb; ver bigint; gold bigint; req text; h text:=repeat('a',64); oldgold bigint;
begin
 if uid is null then raise exception 'FIXTURE_MISSING';end if;
 for c in select * from (values
 ('ascendant-celestial-sovereign','ascendant-celestial-astral-sanctum','ascendant-celestial-crown-of-the-cosmos','ascendant-celestial-aetherion','Sovereign of the Stars'),
 ('ascendant-draconic-dominion','ascendant-draconic-dominion-of-ash','ascendant-draconic-throne-of-embers','ascendant-draconic-vharaxis','Dragon Sovereign'),
 ('ascendant-abyssal-majesty','ascendant-abyssal-forgotten-abyss','ascendant-abyssal-crown-of-the-depths','ascendant-abyssal-nhalzuun','Monarch of the Deep'),
 ('ascendant-paradox-eternal','ascendant-paradox-beyond-the-veil','ascendant-paradox-fractured-eternity','ascendant-paradox-aeon','Beyond Existence')
 ) as x(id,bg,frame,pet,title) loop
 perform public.set_ultra_luxe_grant_server_v1(uid,c.id,true,'save rollback fixture');
 l:=public.load_online_game_ultra_luxe_v1(uid);
 gr:=l->'ultraLuxeCollectionIds'; ver:=(l->>'version')::bigint; gold:=(l->>'walletGold')::bigint;
 if gr is distinct from jsonb_build_array(c.id) or not coalesce(l#>'{state,account,unlockedProfileBackgroundIds}' ? c.bg,false) then raise exception 'LOAD_GRANT_%',c.id;end if;
 st:=l->'state';
 st:=jsonb_set(st,'{character,profileBackgroundId}',to_jsonb(c.bg));
 st:=jsonb_set(st,'{character,profileBorderId}',to_jsonb(c.frame));
 st:=jsonb_set(st,'{character,selectedCosmeticPetId}',to_jsonb(c.pet));
 st:=jsonb_set(st,'{character,profileTitle}',to_jsonb(c.title));
 st:=jsonb_set(st,'{character,gold}',to_jsonb(gold));
 resp:=jsonb_build_object('state',st,'version',ver+1,'serverNow',l->'serverNow','accountId',uid);
 req:='luxe_fixture_'||replace(gen_random_uuid()::text,'-','');
 ack:=public.commit_online_game_ultra_luxe_v1(uid,ver,gold,req,h,resp,'[]',gr);
 if ack#>>'{state,character,profileBackgroundId}' is distinct from c.bg or ack#>>'{state,character,selectedCosmeticPetId}' is distinct from c.pet then raise exception 'COMMIT_GRANT_%',c.id;end if;
 replay:=public.read_online_game_receipt_ultra_luxe_v1(uid,req);
 if replay->>'requestHash' is distinct from h or replay#>>'{response,state,character,profileBorderId}' is distinct from c.frame then raise exception 'REPLAY_GRANT_%',c.id;end if;
 perform public.set_ultra_luxe_grant_server_v1(uid,c.id,false,'save rollback fixture');
 replay:=public.read_online_game_receipt_ultra_luxe_v1(uid,req);
 if replay#>>'{response,state,character,profileBackgroundId}' is distinct from 'asterfall-night' or replay#>>'{response,state,character,profileBorderId}' is not null or replay#>>'{response,state,character,selectedCosmeticPetId}' is not null or replay#>>'{response,state,character,profileTitle}' is distinct from 'New Adventurer' then raise exception 'REPLAY_REVOKE_%',c.id;end if;
 begin
  perform public.commit_online_game_ultra_luxe_v1(uid,ver+1,gold,req||'_stale',h,resp,'[]',gr);
  raise exception 'STALE_GRANT_NOT_REJECTED';
 exception when others then
  if sqlerrm <> 'stale_state_ultra_luxe_grants' then raise;end if;
 end;
 l:=public.load_online_game_ultra_luxe_v1(uid);
 if (l->>'version')::bigint<>ver+1 or (l->>'walletGold')::bigint is distinct from gold or l->'ultraLuxeCollectionIds' is distinct from '[]'::jsonb or l#>>'{state,character,profileTitle}' is distinct from 'New Adventurer' then raise exception 'STALE_WRITE_OR_REVOKE_LOAD_%',c.id;end if;
 end loop;
end $test$;
reset role;
rollback;
select '4 collections: service-role grant-aware load, actual commit, receipt replay, revoked replay, stale-grant rejection and unchanged wallet passed' as result,to_regclass('private.ultra_luxe_collection_grants_v1') is null as rolled_back;
