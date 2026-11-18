-- Public character gallery: the account social name stays fixed while visitors browse
-- character-specific profile art, stats, equipment, and showcase slots.
-- Authorization is delegated to the existing public profile visibility/blocking gate.
create or replace function public.profile_character_public_v1(
 p_target_account_id uuid,p_character_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
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
end $$;
revoke all on function public.profile_character_public_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.profile_character_public_v1(uuid,uuid) to authenticated;

-- Sanitized item facts for any authorized hero. Do not reuse the featured hero's
-- combat stats or equipment when a visitor selects an alternative character.
create or replace function public.profile_character_gear_v1(
 p_target_account_id uuid,p_character_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_profile jsonb;
 v_game jsonb;
 v_character jsonb;
 v_other jsonb;
 v_id text;
 v_slot text;
 v_item_id text;
 v_instance_id text;
 v_instance jsonb;
 v_enhancement jsonb;
 v_rows jsonb:='[]'::jsonb;
begin
 v_profile:=public.profile_character_public_v1(p_target_account_id,p_character_id);
 if v_profile is null then return null;end if;
 v_id:=v_profile#>>'{character,id}';
 select state into v_game from public.online_game_states where account_id=p_target_account_id;
 if v_game#>>'{character,id}'=v_id then
  v_character:=v_game->'character';
 else
  for v_other in select value from jsonb_array_elements(
   case when jsonb_typeof(v_game->'otherCharacters')='array'
    then v_game->'otherCharacters' else '[]'::jsonb end)
  loop
   if v_other#>>'{character,id}'=v_id then
    v_character:=v_other->'character';exit;
   end if;
  end loop;
 end if;
 if v_character is null then
  select jsonb_build_object('equipment',coalesce(c.equipment,'{}'::jsonb))
  into v_character from public.characters c
  where c.account_id=p_target_account_id and c.id::text=v_id limit 1;
 end if;
 if v_character is null then
  return jsonb_build_object('characterId',v_id,'items','[]'::jsonb);
 end if;
 foreach v_slot in array array['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring']
 loop
  v_item_id:=nullif(v_character->'equipment'->>v_slot,'');
  if v_item_id is null then continue;end if;
  v_instance:=null;
  v_instance_id:=nullif(v_character->'equipmentInstanceIds'->>v_slot,'');
  if v_instance_id is not null then
   select entry.value into v_instance from jsonb_array_elements(
     case when jsonb_typeof(v_game#>'{account,craftedGearInstances}')='array'
      then v_game#>'{account,craftedGearInstances}' else '[]'::jsonb end) as entry(value)
   where entry.value->>'id'=v_instance_id and entry.value->>'itemId'=v_item_id
    and entry.value->>'ownerCharacterId'=v_id limit 1;
  end if;
  v_enhancement:=coalesce(v_instance->'enhancement',
     v_character->'gearEnhancements'->v_item_id,'{}'::jsonb);
  v_rows:=v_rows||jsonb_build_array(jsonb_build_object(
    'slot',v_slot,'itemId',v_item_id,
    'rarity',v_instance->>'rarity','quality',v_instance->'quality',
    'rank',v_enhancement->'rank',
    'statGemId',v_enhancement->>'statGemId',
    'effectGemId',v_enhancement->>'effectGemId',
    'gemIds',case when jsonb_typeof(v_enhancement->'gemIds')='array'
      then v_enhancement->'gemIds' else '[]'::jsonb end));
 end loop;
 return jsonb_build_object('characterId',v_id,'items',v_rows);
end $$;
revoke all on function public.profile_character_gear_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.profile_character_gear_v1(uuid,uuid) to authenticated;
