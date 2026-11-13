-- Read-only, privacy-aware equipped gear for the selected public-profile character.
-- Never returns inventory, ownership identifiers, or raw game state.
begin;

create or replace function public.profile_equipped_gear_v1(p_target_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_profile jsonb;
  v_game jsonb;
  v_character jsonb;
  v_other jsonb;
  v_slot text;
  v_item_id text;
  v_instance_id text;
  v_instance jsonb;
  v_enhancement jsonb;
  v_rows jsonb:='[]'::jsonb;
begin
  -- Reuse all existing block, guild, private, and authenticated-viewer checks.
  v_profile:=public.profile_public_v43(p_target_account_id);
  if v_profile is null then return null;end if;

  select state into v_game from public.online_game_states where account_id=p_target_account_id;
  if v_game#>>'{character,id}'=v_profile#>>'{character,id}' then
    v_character:=v_game->'character';
  else
    for v_other in select value from jsonb_array_elements(
      case when jsonb_typeof(v_game->'otherCharacters')='array' then v_game->'otherCharacters' else '[]'::jsonb end
    ) loop
      if v_other#>>'{character,id}'=v_profile#>>'{character,id}' then
        v_character:=v_other->'character';
        exit;
      end if;
    end loop;
  end if;

  -- Older accounts may only have a character equipment snapshot.
  if v_character is null then
    select jsonb_build_object('equipment',coalesce(c.equipment,'{}'::jsonb))
      into v_character from public.characters c
      where c.account_id=p_target_account_id and c.id::text=v_profile#>>'{character,id}'
      limit 1;
  end if;
  if v_character is null then return jsonb_build_object('characterId',v_profile#>>'{character,id}','items','[]'::jsonb);end if;

  foreach v_slot in array array['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'] loop
    v_item_id:=nullif(v_character->'equipment'->>v_slot,'');
    if v_item_id is null then continue;end if;

    v_instance:=null;
    v_instance_id:=nullif(v_character->'equipmentInstanceIds'->>v_slot,'');
    if v_instance_id is not null then
      select entry.value into v_instance
      from jsonb_array_elements(
        case when jsonb_typeof(v_game#>'{account,craftedGearInstances}')='array'
          then v_game#>'{account,craftedGearInstances}' else '[]'::jsonb end
      ) as entry(value)
      where entry.value->>'id'=v_instance_id and entry.value->>'itemId'=v_item_id
        and entry.value->>'ownerCharacterId'=v_profile#>>'{character,id}'
      limit 1;
    end if;
    v_enhancement:=coalesce(v_instance->'enhancement',v_character->'gearEnhancements'->v_item_id,'{}'::jsonb);
    v_rows:=v_rows||jsonb_build_array(jsonb_build_object(
      'slot',v_slot,'itemId',v_item_id,
      'rarity',v_instance->>'rarity','quality',v_instance->'quality',
      'rank',v_enhancement->'rank',
      'statGemId',v_enhancement->>'statGemId',
      'effectGemId',v_enhancement->>'effectGemId',
      'gemIds',case when jsonb_typeof(v_enhancement->'gemIds')='array' then v_enhancement->'gemIds' else '[]'::jsonb end
    ));
  end loop;
  return jsonb_build_object('characterId',v_profile#>>'{character,id}','items',v_rows);
end $$;

revoke all on function public.profile_equipped_gear_v1(uuid) from public,anon;
grant execute on function public.profile_equipped_gear_v1(uuid) to authenticated;
commit;
