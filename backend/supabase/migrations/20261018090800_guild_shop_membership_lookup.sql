-- Resolve guild membership and level using the canonical guild tables.
-- Trusted gameplay gateway has already authenticated the bearer token;
-- never accept an account id directly from the player.
create or replace function public.guild_shop_guild_level_server_v1(p_account_id uuid)
returns integer language sql stable security invoker set search_path=public as $$
 select greatest(1,g.level)::integer
 from public.guild_members m
 join public.guilds g on g.id=m.guild_id
 where m.account_id=p_account_id
 limit 1
$$;
revoke all on function public.guild_shop_guild_level_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_shop_guild_level_server_v1(uuid) to service_role;
