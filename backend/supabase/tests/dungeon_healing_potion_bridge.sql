-- Integration regression: run inside a transaction, leave zero test accounts behind.
-- Run against staging after deploying the dungeon potion migration.
begin;
do $dungeon_potion_test$
declare
 a uuid:=gen_random_uuid();
 b uuid:=gen_random_uuid();
 c uuid:=gen_random_uuid();
 d uuid:=gen_random_uuid();
 rid uuid:=gen_random_uuid();
 st jsonb; private_state jsonb; view_state jsonb;
 result jsonb; replay jsonb;
begin
 insert into auth.users(id,email) values
 (a,'dungeon-potion-a-'||a||'@example.invalid'),
 (b,'dungeon-potion-b-'||b||'@example.invalid');
 insert into public.characters(id,account_id,name,class_id,level) values
 (c,a,'Potion Alpha','IRONWARDEN',25),
 (d,b,'Potion Bravo','BASTION',25);
 st:=jsonb_build_object('inventory',jsonb_build_object('stacks',jsonb_build_array(
   jsonb_build_object('itemId','DEWLEAF_DRAUGHT','quantity',3),
   jsonb_build_object('itemId','COOKED_FISH','quantity',10)
 )));
 insert into public.online_game_states(account_id,character_id,state,revision) values
 (a,c,st,4),(b,d,st,4);
 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,controller_account_id,phase,state_version)
 values(rid,'EXP_001',1,'potion-test',repeat('a',64),a,'qmode',a,'awaiting_choice',1);
 insert into public.expedition_run_members(run_id,character_id,account_id,role,synced_level,loadout_snapshot,stat_snapshot,member_kind)
 values(rid,c,a,'tank',25,'{}'::jsonb,'{}'::jsonb,'human');
 insert into public.coop_run_access_memberships(run_id,account_id,membership_kind)
 values(rid,a,'controller');
 private_state:=jsonb_build_object('run',jsonb_build_object(
  'phase','awaiting_choice','tier',1,
  'players',jsonb_build_array(jsonb_build_object('id',c,'stats',jsonb_build_object('maxHp',1000))),
  'persistentState',jsonb_build_object('actors',jsonb_build_object(c::text,
   jsonb_build_object('hp',400,'downed',false)))));
 insert into public.coop_run_private_state(run_id,state_json) values(rid,private_state);
 view_state:=jsonb_build_object('mode','qmode','team',jsonb_build_array(
  jsonb_build_object('memberId',c,'currentHp',400)));
 insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json)
 values(rid,1,1,view_state);
 if (select projection_json#>>'{potionCharges,remaining}' from public.coop_run_client_snapshots where run_id=rid)<>'3'
 then raise exception 'initial run charge projection missing'; end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 result:=public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',1,'testpot001');
 if (result->>'healedHp')::integer<>250 or (result->>'chargesRemaining')::integer<>2
 then raise exception 'healing amount or charge result wrong: %',result;end if;
 if (select state#>>'{inventory,stacks,0,quantity}' from public.online_game_states where account_id=a)<>'2'
 then raise exception 'inventory did not spend exactly one potion';end if;
 if (select state#>>'{inventory,stacks,1,quantity}' from public.online_game_states where account_id=a)<>'10'
 then raise exception 'food was mistakenly consumed';end if;
 if (select state_json#>>array['run','persistentState','actors',c::text,'hp']
    from public.coop_run_private_state where run_id=rid)<>'650'
 then raise exception 'private actor HP not updated';end if;
 if (select projection_json#>>'{team,0,currentHp}' from public.coop_run_client_snapshots where run_id=rid)<>'650'
 then raise exception 'public team HP not updated';end if;
 if (select projection_json#>>'{potionCharges,remaining}' from public.coop_run_client_snapshots where run_id=rid)<>'2'
 then raise exception 'remaining charge projection not updated';end if;
 if (select revision from public.online_game_states where account_id=a)<>5
 then raise exception 'game revision did not advance';end if;
 replay:=public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',1,'testpot001');
 if replay is distinct from result then raise exception 'idempotent response changed';end if;
 if (select state#>>'{inventory,stacks,0,quantity}' from public.online_game_states where account_id=a)<>'2'
 then raise exception 'idempotent replay spent another potion';end if;
 begin
  perform public.use_online_dungeon_potion_v1(rid,'RIVERHEART_DRAUGHT',1,'testpot001');
  raise exception 'request key reused with different potion';
 exception when raise_exception then if sqlerrm<>'idempotency_key_conflict' then raise;end if;
 end;
 begin
  perform public.use_online_dungeon_potion_v1(rid,'COOKED_FISH',2,'testpot002');
  raise exception 'food accepted';
 exception when raise_exception then if sqlerrm<>'healing_potion_required' then raise;end if;
 end;
 begin
  perform public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',1,'testpot003');
  raise exception 'stale run version accepted';
 exception when raise_exception then if sqlerrm<>'stale_state' then raise;end if;
 end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 begin
  perform public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',2,'testpot004');
  raise exception 'foreign account used dungeon potion';
 exception when raise_exception then if sqlerrm<>'not_active_dungeon_participant' then raise;end if;
 end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 update public.coop_run_private_state set state_json=jsonb_set(state_json,
  array['run','persistentState','actors',c::text,'downed'],'true'::jsonb)
 where run_id=rid;
 begin
  perform public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',2,'testpot005');
  raise exception 'downed player healed';
 exception when raise_exception then if sqlerrm<>'dungeon_actor_cannot_heal' then raise;end if;
 end;
 update public.coop_run_private_state set state_json=jsonb_set(state_json,
  array['run','persistentState','actors',c::text,'downed'],'false'::jsonb)
 where run_id=rid;
 update public.coop_run_private_state set state_json=jsonb_set(state_json,
  array['run','persistentState','actors',c::text,'hp'],'1000'::jsonb)
 where run_id=rid;
 begin
  perform public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',2,'testpot006');
  raise exception 'full-health use accepted';
 exception when raise_exception then if sqlerrm<>'health_full' then raise;end if;
 end;
 update public.coop_run_private_state set state_json=jsonb_set(state_json,
  array['run','persistentState','actors',c::text,'hp'],'650'::jsonb)
 where run_id=rid;
 update public.coop_run_private_state set state_json=jsonb_set(state_json,'{run,phase}','"resolving_node"'::jsonb)
 where run_id=rid;
 begin
  perform public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',2,'testpot007');
  raise exception 'potion used mid-combat';
 exception when raise_exception then if sqlerrm<>'unsupported_dungeon_potion_state' then raise;end if;
 end;
 update public.coop_run_private_state set state_json=jsonb_set(state_json,'{run,phase}','"awaiting_choice"'::jsonb)
 where run_id=rid;
 result:=public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',2,'testpot008');
 if (result->>'chargesRemaining')::integer<>1 then raise exception 'second charge missing';end if;
 result:=public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',3,'testpot009');
 if (result->>'chargesRemaining')::integer<>0 then raise exception 'third charge missing';end if;
 begin
  perform public.use_online_dungeon_potion_v1(rid,'DEWLEAF_DRAUGHT',4,'testpot010');
  raise exception 'tier 1 over-cap accepted';
 exception when raise_exception then if sqlerrm<>'dungeon_potion_charges_exhausted' then raise;end if;
 end;
 if (select state#>>'{inventory,stacks,0,itemId}' from public.online_game_states where account_id=a)<>'COOKED_FISH'
 then raise exception 'spent potion stack not removed';end if;
 if (select state_json#>>'{run,persistentState,potionChargesUsed}' from public.coop_run_private_state where run_id=rid)<>'3'
 then raise exception 'private run charge counter not persistent';end if;
 if (select projection_json#>>'{potionCharges,remaining}' from public.coop_run_client_snapshots where run_id=rid)<>'0'
 then raise exception 'final charge projection not zero';end if;
end $dungeon_potion_test$;
rollback;
