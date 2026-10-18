-- Award actual daily Guild Tokens only for server-recorded Muster activity.
-- This operation is atomic, replay-safe, and cannot accept player-supplied amounts.
create or replace function public.guild_shop_claim_daily_server_v1(
 p_account_id uuid,p_kind text
) returns bigint language plpgsql security invoker set search_path=public as $$
declare
 v_day date := (now() at time zone 'utc')::date;
 v_claim text;
 v_verified boolean;
begin
 if p_account_id is null or p_kind not in ('attendance','contribution') then
  raise exception 'invalid_guild_daily_reward';
 end if;
 -- Guild activity was already verified and committed by existing server systems.
 select exists(
  select 1 from public.guild_muster_daily d
  join public.guild_members m on m.guild_id=d.guild_id and m.account_id=d.account_id
  where d.account_id=p_account_id and d.activity_date=v_day
   and case when p_kind='attendance' then d.check_in_points>0
            else d.combat_points>0 or d.skilling_points>0 end
 ) into v_verified;
 if not v_verified then raise exception 'guild_daily_reward_not_earned'; end if;
 v_claim:='guild-muster:'||v_day::text||':'||p_kind;
 insert into public.guild_shop_claim_sources(
  account_id,claim_key,reward_amount,reward_kind
 ) values(p_account_id,v_claim,10,'standard')
 on conflict(account_id,claim_key) do nothing;
 return public.guild_shop_redeem_verified_claim_server_v2(p_account_id,v_claim);
end $$;
revoke all on function public.guild_shop_claim_daily_server_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.guild_shop_claim_daily_server_v1(uuid,text) to service_role;
