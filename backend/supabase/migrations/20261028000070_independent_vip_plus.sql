-- Recovered from the already-applied production migration history.
begin;

-- VIP and VIP+ are separate permanent purchases. VIP+ adds its own benefits
-- and is intentionally available without owning VIP. Keep the old upgrade SKU
-- readable for restoring historical purchases, but do not grant VIP from VIP+.
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
    where p.account_id=p_account_id
      and p.product_id in('vip_plus','vip_plus_upgrade')
      and p.entitlement_active
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

create or replace function private.commerce_entitlements_v1(p_account_id uuid)
returns table(vip boolean,vip_plus boolean,supporter boolean)
language sql stable security definer set search_path=''
as $$
 select
   coalesce(e.vip,false) or coalesce(p.vip,false),
   coalesce(e.vip_plus,false) or coalesce(p.vip_plus,false),
   (coalesce(e.supporter_active,false) and (e.supporter_expires_at is null or e.supporter_expires_at>now()))
     or coalesce(p.supporter_lifetime,false) or coalesce(p.supporter_expires_at>now(),false)
 from (select 1) seed
 left join private.account_commerce_entitlements_v1 e on e.account_id=p_account_id
 left join private.commerce_promo_entitlements_v1 p on p.account_id=p_account_id;
$$;

commit;
