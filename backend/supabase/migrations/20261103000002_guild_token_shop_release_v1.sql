-- Release the permanent Guild Token Shop after its mobile art, entitlement projection,
-- Ordered after the deployed chain; 20261018092000 belongs to chat emote entitlements.
-- and server-authoritative purchase path have all been validated.
-- The mobile client never receives permission to invoke this RPC directly.

update public.guild_shop_reward_catalogue
set enabled=true
where item_id in (
  'guild_pet_01','guild_pet_02',
  'guild_companion_01','guild_companion_02','guild_companion_03',
  'border_silver','border_emerald','border_royal',
  'icon_guild',
  'emotes_fellowship','emotes_adventure','emotes_legends'
);

grant execute on function public.guild_shop_purchase_server_v4(uuid,text) to service_role;
revoke all on function public.guild_shop_purchase_server_v4(uuid,text) from public,anon,authenticated;
