-- Character-owned Alchemy potion healing between authoritative Q-Mode/Live dungeon rooms.
-- Unlike the old tier allowance, every charge spends one carried crafted potion.
-- This is deliberately a between-room action: combat resolution, votes and Echoes
-- must not be able to consume inventory on behalf of a player.
begin;
create or replace function public.consume_online_coop_healing_potion_server_v1(
 p_account_id uuid,p_run_id uuid,p_request_id text,p_request_hash text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_run public.expedition_runs%rowtype;
 v_game public.online_game_states%rowtype;
 v_private jsonb;v_projection jsonb;v_team jsonb;v_stacks jsonb;
 v_character_id uuid;v_actor jsonb;v_actor_path text[];v_potion_id text;
 v_prior jsonb;v_cap integer;v_used integer;v_quantity integer;
 v_fraction numeric;v_hp numeric;v_max numeric;v_next_hp numeric;
 v_index integer;v_team_index integer;v_found boolean:=false;v_team_found boolean:=false;
 v_stack jsonb;v_member jsonb;v_usage jsonb;
begin
 if p_account_id is null or p_run_id is null
  or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$' or p_request_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'invalid_potion_request';end if;

 -- Serialize against room selection, resolution and other potion requests.
 select * into v_run from public.expedition_runs where id=p_run_id for update;
 if not found or v_run.coop_mode not in ('qmode','live') then raise exception 'not_participant';end if;
 if not exists(
   select 1 from public.coop_run_access_memberships a
   where a.run_id=p_run_id and a.account_id=p_account_id and a.active
 ) then raise exception 'not_participant';end if;
 if v_run.coop_mode='qmode' and v_run.controller_account_id is distinct from p_account_id
 then raise exception 'not_participant';end if;

 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'dungeon_potion_v1',p_run_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash' is distinct from p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 if v_run.phase<>'awaiting_choice' or v_run.status<>'active' then raise exception 'run_not_awaiting_choice';end if;

 select m.character_id into v_character_id from public.expedition_run_members m
 where m.run_id=p_run_id and m.account_id=p_account_id
  and m.member_kind='human' and m.active_participant_account_id=p_account_id
 limit 1;
 if v_character_id is null then raise exception 'not_participant';end if;
 select * into v_game from public.online_game_states where account_id=p_account_id for update;
 if not found or v_game.character_id is distinct from v_character_id
  or v_game.state#>>'{character,id}' is distinct from v_character_id::text
 then raise exception 'character_mismatch';end if;

 select state_json into v_private from public.coop_run_private_state where run_id=p_run_id for update;
 select projection_json into v_projection from public.coop_run_client_snapshots where run_id=p_run_id for update;
 if v_private is null or v_projection is null or v_private ? 'pending'
   or v_private#>>'{run,phase}' is distinct from 'awaiting_choice'
 then raise exception 'run_not_awaiting_choice';end if;
 v_actor_path:=array['run','persistentState','actors',v_character_id::text];
 v_actor:=v_private#>v_actor_path;
 if jsonb_typeof(v_actor)<>'object' then raise exception 'invalid_dungeon_actor';end if;
 if coalesce((v_actor->>'downed')::boolean,false) then raise exception 'potion_cannot_revive';end if;
 v_hp:=(v_actor->>'hp')::numeric;
 select (x#>>'{stats,maxHp}')::numeric into v_max
 from jsonb_array_elements(v_private#>'{run,players}') x
 where x->>'id'=v_character_id::text limit 1;
 if v_max is null or v_max<=0 or v_hp is null or v_hp<=0
 then raise exception 'potion_cannot_revive';end if;
 if v_hp>=v_max then raise exception 'health_full';end if;

 v_cap:=case v_run.tier when 1 then 3 when 2 then 3 when 3 then 4 when 4 then 4 when 5 then 5 else 0 end;
 if v_cap=0 then raise exception 'invalid_dungeon_tier';end if;
 v_usage:=coalesce(v_private#>'{run,persistentState,healingPotionUsesByActor}','{}'::jsonb);
 v_used:=coalesce((v_usage->>v_character_id::text)::integer,0);
 if v_used<0 or v_used>=v_cap then raise exception 'potion_charges_exhausted';end if;

 v_potion_id:=v_game.state#>>'{character,equippedHealingPotionId}';
 v_fraction:=case v_potion_id
  when 'DEWLEAF_DRAUGHT' then 0.20
  when 'RIVERHEART_DRAUGHT' then 0.35
  when 'OATHBLOOM_DRAUGHT' then 0.50
  else null end;
 if v_fraction is null then raise exception 'healing_potion_not_selected';end if;
 v_stacks:=v_game.state#>'{inventory,stacks}';
 if jsonb_typeof(v_stacks)<>'array' then raise exception 'invalid_inventory';end if;
 for v_stack,v_index in select value,ordinality::integer
    from jsonb_array_elements(v_stacks) with ordinality
 loop
  if v_stack->>'itemId'=v_potion_id and coalesce((v_stack->>'quantity')::integer,0)>0 then
   v_quantity:=(v_stack->>'quantity')::integer;
   if v_quantity=1 then
    v_stacks:=v_stacks-(v_index-1);
   else
    v_stacks:=jsonb_set(v_stacks,array[(v_index-1)::text,'quantity'],to_jsonb(v_quantity-1),false);
   end if;
   v_found:=true;exit;
  end if;
 end loop;
 if not v_found then raise exception 'healing_potion_not_carried';end if;

 v_next_hp:=least(v_max,v_hp+ceil(v_max*v_fraction));
 v_private:=jsonb_set(v_private,v_actor_path||array['hp'],to_jsonb(v_next_hp),false);
 v_usage:=v_usage||jsonb_build_object(v_character_id::text,v_used+1);
 v_private:=jsonb_set(v_private,'{run,persistentState,healingPotionUsesByActor}',v_usage,true);

 -- Keep the public HP projection in sync without exposing account inventory.
 v_team:=v_projection->'team';
 if jsonb_typeof(v_team)<>'array' then raise exception 'invalid_dungeon_projection';end if;
 for v_member,v_team_index in select value,ordinality::integer
   from jsonb_array_elements(v_team) with ordinality
 loop
  if v_member->>'memberId'=v_character_id::text then
   v_team:=jsonb_set(v_team,array[(v_team_index-1)::text,'currentHp'],to_jsonb(v_next_hp),false);
   v_team_found:=true;exit;
  end if;
 end loop;
 if not v_team_found then raise exception 'invalid_dungeon_projection';end if;
 v_projection:=jsonb_set(v_projection,'{team}',v_team,false)
   ||jsonb_build_object('healingPotionUsesByActor',v_usage);

 -- These three writes and the receipt commit together or not at all. The
 -- route state_version deliberately stays unchanged: an active Live vote
 -- retains its decisionRevision. Room-queue CAS validates full private state,
 -- so any concurrent stale room simulation is rejected instead of erasing HP.
 update public.online_game_states
 set state=jsonb_set(v_game.state,'{inventory,stacks}',v_stacks,false),
     revision=revision+1,updated_at=clock_timestamp()
 where account_id=p_account_id;
 update public.coop_run_private_state set state_json=v_private,updated_at=clock_timestamp() where run_id=p_run_id;
 update public.coop_run_client_snapshots set projection_json=v_projection,updated_at=clock_timestamp() where run_id=p_run_id;
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'dungeon_potion_v1',p_run_id::text,p_request_id,p_request_hash,v_projection);
 return v_projection;
end $$;
revoke all on function public.consume_online_coop_healing_potion_server_v1(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.consume_online_coop_healing_potion_server_v1(uuid,uuid,text,text) to service_role;

-- A character may prepare exactly one brewed role tonic before the first room.
-- Potions are paid from the authoritative carried inventory. Frozen modifiers
-- reside with the dungeon player snapshot and remain in effect until run end.
-- Client requests select an ID only, never its numeric potency or recipient.
create or replace function public.consume_online_coop_preparation_tonic_server_v1(
 p_account_id uuid,p_run_id uuid,p_request_id text,p_request_hash text,p_potion_id text
) returns jsonb language plpgsql security definer set search_path=public as $
declare
 v_run public.expedition_runs%rowtype;
 v_game public.online_game_states%rowtype;
 v_private jsonb;v_projection jsonb;v_players jsonb;v_stacks jsonb;v_prepared jsonb;
 v_character_id uuid;v_stack jsonb;v_member jsonb;v_modifiers jsonb;v_prior jsonb;
 v_outgoing numeric:=1;v_incoming numeric:=1;v_healing numeric:=1;v_shielding numeric:=1;
 v_index integer;v_player_index integer;v_qty integer;
 v_found boolean:=false;v_player_found boolean:=false;
begin
 if p_account_id is null or p_run_id is null or p_request_id is null
  or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}
  or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}
 then raise exception 'invalid_tonic_request';end if;

 -- Only these nine server-catalogued effects can be selected. Never derive
 -- percentages from JSON supplied by a mobile client.
 case p_potion_id
  when 'VIGOR_TONIC' then v_outgoing:=1.05;
  when 'GREATER_VIGOR_TONIC' then v_outgoing:=1.10;
  when 'OATH_VIGOR_TONIC' then v_outgoing:=1.15;
  when 'WARD_TONIC' then v_incoming:=0.95;
  when 'GREATER_WARD_TONIC' then v_incoming:=0.90;
  when 'OATH_WARD_TONIC' then v_incoming:=0.85;
  when 'HARMONY_TONIC' then v_outgoing:=1.02;v_healing:=1.05;v_shielding:=1.05;
  when 'GREATER_HARMONY_TONIC' then v_outgoing:=1.04;v_healing:=1.10;v_shielding:=1.10;
  when 'OATH_HARMONY_TONIC' then v_outgoing:=1.06;v_healing:=1.15;v_shielding:=1.15;
  else raise exception 'invalid_tonic_selection';
 end case;
 v_modifiers:=jsonb_build_object('outgoing',v_outgoing,'incoming',v_incoming,'healing',v_healing,'shielding',v_shielding);

 -- Take all dungeon mutations under the run lock, matching the healing RPC.
 select * into v_run from public.expedition_runs where id=p_run_id for update;
 if not found or v_run.coop_mode not in ('qmode','live') then raise exception 'not_participant';end if;
 if not exists(select 1 from public.coop_run_access_memberships a
               where a.run_id=p_run_id and a.account_id=p_account_id and a.active)
 then raise exception 'not_participant';end if;
 if v_run.coop_mode='qmode' and v_run.controller_account_id is distinct from p_account_id
 then raise exception 'not_participant';end if;

 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'dungeon_tonic_v1',p_run_id::text,p_request_id);
 if v_prior is not null then
  if v_prior->>'requestHash' is distinct from p_request_hash then raise exception 'idempotency_key_conflict';end if;
  return v_prior->'response';
 end if;
 if v_run.phase<>'awaiting_choice' or v_run.status<>'active' then raise exception 'run_not_awaiting_choice';end if;

 select m.character_id into v_character_id from public.expedition_run_members m
 where m.run_id=p_run_id and m.account_id=p_account_id
 and m.member_kind='human' and m.active_participant_account_id=p_account_id limit 1;
 if v_character_id is null then raise exception 'not_participant';end if;
 select * into v_game from public.online_game_states where account_id=p_account_id for update;
 if not found or v_game.character_id is distinct from v_character_id
   or v_game.state#>>'{character,id}' is distinct from v_character_id::text
 then raise exception 'character_mismatch';end if;

 select state_json into v_private from public.coop_run_private_state where run_id=p_run_id for update;
 select projection_json into v_projection from public.coop_run_client_snapshots where run_id=p_run_id for update;
 if v_private is null or v_projection is null or v_private ? 'pending'
 or v_private#>>'{run,phase}' is distinct from 'awaiting_choice'
 then raise exception 'run_not_awaiting_choice';end if;
 if coalesce(jsonb_typeof(v_private#>'{run,persistentState,visitedNodeIds}'),'null')<>'array'
 or jsonb_array_length(v_private#>'{run,persistentState,visitedNodeIds}')<>0
 then raise exception 'tonic_preparation_closed';end if;

 v_prepared:=coalesce(v_private#>'{run,persistentState,preparedAlchemyPotionIdsByActor}','{}'::jsonb);
 if jsonb_typeof(v_prepared)<>'object' then raise exception 'invalid_tonic_state';end if;
 if v_prepared ? v_character_id::text then raise exception 'tonic_already_prepared';end if;

 v_players:=v_private#>'{run,players}';
 if jsonb_typeof(v_players)<>'array' then raise exception 'invalid_dungeon_actor';end if;
 for v_member,v_player_index in select value,ordinality::integer from jsonb_array_elements(v_players) with ordinality loop
  if v_member->>'id'=v_character_id::text then
   if v_member->>'team' is distinct from 'players' then raise exception 'invalid_dungeon_actor';end if;
   v_players:=jsonb_set(v_players,array[(v_player_index-1)::text,'alchemyModifiers'],v_modifiers,true);
   v_player_found:=true;exit;
  end if;
 end loop;
 if not v_player_found then raise exception 'invalid_dungeon_actor';end if;

 v_stacks:=v_game.state#>'{inventory,stacks}';
 if jsonb_typeof(v_stacks)<>'array' then raise exception 'invalid_inventory';end if;
 for v_stack,v_index in select value,ordinality::integer from jsonb_array_elements(v_stacks) with ordinality loop
  if v_stack->>'itemId'=p_potion_id and coalesce((v_stack->>'quantity')::integer,0)>0 then
   v_qty:=(v_stack->>'quantity')::integer;
   if v_qty=1 then v_stacks:=v_stacks-(v_index-1);
   else v_stacks:=jsonb_set(v_stacks,array[(v_index-1)::text,'quantity'],to_jsonb(v_qty-1),false);end if;
   v_found:=true;exit;
  end if;
 end loop;
 if not v_found then raise exception 'tonic_not_carried';end if;

 v_prepared:=v_prepared||jsonb_build_object(v_character_id::text,p_potion_id);
 v_private:=jsonb_set(v_private,'{run,players}',v_players,false);
 v_private:=jsonb_set(v_private,'{run,persistentState,preparedAlchemyPotionIdsByActor}',v_prepared,true);
 v_projection:=v_projection||jsonb_build_object('preparedAlchemyPotionIdsByActor',v_prepared);

 -- One atomic transaction: inventory, version, private run, projection, receipt.
 -- Preserve the current decision revision, as with between-room healing.
 update public.online_game_states
 set state=jsonb_set(v_game.state,'{inventory,stacks}',v_stacks,false),
     revision=revision+1,updated_at=clock_timestamp()
 where account_id=p_account_id;
 update public.coop_run_private_state set state_json=v_private,updated_at=clock_timestamp() where run_id=p_run_id;
 update public.coop_run_client_snapshots set projection_json=v_projection,updated_at=clock_timestamp() where run_id=p_run_id;
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(p_account_id,'dungeon_tonic_v1',p_run_id::text,p_request_id,p_request_hash,v_projection);
 return v_projection;
end $;

revoke all on function public.consume_online_coop_preparation_tonic_server_v1(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.consume_online_coop_preparation_tonic_server_v1(uuid,uuid,text,text,text) to service_role;

commit;
