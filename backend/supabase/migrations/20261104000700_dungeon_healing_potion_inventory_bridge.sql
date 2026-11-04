-- Bridge crafted Alchemy healing potions into authoritative co-op HP.
-- The client supplies only the chosen item, run, version and idempotency key;
-- ownership, inventory, health, charge budgets and outcomes are read server-side.
-- Only between-room actions are permitted; Food and preparation tonics are never eligible.
create or replace function public.use_online_dungeon_potion_v1(
 p_run_id uuid, p_item_id text, p_expected_version bigint, p_request_id text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
 v_account uuid := auth.uid();
 g public.online_game_states%rowtype;
 r public.expedition_runs%rowtype;
 c public.coop_run_client_snapshots%rowtype;
 v_private jsonb;
 v_public jsonb;
 v_stacks jsonb;
 v_new_stacks jsonb := '[]'::jsonb;
 v_stack jsonb;
 v_party_member jsonb;
 v_new_team jsonb := '[]'::jsonb;
 v_actor_id text;
 v_player jsonb;
 v_actor jsonb;
 v_fraction numeric;
 v_max_hp numeric;
 v_current_hp numeric;
 v_new_hp numeric;
 v_used integer;
 v_capacity integer;
 v_consumed boolean := false;
 v_team_updated boolean := false;
 v_request_hash text;
 v_prior_hash text;
 v_prior_response jsonb;
 v_response jsonb;
 v_runtime_commit jsonb;
begin
 if v_account is null then raise exception 'not_authenticated'; end if;
 if p_run_id is null or p_request_id is null or p_request_id !~ '^[A-Za-z0-9_-]{8,128}$'
    or p_expected_version is null or p_expected_version < 0 then
   raise exception 'invalid_potion_request';
 end if;
 v_fraction := case p_item_id
   when 'DEWLEAF_DRAUGHT' then 0.25
   when 'RIVERHEART_DRAUGHT' then 0.45
   when 'OATHBLOOM_DRAUGHT' then 0.65
   else null end;
 if v_fraction is null then raise exception 'healing_potion_required'; end if;
 v_request_hash := md5(p_item_id || ':' || p_expected_version::text) || md5(p_item_id || ':' || p_expected_version::text);
 -- A consistent account-first lock order serializes dungeon use with online gameplay writes.
 select * into g from public.online_game_states where account_id=v_account for update;
 if not found or g.character_id is null then raise exception 'character_required'; end if;
 select * into r from public.expedition_runs where id=p_run_id for update;
 if not found then raise exception 'run_not_found'; end if;
 select request_hash,response_json into v_prior_hash,v_prior_response
 from public.coop_idempotency_receipts
 where caller_account_id=v_account and operation='dungeon_healing_potion_v1'
   and resource_id=p_run_id::text and request_id=p_request_id;
 if found then
   if v_prior_hash is distinct from v_request_hash then raise exception 'idempotency_key_conflict'; end if;
   return v_prior_response;
 end if;
 if r.coop_mode not in ('qmode','live') or r.status <> 'active'
    or r.phase <> 'awaiting_choice' then raise exception 'potion_only_between_rooms'; end if;
 if r.state_version is distinct from p_expected_version then raise exception 'stale_state'; end if;
 select m.character_id::text into v_actor_id from public.expedition_run_members m
 join public.coop_run_access_memberships a on a.run_id=m.run_id and a.account_id=v_account and a.active
 where m.run_id=p_run_id and m.member_kind='human'
   and (m.account_id=v_account or m.active_participant_account_id=v_account)
   and m.character_id=g.character_id limit 1;
 if v_actor_id is null then raise exception 'not_active_dungeon_participant'; end if;
 select * into c from public.coop_run_client_snapshots where run_id=p_run_id for update;
 select state_json into v_private from public.coop_run_private_state where run_id=p_run_id for update;
 if v_private is null or v_private#>>'{run,phase}' is distinct from 'awaiting_choice'
    or jsonb_typeof(v_private#>'{run,persistentState,actors}')<>'object'
    or jsonb_typeof(v_private#>'{run,players}')<>'array'
    or jsonb_typeof(c.projection_json->'team')<>'array' then
   raise exception 'unsupported_dungeon_potion_state';
 end if;
 v_used:=coalesce((v_private#>>'{run,persistentState,potionChargesUsed}')::integer,0);
 v_capacity:=case r.tier when 1 then 3 when 2 then 3 when 3 then 4 when 4 then 4 when 5 then 5 else 0 end;
 if v_used<0 or v_capacity<1 or v_used>=v_capacity then raise exception 'dungeon_potion_charges_exhausted'; end if;
 select value into v_player from jsonb_array_elements(v_private#>'{run,players}') value
 where value->>'id'=v_actor_id limit 1;
 v_actor:=v_private#>array['run','persistentState','actors',v_actor_id];
 if v_player is null or v_actor is null then raise exception 'dungeon_actor_not_found'; end if;
 v_max_hp:=(v_player#>>'{stats,maxHp}')::numeric;
 v_current_hp:=(v_actor->>'hp')::numeric;
 if v_max_hp is null or v_max_hp<=0 or v_current_hp is null
   or v_current_hp<=0 or v_current_hp>v_max_hp
   or coalesce((v_actor->>'downed')::boolean,false) then
   raise exception 'dungeon_actor_cannot_heal';
 end if;
 if v_current_hp>=v_max_hp then raise exception 'health_full'; end if;
 v_stacks:=g.state#>'{inventory,stacks}';
 if jsonb_typeof(v_stacks)<>'array' then raise exception 'invalid_authoritative_inventory'; end if;
 for v_stack in select value from jsonb_array_elements(v_stacks) value loop
   if not v_consumed and v_stack->>'itemId'=p_item_id and coalesce((v_stack->>'quantity')::integer,0)>0 then
     v_consumed:=true;
     if (v_stack->>'quantity')::integer>1 then
       v_new_stacks:=v_new_stacks || jsonb_build_array(jsonb_set(v_stack,'{quantity}',to_jsonb((v_stack->>'quantity')::integer-1)));
     end if;
   else
     v_new_stacks:=v_new_stacks || jsonb_build_array(v_stack);
   end if;
 end loop;
 if not v_consumed then raise exception 'no_carried_healing_potion'; end if;
 v_new_hp:=least(v_max_hp,v_current_hp+ceil(v_max_hp*v_fraction));
 v_private:=jsonb_set(v_private,array['run','persistentState','actors',v_actor_id,'hp'],to_jsonb(v_new_hp),false);
 v_private:=jsonb_set(v_private,'{run,persistentState,potionChargesUsed}',to_jsonb(v_used+1),true);
 for v_party_member in select value from jsonb_array_elements(c.projection_json->'team') value loop
   if v_party_member->>'memberId'=v_actor_id then
     v_party_member:=jsonb_set(v_party_member,'{currentHp}',to_jsonb(v_new_hp),true);
     v_team_updated:=true;
   end if;
   v_new_team:=v_new_team || jsonb_build_array(v_party_member);
 end loop;
 if not v_team_updated then raise exception 'dungeon_member_projection_missing'; end if;
 v_public:=jsonb_set(c.projection_json,'{team}',v_new_team,false);
 v_public:=jsonb_set(v_public,'{potionCharges}',jsonb_build_object(
   'used',v_used+1,'max',v_capacity,'remaining',v_capacity-v_used-1),true);
 v_public:=jsonb_set(v_public,'{stateVersion}',to_jsonb(r.state_version+1),true);
 v_runtime_commit:=public.commit_coop_runtime_server_v1(
   p_run_id,v_account,r.state_version,r.phase,r.current_node_id,r.cleared_pre_boss_count,
   v_private,v_public,c.event_cursor+1,'dungeon_potion_used',v_public,
   'dungeon-potion:'||p_run_id::text||':'||v_account::text||':'||p_request_id);
 update public.online_game_states set
   state=jsonb_set(g.state,'{inventory,stacks}',v_new_stacks,false),
   revision=revision+1,updated_at=clock_timestamp()
 where account_id=v_account and revision=g.revision;
 if not found then raise exception 'stale_game_state'; end if;
 v_response:=jsonb_build_object('runId',p_run_id,'stateVersion',r.state_version+1,
   'gameVersion',g.revision+1,'healedHp',v_new_hp-v_current_hp,
   'potionId',p_item_id,'chargesRemaining',v_capacity-v_used-1,
   'chargesMax',v_capacity);
 insert into public.coop_idempotency_receipts(
   caller_account_id,operation,resource_id,request_id,request_hash,response_json)
 values(v_account,'dungeon_healing_potion_v1',p_run_id::text,p_request_id,v_request_hash,v_response);
 return v_response;
end; $$;
revoke all on function public.use_online_dungeon_potion_v1(uuid,text,bigint,text) from public,anon,authenticated;
grant execute on function public.use_online_dungeon_potion_v1(uuid,text,bigint,text) to authenticated;
comment on function public.use_online_dungeon_potion_v1(uuid,text,bigint,text) is
 'Consumes one verified carried Alchemy healing potion and one shared dungeon charge atomically between rooms, with an idempotent server-owned HP update.';
