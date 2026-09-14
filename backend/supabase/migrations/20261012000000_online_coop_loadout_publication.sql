-- Publish only from the authoritative game revision; reuse saved loadouts,
-- Echo profiles and existing co-op command receipts. No client stat uploads.
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
   values(v_character,v_profile_version,'online-coop-loadout-v1',v_role,(p_record->>'characterLevel')::integer,p_record,p_snapshot_hash,'{"pipeline":"online_coop_v1"}',clock_timestamp(),true,clock_timestamp()+interval '24 hours',p_readiness,p_snapshot_hash) returning id into v_echo;
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

create or replace function public.eligible_online_coop_echoes_server_v1(p_actor_account_id uuid,p_min_level integer)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('profileId',p.id,'sourceAccountId',p.account_id,'publishedAtMs',extract(epoch from p.published_at)*1000,'record',p.loadout_snapshot)),'[]'::jsonb)
 from (select e.*,c.account_id,row_number() over(partition by e.role order by e.published_at desc,e.id) as role_rank
  from public.echo_profiles e join public.characters c on c.id=e.character_id
  where e.opted_in and e.expires_at>now() and e.published_at>now()-interval '24 hours'
   and e.content_version='online-coop-loadout-v1' and e.preferences->>'pipeline'='online_coop_v1'
   and e.synced_level>=p_min_level and c.account_id<>p_actor_account_id
   and not exists(select 1 from public.player_blocks b where (b.blocker_id=c.account_id and b.blocked_id=p_actor_account_id) or (b.blocked_id=c.account_id and b.blocker_id=p_actor_account_id))
 ) p where p.role_rank<=128;
$$;
revoke all on function public.eligible_online_coop_echoes_server_v1(uuid,integer) from public,anon,authenticated;
grant execute on function public.eligible_online_coop_echoes_server_v1(uuid,integer) to service_role;
commit;
