-- Current-version public equipment inspection. Staging migration version verified.
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
  if auth.uid() is null then return null;end if;
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
      if (select count(*) from jsonb_array_elements(case when jsonb_typeof(v_game#>'{account,craftedGearInstances}')='array' then v_game#>'{account,craftedGearInstances}' else '[]'::jsonb end) e where e->>'id'=v_instance_id)<>1 then v_instance:=null;end if;
    end if;
    v_enhancement:=case when v_instance_id is not null then coalesce(v_instance->'enhancement','{}'::jsonb)
      else coalesce(v_character->'gearEnhancements'->v_item_id,'{}'::jsonb) end;
    v_rows:=v_rows||jsonb_build_array(jsonb_build_object(
      'slot',v_slot,'itemId',v_item_id,
      'rarity',v_instance->>'rarity','quality',case when jsonb_typeof(v_instance->'quality')='number' then v_instance->'quality' end,
    'inspectionKnown',v_character ? 'id' and (v_instance_id is null or (v_instance is not null and jsonb_typeof(v_instance->'enhancement')='object')),
    'weaponBonusRollVersion',case when jsonb_typeof(v_instance->'weaponBonusRollVersion')='number' then v_instance->'weaponBonusRollVersion' end,
    'equipmentBonusRollVersion',case when jsonb_typeof(v_instance->'equipmentBonusRollVersion')='number' then v_instance->'equipmentBonusRollVersion' end,
    'weaponBonuses',(select coalesce(jsonb_agg(jsonb_build_object('stat',r->'stat','basisPoints',r->'basisPoints')),'[]'::jsonb) from (select value as r from jsonb_array_elements(case when jsonb_typeof(v_instance->'weaponBonuses')='array' then v_instance->'weaponBonuses' else '[]'::jsonb end) limit 2) b where jsonb_typeof(r->'stat')='string' and jsonb_typeof(r->'basisPoints')='number'),
    'equipmentBonuses',(select coalesce(jsonb_agg(jsonb_build_object('stat',r->'stat','basisPoints',r->'basisPoints')),'[]'::jsonb) from (select value as r from jsonb_array_elements(case when jsonb_typeof(v_instance->'equipmentBonuses')='array' then v_instance->'equipmentBonuses' else '[]'::jsonb end) limit 2) b where jsonb_typeof(r->'stat')='string' and jsonb_typeof(r->'basisPoints')='number'),
    'statGemRollPercent',case when jsonb_typeof(v_enhancement->'statGemRollPercent')='number' then v_enhancement->'statGemRollPercent' end,
    'effectGemRollPercent',case when jsonb_typeof(v_enhancement->'effectGemRollPercent')='number' then v_enhancement->'effectGemRollPercent' end,
      'rank',case when jsonb_typeof(v_enhancement->'rank')='number' then v_enhancement->'rank' end,
      'statGemId',v_enhancement->>'statGemId',
      'effectGemId',v_enhancement->>'effectGemId',
      'gemIds',(select coalesce(jsonb_agg(g),'[]'::jsonb) from (select value as g from jsonb_array_elements(case when jsonb_typeof(v_enhancement->'gemIds')='array' then v_enhancement->'gemIds' else '[]'::jsonb end) with ordinality as e(value,ord) where jsonb_typeof(value)='string' order by ord limit 2) bounded)
    ));
  end loop;
  return jsonb_build_object('characterId',v_profile#>>'{character,id}','items',v_rows);
end $$;

revoke all on function public.profile_equipped_gear_v1(uuid) from public,anon;
grant execute on function public.profile_equipped_gear_v1(uuid) to authenticated;

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
  if auth.uid() is null then return null;end if;
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
   if (select count(*) from jsonb_array_elements(case when jsonb_typeof(v_game#>'{account,craftedGearInstances}')='array' then v_game#>'{account,craftedGearInstances}' else '[]'::jsonb end) e where e->>'id'=v_instance_id)<>1 then v_instance:=null;end if;
  end if;
  v_enhancement:=case when v_instance_id is not null then coalesce(v_instance->'enhancement','{}'::jsonb)
      else coalesce(v_character->'gearEnhancements'->v_item_id,'{}'::jsonb) end;
  v_rows:=v_rows||jsonb_build_array(jsonb_build_object(
    'slot',v_slot,'itemId',v_item_id,
    'rarity',v_instance->>'rarity','quality',case when jsonb_typeof(v_instance->'quality')='number' then v_instance->'quality' end,
    'inspectionKnown',v_character ? 'id' and (v_instance_id is null or (v_instance is not null and jsonb_typeof(v_instance->'enhancement')='object')),
    'weaponBonusRollVersion',case when jsonb_typeof(v_instance->'weaponBonusRollVersion')='number' then v_instance->'weaponBonusRollVersion' end,
    'equipmentBonusRollVersion',case when jsonb_typeof(v_instance->'equipmentBonusRollVersion')='number' then v_instance->'equipmentBonusRollVersion' end,
    'weaponBonuses',(select coalesce(jsonb_agg(jsonb_build_object('stat',r->'stat','basisPoints',r->'basisPoints')),'[]'::jsonb) from (select value as r from jsonb_array_elements(case when jsonb_typeof(v_instance->'weaponBonuses')='array' then v_instance->'weaponBonuses' else '[]'::jsonb end) limit 2) b where jsonb_typeof(r->'stat')='string' and jsonb_typeof(r->'basisPoints')='number'),
    'equipmentBonuses',(select coalesce(jsonb_agg(jsonb_build_object('stat',r->'stat','basisPoints',r->'basisPoints')),'[]'::jsonb) from (select value as r from jsonb_array_elements(case when jsonb_typeof(v_instance->'equipmentBonuses')='array' then v_instance->'equipmentBonuses' else '[]'::jsonb end) limit 2) b where jsonb_typeof(r->'stat')='string' and jsonb_typeof(r->'basisPoints')='number'),
    'statGemRollPercent',case when jsonb_typeof(v_enhancement->'statGemRollPercent')='number' then v_enhancement->'statGemRollPercent' end,
    'effectGemRollPercent',case when jsonb_typeof(v_enhancement->'effectGemRollPercent')='number' then v_enhancement->'effectGemRollPercent' end,
    'rank',case when jsonb_typeof(v_enhancement->'rank')='number' then v_enhancement->'rank' end,
    'statGemId',v_enhancement->>'statGemId',
    'effectGemId',v_enhancement->>'effectGemId',
    'gemIds',(select coalesce(jsonb_agg(g),'[]'::jsonb) from (select value as g from jsonb_array_elements(case when jsonb_typeof(v_enhancement->'gemIds')='array' then v_enhancement->'gemIds' else '[]'::jsonb end) with ordinality as e(value,ord) where jsonb_typeof(value)='string' order by ord limit 2) bounded)));
 end loop;
 return jsonb_build_object('characterId',v_id,'items',v_rows);
end $$;
revoke all on function public.profile_character_gear_v1(uuid,uuid)
 from public,anon,authenticated;
grant execute on function public.profile_character_gear_v1(uuid,uuid) to authenticated;

commit;
