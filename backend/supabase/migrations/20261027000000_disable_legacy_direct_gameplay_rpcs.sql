-- Legacy direct-mutation RPCs are superseded by the authoritative gameplay Edge Function.
-- Normal authenticated clients must express intent through /functions/v1/gameplay instead.
revoke execute on function public.claim_gathering_activity(uuid,text) from public, anon, authenticated;
revoke execute on function public.start_gathering_activity(uuid,text) from public, anon, authenticated;
revoke execute on function public.equip_item_instance(uuid,uuid,text) from public, anon, authenticated;
revoke execute on function public.transfer_storage_item(uuid,uuid,integer,text,text) from public, anon, authenticated;
revoke execute on function public.unequip_item_slot(uuid,text) from public, anon, authenticated;
revoke execute on function public.upgrade_storage_capacity(uuid,text,text) from public, anon, authenticated;

grant execute on function public.claim_gathering_activity(uuid,text) to service_role;
grant execute on function public.start_gathering_activity(uuid,text) to service_role;
grant execute on function public.equip_item_instance(uuid,uuid,text) to service_role;
grant execute on function public.transfer_storage_item(uuid,uuid,integer,text,text) to service_role;
grant execute on function public.unequip_item_slot(uuid,text) to service_role;
grant execute on function public.upgrade_storage_capacity(uuid,text,text) to service_role;
