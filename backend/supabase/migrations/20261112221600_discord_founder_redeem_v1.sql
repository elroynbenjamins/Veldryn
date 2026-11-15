-- Discord Founder 2026: permanent cosmetic Founder badge, one claim per account.
-- Code DISCORDFOUNDER is unlimited globally; expires at the end of Dec 5, Europe/Amsterdam.
-- Uses the existing redeem_commerce_code_v1 RPC for compatibility with installed clients.
begin;
create table if not exists private.discord_founder_redeem_claims_v1 (
  account_id uuid primary key references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);
alter table private.discord_founder_redeem_claims_v1 enable row level security;
revoke all on private.discord_founder_redeem_claims_v1 from public,anon,authenticated;
grant select on private.discord_founder_redeem_claims_v1 to service_role;
create or replace function public.redeem_commerce_code_v1(p_code text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_anonymous boolean;
  v_normalized text:=upper(trim(coalesce(p_code,'')));
  v_hash text;
  v_code private.commerce_redeem_codes_v1%rowtype;
  v_account_claims integer;
  v_months integer;
  v_base timestamptz;
  v_exp timestamptz;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(u.is_anonymous,false) into v_anonymous from auth.users u where u.id=v_uid for update;
  if not found or v_anonymous then raise exception 'LINK_ACCOUNT_REQUIRED'; end if;
  -- Discord Founder: permanent cosmetic unlock with one claim per account.
  -- Expires 2026-12-06 00:00 CET (2026-12-05 23:00 UTC).
  if v_normalized='DISCORDFOUNDER' then
    if now() >= timestamptz '2026-12-05 23:00:00+00' then
      raise exception 'REDEEM_CODE_EXPIRED';
    end if;
    if exists(select 1 from private.player_collectible_badges_v1
       where account_id=v_uid and badge_id='founder') then
      raise exception 'REDEEM_LIMIT_REACHED';
    end if;
    insert into private.discord_founder_redeem_claims_v1(account_id)
      values(v_uid) on conflict(account_id) do nothing;
    if not found then raise exception 'REDEEM_LIMIT_REACHED'; end if;
    insert into private.player_collectible_badges_v1(account_id,badge_id)
      values(v_uid,'founder') on conflict(account_id,badge_id) do nothing;
    if not found then raise exception 'REDEEM_LIMIT_REACHED'; end if;
    return jsonb_build_object('grant','founder_badge');
  end if;
  if v_normalized !~ '^VEL-[A-Z0-9][A-Z0-9-]{10,46}[A-Z0-9]$' then raise exception 'INVALID_REDEEM_CODE'; end if;

  v_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_normalized,'UTF8')),'hex');
  select * into v_code from private.commerce_redeem_codes_v1 where code_hash=v_hash for update;
  if not found or not v_code.enabled then raise exception 'INVALID_REDEEM_CODE'; end if;
  if v_code.max_total_claims is not null and v_code.claims_count>=v_code.max_total_claims then
    raise exception 'REDEEM_LIMIT_REACHED';
  end if;

  select count(*) into v_account_claims
  from private.commerce_redeem_code_claims_v1
  where code_hash=v_hash and account_id=v_uid;
  if v_account_claims>=v_code.max_claims_per_account then
    raise exception 'REDEEM_LIMIT_REACHED';
  end if;

  insert into private.commerce_redeem_code_claims_v1(code_hash,account_id,grant_kind,claim_sequence)
  values(v_hash,v_uid,v_code.grant_kind,v_account_claims+1);

  if v_code.grant_kind like 'supporter_%' then
    if v_code.grant_kind='supporter_lifetime' then
      insert into private.commerce_promo_entitlements_v1(account_id,supporter_lifetime)
      values(v_uid,true)
      on conflict(account_id) do update set supporter_lifetime=true,updated_at=now();
    else
      v_months:=case v_code.grant_kind when 'supporter_1m' then 1 when 'supporter_3m' then 3 else 6 end;
      select greatest(now(),p.supporter_expires_at,e.supporter_expires_at) into v_base
      from (select 1) seed
      left join private.commerce_promo_entitlements_v1 p on p.account_id=v_uid
      left join private.account_commerce_entitlements_v1 e on e.account_id=v_uid;
      v_exp:=v_base+make_interval(months=>v_months);
      insert into private.commerce_promo_entitlements_v1(account_id,supporter_expires_at)
      values(v_uid,v_exp)
      on conflict(account_id) do update set supporter_expires_at=v_exp,updated_at=now();
    end if;
  else
    insert into private.commerce_promo_entitlements_v1(account_id,vip,vip_plus)
    values(v_uid,true,v_code.grant_kind='vip_plus')
    on conflict(account_id) do update set
      vip=true,
      vip_plus=private.commerce_promo_entitlements_v1.vip_plus or excluded.vip_plus,
      updated_at=now();
  end if;

  update private.commerce_redeem_codes_v1
  set claims_count=claims_count+1,
      redeemed_by=coalesce(redeemed_by,v_uid),
      redeemed_at=coalesce(redeemed_at,now())
  where code_hash=v_hash;

  return jsonb_build_object('grant',v_code.grant_kind,'entitlements',public.commerce_entitlements_self_v1());
end $$;
revoke all on function public.redeem_commerce_code_v1(text) from public,anon;
grant execute on function public.redeem_commerce_code_v1(text) to authenticated;
commit;
