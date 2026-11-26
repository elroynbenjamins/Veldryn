-- Staging-only: after all four candidate SQL sources, under one outer transaction.
-- No data or schema persists. Exercise each exact collection using service-only
-- commands and an existing staging fixture. No production project access.
select set_config('veldryn.test_account',(select account_id::text from public.online_game_states where jsonb_typeof(state->'character')='object' and character_id is not null and (state->>'version')::int in (6,11) limit 1),true);
do $acl$
begin
 if has_table_privilege('authenticated','private.ultra_luxe_full_set_undo_v1','select') or has_table_privilege('anon','private.ultra_luxe_full_set_undo_v1','select')
 or has_function_privilege('authenticated','public.undo_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,text,text)','execute')
 or has_function_privilege('anon','public.undo_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,text,text)','execute')
 or not has_function_privilege('service_role','public.undo_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,text,text)','execute')
 then raise exception 'UNDO_ACL';end if;
end $acl$;
set local role service_role;
do $test$
declare uid uuid:=nullif(current_setting('veldryn.test_account',true),'')::uuid; cid uuid; c record; l jsonb; s jsonb; resp jsonb; ack jsonb; g jsonb; ver bigint; gold bigint; equip_req text; old_equip_req text; undo_req text; edit_req text; slots jsonb; expected jsonb; h text:=repeat('b',64); n int:=0;
begin
 if uid is null then raise exception 'FIXTURE_MISSING';end if;
 for c in select id,d.* from unnest(array['ascendant-celestial-sovereign','ascendant-draconic-dominion','ascendant-abyssal-majesty','ascendant-paradox-eternal','ascendant-sakura-enchantment','ascendant-stormforged-sovereign']) x(id)
 cross join lateral private.ultra_luxe_full_set_definition_v1(id) d loop
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,true,'undo rollback fixture');
  l:=public.load_online_game_ultra_luxe_v1(uid);g:=l->'ultraLuxeCollectionIds';ver:=(l->>'version')::bigint;gold:=(l->>'walletGold')::bigint;cid:=(l#>>'{state,character,id}')::uuid;
  if g is distinct from jsonb_build_array(c.id) then raise exception 'FIXTURE_GRANT_SCOPE';end if;
  slots:=private.ultra_luxe_undo_slots_v1(l#>'{state,character}');
  s:=l->'state';s:=jsonb_set(s,'{character,profileBackgroundId}',to_jsonb(c.background_id));s:=jsonb_set(s,'{character,profileBorderId}',to_jsonb(c.border_id));s:=jsonb_set(s,'{character,selectedCosmeticPetId}',to_jsonb(c.pet_id));s:=jsonb_set(s,'{character,profileTitle}',to_jsonb(c.title_name));s:=jsonb_set(s,'{character,gold}',to_jsonb(gold));s:=s#-'{character,profileEffectId}';
  resp:=jsonb_build_object('state',s,'version',ver+1,'serverNow',l->'serverNow','accountId',uid);
  equip_req:='luxe_full_set_'||replace(gen_random_uuid()::text,'-','');undo_req:='luxe_undo_set_'||replace(gen_random_uuid()::text,'-','');
  ack:=public.commit_ultra_luxe_full_set_server_v1(uid,cid,c.id,ver,gold,g,null,equip_req,h,resp);
  if ack->>'undoEquipRequestId' is distinct from equip_req then raise exception 'UNDO_TOKEN';end if;
  if (select count(*) from private.ultra_luxe_full_set_undo_v1 where account_id=uid)<>1 then raise exception 'UNDO_JOURNAL_COUNT';end if;
  begin
   perform public.undo_ultra_luxe_full_set_server_v1(uid,cid,equip_req,ver,undo_req,h);raise exception 'STALE_NOT_REJECTED';
  exception when others then if sqlerrm<>'STALE_ULTRA_LUXE_GAMEPLAY' then raise;end if;end;
  begin
   perform public.undo_ultra_luxe_full_set_server_v1(uid,gen_random_uuid(),equip_req,ver+1,undo_req,h);raise exception 'WRONG_CHARACTER_NOT_REJECTED';
  exception when others then if sqlerrm<>'STALE_ULTRA_LUXE_UNDO' then raise;end if;end;
  -- Alternate exact restore and preservation of an independent title edit.
  expected:=slots;
  if n%2=1 then
   l:=public.load_online_game_ultra_luxe_v1(uid);s:=jsonb_set(l->'state','{character,profileTitle}',to_jsonb('Independent title'::text));
   s:=jsonb_set(s,'{character,gold}',to_jsonb(gold));
   edit_req:='undo-fixture-edit-'||replace(gen_random_uuid()::text,'-','');
   perform public.commit_online_game_ultra_luxe_v1(uid,ver+1,gold,edit_req,h,jsonb_build_object('accountId',uid,'state',s,'version',ver+2,'serverNow',l->'serverNow'),'[]'::jsonb,g);
   expected:=jsonb_set(expected,'{profileTitle}',to_jsonb('Independent title'::text));
   delete from private.ultra_luxe_name_selection_v1 where account_id=uid;
   ver:=ver+1;
  end if;
  ack:=public.undo_ultra_luxe_full_set_server_v1(uid,cid,equip_req,ver+1,undo_req,h);
  if private.ultra_luxe_undo_slots_v1(ack#>'{gameplay,state,character}') is distinct from expected or ack#>>'{nameSelection,selectedId}' is not null or (ack->>'replayed')::boolean then raise exception 'UNDO_RESULT_%',c.id;end if;
  if exists(select 1 from private.ultra_luxe_full_set_undo_v1 where account_id=uid) then raise exception 'UNDO_NOT_CONSUMED';end if;
  if (public.load_online_game_ultra_luxe_v1(uid)->>'walletGold')::bigint is distinct from gold then raise exception 'UNDO_WALLET_CHANGED';end if;
  ack:=public.undo_ultra_luxe_full_set_server_v1(uid,cid,equip_req,ver+1,undo_req,h);
  if not (ack->>'replayed')::boolean then raise exception 'UNDO_REPLAY';end if;
  old_equip_req:=equip_req;
  -- Re-equip creates a fresh journal; replay of the consumed undo must not
  -- consume this new journal. A revocation invalidates it permanently.
  l:=public.load_online_game_ultra_luxe_v1(uid);ver:=(l->>'version')::bigint;
  s:=l->'state';s:=jsonb_set(s,'{character,profileBackgroundId}',to_jsonb(c.background_id));s:=jsonb_set(s,'{character,profileBorderId}',to_jsonb(c.border_id));s:=jsonb_set(s,'{character,selectedCosmeticPetId}',to_jsonb(c.pet_id));s:=jsonb_set(s,'{character,profileTitle}',to_jsonb(c.title_name));s:=jsonb_set(s,'{character,gold}',to_jsonb(gold));s:=s#-'{character,profileEffectId}';
  equip_req:='luxe_full_set_'||replace(gen_random_uuid()::text,'-','');
  ack:=public.commit_ultra_luxe_full_set_server_v1(uid,cid,c.id,ver,gold,g,null,equip_req,h,jsonb_build_object('accountId',uid,'state',s,'version',ver+1,'serverNow',l->'serverNow'));
  perform public.undo_ultra_luxe_full_set_server_v1(uid,cid,old_equip_req,ver,undo_req,h);
  if not exists(select 1 from private.ultra_luxe_full_set_undo_v1 where account_id=uid and equip_request_id=equip_req) then raise exception 'REPLAY_CONSUMED_NEW_UNDO';end if;
  update private.ultra_luxe_full_set_undo_v1 set expires_at=clock_timestamp()-interval '1 second' where account_id=uid;
  begin
   perform public.undo_ultra_luxe_full_set_server_v1(uid,cid,equip_req,ver+1,'luxe_undo_set_'||replace(gen_random_uuid()::text,'-',''),h);raise exception 'EXPIRED_NOT_REJECTED';
  exception when others then if sqlerrm<>'STALE_ULTRA_LUXE_UNDO' then raise;end if;end;
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,false,'undo rollback revoke');
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,true,'undo rollback regrant');
  if exists(select 1 from private.ultra_luxe_full_set_undo_v1 where account_id=uid) then raise exception 'UNDO_REVIVED';end if;
  perform public.set_ultra_luxe_grant_server_v1(uid,c.id,false,'undo rollback cleanup');
  n:=n+1;
 end loop;
 if n<>6 then raise exception 'FIXTURE_COUNT';end if;
end $test$;
reset role;
rollback;
select '6 combined equip/undo transactions passed' as result,
 to_regclass('private.ultra_luxe_collection_grants_v1') is null as grants_rolled_back,
 to_regclass('private.ultra_luxe_full_set_undo_v1') is null as undo_rolled_back,
 to_regprocedure('public.undo_ultra_luxe_full_set_server_v1(uuid,uuid,text,bigint,text,text)') is null as rpc_rolled_back;
