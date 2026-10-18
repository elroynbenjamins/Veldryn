-- Redeem verified claims without calling the disabled low-level grant API.
-- All wallet, ledger, and weekly writes happen in one PostgreSQL transaction.
create or replace function public.guild_shop_redeem_verified_claim_server_v2(
 p_account_id uuid,p_claim_key text
) returns bigint language plpgsql security invoker set search_path=public as $$
declare v_amount bigint;v_kind text;v_credited bigint;v_earned integer;v_week date;
begin
 if p_account_id is null or p_claim_key is null or length(p_claim_key) not between 1 and 200
 then raise exception 'invalid_claim'; end if;
 -- Lock the source first, then wallet, then weekly row. All claim paths must
 -- preserve this ordering to avoid deadlocks.
 select reward_amount,reward_kind into v_amount,v_kind
 from public.guild_shop_claim_sources
 where account_id=p_account_id and claim_key=p_claim_key and consumed_at is null
 for update;
 if not found then
  if exists(select 1 from public.guild_shop_claim_sources
   where account_id=p_account_id and claim_key=p_claim_key and consumed_at is not null)
  then return 0; end if;
  raise exception 'unverified_guild_claim';
 end if;
 insert into public.guild_shop_wallets(account_id) values(p_account_id)
 on conflict(account_id) do nothing;
 perform 1 from public.guild_shop_wallets where account_id=p_account_id for update;
 v_week:=date_trunc('week',now() at time zone 'utc')::date;
 insert into public.guild_shop_weekly(account_id,week_start) values(p_account_id,v_week)
 on conflict(account_id,week_start) do nothing;
 select earned into v_earned from public.guild_shop_weekly
 where account_id=p_account_id and week_start=v_week for update;
 v_credited:=case when v_kind='event' then v_amount
 else least(v_amount,greatest(0,250-v_earned)) end;
 if v_credited>0 then
  insert into public.guild_shop_ledger(account_id,claim_key,amount,kind)
   values(p_account_id,p_claim_key,v_credited,v_kind);
  update public.guild_shop_wallets set balance=balance+v_credited where account_id=p_account_id;
  if v_kind='standard' then
   update public.guild_shop_weekly set earned=earned+v_credited
   where account_id=p_account_id and week_start=v_week;
  end if;
 end if;
 update public.guild_shop_claim_sources set consumed_at=now()
 where account_id=p_account_id and claim_key=p_claim_key;
 return v_credited;
end $$;
revoke all on function public.guild_shop_redeem_verified_claim_server_v2(uuid,text)
 from public,anon,authenticated;
grant execute on function public.guild_shop_redeem_verified_claim_server_v2(uuid,text) to service_role;
