-- Server-only read snapshot. Caller must authenticate and pass the verified account UUID.
create or replace function public.guild_shop_snapshot_server_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
  'balance',coalesce((select balance from public.guild_shop_wallets where account_id=p_account_id),0),
  'earnedThisWeek',coalesce((select earned from public.guild_shop_weekly
    where account_id=p_account_id and week_start=date_trunc('week',now() at time zone 'utc')::date),0),
  'ownedItemIds',coalesce((select jsonb_agg(item_id order by item_id)
    from public.guild_shop_owned where account_id=p_account_id),'[]'::jsonb)
 )
$$;
revoke all on function public.guild_shop_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_shop_snapshot_server_v1(uuid) to service_role;
