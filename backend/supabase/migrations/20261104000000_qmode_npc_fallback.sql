-- Q-Mode can use genuine shared Echoes and fill empty seats with server-owned
-- adventurers. No synthetic auth.users or characters are created. The RPC keeps
-- controller/real Echo verification and idempotent reward paths unchanged.
CREATE OR REPLACE FUNCTION public.start_online_qmode_server_v1(p_account_id uuid, p_game_version bigint, p_request_id text, p_request_hash text, p_run_id uuid, p_private_state jsonb, p_client_projection jsonb, p_members jsonb, p_seed_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_prior jsonb;g public.online_game_states;r jsonb:=p_private_state->'run';m jsonb;s jsonb;e public.echo_profiles;v_index integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-coop:'||p_account_id::text,0));
 v_prior:=public.read_online_coop_receipt_server_v1(p_account_id,'qmode_start_v1',p_account_id::text,p_request_id);
 if v_prior is not null then if v_prior->>'requestHash'<>p_request_hash then raise exception 'idempotency_key_conflict';end if;return v_prior->'response';end if;
 if char_length(p_request_id) not between 8 and 128 or p_request_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_request';end if;
 select * into g from public.online_game_states where account_id=p_account_id for share;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 if g.revision<>p_game_version then raise exception 'stale_game_version';end if;
 if r->>'id' is distinct from p_run_id::text or r->>'controllerAccountId' is distinct from p_account_id::text or r->>'phase' is distinct from 'awaiting_choice' then raise exception 'invalid_run';end if;
 if jsonb_array_length(p_members)<>4 or (select count(distinct x#>>'{snapshot,accountId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(distinct x#>>'{snapshot,characterId}') from jsonb_array_elements(p_members) x)<>4
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='tank')<>1
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='damage')<>2
  or (select count(*) from jsonb_array_elements(p_members) x where x#>>'{snapshot,readiness,role}'='support')<>1 then raise exception 'invalid_roster';end if;
 delete from public.coop_account_reservations where account_id=p_account_id and reservation_kind<>'run' and expires_at<=clock_timestamp();
 if exists(select 1 from public.coop_account_reservations where account_id=p_account_id)
  or exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs x on x.id=a.run_id where a.account_id=p_account_id and a.active and x.status='active') then raise exception 'account_already_participating';end if;
 insert into public.expedition_runs(id,expedition_id,tier,content_version,seed_hash,created_by,coop_mode,controller_account_id,route_schema_version,route_graph_json,current_node_id,balance_version,engine_version,phase)
 values(p_run_id,r->>'expeditionId',(r->>'tier')::smallint,'online-coop-loadout-v1',p_seed_hash,p_account_id,'qmode',p_account_id,1,r->'graph',r->>'currentNodeId','online-coop-loadout-v1','online-coop-runtime-v1','awaiting_choice');
 for m in select * from jsonb_array_elements(p_members) loop
  s:=m->'snapshot';
  if (s#>>'{readiness,ready}')::boolean is not true then raise exception 'loadout_not_ready';end if;
  if v_index=0 then
   if s->>'accountId' is distinct from p_account_id::text or s->>'characterId' is distinct from g.character_id::text or s->>'revision' is distinct from p_game_version::text then raise exception 'invalid_controller';end if;
  elsif m->>'memberKind'='npc' then
   -- NPCs are server-owned kits, not fake users or donor Echoes. Their combat
   -- snapshots remain in the private run; they receive no player rewards.
   if m->>'profileId' is not null
      or m->>'sourceHash' is distinct from s->>'snapshotHash'
      or s->>'accountId' is distinct from 'npc:qmode:'||(s->>'classId')
      or s->>'characterId' is distinct from s->>'accountId'
      or s->>'loadoutId' is distinct from 'npc-kit'
      or s->>'revision' is distinct from '1'
      or s->>'classId' not in ('IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER')
      or s#>>'{normalized,snapshot,displayName}' not like 'NPC · %'
      or s#>>'{normalized,snapshot,characterId}' is distinct from s->>'characterId'
      or s#>>'{normalized,snapshot,classId}' is distinct from s->>'classId'
      or s#>>'{normalized,snapshot,role}' is distinct from s#>>'{readiness,role}'
      or s#>>'{readiness,role}' is distinct from case when s->>'classId' in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank' when s->>'classId' in ('DAWNKEEPER','STONECALLER') then 'support' else 'damage' end
      or (s#>>'{normalized,effectiveLevel}')::integer not between 1 and 100
   then raise exception 'invalid_npc_member';end if;
  else
   if coalesce(m->>'memberKind','echo')<>'echo' then raise exception 'invalid_member_kind';end if;
   select ep.* into e from public.echo_profiles ep join public.characters c on c.id=ep.character_id
   where ep.id=(m->>'profileId')::uuid and c.account_id=(s->>'accountId')::uuid and ep.character_id=(s->>'characterId')::uuid
    and ep.opted_in and ep.expires_at>clock_timestamp() and ep.published_at>clock_timestamp()-interval '24 hours'
    and ep.content_version='online-coop-loadout-v1' and ep.preferences->>'pipeline'='online_coop_v1' and ep.snapshot_hash=m->>'sourceHash'
   for share of ep;
   if not found then raise exception 'echo_no_longer_eligible';end if;
   if exists(select 1 from public.player_blocks b where (b.blocker_id=p_account_id and b.blocked_id=(s->>'accountId')::uuid) or (b.blocked_id=p_account_id and b.blocker_id=(s->>'accountId')::uuid)) then raise exception 'echo_no_longer_eligible';end if;
  end if;
  -- Only real characters belong in expedition_run_members. NPCs are part of
  -- the already persisted server-private combat state and public projection.
  if v_index=0 or coalesce(m->>'memberKind','echo')='echo' then
   insert into public.expedition_run_members(run_id,character_id,account_id,echo_profile_version,role,synced_level,loadout_snapshot,stat_snapshot,slot_id,member_kind,source_account_id,active_participant_account_id,snapshot_hash)
   values(p_run_id,(s->>'characterId')::uuid,(s->>'accountId')::uuid,case when v_index=0 then null else e.profile_version end,s#>>'{readiness,role}',(s#>>'{normalized,effectiveLevel}')::integer,s,s#>'{normalized,snapshot}',v_index::text,case when v_index=0 then 'human' else 'echo' end,(s->>'accountId')::uuid,case when v_index=0 then p_account_id else null end,s->>'snapshotHash');
  end if;
  v_index:=v_index+1;
 end loop;
 insert into public.coop_run_access_memberships(run_id,account_id,membership_kind) values(p_run_id,p_account_id,'controller');
 insert into public.coop_account_reservations(account_id,run_id,reservation_kind) values(p_account_id,p_run_id,'run');
 insert into public.coop_run_private_state(run_id,state_json) values(p_run_id,p_private_state);
 insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json) values(p_run_id,1,1,p_client_projection);
 insert into public.coop_outbox(semantic_key,run_id,channel_epoch,event_type,client_payload) values('qmode:'||p_run_id||':start',p_run_id,1,'run_started',p_client_projection);
 insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'qmode_start_v1',p_account_id::text,p_request_id,p_request_hash,p_client_projection);
 return p_client_projection;
end $function$
;
-- The Edge Function is the sole caller; retain existing private RPC access.
revoke execute on function public.start_online_qmode_server_v1(uuid,bigint,text,text,uuid,jsonb,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.start_online_qmode_server_v1(uuid,bigint,text,text,uuid,jsonb,jsonb,jsonb,text) to service_role;
