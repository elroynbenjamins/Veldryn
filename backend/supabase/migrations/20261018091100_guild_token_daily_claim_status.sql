-- Extend the signed-in account snapshot with daily claim status. This checks
-- source consumption instead of ledger entries, so cap-exhausted claims still
-- show as claimed and cannot be spammed.
create or replace function public.guild_shop_snapshot_server_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
  'balance',coalesce((select balance from public.guild_shop_wallets where account_id=p_account_id),0),
  'earnedThisWeek',coalesce((select earned from public.guild_shop_weekly
   where account_id=p_account_id and week_start=date_trunc('week',now() at time zone 'utc')::date),0),
  'ownedItemIds',coalesce((select jsonb_agg(item_id order by item_id)
   from public.guild_shop_owned where account_id=p_account_id),'[]'::jsonb),
  'claimedDailyKinds',coalesce((
   select jsonb_agg(split_part(claim_key,':',3) order by claim_key)
   from public.guild_shop_claim_sources
   where account_id=p_account_id and consumed_at is not null
    and claim_key like 'guild-muster:'||(now() at time zone 'utc')::date::text||':%'
  ),'[]'::jsonb)
 )
$$;
revoke all on function public.guild_shop_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_shop_snapshot_server_v1(uuid) to service_role;
