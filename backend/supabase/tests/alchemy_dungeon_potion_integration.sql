-- Run on staging AFTER 20261104100500 migration. Every row and mutation rolls back.
-- Validates atomic real Inventory/HP/tonic changes, server snapshots and replay safety.
begin;
do $test$
declare
 a uuid:=gen_random_uuid();c uuid:=gen_random_uuid();rid uuid:=gen_random_uuid();
 st jsonb;r jsonb;r2 jsonb;before_version bigint;msg text;
begin
 insert into auth.users(id,email) values(a,'potion-test-'||a||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id,level) values(c,a,'PotionTester','IRONWARDEN',25);
 st:=jsonb_build_object('character',jsonb_build_object('id',c,'equippedHealingPotionId','DEWLEAF_DRAUGHT'),
 'inventory',jsonb_build_object('stacks',jsonb_build_array(
 jsonb_build_object('itemId','DEWLEAF_DRAUGHT','quantity',3),
 jsonb_build_object('itemId','WARD_TONIC','quantity',2),
 jsonb_build_object('itemId','COOKED_FISH','quantity',10))));
 insert into public.online_game_states(account_id,character_id,state,revision) values(a,c,st,4);
 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,controller_account_id,phase,state_version)
 values(rid,'EXP_001',1,'alchemy-test',repeat('a',64),a,'qmode',a,'awaiting_choice',1);
 insert into public.expedition_run_members(run_id,character_id,account_id,role,synced_level,loadout_snapshot,stat_snapshot,member_kind,active_participant_account_id)
 values(rid,c,a,'tank',25,'{}'::jsonb,'{}'::jsonb,'human',a);
 insert into public.coop_run_access_memberships(run_id,account_id,membership_kind) values(rid,a,'controller');
 insert into public.coop_run_private_state(run_id,state_json)
 values(rid,jsonb_build_object('run',jsonb_build_object(
 'phase','awaiting_choice','players',jsonb_build_array(jsonb_build_object('id',c,'team','players','stats',jsonb_build_object('maxHp',1000))),
 'persistentState',jsonb_build_object('actors',jsonb_build_object(c::text,jsonb_build_object('hp',400,'downed',false)),'visitedNodeIds','[]'::jsonb))));
 insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json)
 values(rid,1,1,jsonb_build_object('mode','qmode','team',jsonb_build_array(jsonb_build_object('memberId',c,'currentHp',400)),'decisionRevision',7));
 before_version:=(select state_version from public.expedition_runs where id=rid);
 -- Healing from equipped brewed stock, 20% of 1000 HP, with one inventory deduction.
 r:=public.consume_online_coop_healing_potion_server_v1(a,rid,'heal-request-001',repeat('b',64));
 if r#>>'{team,0,currentHp}'<>'600' then raise exception 'wrong healing: %',r;end if;
 if (select state#>>'{inventory,stacks,0,quantity}' from public.online_game_states where account_id=a)<>'2' then raise exception 'healing did not spend exactly one';end if;
 if (select state_json#>>array['run','persistentState','healingPotionUsesByActor',c::text] from public.coop_run_private_state where run_id=rid)<>'1'
 then raise exception 'healing charge not persisted';end if;
 r2:=public.consume_online_coop_healing_potion_server_v1(a,rid,'heal-request-001',repeat('b',64));
 if r2 is distinct from r then raise exception 'healing replay not idempotent';end if;
 begin
  perform public.consume_online_coop_healing_potion_server_v1(a,rid,'heal-request-001',repeat('c',64));
  raise exception 'conflicting key accepted';
 exception when others then
  get stacked diagnostics msg=message_text;
  if msg<>'idempotency_key_conflict' then raise exception 'unexpected key conflict: %',msg;end if;
 end;
 -- One owner-only Ward tonic is consumed and frozen onto this actor's snapshot.
 r:=public.consume_online_coop_preparation_tonic_server_v1(a,rid,'tonic-request-001',repeat('d',64),'WARD_TONIC');
 if r#>>array['preparedAlchemyPotionIdsByActor',c::text]<>'WARD_TONIC' then raise exception 'tonic selection missing';end if;
 if (select state_json#>>'{run,players,0,alchemyModifiers,incoming}' from public.coop_run_private_state where run_id=rid)<>'0.95'
 then raise exception 'Ward mitigation not persisted';end if;
 r2:=public.consume_online_coop_preparation_tonic_server_v1(a,rid,'tonic-request-001',repeat('d',64),'WARD_TONIC');
 if r2 is distinct from r then raise exception 'tonic replay changed';end if;
 if (select state#>>'{inventory,stacks,1,quantity}' from public.online_game_states where account_id=a)<>'1'
 then raise exception 'tonic not deducted exactly once';end if;
 begin
  perform public.consume_online_coop_preparation_tonic_server_v1(a,rid,'tonic-request-002',repeat('e',64),'WARD_TONIC');
  raise exception 'double tonic accepted';
 exception when others then
  get stacked diagnostics msg=message_text;
  if msg<>'tonic_already_prepared' then raise exception 'unexpected extra tonic response: %',msg;end if;
 end;
 if (select state#>>'{inventory,stacks,2,quantity}' from public.online_game_states where account_id=a)<>'10' then raise exception 'food consumed';end if;
 if (select state_version from public.expedition_runs where id=rid)<>before_version then raise exception 'room state_version mutated';end if;
 if (select projection_json->>'decisionRevision' from public.coop_run_client_snapshots where run_id=rid)<>'7' then raise exception 'Live decisionRevision mutated';end if;
end $test$;
rollback;
