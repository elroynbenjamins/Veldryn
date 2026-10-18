-- Redeem a previously verified claim exactly once. This is the only safe grant
-- entry point; the low-level grant function must not be called directly.
create or replace function public.guild_shop_redeem_verified_claim_server_v1(
 p_account_id uuid,p_claim_key text,p_amount bigint,p_is_event boolean
) returns bigint language plpgsql security invoker set search_path=public as $$
declare v_credited bigint;
begin
 if p_account_id is null or p_claim_key is null then raise exception 'invalid_claim'; end if;
 -- Lock the source row so concurrent redemptions serialize.
 perform 1 from public.guild_shop_claim_sources
 where account_id=p_account_id and claim_key=p_claim_key and consumed_at is null
 for update;
 if not found then
  -- Idempotent replay: already consumed means zero additional credit.
  if exists(select 1 from public.guild_shop_claim_sources
    where account_id=p_account_id and claim_key=p_claim_key and consumed_at is not null)
    then return 0; end if;
  raise exception 'unverified_guild_claim';
 end if;
 v_credited:=public.guild_shop_grant_tokens_server_v1(
   p_account_id,p_claim_key,p_amount,p_is_event);
 -- Even when normal weekly cap is reached, consume verified source once.
 update public.guild_shop_claim_sources set consumed_at=now()
 where account_id=p_account_id and claim_key=p_claim_key;
 return v_credited;
end $$;
revoke all on function public.guild_shop_redeem_verified_claim_server_v1(uuid,text,bigint,boolean)
 from public,anon,authenticated;
grant execute on function public.guild_shop_redeem_verified_claim_server_v1(uuid,text,bigint,boolean)
 to service_role;
-- IMPORTANT: verified claim sources currently do not pin amount/kind.
-- Do not expose this function until verified sources store authoritative
-- reward amounts and event classifications.
