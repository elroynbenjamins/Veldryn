-- Server-ready gathering tool loadouts. Tool slots reuse the authoritative
-- item-instance equip flow and remain separate from visible combat equipment.

alter table public.item_instances drop constraint if exists item_instances_equipped_slot_check;
alter table public.item_instances add constraint item_instances_equipped_slot_check
check (equipped_slot is null or equipped_slot in (
  'weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring',
  'tool_mining','tool_woodcutting','tool_fishing'
));

create or replace function public.equip_item_instance(p_character_id uuid,p_item_instance_id uuid,p_slot text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_item public.item_instances%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_slot not in ('weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring','tool_mining','tool_woodcutting','tool_fishing') then raise exception 'INVALID_EQUIPMENT_SLOT'; end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED'; end if;
  select * into v_item from public.item_instances where id=p_item_instance_id and character_id=p_character_id for update;
  if not found then raise exception 'ITEM_NOT_OWNED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_character_id::text,0));
  update public.item_instances set equipped_slot=null where character_id=p_character_id and equipped_slot=p_slot;
  update public.item_instances set equipped_slot=p_slot where id=p_item_instance_id;
  update public.characters set equipment=jsonb_set(coalesce(equipment,'{}'::jsonb),array[p_slot],to_jsonb(v_item.item_id),true),updated_at=now() where id=p_character_id;
  return jsonb_build_object('characterId',p_character_id,'itemInstanceId',p_item_instance_id,'itemId',v_item.item_id,'slot',p_slot);
end;
$$;

create or replace function public.unequip_item_slot(p_character_id uuid,p_slot text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_slot not in ('weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring','tool_mining','tool_woodcutting','tool_fishing') then raise exception 'INVALID_EQUIPMENT_SLOT'; end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_character_id::text,0));
  update public.item_instances set equipped_slot=null where character_id=p_character_id and equipped_slot=p_slot;
  update public.characters set equipment=coalesce(equipment,'{}'::jsonb)-p_slot,updated_at=now() where id=p_character_id;
  return jsonb_build_object('characterId',p_character_id,'slot',p_slot,'unequipped',true);
end;
$$;

revoke all on function public.equip_item_instance(uuid,uuid,text) from public;
revoke all on function public.unequip_item_slot(uuid,text) from public;
grant execute on function public.equip_item_instance(uuid,uuid,text) to authenticated;
grant execute on function public.unequip_item_slot(uuid,text) to authenticated;
