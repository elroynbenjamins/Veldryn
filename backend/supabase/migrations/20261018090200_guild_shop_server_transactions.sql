-- Server-only atomic token operations. Authorization is intentionally enforced by
-- the calling trusted backend; no EXECUTE grant to anon or authenticated.
-- Caller must verify guild membership, event milestone, reward ID and item ownership.
create or replace function public.guild_shop_grant_tokens_server_v1(
 p_account_id uuid, p_claim_key text, p_amount bigint, p_is_event boolean
) returns bigint language plpgsql security invoker set search_path = public as $$
declare v_balance bigint; v_week date; v_earned integer; v_credit bigint;
begin
 if p_account_id is null or p_claim_key is null or length(p_claim_key) not between 1 and 200
    or p_amount is null or p_amount <= 0 or p_amount > 100000 then
  raise exception 'invalid_guild_token_grant';
 end if;
 insert into public.guild_shop_wallets(account_id) values (p_account_id)
 on conflict(account_id) do nothing;
 select balance into v_balance from public.guild_shop_wallets
 where account_id = p_account_id for update;
 if exists(select 1 from public.guild_shop_ledger where account_id=p_account_id and claim_key=p_claim_key) then
  return 0;
 end if;
 v_week := date_trunc('week', now() at time zone 'utc')::date;
 insert into public.guild_shop_weekly(account_id,week_start) values(p_account_id,v_week)
 on conflict(account_id,week_start) do nothing;
 select earned into v_earned from public.guild_shop_weekly
 where account_id=p_account_id and week_start=v_week for update;
 v_credit := case when p_is_event then p_amount else least(p_amount, greatest(0,250-v_earned)) end;
 if v_credit = 0 then return 0; end if;
 insert into public.guild_shop_ledger(account_id,claim_key,amount,kind)
 values(p_account_id,p_claim_key,v_credit,case when p_is_event then 'event' else 'standard' end);
 update public.guild_shop_wallets set balance=balance+v_credit where account_id=p_account_id;
 if not p_is_event then
  update public.guild_shop_weekly set earned=earned+v_credit
  where account_id=p_account_id and week_start=v_week;
 end if;
 return v_credit;
end $$;
revoke all on function public.guild_shop_grant_tokens_server_v1(uuid,text,bigint,boolean)
 from public, anon, authenticated;
grant execute on function public.guild_shop_grant_tokens_server_v1(uuid,text,bigint,boolean) to service_role;

create or replace function public.guild_shop_purchase_server_v1(
 p_account_id uuid, p_item_id text, p_cost bigint
) returns bigint language plpgsql security invoker set search_path = public as $$
declare v_balance bigint;
begin
 if p_account_id is null or p_item_id is null or length(p_item_id) not between 1 and 120
   or p_cost is null or p_cost <= 0 then raise exception 'invalid_guild_shop_purchase'; end if;
 select balance into v_balance from public.guild_shop_wallets
 where account_id=p_account_id for update;
 if v_balance is null or v_balance < p_cost then raise exception 'insufficient_guild_tokens'; end if;
 if exists(select 1 from public.guild_shop_owned where account_id=p_account_id and item_id=p_item_id) then
  raise exception 'guild_shop_already_owned';
 end if;
 insert into public.guild_shop_owned(account_id,item_id) values(p_account_id,p_item_id);
 insert into public.guild_shop_ledger(account_id,claim_key,amount,kind)
 values(p_account_id,'purchase:'||p_item_id,-p_cost,'purchase');
 update public.guild_shop_wallets set balance=balance-p_cost where account_id=p_account_id;
 return v_balance-p_cost;
end $$;
revoke all on function public.guild_shop_purchase_server_v1(uuid,text,bigint)
 from public, anon, authenticated;
grant execute on function public.guild_shop_purchase_server_v1(uuid,text,bigint) to service_role;
-- IMPORTANT: Purchase is not safe to call until trusted backend validates price,
-- membership, level and grants the real collectible in the SAME transaction.
