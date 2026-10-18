-- Bind every verified claim to an authoritative reward amount and type.
alter table public.guild_shop_claim_sources
 add column if not exists reward_amount bigint not null default 1
 check (reward_amount between 1 and 100000),
 add column if not exists reward_kind text not null default 'standard'
 check (reward_kind in ('standard','event'));
-- Default is a schema-compatibility fallback only. Trusted event verification must\n-- explicitly supply the correct amount and reward kind for each source.
-- Retire the previous caller-amount API before exposing any reward redemption.
drop function if exists public.guild_shop_redeem_verified_claim_server_v1(uuid,text,bigint,boolean);
create or replace function public.guild_shop_redeem_verified_claim_server_v2(
 p_account_id uuid,p_claim_key text
) returns bigint language plpgsql security invoker set search_path=public as $$
declare v_amount bigint;v_kind text;v_credited bigint;
begin
 if p_account_id is null or p_claim_key is null then raise exception 'invalid_claim'; end if;
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
 v_credited:=public.guild_shop_grant_tokens_server_v1(
  p_account_id,p_claim_key,v_amount,v_kind='event');
 update public.guild_shop_claim_sources set consumed_at=now()
 where account_id=p_account_id and claim_key=p_claim_key;
 return v_credited;
end $$;
revoke all on function public.guild_shop_redeem_verified_claim_server_v2(uuid,text)
 from public,anon,authenticated;
grant execute on function public.guild_shop_redeem_verified_claim_server_v2(uuid,text) to service_role;
-- Source creation must still validate real gameplay/event completion.
