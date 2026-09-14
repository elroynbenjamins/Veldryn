begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();loaded jsonb;response jsonb;replay jsonb;s jsonb;
begin
 insert into auth.users(id,email) values(a,'online-test-'||a||'@example.invalid'),(b,'online-test-'||b||'@example.invalid');
 loaded:=public.load_online_game_server_v1(a);
 if (loaded->>'version')::int<>0 or loaded->'state'<>'null'::jsonb then raise exception 'initial state';end if;
 s:=jsonb_build_object('version',6,'character',jsonb_build_object('id',c,'name','Online Test','classId','IRONWARDEN','bodyPresentation','male','level',1,'xp',0,'gold',100,'hp',100,'currentHp',100,'attack',10,'defense',10,'equipment','{}'::jsonb),'account','{}'::jsonb);
 response:=jsonb_build_object('state',s,'version',1,'accountId',a,'serverNow',loaded->'serverNow');
 replay:=public.commit_online_game_server_v1(a,0,null,'online-create-001',repeat('a',64),response,'[]');
 if replay<>response or (select gold from public.character_wallets where character_id=c)<>100 then raise exception 'create persistence';end if;
 replay:=public.commit_online_game_server_v1(a,0,null,'online-create-001',repeat('a',64),response,'[]');
 if replay<>response or (select revision from public.online_game_states where account_id=a)<>1 then raise exception 'create replay';end if;
 begin perform public.commit_online_game_server_v1(a,1,100,'online-create-001',repeat('b',64),response,'[]');raise exception 'key conflict accepted';exception when raise_exception then if sqlerrm<>'idempotency_key_conflict' then raise;end if;end;
 begin perform public.commit_online_game_server_v1(a,0,100,'online-stale-001',repeat('b',64),response,'[]');raise exception 'stale accepted';exception when raise_exception then if sqlerrm<>'stale_state' then raise;end if;end;
 update public.character_wallets set gold=150 where character_id=c;
 begin perform public.commit_online_game_server_v1(a,1,100,'online-wallet-001',repeat('b',64),response,'[]');raise exception 'wallet race accepted';exception when raise_exception then if sqlerrm<>'stale_state_wallet' then raise;end if;end;
 loaded:=public.load_online_game_server_v1(a);if (loaded->>'walletGold')::int<>150 then raise exception 'external reward visibility';end if;
 -- Roster transitions keep the authoritative schema-11 state and active relational projection aligned.
 s:=jsonb_build_object('version',11,'character',jsonb_build_object('id',c,'name','Online Test','classId','IRONWARDEN','bodyPresentation','male','level',1,'xp',0,'gold',150,'hp',100,'currentHp',100,'attack',10,'defense',10,'equipment','{}'::jsonb),'otherCharacters',jsonb_build_array(jsonb_build_object('character',jsonb_build_object('id',b,'name','Second','classId','BASTION','bodyPresentation','female','level',1,'xp',0,'gold',100,'hp',100,'currentHp',100,'attack',10,'defense',10,'equipment','{}'::jsonb))), 'account','{}'::jsonb);
 response:=jsonb_build_object('state',s,'version',2,'accountId',a,'serverNow',loaded->'serverNow');
 -- Switch to the newly-created member; it is represented in the state and gets a relational projection.
 s:=jsonb_set(s,'{character,id}',to_jsonb(b));s:=jsonb_set(s,'{character,name}',to_jsonb('Second'::text));s:=jsonb_set(s,'{character,classId}',to_jsonb('BASTION'::text));s:=jsonb_set(s,'{character,gold}',to_jsonb(100));
 response:=jsonb_set(response,'{state}',s);response:=jsonb_set(response,'{version}',to_jsonb(2));
 perform public.commit_online_game_server_v1(a,1,150,'online-roster-switch-01',repeat('c',64),response,'[]');
 if (select character_id from public.online_game_states where account_id=a)<>b or not exists(select 1 from public.characters where id=b and account_id=a) then raise exception 'roster create projection';end if;
 -- Switch back; existing ownership is required and the schema-11 state remains intact.
 s:=jsonb_set(s,'{character,id}',to_jsonb(c));s:=jsonb_set(s,'{character,name}',to_jsonb('Online Test'::text));s:=jsonb_set(s,'{character,classId}',to_jsonb('IRONWARDEN'::text));s:=jsonb_set(s,'{character,gold}',to_jsonb(150));s:=jsonb_set(s,'{character,faith}',jsonb_build_object('xp',120,'selectedBlessingId','EMBER_VOW','favoriteBlessingIds',jsonb_build_array('EMBER_VOW'),'hideWeakerBlessings',true));s:=jsonb_set(s,'{skills}',jsonb_build_array(jsonb_build_object('skillId','faith','xp',120,'level',2),jsonb_build_object('skillId','herbalism','xp',9,'level',1),jsonb_build_object('skillId','alchemy','xp',24,'level',1)));s:=jsonb_set(s,'{activity}',jsonb_build_object('kind','alchemy','targetId','BREW_DEWLEAF_DRAUGHT','startedAtMs',1000,'lastClaimAtMs',1000,'brew',jsonb_build_object('recipeId','BREW_DEWLEAF_DRAUGHT','remainingBatches',1,'reservedInputs',jsonb_build_array(jsonb_build_object('itemId','DEWLEAF','quantity',2)),'reservedGold',4,'secondsPerBatch',60,'xpPerBatch',24,'output',jsonb_build_object('itemId','DEWLEAF_DRAUGHT','quantity',1))));response:=jsonb_set(response,'{state}',s);response:=jsonb_set(response,'{version}',to_jsonb(3));
 perform public.commit_online_game_server_v1(a,2,100,'online-roster-switch-02',repeat('d',64),response,'[]');
 if (select character_id from public.online_game_states where account_id=a)<>c or (select state->>'version' from public.online_game_states where account_id=a)<>'11' or (select state#>>'{character,faith,selectedBlessingId}' from public.online_game_states where account_id=a)<>'EMBER_VOW' or (select state#>>'{skills,1,skillId}' from public.online_game_states where account_id=a)<>'herbalism' or (select state#>>'{activity,kind}' from public.online_game_states where account_id=a)<>'alchemy' then raise exception 'roster mode state persistence';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);perform set_config('request.jwt.claim.role','authenticated',true);set local role authenticated;
 begin perform public.load_online_game_server_v1(b);raise exception 'client server RPC allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from public.online_game_states;raise exception 'client private state allowed';exception when insufficient_privilege then null;end;
 begin update public.characters set gold=999999 where id=c;raise exception 'client progression write allowed';exception when insufficient_privilege then null;end;
 begin update public.character_wallets set gold=999999 where character_id=c;raise exception 'client wallet write allowed';exception when insufficient_privilege then null;end;
 begin perform public.reserve_market_buy_gold(c,gen_random_uuid(),100);raise exception 'client server economy allowed';exception when insufficient_privilege then null;end;
 begin perform public.start_gathering_activity(c,'COPPER_VEIN');raise exception 'parallel gathering allowed';exception when raise_exception then if sqlerrm<>'use_authoritative_gameplay' then raise;end if;end;
 begin perform public.guild_contribute('boss',50000);raise exception 'client Guild points allowed';exception when insufficient_privilege then null;end;
 reset role;perform set_config('request.jwt.claim.role','service_role',true);
 if (select count(*) from public.server_action_receipts where account_id=a and action='online_game_v1')<>1 then raise exception 'receipt count';end if;
end $$;
select 'PASS: online state, identity, replay, version/wallet races, RLS and legacy mutation denial' as result;
rollback;
