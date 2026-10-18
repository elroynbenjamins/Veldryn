-- Read-only Guild Shop snapshot for authenticated accounts.
-- This function does not grant tokens, purchase rewards or expose other accounts.
create or replace function public.guild_shop_snapshot_v1()
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
   'balance',coalesce((select balance from public.guild_shop_wallets where account_id=auth.uid()),0),
   'earnedThisWeek',coalesce((
     select earned from public.guild_shop_weekly
     where account_id=auth.uid() and week_start=date_trunc('week',now() at time zone 'utc')::date
   ),0),
   'ownedItemIds',coalesce((
     select jsonb_agg(item_id order by item_id) from public.guild_shop_owned where account_id=auth.uid()
   ),'[]'::jsonb)
 )
$$;
-- Under RLS, invoker access is denied by design until safe per-account
-- SELECT policies are explicitly installed.
revoke all on function public.guild_shop_snapshot_v1() from public,anon,authenticated;
grant execute on function public.guild_shop_snapshot_v1() to service_role;
