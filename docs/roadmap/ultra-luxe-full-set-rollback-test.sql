-- Staging-only, run after the four-collection candidate, combined commit and six-name
-- authority extension, all inside one outer transaction. The caller must ROLLBACK.
select set_config('veldryn.test_account',(select account_id::text from public.online_game_states where jsonb_typeof(state->'character')='object' and character_id is not null and (state->>'version')::int in (6,11) limit 1),true);
do $acl$
begin
 if has_function_privilege('authenticated','public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb)','execute')
 or has_function_privilege('anon','public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb)','execute')
 or not has_function_privilege('service_role','public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb)','execute') then raise exception 'FULL_SET_ACL';end if;
end $acl$;
set local role service_role;
do $test$
declare uid uuid:=nullif(current_setting('veldryn.test_account',true),'')::uuid; cid uuid; c record; l jsonb; st jsonb; resp jsonb; ack jsonb; gr jsonb; ver bigint; gold bigint; req text; h text:=repeat('b',64); n int:=0;
begin
 if uid is null then raise exception 'FIXTURE_MISSING';end if;
 for c in select id,d.* from unnest(array['ascendant-celestial-sovereign','ascendant-draconic-dominion','ascendant-abyssal-majesty','ascendant-paradox-eternal']) as x(id) cross join lateral private.ultra_luxe_full_set_definition_v1(id) d loop
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,true,'combined equip rollback fixture');
  l:=public.load_online_game_ultra_luxe_v1(uid);gr:=l->'ultraLuxeCollectionIds';ver:=(l->>'version')::bigint;gold:=(l->>'walletGold')::bigint;cid:=(l#>>'{state,character,id}')::uuid;
  if gr is distinct from jsonb_build_array(c.id) then raise exception 'FIXTURE_GRANT_SCOPE';end if;
  st:=l->'state';st:=jsonb_set(st,'{character,profileBackgroundId}',to_jsonb(c.background_id));st:=jsonb_set(st,'{character,profileBorderId}',to_jsonb(c.border_id));st:=jsonb_set(st,'{character,selectedCosmeticPetId}',to_jsonb(c.pet_id));st:=jsonb_set(st,'{character,profileTitle}',to_jsonb(c.title_name));st:=jsonb_set(st,'{character,gold}',to_jsonb(gold));st:=st#-'{character,profileEffectId}';
  resp:=jsonb_build_object('state',st,'version',ver+1,'serverNow',l->'serverNow','accountId',uid);
  req:='luxe_full_set:'||replace(gen_random_uuid()::text,'-','');
  begin
   perform public.commit_ultra_luxe_full_set_server_v1(uid,cid,c.id,ver,gold,gr,'wrong-name',req,h,resp);
   raise exception 'STALE_NAME_NOT_REJECTED';
  exception when others then if sqlerrm<>'STALE_ULTRA_LUXE_NAME_SELECTION' then raise;end if;end;
  ack:=public.commit_ultra_luxe_full_set_server_v1(uid,cid,c.id,ver,gold,gr,null,req,h,resp);
  if ack#>>'{nameSelection,selectedId}' is distinct from c.preset_id or ack#>>'{gameplay,state,character,profileBorderId}' is distinct from c.border_id or (ack->>'replayed')::boolean then raise exception 'COMBINED_COMMIT_%',c.id;end if;
  if (public.load_online_game_ultra_luxe_v1(uid)->>'walletGold')::bigint is distinct from gold then raise exception 'WALLET_CHANGED';end if;
  if private.ultra_luxe_name_style_v1(uid)->>'ultraLuxePresetId' is distinct from c.preset_id then raise exception 'NAME_PROJECTION';end if;
  delete from private.ultra_luxe_name_selection_v1 where account_id=uid;
  ack:=public.commit_ultra_luxe_full_set_server_v1(uid,cid,c.id,ver,gold,gr,null,req,h,resp);
  if not (ack->>'replayed')::boolean or ack#>>'{nameSelection,selectedId}' is not null then raise exception 'REPLAY_REAPPLIED_NAME';end if;
  begin
   perform public.commit_ultra_luxe_full_set_server_v1(uid,cid,c.id,ver,gold,gr,null,req,repeat('c',64),resp);
   raise exception 'HASH_NOT_REJECTED';
  exception when others then if sqlerrm<>'ULTRA_LUXE_REQUEST_HASH_MISMATCH' then raise;end if;end;
  insert into private.ultra_luxe_name_selection_v1(account_id,preset_id) values(uid,c.preset_id);
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,false,'combined equip rollback fixture');
  if private.ultra_luxe_selected_name_v1(uid) is not null then raise exception 'REVOKE_NAME';end if;
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,true,'combined equip regrant fixture');
  if private.ultra_luxe_selected_name_v1(uid) is not null then raise exception 'REGRANT_RESTORED_NAME';end if;
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,false,'combined equip cleanup fixture');
  n:=n+1;
 end loop;
 if n<>4 then raise exception 'FIXTURE_COUNT';end if;
 raise notice 'Four actual combined commits, stale selection, hash mismatch, replay, wallet, revoke/regrant passed';
end $test$;
reset role;
rollback;
select '4 combined equip transactions and rollback checks passed' as result,
 to_regclass('private.ultra_luxe_collection_grants_v1') is null as grants_rolled_back,
 to_regprocedure('public.commit_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,bigint,jsonb,text,text,text,jsonb)') is null as commit_rolled_back;