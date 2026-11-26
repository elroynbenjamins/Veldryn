-- Rollback reference only. Recheck deployed function hashes and later changes before use.
-- Restores exact pre-release definitions; never execute blindly.
CREATE OR REPLACE FUNCTION public.profile_character_public_v1(p_target_account_id uuid, p_character_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_base jsonb;
 v_id uuid;
 v_character public.characters%rowtype;
 v_game jsonb;
 v_hero jsonb;
 v_other jsonb;
 v_choices jsonb;
 v_slots public.character_profile_showcases_v1%rowtype;
 v_has_slots boolean:=false;
 v_primary boolean:=false;
begin
 v_base:=public.profile_public_v43(p_target_account_id);
 if v_base is null then return null;end if;
 v_id:=coalesce(p_character_id,nullif(v_base#>>'{character,id}','')::uuid);
 select * into v_character from public.characters c
 where c.id=v_id and c.account_id=p_target_account_id;
 if not found then return null;end if;
 v_primary:=v_base#>>'{character,id}'=v_id::text;
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,'name',c.name,'classId',c.class_id,'level',c.level)
  order by c.created_at,c.id),'[]'::jsonb)
 into v_choices from public.characters c where c.account_id=p_target_account_id;
 select state into v_game from public.online_game_states where account_id=p_target_account_id;
 if v_game#>>'{character,id}'=v_id::text then
  v_hero:=v_game->'character';
 else
  for v_other in select value from jsonb_array_elements(
   case when jsonb_typeof(v_game->'otherCharacters')='array'
    then v_game->'otherCharacters' else '[]'::jsonb end)
  loop
   if v_other#>>'{character,id}'=v_id::text then
    v_hero:=v_other->'character';exit;
   end if;
  end loop;
 end if;
 select * into v_slots from public.character_profile_showcases_v1
 where character_id=v_id and account_id=p_target_account_id;
 v_has_slots:=found;
 return v_base || jsonb_build_object(
  'characterChoices',v_choices,
  'character',jsonb_build_object(
   'id',v_id,'name',coalesce(nullif(v_hero->>'name',''),v_character.name),
   'classId',coalesce(nullif(v_hero->>'classId',''),v_character.class_id),
   'level',coalesce(nullif(v_hero->>'level','')::integer,v_character.level,1),
   'bodyPresentation',coalesce(nullif(v_hero->>'bodyPresentation',''),v_character.body_presentation,'male'),
   'profileIconId',coalesce(nullif(v_hero->>'profileIconId',''),
      nullif(v_character.customization->>'profileIconId',''),'default'),
   'selectedSkinId',coalesce(nullif(v_hero->>'selectedSkinId',''),'starting')),
  'title',coalesce(nullif(v_hero->>'profileTitle',''),v_character.profile_title,'Adventurer'),
  'backgroundId',coalesce(nullif(v_hero->>'profileBackgroundId',''),
    v_character.profile_background_id,'asterfall-night'),
  'borderId',nullif(v_hero->>'profileBorderId',''),
  'effectId',nullif(v_hero->>'profileEffectId',''),
  'petId',nullif(v_hero->>'selectedCosmeticPetId',''),
  'favoriteSkillId',case when v_has_slots then v_slots.favorite_skill_id
    when v_primary then v_base->>'favoriteSkillId' else null end,
  'favoriteCompanionId',case when v_has_slots then v_slots.favorite_companion_id
    when v_primary then v_base->>'favoriteCompanionId' else null end,
  'achievementShowcaseIds',case when v_has_slots then to_jsonb(v_slots.achievement_showcase_ids)
    when v_primary then coalesce(v_base->'achievementShowcaseIds','[]'::jsonb) else '[]'::jsonb end,
  'collectionShowcase',case when v_has_slots then v_slots.collection_showcase
    when v_primary then coalesce(v_base->'collectionShowcase','[]'::jsonb) else '[]'::jsonb end,
  'recordShowcaseIds',case when v_has_slots then to_jsonb(v_slots.record_showcase_ids)
    when v_primary then coalesce(v_base->'recordShowcaseIds','[]'::jsonb) else '[]'::jsonb end,
  'masteryShowcaseActionIds',case when v_has_slots then to_jsonb(v_slots.mastery_showcase_action_ids)
    when v_primary then coalesce(v_base->'masteryShowcaseActionIds','[]'::jsonb) else '[]'::jsonb end
 );
end $function$;

CREATE OR REPLACE FUNCTION public.profile_public_v43(p_target_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
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
  if v_journal is null then v_journal := v_game#>'{account,journalState}'; end if;
  -- Object-key membership only: malformed arrays/scalars cannot grant ownership.
  v_journal := jsonb_build_object(
   'unlockedAchievements',case when jsonb_typeof(v_journal->'unlockedAchievements')='object' then v_journal->'unlockedAchievements' else '{}'::jsonb end,
   'records',case when jsonb_typeof(v_journal->'records')='object' then v_journal->'records' else '{}'::jsonb end
  );
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
    'borderId',v_character->>'profileBorderId','effectId',v_character->>'profileEffectId','petId',v_character->>'selectedCosmeticPetId',
    'cosmeticsPreview',coalesce(v_game#>'{account,entitlements,profile_cosmetics_tester_v1}','false'::jsonb)='true'::jsonb,
    'bio',coalesce(v_ext.bio,''),'favoriteSkillId',v_ext.favorite_skill_id,'favoriteCompanionId',v_ext.favorite_companion_id,
    'achievementShowcaseIds',coalesce(v_ext.achievement_showcase_ids,'{}'::text[]),'collectionShowcase',coalesce(v_ext.collection_showcase,'[]'::jsonb),
    'recordShowcaseIds',coalesce(v_ext.record_showcase_ids,'{}'::text[]),'masteryShowcaseActionIds',coalesce(v_ext.mastery_showcase_action_ids,'{}'::text[]),
    'recordEntries',coalesce(v_journal->'records','{}'::jsonb),'revision',coalesce(v_ext.revision,0)
  );
end $function$;
