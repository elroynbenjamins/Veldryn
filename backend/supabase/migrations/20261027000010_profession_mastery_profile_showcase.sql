begin;

alter table public.player_profile_extensions
  add column if not exists mastery_showcase_action_ids text[] not null default '{}'::text[];

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conrelid='public.player_profile_extensions'::regclass
      and conname='player_profile_extensions_mastery_showcase_limit'
  ) then
    alter table public.player_profile_extensions
      add constraint player_profile_extensions_mastery_showcase_limit
      check(cardinality(mastery_showcase_action_ids)<=3);
  end if;
end $$;

create or replace function public.profile_extension_self_v43()
returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare v_uid uuid:=auth.uid();v_row public.player_profile_extensions%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  insert into public.player_profile_extensions(account_id) values(v_uid) on conflict(account_id) do nothing;
  select * into v_row from public.player_profile_extensions where account_id=v_uid;
  return jsonb_build_object(
    'accountId',v_row.account_id,'visibility',v_row.visibility,'worldFeedOptOut',v_row.world_feed_opt_out,
    'selectedCharacterId',v_row.selected_character_id,'bio',v_row.bio,'favoriteSkillId',v_row.favorite_skill_id,
    'favoriteCompanionId',v_row.favorite_companion_id,'achievementShowcaseIds',v_row.achievement_showcase_ids,
    'collectionShowcase',v_row.collection_showcase,'recordShowcaseIds',v_row.record_showcase_ids,
    'masteryShowcaseActionIds',v_row.mastery_showcase_action_ids,
    'revision',v_row.revision,'updatedAt',v_row.updated_at
  );
end $$;

drop function if exists public.profile_extension_update_v43(text,boolean,uuid,text,text,text,text[],jsonb,text[]);

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
    if not (v_ref ? 'kind' and v_ref ? 'id') or v_ref->>'kind' not in('item','pet','companion','skin','background','border') then raise exception 'INVALID_COLLECTION_SHOWCASE';end if;
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
    select jsonb_build_object('id',c.id,'name',c.name,'classId',c.class_id,'level',c.level,'bodyPresentation',c.body_presentation,'profileTitle',c.profile_title,'profileBackgroundId',c.profile_background_id,'selectedSkinId','starting')
    into v_character from public.characters c where c.account_id=p_target_account_id order by (c.id=v_selected) desc,c.level desc,c.updated_at desc limit 1;
  end if;
  if v_character is null then return null;end if;

  return jsonb_build_object(
    'accountId',p_target_account_id,'displayName',coalesce(nullif(v_profile.display_name,''),v_character->>'name','Adventurer'),'visibility',v_ext.visibility,
    'character',jsonb_build_object('id',v_character->>'id','name',v_character->>'name','classId',v_character->>'classId','level',coalesce((v_character->>'level')::int,1),'bodyPresentation',coalesce(v_character->>'bodyPresentation','male'),'selectedSkinId',coalesce(v_character->>'selectedSkinId','starting')),
    'title',coalesce(v_character->>'profileTitle',v_profile.profile_title,'Adventurer'),
    'backgroundId',coalesce(v_character->>'profileBackgroundId',v_profile.profile_background_id,'asterfall-night'),
    'borderId',v_character->>'profileBorderId','petId',v_character->>'selectedCosmeticPetId',
    'bio',coalesce(v_ext.bio,''),'favoriteSkillId',v_ext.favorite_skill_id,'favoriteCompanionId',v_ext.favorite_companion_id,
    'achievementShowcaseIds',coalesce(v_ext.achievement_showcase_ids,'{}'::text[]),'collectionShowcase',coalesce(v_ext.collection_showcase,'[]'::jsonb),
    'recordShowcaseIds',coalesce(v_ext.record_showcase_ids,'{}'::text[]),'masteryShowcaseActionIds',coalesce(v_ext.mastery_showcase_action_ids,'{}'::text[]),
    'recordEntries',coalesce(v_journal->'records','{}'::jsonb),'revision',coalesce(v_ext.revision,0)
  );
end $$;

revoke all on function public.profile_extension_self_v43() from public,anon;
revoke all on function public.profile_extension_update_v43(text,boolean,uuid,text,text,text,text[],jsonb,text[],text[]) from public,anon;
revoke all on function public.profile_public_v43(uuid) from public,anon;
grant execute on function public.profile_extension_self_v43() to authenticated;
grant execute on function public.profile_extension_update_v43(text,boolean,uuid,text,text,text,text[],jsonb,text[],text[]) to authenticated;
grant execute on function public.profile_public_v43(uuid) to authenticated;

commit;
