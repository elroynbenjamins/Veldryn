-- Extend newly published and explicitly refreshed player Echoes to seven days.
-- Retains the current QA-isolated eligibility policy and NPC-safe Q-Mode rules.
-- Existing expired Echoes are not resurrected or retroactively extended.
begin;

create or replace function public.publish_online_coop_loadout_server_v1(
 p_account_id uuid,p_game_version bigint,p_record jsonb,p_snapshot_hash text,
 p_readiness jsonb,p_share_echo boolean default null,p_request_id text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.online_game_states;v_character uuid;v_role text;v_echo uuid;v_profile_version integer;
 v_prior public.coop_idempotency_receipts;v_response jsonb;v_hash text;
begin
 select * into g from public.online_game_states where account_id=p_account_id for update;
 if not found or g.character_id is null then raise exception 'character_required';end if;
 v_character:=g.character_id;
 if p_share_echo is not null then
  if p_request_id is null or char_length(p_request_id) not between 8 and 128 then raise exception 'invalid_request_id';end if;
  v_hash:=encode(sha256(convert_to('share:'||p_share_echo::text||':revision:'||p_game_version::text,'UTF8')),'hex');
  select * into v_prior from public.coop_idempotency_receipts where caller_account_id=p_account_id and operation='online_echo_share_v1' and resource_id=v_character::text and request_id=p_request_id;
  if found then
   if v_prior.request_hash<>v_hash then raise exception 'idempotency_key_conflict';end if;
   return v_prior.response_json;
  end if;
 end if;
 if g.revision<>p_game_version then raise exception 'stale_game_version';end if;
 if p_record->>'accountId' is distinct from p_account_id::text
  or p_record->>'characterId' is distinct from v_character::text
  or p_record->>'classId' is distinct from g.state#>>'{character,classId}'
  or p_record->>'characterLevel' is distinct from g.state#>>'{character,level}'
  or p_record->>'revision' is distinct from p_game_version::text
  or p_record->>'loadoutId' is distinct from 'current'
  or p_record#>>'{stats,characterId}' is distinct from v_character::text
  or p_record#>>'{stats,classId}' is distinct from g.state#>>'{character,classId}'
  or p_snapshot_hash is null or p_snapshot_hash!~'^[a-f0-9]{64}$' then raise exception 'invalid_loadout_evidence';end if;
 v_role:=case p_record->>'classId' when 'IRONWARDEN' then 'tank' when 'BASTION' then 'tank' when 'DREADGUARD' then 'tank' when 'DAWNKEEPER' then 'support' when 'STONECALLER' then 'support' when 'WAYFINDER' then 'damage' when 'RAVAGER' then 'damage' when 'HEXWEAVER' then 'damage' when 'KNIFE_DANCER' then 'damage' else null end;
 if v_role is null or p_readiness->>'role' is distinct from v_role then raise exception 'invalid_role_evidence';end if;
 insert into public.coop_saved_loadouts(account_id,character_id,loadout_id,revision,display_name,content_version,appearance_id,class_id,character_level,dungeon_unlocked,legal_equipment,stat_snapshot,ability_snapshot,capability_tags,readiness_json,snapshot_hash,verified_at,active)
 values(p_account_id,v_character,'current',p_game_version,'Current equipment','online-coop-loadout-v1',g.state#>>'{character,selectedSkinId}',p_record->>'classId',(p_record->>'characterLevel')::integer,(p_record->>'dungeonUnlocked')::boolean,(p_record->>'legalEquipment')::boolean,p_record->'stats',p_record->'abilities',array(select jsonb_array_elements_text(p_record->'capabilities')),p_readiness,p_snapshot_hash,clock_timestamp(),true)
 on conflict(account_id,character_id,loadout_id) do update set revision=excluded.revision,display_name=excluded.display_name,content_version=excluded.content_version,appearance_id=excluded.appearance_id,class_id=excluded.class_id,character_level=excluded.character_level,dungeon_unlocked=excluded.dungeon_unlocked,legal_equipment=excluded.legal_equipment,stat_snapshot=excluded.stat_snapshot,ability_snapshot=excluded.ability_snapshot,capability_tags=excluded.capability_tags,readiness_json=excluded.readiness_json,snapshot_hash=excluded.snapshot_hash,verified_at=excluded.verified_at,active=true;
 if p_share_echo is true then
  if coalesce((p_readiness->>'ready')::boolean,false) is not true or (p_record->>'characterLevel')::integer<15 or coalesce((p_record->>'legalEquipment')::boolean,false) is not true then raise exception 'loadout_not_ready';end if;
  select id into v_echo from public.echo_profiles where character_id=v_character and opted_in and expires_at>clock_timestamp() and snapshot_hash=p_snapshot_hash and preferences->>'pipeline'='online_coop_v1' limit 1;
  if v_echo is null then
   update public.echo_profiles set opted_in=false where character_id=v_character and preferences->>'pipeline'='online_coop_v1';
   select coalesce(max(profile_version),0)+1 into v_profile_version from public.echo_profiles where character_id=v_character;
   insert into public.echo_profiles(character_id,profile_version,content_version,role,synced_level,loadout_snapshot,loadout_hash,preferences,published_at,opted_in,expires_at,readiness_json,snapshot_hash)
   values(v_character,v_profile_version,'online-coop-loadout-v1',v_role,(p_record->>'characterLevel')::integer,p_record,p_snapshot_hash,'{"pipeline":"online_coop_v1"}',clock_timestamp(),true,clock_timestamp()+interval '7 days',p_readiness,p_snapshot_hash) returning id into v_echo;
  else
   -- Explicitly resharing the same loadout renews the seven-day visibility window.
   update public.echo_profiles set published_at=clock_timestamp(),expires_at=clock_timestamp()+interval '7 days' where id=v_echo;
  end if;
 elsif p_share_echo is false then
  update public.echo_profiles set opted_in=false where character_id=v_character and preferences->>'pipeline'='online_coop_v1';
 end if;
 v_response:=jsonb_build_object('revision',p_game_version,'snapshotHash',p_snapshot_hash,'echoProfileId',v_echo,'sharing',exists(select 1 from public.echo_profiles where character_id=v_character and opted_in and expires_at>clock_timestamp() and preferences->>'pipeline'='online_coop_v1'));
 if p_share_echo is not null then insert into public.coop_idempotency_receipts(caller_account_id,operation,resource_id,request_id,request_hash,response_json) values(p_account_id,'online_echo_share_v1',v_character::text,p_request_id,v_hash,v_response);end if;
 return v_response;
end $$;
revoke all on function public.publish_online_coop_loadout_server_v1(uuid,bigint,jsonb,text,jsonb,boolean,text) from public,anon,authenticated;
grant execute on function public.publish_online_coop_loadout_server_v1(uuid,bigint,jsonb,text,jsonb,boolean,text) to service_role;


create or replace function public.eligible_online_coop_echoes_server_v1(p_actor_account_id uuid, p_min_level integer)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
 select coalesce(jsonb_agg(jsonb_build_object('profileId',p.id,'sourceAccountId',p.account_id,'publishedAtMs',extract(epoch from p.published_at)*1000,'record',p.loadout_snapshot)),'[]'::jsonb)
 from (
   select e.*,c.account_id,row_number() over(partition by e.role order by e.published_at desc,e.id) as role_rank
   from public.echo_profiles e
   join public.characters c on c.id=e.character_id
   where e.opted_in
     and e.expires_at>now()
     and e.published_at>now()-interval '7 days'
     and e.content_version='online-coop-loadout-v1'
     and e.preferences->>'pipeline'='online_coop_v1'
     and e.synced_level>=p_min_level
     and c.account_id<>p_actor_account_id
     and (
       coalesce(e.preferences->>'qa_system','false')<>'true'
       or exists(
         select 1
         from auth.users actor
         where actor.id=p_actor_account_id
           and (
             coalesce(actor.raw_app_meta_data,'{}'::jsonb) @> '{"admin_qa":true}'::jsonb
             or coalesce(actor.raw_app_meta_data->'roles','[]'::jsonb) ? 'admin_qa'
           )
       )
     )
     and not exists(
       select 1 from public.player_blocks b
       where (b.blocker_id=c.account_id and b.blocked_id=p_actor_account_id)
          or (b.blocked_id=c.account_id and b.blocker_id=p_actor_account_id)
     )
 ) p
 where p.role_rank<=128;
$function$;


revoke all on function public.eligible_online_coop_echoes_server_v1(uuid,integer) from public, anon, authenticated;
grant execute on function public.eligible_online_coop_echoes_server_v1(uuid,integer) to service_role;

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
      or s#>>'{readiness,role}' is distinct from (case when s->>'classId' in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank' when s->>'classId' in ('DAWNKEEPER','STONECALLER') then 'support' else 'damage' end)
      or (s#>>'{normalized,effectiveLevel}')::integer not between 1 and 100
   then raise exception 'invalid_npc_member';end if;
  else
   if coalesce(m->>'memberKind','echo')<>'echo' then raise exception 'invalid_member_kind';end if;
   select ep.* into e from public.echo_profiles ep join public.characters c on c.id=ep.character_id
   where ep.id=(m->>'profileId')::uuid and c.account_id=(s->>'accountId')::uuid and ep.character_id=(s->>'characterId')::uuid
    and ep.opted_in and ep.expires_at>clock_timestamp() and ep.published_at>clock_timestamp()-interval '7 days'
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

commit;
