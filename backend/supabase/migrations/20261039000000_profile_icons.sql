begin;
-- Profile icons replace equipment appearances. No legacy-save conversion.
alter table public.characters drop column if exists unlocked_skin_ids;

create or replace function private.profile_collection_owned_v43(p_state jsonb,p_kind text,p_id text)
returns boolean
language plpgsql
immutable
set search_path=public,private
as $$
declare v_other jsonb;
begin
  if p_state is null or p_id is null or p_id='' then return false; end if;
  if p_kind='item' then
    if exists(select 1 from jsonb_array_elements(coalesce(p_state#>'{inventory,stacks}','[]'::jsonb)) r where r->>'itemId'=p_id and coalesce((r->>'quantity')::int,0)>0) then return true; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(p_state#>'{bank,stacks}','[]'::jsonb)) r where r->>'itemId'=p_id and coalesce((r->>'quantity')::int,0)>0) then return true; end if;
    if exists(select 1 from jsonb_array_elements(coalesce(p_state#>'{overflow,stacks}','[]'::jsonb)) r where r->>'itemId'=p_id and coalesce((r->>'quantity')::int,0)>0) then return true; end if;
    if exists(select 1 from jsonb_each_text(coalesce(p_state#>'{character,equipment}','{}'::jsonb)) e where e.value=p_id) then return true; end if;
    for v_other in select value from jsonb_array_elements(coalesce(p_state->'otherCharacters','[]'::jsonb)) loop
      if exists(select 1 from jsonb_array_elements(coalesce(v_other#>'{inventory,stacks}','[]'::jsonb)) r where r->>'itemId'=p_id and coalesce((r->>'quantity')::int,0)>0) then return true; end if;
      if exists(select 1 from jsonb_array_elements(coalesce(v_other#>'{overflow,stacks}','[]'::jsonb)) r where r->>'itemId'=p_id and coalesce((r->>'quantity')::int,0)>0) then return true; end if;
      if exists(select 1 from jsonb_each_text(coalesce(v_other#>'{character,equipment}','{}'::jsonb)) e where e.value=p_id) then return true; end if;
    end loop;
    return false;
  elsif p_kind='pet' then
    if coalesce(p_state#>'{account,unlockedCosmeticPetIds}','[]'::jsonb) @> jsonb_build_array(p_id) then return true; end if;
    if coalesce(p_state#>'{character,ownedPetIds}','[]'::jsonb) @> jsonb_build_array(p_id) then return true; end if;
    for v_other in select value from jsonb_array_elements(coalesce(p_state->'otherCharacters','[]'::jsonb)) loop
      if coalesce(v_other#>'{character,ownedPetIds}','[]'::jsonb) @> jsonb_build_array(p_id) then return true; end if;
    end loop;
    return false;
  elsif p_kind='companion' then
    return coalesce(p_state#>'{account,unlockedCombatCompanionIds}','[]'::jsonb) @> jsonb_build_array(p_id);
  elsif p_kind='profile_icon' then
    if p_id in ('starter:hooded-ranger','starter:armored-sentinel','starter:masked-spellcaster','starter:traveling-alchemist','starter:dawn-priestess','starter:stonebound-explorer') then return true;end if;
    if p_id in ('companion:UNIT_001','companion:UNIT_002','companion:UNIT_008') and coalesce(p_state#>'{account,unlockedCombatCompanionIds}','[]'::jsonb) @> jsonb_build_array(split_part(p_id,':',2)) then return true;end if;
    if p_id='event:harvest-guardian' and coalesce(p_state#>'{account,unlockedCombatCompanionIds}','[]'::jsonb) @> '["EVT_UNIT_006"]'::jsonb then return true;end if;
    if p_id='event:pumpkin-piglet' and private.profile_collection_owned_v43(p_state,'pet','EVT_PET_011') then return true;end if;
    if p_id='creature:FALLEN_KNIGHT' and coalesce(p_state->'defeatedBossIds','[]'::jsonb) @> '["FALLEN_KNIGHT"]'::jsonb then return true;end if;
    if p_id in ('creature:MOSS_RAT','creature:IRONWOOD_WOLF') then
      if coalesce((p_state#>>array['character','monsterMasteryPoints',split_part(p_id,':',2)])::numeric,0)>=10 then return true;end if;
      for v_other in select value from jsonb_array_elements(coalesce(p_state->'otherCharacters','[]'::jsonb)) loop
        if coalesce((v_other#>>array['character','monsterMasteryPoints',split_part(p_id,':',2)])::numeric,0)>=10 then return true;end if;
      end loop;
    end if;
    return p_id in ('class:IRONWARDEN','class:BASTION','class:DREADGUARD','class:WAYFINDER','class:RAVAGER','class:HEXWEAVER','class:KNIFE_DANCER','class:DAWNKEEPER','class:STONECALLER') or coalesce(p_state#>'{account,unlockedProfileIconIds}','[]'::jsonb) @> jsonb_build_array(p_id);
  elsif p_kind='background' then
    return p_id in ('asterfall-night','ironwood-dawn','silverbrook-mist','oathglass-hall')
      or coalesce(p_state#>'{account,unlockedProfileBackgroundIds}','[]'::jsonb) @> jsonb_build_array(p_id)
      or p_state#>>'{character,profileBackgroundId}'=p_id;
  elsif p_kind='border' then
    return coalesce(p_state#>'{account,unlockedProfileBorderIds}','[]'::jsonb) @> jsonb_build_array(p_id)
      or p_state#>>'{character,profileBorderId}'=p_id;
  end if;
  return false;
end $$;

create or replace function public.profile_public_v43(p_target_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_uid uuid:=auth.uid();v_ext public.player_profile_extensions%rowtype;v_profile public.player_profiles%rowtype;
  v_game jsonb;v_journal jsonb;v_character jsonb;v_selected uuid;v_allowed boolean:=false;v_other jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if p_target_account_id is null then raise exception 'PROFILE_TARGET_REQUIRED';end if;
  if exists(select 1 from public.player_blocks where (blocker_id=v_uid and blocked_id=p_target_account_id) or (blocker_id=p_target_account_id and blocked_id=v_uid)) then return null;end if;

  select * into v_ext from public.player_profile_extensions where account_id=p_target_account_id;
  if not found then
    v_ext.account_id:=p_target_account_id;v_ext.visibility:='public';v_ext.world_feed_opt_out:=false;v_ext.bio:='';v_ext.achievement_showcase_ids:='{}';v_ext.collection_showcase:='[]';v_ext.record_showcase_ids:='{}';v_ext.mastery_showcase_action_ids:='{}';
  end if;
  v_allowed:=p_target_account_id=v_uid or v_ext.visibility='public';
  if not v_allowed and v_ext.visibility='guild' then
    v_allowed:=exists(
      select 1 from public.guild_members me join public.guild_members them on them.guild_id=me.guild_id
      where me.account_id=v_uid and them.account_id=p_target_account_id
    );
  end if;
  if not v_allowed then return null;end if;

  select * into v_profile from public.player_profiles where account_id=p_target_account_id;
  select state into v_game from public.online_game_states where account_id=p_target_account_id;
  select state into v_journal from private.adventurers_journal_state where account_id=p_target_account_id;
  v_selected:=coalesce(v_ext.selected_character_id,v_profile.active_character_id,(v_game#>>'{character,id}')::uuid);
  if v_selected is not null and v_game#>>'{character,id}'=v_selected::text then
    v_character:=v_game->'character';
  elsif v_selected is not null then
    for v_other in select value from jsonb_array_elements(coalesce(v_game->'otherCharacters','[]'::jsonb)) loop
      if v_other#>>'{character,id}'=v_selected::text then v_character:=v_other->'character';exit;end if;
    end loop;
  end if;
  if v_character is null then
    select jsonb_build_object('id',c.id,'name',c.name,'classId',c.class_id,'level',c.level,'bodyPresentation',c.body_presentation,'profileTitle',c.profile_title,'profileBackgroundId',c.profile_background_id,'profileIconId','class:'||c.class_id)
    into v_character from public.characters c where c.account_id=p_target_account_id order by (c.id=v_selected) desc,c.level desc,c.updated_at desc limit 1;
  end if;
  if v_character is null then return null;end if;

  return jsonb_build_object(
    'accountId',p_target_account_id,'displayName',coalesce(nullif(v_profile.display_name,''),v_character->>'name','Adventurer'),'visibility',v_ext.visibility,
    'character',jsonb_build_object('id',v_character->>'id','name',v_character->>'name','classId',v_character->>'classId','level',coalesce((v_character->>'level')::int,1),'bodyPresentation',coalesce(v_character->>'bodyPresentation','male'),'profileIconId',coalesce(v_character->>'profileIconId','class:'||(v_character->>'classId'))),
    'title',coalesce(v_character->>'profileTitle',v_profile.profile_title,'Adventurer'),
    'backgroundId',coalesce(v_character->>'profileBackgroundId',v_profile.profile_background_id,'asterfall-night'),
    'borderId',v_character->>'profileBorderId','petId',v_character->>'selectedCosmeticPetId',
    'bio',coalesce(v_ext.bio,''),'favoriteSkillId',v_ext.favorite_skill_id,'favoriteCompanionId',v_ext.favorite_companion_id,
    'achievementShowcaseIds',coalesce(v_ext.achievement_showcase_ids,'{}'::text[]),'collectionShowcase',coalesce(v_ext.collection_showcase,'[]'::jsonb),
    'recordShowcaseIds',coalesce(v_ext.record_showcase_ids,'{}'::text[]),'masteryShowcaseActionIds',coalesce(v_ext.mastery_showcase_action_ids,'{}'::text[]),
    'recordEntries',coalesce(v_journal->'records','{}'::jsonb),'revision',coalesce(v_ext.revision,0)
  );
end $$;

create or replace function public.profile_extension_update_v43(
  p_visibility text,
  p_world_feed_opt_out boolean,
  p_selected_character_id uuid,
  p_bio text,
  p_favorite_skill_id text,
  p_favorite_companion_id text,
  p_achievement_showcase_ids text[],
  p_collection_showcase jsonb,
  p_record_showcase_ids text[],
  p_mastery_showcase_action_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_uid uuid:=auth.uid();v_state jsonb;v_journal jsonb;v_ref jsonb;v_id text;v_bio text;v_points bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
  if p_visibility not in('public','guild','private') then raise exception 'INVALID_PROFILE_VISIBILITY';end if;
  v_bio:=regexp_replace(trim(coalesce(p_bio,'')),'[[:cntrl:]]+',' ','g');
  v_bio:=regexp_replace(v_bio,'[[:space:]]+',' ','g');
  if char_length(v_bio)>160 then raise exception 'PROFILE_BIO_TOO_LONG';end if;
  if cardinality(coalesce(p_achievement_showcase_ids,'{}'::text[]))>3
    or cardinality(coalesce(p_record_showcase_ids,'{}'::text[]))>3
    or cardinality(coalesce(p_mastery_showcase_action_ids,'{}'::text[]))>3
    or jsonb_typeof(coalesce(p_collection_showcase,'[]'::jsonb))<>'array'
    or jsonb_array_length(coalesce(p_collection_showcase,'[]'::jsonb))>3 then
    raise exception 'PROFILE_SHOWCASE_LIMIT';
  end if;

  select state into v_state from public.online_game_states where account_id=v_uid;
  select state into v_journal from private.adventurers_journal_state where account_id=v_uid;

  if p_selected_character_id is not null and not exists(select 1 from public.characters where id=p_selected_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED';end if;
  if p_favorite_skill_id is not null and not exists(
    select 1 from jsonb_array_elements(coalesce(v_state->'skills','[]'::jsonb)) row where row->>'skillId'=p_favorite_skill_id
  ) then raise exception 'SKILL_NOT_AVAILABLE';end if;
  if p_favorite_companion_id is not null and not coalesce(v_state#>'{account,unlockedCombatCompanionIds}','[]'::jsonb) @> jsonb_build_array(p_favorite_companion_id) then raise exception 'COMPANION_NOT_OWNED';end if;

  foreach v_id in array coalesce(p_achievement_showcase_ids,'{}'::text[]) loop
    if v_journal is null or not coalesce(v_journal->'unlockedAchievements','{}'::jsonb) ? v_id then raise exception 'ACHIEVEMENT_NOT_UNLOCKED';end if;
  end loop;
  foreach v_id in array coalesce(p_record_showcase_ids,'{}'::text[]) loop
    if v_journal is null or not coalesce(v_journal->'records','{}'::jsonb) ? v_id then raise exception 'RECORD_NOT_AVAILABLE';end if;
  end loop;
  foreach v_id in array coalesce(p_mastery_showcase_action_ids,'{}'::text[]) loop
    begin
      v_points:=coalesce(((coalesce(v_state#>'{account,professionMasteryByAction}','{}'::jsonb)->v_id)->>'points')::bigint,0);
    exception when others then
      v_points:=0;
    end;
    if v_points<12750 then raise exception 'MASTERY_NOT_MASTERED';end if;
  end loop;
  for v_ref in select value from jsonb_array_elements(coalesce(p_collection_showcase,'[]'::jsonb)) loop
    if not (v_ref ? 'kind' and v_ref ? 'id') or v_ref->>'kind' not in('item','pet','companion','profile_icon','background','border') then raise exception 'INVALID_COLLECTION_SHOWCASE';end if;
    if not private.profile_collection_owned_v43(v_state,v_ref->>'kind',v_ref->>'id') then raise exception 'COLLECTION_NOT_OWNED';end if;
  end loop;

  insert into public.player_profile_extensions(account_id,visibility,world_feed_opt_out,selected_character_id,bio,favorite_skill_id,favorite_companion_id,achievement_showcase_ids,collection_showcase,record_showcase_ids,mastery_showcase_action_ids,revision,updated_at)
  values(v_uid,p_visibility,coalesce(p_world_feed_opt_out,false),p_selected_character_id,v_bio,p_favorite_skill_id,p_favorite_companion_id,coalesce(p_achievement_showcase_ids,'{}'::text[]),coalesce(p_collection_showcase,'[]'::jsonb),coalesce(p_record_showcase_ids,'{}'::text[]),coalesce(p_mastery_showcase_action_ids,'{}'::text[]),1,now())
  on conflict(account_id) do update set
    visibility=excluded.visibility,world_feed_opt_out=excluded.world_feed_opt_out,selected_character_id=excluded.selected_character_id,bio=excluded.bio,
    favorite_skill_id=excluded.favorite_skill_id,favorite_companion_id=excluded.favorite_companion_id,achievement_showcase_ids=excluded.achievement_showcase_ids,
    collection_showcase=excluded.collection_showcase,record_showcase_ids=excluded.record_showcase_ids,mastery_showcase_action_ids=excluded.mastery_showcase_action_ids,
    revision=public.player_profile_extensions.revision+1,updated_at=now();

  if p_selected_character_id is not null then update public.player_profiles set active_character_id=p_selected_character_id,updated_at=now() where account_id=v_uid;end if;
  if p_visibility<>'public' or coalesce(p_world_feed_opt_out,false) then delete from public.world_milestone_feed where account_id=v_uid;end if;
  return public.profile_extension_self_v43();
end $$;

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
 values(p_account_id,v_character,'current',p_game_version,'Current equipment','online-coop-loadout-v1',g.state#>>'{character,profileIconId}',p_record->>'classId',(p_record->>'characterLevel')::integer,(p_record->>'dungeonUnlocked')::boolean,(p_record->>'legalEquipment')::boolean,p_record->'stats',p_record->'abilities',array(select jsonb_array_elements_text(p_record->'capabilities')),p_readiness,p_snapshot_hash,clock_timestamp(),true)
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


-- Batched public identity icons use the same privacy and block checks as profiles.
create or replace function public.guild_identities_v3(p_account_ids uuid[])
returns table(account_id uuid,guild_tag text,guild_tag_color_id text,player_name_style jsonb,player_badges jsonb,profile_icon_id text,class_id text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if cardinality(p_account_ids)>100 then raise exception 'TOO_MANY_IDENTITIES';end if;
 return query select b.account_id,b.guild_tag,b.guild_tag_color_id,b.player_name_style,b.player_badges,
 p.profile#>>'{character,profileIconId}',p.profile#>>'{character,classId}'
 from public.guild_identities_v2(p_account_ids) b
 cross join lateral (select public.profile_public_v43(b.account_id) as profile) p;
end $$;
revoke all on function public.guild_identities_v3(uuid[]) from public,anon;
grant execute on function public.guild_identities_v3(uuid[]) to authenticated;

commit;
