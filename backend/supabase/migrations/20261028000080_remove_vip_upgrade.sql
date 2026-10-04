-- Recovered from the already-applied production migration history.
begin;

-- Never discard purchase evidence when retiring this SKU. Abort for manual
-- entitlement migration if any real or test purchase appeared since preflight.
set local lock_timeout='5s';

lock table private.google_play_purchases_v1 in share row exclusive mode;

do $$ begin
  if exists(select 1 from private.google_play_purchases_v1 where product_id='vip_plus_upgrade') then
    raise exception 'Legacy VIP upgrade purchases require explicit entitlement migration';
  end if;
end $$;

-- The testing economy now has exactly two independent permanent purchases:
-- VIP and VIP+. Remove the obsolete upgrade SKU and any test rows using it.
create temporary table _vip_upgrade_accounts on commit drop as
  select distinct account_id
  from private.google_play_purchases_v1
  where product_id='vip_plus_upgrade';

delete from private.google_play_purchases_v1
where product_id='vip_plus_upgrade';

alter table private.google_play_purchases_v1
  drop constraint if exists google_play_purchases_v1_product_id_check;

alter table private.google_play_purchases_v1
  add constraint google_play_purchases_v1_product_id_check
  check(product_id in('vip','vip_plus','supporter_monthly'));

create or replace function private.google_play_recompute_entitlements_v1(p_account_id uuid)
returns void
language plpgsql security definer set search_path=''
as $$
declare
  v_vip boolean:=false;
  v_vip_plus boolean:=false;
  v_supporter_expiry timestamptz;
begin
  select exists(
    select 1 from private.google_play_purchases_v1 p
    where p.account_id=p_account_id and p.product_id='vip' and p.entitlement_active
  ) into v_vip;

  select exists(
    select 1 from private.google_play_purchases_v1 p
    where p.account_id=p_account_id and p.product_id='vip_plus' and p.entitlement_active
  ) into v_vip_plus;

  select max(p.expires_at) into v_supporter_expiry
  from private.google_play_purchases_v1 p
  where p.account_id=p_account_id
    and p.product_id='supporter_monthly'
    and p.entitlement_active
    and p.expires_at is not null
    and p.expires_at>now();

  insert into private.account_commerce_entitlements_v1(
    account_id,vip,vip_plus,supporter_active,supporter_expires_at,source,updated_at
  )
  values(
    p_account_id,v_vip,v_vip_plus,v_supporter_expiry is not null,
    v_supporter_expiry,'google_play',now()
  )
  on conflict(account_id) do update set
    vip=excluded.vip,
    vip_plus=excluded.vip_plus,
    supporter_active=excluded.supporter_active,
    supporter_expires_at=excluded.supporter_expires_at,
    source='google_play',
    updated_at=now();
end $$;

do $$
declare r record;
begin
  for r in select account_id from _vip_upgrade_accounts loop
    perform private.google_play_recompute_entitlements_v1(r.account_id);
  end loop;
end $$;

commit;
