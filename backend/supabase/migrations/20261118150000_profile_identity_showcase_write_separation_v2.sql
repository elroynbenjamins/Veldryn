-- Profile 2.0 safety refinement: independent account identity, independent hero showcases,
-- and explicit featured-hero selection. None of these operations changes gameplay's active hero.
-- All writes are owner-scoped, validated, and restricted to authenticated users.

create or replace function public.profile_identity_update_v2(
 p_visibility text,p_world_feed_opt_out boolean,p_bio text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();
 v_bio text:=regexp_replace(btrim(coalesce(p_bio,'')),'[[:cntrl:]]+',' ','g');
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 if p_visibility not in ('public','guild','private') then raise exception 'INVALID_PROFILE_VISIBILITY';end if;
 v_bio:=regexp_replace(v_bio,'[[:space:]]+',' ','g');
 if char_length(v_bio)>160 then raise exception 'PROFILE_BIO_TOO_LONG';end if;
 insert into public.player_profile_extensions(account_id,visibility,world_feed_opt_out,bio)
 values(v_uid,p_visibility,coalesce(p_world_feed_opt_out,false),v_bio)
 on conflict (account_id) do update set
  visibility=excluded.visibility,
  world_feed_opt_out=excluded.world_feed_opt_out,
  bio=excluded.bio,
  revision=public.player_profile_extensions.revision+1,
  updated_at=now();
 if p_visibility<>'public' or coalesce(p_world_feed_opt_out,false)
 then delete from public.world_milestone_feed where account_id=v_uid;end if;
 return public.profile_extension_self_v43();
end $$;

create or replace function public.profile_character_showcase_update_v2(
 p_character_id uuid,
 p_favorite_skill_id text,
 p_favorite_companion_id text,
 p_achievement_showcase_ids text[],
 p_collection_showcase jsonb,
 p_record_showcase_ids text[],
 p_mastery_showcase_action_ids text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();
 v_state jsonb;
 v_hero jsonb;
 v_skills jsonb:='[]'::jsonb;
 v_alt jsonb;
 v_journal jsonb;
 v_id text;
 v_ref jsonb;
 v_kind text;
 v_icon text;
 v_points bigint;
 v_owned_icon boolean;
 v_selected uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 if p_character_id is null or not exists(
  select 1 from public.characters where account_id=v_uid and id=p_character_id)
 then raise exception 'CHARACTER_NOT_OWNED';end if;

 if cardinality(coalesce(p_achievement_showcase_ids,'{}'::text[]))>3
  or cardinality(coalesce(p_record_showcase_ids,'{}'::text[]))>3
  or cardinality(coalesce(p_mastery_showcase_action_ids,'{}'::text[]))>3
  or jsonb_typeof(coalesce(p_collection_showcase,'[]'::jsonb))<>'array'
  or jsonb_array_length(coalesce(p_collection_showcase,'[]'::jsonb))>3
 then raise exception 'PROFILE_SHOWCASE_LIMIT';end if;
 if exists(select 1 from unnest(coalesce(p_achievement_showcase_ids,'{}'::text[])) id where id is null or id='')
  or exists(select 1 from unnest(coalesce(p_record_showcase_ids,'{}'::text[])) id where id is null or id='')
  or exists(select 1 from unnest(coalesce(p_mastery_showcase_action_ids,'{}'::text[])) id where id is null or id='')
 then raise exception 'INVALID_SHOWCASE_ITEM';end if;

 select state into v_state from public.online_game_states where account_id=v_uid;
 select state into v_journal from private.adventurers_journal_state where account_id=v_uid;
 if v_state#>>'{character,id}'=p_character_id::text then
  v_hero:=v_state->'character';
  v_skills:=coalesce(v_state->'skills','[]'::jsonb);
 else
  for v_alt in select value from jsonb_array_elements(
   case when jsonb_typeof(v_state->'otherCharacters')='array' then v_state->'otherCharacters' else '[]'::jsonb end)
  loop
   if v_alt#>>'{character,id}'=p_character_id::text then
    v_hero:=v_alt->'character';
    v_skills:=coalesce(v_alt->'skills','[]'::jsonb);
    exit;
   end if;
  end loop;
 end if;
 if jsonb_typeof(v_skills)<>'array' then v_skills:='[]'::jsonb;end if;
 if p_favorite_skill_id is not null and not exists(
  select 1 from jsonb_array_elements(v_skills) s where s->>'skillId'=p_favorite_skill_id)
 then raise exception 'SKILL_NOT_AVAILABLE';end if;
 if p_favorite_companion_id is not null and not
   coalesce(v_state#>'{account,unlockedCombatCompanionIds}','[]'::jsonb)
    @> jsonb_build_array(p_favorite_companion_id)
 then raise exception 'COMPANION_NOT_OWNED';end if;

 foreach v_id in array coalesce(p_achievement_showcase_ids,'{}'::text[]) loop
  if v_journal is null or not coalesce(v_journal->'unlockedAchievements','{}'::jsonb) ? v_id
  then raise exception 'ACHIEVEMENT_NOT_UNLOCKED';end if;
 end loop;
 foreach v_id in array coalesce(p_record_showcase_ids,'{}'::text[]) loop
  if v_journal is null or not coalesce(v_journal->'records','{}'::jsonb) ? v_id
  then raise exception 'RECORD_NOT_AVAILABLE';end if;
 end loop;
 foreach v_id in array coalesce(p_mastery_showcase_action_ids,'{}'::text[]) loop
  begin
   v_points:=coalesce(((coalesce(v_state#>'{account,professionMasteryByAction}','{}'::jsonb)->v_id)->>'points')::bigint,0);
  exception when others then v_points:=0;
  end;
  if v_points<12750 then raise exception 'MASTERY_NOT_MASTERED';end if;
 end loop;

 for v_ref in select value from jsonb_array_elements(coalesce(p_collection_showcase,'[]'::jsonb)) loop
  if jsonb_typeof(v_ref)<>'object' or not (v_ref ? 'kind' and v_ref ? 'id')
    or jsonb_typeof(v_ref->'kind')<>'string' or jsonb_typeof(v_ref->'id')<>'string'
  then raise exception 'INVALID_COLLECTION_SHOWCASE';end if;
  v_kind:=v_ref->>'kind';v_id:=v_ref->>'id';
  if char_length(v_id) not between 1 and 160
  then raise exception 'INVALID_COLLECTION_SHOWCASE';end if;
  if v_kind='profile_icon' then
   -- Starter and an owned class portrait are always legal. Other icons must be
   -- explicitly owned, already equipped, or earned by the Fallen Knight milestone.
   v_owned_icon:=coalesce(v_state#>'{account,unlockedProfileIconIds}','[]'::jsonb) @> jsonb_build_array(v_id)
      or v_id=any(array[
        'starter:hooded-ranger','starter:armored-sentinel','starter:masked-spellcaster',
        'starter:traveling-alchemist','starter:dawn-priestess',
        'starter:stonebound-explorer','starter:gilded-duelist','starter:runic-scholar',
        'starter:dune-warden'])
      or exists(select 1 from public.characters c
        where c.account_id=v_uid and v_id='class:'||c.class_id)
      or v_hero->>'profileIconId'=v_id
      or (v_id='creature:FALLEN_KNIGHT' and coalesce(v_state->'defeatedBossIds','[]'::jsonb)
           @> '["FALLEN_KNIGHT"]'::jsonb);
   if not v_owned_icon then raise exception 'COLLECTION_NOT_OWNED';end if;
  elsif v_kind in ('item','pet','companion','skin','background','border') then
   if not private.profile_collection_owned_v43(v_state,v_kind,v_id)
   then raise exception 'COLLECTION_NOT_OWNED';end if;
  else
   raise exception 'INVALID_COLLECTION_SHOWCASE';
  end if;
 end loop;

 -- Serialise a single account's showcase changes with featured-character changes.
 perform pg_advisory_xact_lock(hashtextextended('veldryn:showcase:'||v_uid::text,0));
 insert into public.character_profile_showcases_v1(
  character_id,account_id,favorite_skill_id,favorite_companion_id,
  achievement_showcase_ids,collection_showcase,record_showcase_ids,mastery_showcase_action_ids)
 values(p_character_id,v_uid,p_favorite_skill_id,p_favorite_companion_id,
  coalesce(p_achievement_showcase_ids,'{}'::text[]),coalesce(p_collection_showcase,'[]'::jsonb),
  coalesce(p_record_showcase_ids,'{}'::text[]),coalesce(p_mastery_showcase_action_ids,'{}'::text[]))
 on conflict(character_id) do update set
  favorite_skill_id=excluded.favorite_skill_id,
  favorite_companion_id=excluded.favorite_companion_id,
  achievement_showcase_ids=excluded.achievement_showcase_ids,
  collection_showcase=excluded.collection_showcase,
  record_showcase_ids=excluded.record_showcase_ids,
  mastery_showcase_action_ids=excluded.mastery_showcase_action_ids,
  updated_at=now()
 where public.character_profile_showcases_v1.account_id=v_uid;

 select selected_character_id into v_selected
  from public.player_profile_extensions where account_id=v_uid for update;
 if v_selected=p_character_id then
  update public.player_profile_extensions set
   favorite_skill_id=p_favorite_skill_id,
   favorite_companion_id=p_favorite_companion_id,
   achievement_showcase_ids=coalesce(p_achievement_showcase_ids,'{}'::text[]),
   collection_showcase=coalesce(p_collection_showcase,'[]'::jsonb),
   record_showcase_ids=coalesce(p_record_showcase_ids,'{}'::text[]),
   mastery_showcase_action_ids=coalesce(p_mastery_showcase_action_ids,'{}'::text[]),
   revision=revision+1,updated_at=now()
  where account_id=v_uid;
 end if;
 return public.character_showcase_self_v1(p_character_id);
end $$;

create or replace function public.profile_featured_character_update_v2(p_character_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();
 v_slots public.character_profile_showcases_v1%rowtype;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 if p_character_id is null or not exists(
  select 1 from public.characters where account_id=v_uid and id=p_character_id)
 then raise exception 'CHARACTER_NOT_OWNED';end if;
 perform pg_advisory_xact_lock(hashtextextended('veldryn:showcase:'||v_uid::text,0));
 select * into v_slots from public.character_profile_showcases_v1
  where account_id=v_uid and character_id=p_character_id;
 insert into public.player_profile_extensions(account_id,selected_character_id,
  favorite_skill_id,favorite_companion_id,achievement_showcase_ids,collection_showcase,
  record_showcase_ids,mastery_showcase_action_ids)
 values(v_uid,p_character_id,v_slots.favorite_skill_id,v_slots.favorite_companion_id,
  coalesce(v_slots.achievement_showcase_ids,'{}'::text[]),
  coalesce(v_slots.collection_showcase,'[]'::jsonb),
  coalesce(v_slots.record_showcase_ids,'{}'::text[]),
  coalesce(v_slots.mastery_showcase_action_ids,'{}'::text[]))
 on conflict(account_id) do update set
  selected_character_id=excluded.selected_character_id,
  favorite_skill_id=excluded.favorite_skill_id,
  favorite_companion_id=excluded.favorite_companion_id,
  achievement_showcase_ids=excluded.achievement_showcase_ids,
  collection_showcase=excluded.collection_showcase,
  record_showcase_ids=excluded.record_showcase_ids,
  mastery_showcase_action_ids=excluded.mastery_showcase_action_ids,
  revision=public.player_profile_extensions.revision+1,updated_at=now();
 return public.profile_extension_self_v43();
end $$;

-- Remove accidental gameplay character switching from the legacy profile API, while
-- leaving its existing profile validation and backwards-compatible response intact.
do $patch$
declare
 v_def text:=pg_get_functiondef(
  'public.profile_extension_update_v43(text,boolean,uuid,text,text,text,text[],jsonb,text[],text[])'::regprocedure);
 v_old text:='if p_selected_character_id is not null then update public.player_profiles set active_character_id=p_selected_character_id,updated_at=now() where account_id=v_uid;end if;';
begin
 if position(v_old in v_def)>0 then
  execute replace(v_def,v_old,'null; -- A profile save must not switch the active gameplay character.');
 elsif position('A profile save must not switch the active gameplay character' in v_def)=0 then
  raise exception 'profile_extension_legacy_switch_contract_drift';
 end if;
end $patch$;

revoke all on function public.profile_identity_update_v2(text,boolean,text) from public,anon,authenticated;
grant execute on function public.profile_identity_update_v2(text,boolean,text) to authenticated;
revoke all on function public.profile_character_showcase_update_v2(uuid,text,text,text[],jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.profile_character_showcase_update_v2(uuid,text,text,text[],jsonb,text[],text[]) to authenticated;
revoke all on function public.profile_featured_character_update_v2(uuid) from public,anon,authenticated;
grant execute on function public.profile_featured_character_update_v2(uuid) to authenticated;
