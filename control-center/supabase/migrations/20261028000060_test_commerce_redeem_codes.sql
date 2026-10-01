begin;

-- Testing-phase complimentary commerce codes. Codes stay hash-only at rest, but
-- can be reused with explicit total/per-account claim limits until launch.
alter table private.commerce_redeem_codes_v1
  add column if not exists label text,
  add column if not exists code_hint text,
  add column if not exists max_total_claims integer,
  add column if not exists max_claims_per_account integer not null default 1,
  add column if not exists claims_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='commerce_redeem_codes_v1_max_total_check') then
    alter table private.commerce_redeem_codes_v1
      add constraint commerce_redeem_codes_v1_max_total_check
      check (max_total_claims is null or (max_total_claims>=1 and max_total_claims<=1000000));
  end if;
  if not exists (select 1 from pg_constraint where conname='commerce_redeem_codes_v1_max_per_account_check') then
    alter table private.commerce_redeem_codes_v1
      add constraint commerce_redeem_codes_v1_max_per_account_check
      check (max_claims_per_account>=1 and max_claims_per_account<=1000);
  end if;
  if not exists (select 1 from pg_constraint where conname='commerce_redeem_codes_v1_claims_count_check') then
    alter table private.commerce_redeem_codes_v1
      add constraint commerce_redeem_codes_v1_claims_count_check
      check (claims_count>=0);
  end if;
end $$;

update private.commerce_redeem_codes_v1
set
  label=coalesce(label, initcap(replace(grant_kind,'_',' ')) || ' test code'),
  code_hint=coalesce(code_hint, left(code_hash,8) || '...' || right(code_hash,8)),
  max_total_claims=null,
  max_claims_per_account=case when max_claims_per_account=1 then 20 else max_claims_per_account end,
  claims_count=greatest(claims_count, case when redeemed_at is null then 0 else 1 end);

create table if not exists private.commerce_redeem_code_claims_v1 (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null references private.commerce_redeem_codes_v1(code_hash) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  grant_kind text not null,
  claim_sequence integer not null,
  created_at timestamptz not null default now(),
  unique(code_hash,account_id,claim_sequence)
);

grant select,insert on table private.commerce_redeem_code_claims_v1 to service_role;

drop function if exists public.admin_list_commerce_redeem_codes_v1();
drop function if exists public.admin_set_commerce_redeem_code_enabled_v1(text,boolean);
drop function if exists public.admin_create_commerce_redeem_code_v1(text,text,text,integer,integer);

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

create function public.admin_list_commerce_redeem_codes_v1()
returns table(
  code_hash text,
  code_hint text,
  label text,
  grant_kind text,
  enabled boolean,
  max_total_claims integer,
  max_claims_per_account integer,
  claims_count integer,
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz
)
language sql security definer set search_path=''
as $$
  select c.code_hash,c.code_hint,c.label,c.grant_kind,c.enabled,c.max_total_claims,
         c.max_claims_per_account,c.claims_count,c.redeemed_by,c.redeemed_at,c.created_at
  from private.commerce_redeem_codes_v1 c
  order by c.created_at desc,c.code_hash asc
  limit 500;
$$;

create function public.admin_set_commerce_redeem_code_enabled_v1(p_code_hash text,p_enabled boolean)
returns table(
  code_hash text,
  code_hint text,
  label text,
  grant_kind text,
  enabled boolean,
  max_total_claims integer,
  max_claims_per_account integer,
  claims_count integer,
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz
)
language plpgsql security definer set search_path=''
as $$
begin
  update private.commerce_redeem_codes_v1 c
  set enabled=p_enabled
  where c.code_hash=p_code_hash;
  if not found then raise exception 'COMMERCE_REDEEM_CODE_NOT_FOUND'; end if;
  return query
    select c.code_hash,c.code_hint,c.label,c.grant_kind,c.enabled,c.max_total_claims,
           c.max_claims_per_account,c.claims_count,c.redeemed_by,c.redeemed_at,c.created_at
    from private.commerce_redeem_codes_v1 c
    where c.code_hash=p_code_hash;
end $$;

create function public.admin_create_commerce_redeem_code_v1(
  p_plaintext_code text,
  p_grant_kind text,
  p_label text,
  p_max_total_claims integer default null,
  p_max_claims_per_account integer default 20
)
returns table(
  code_hash text,
  code_hint text,
  label text,
  grant_kind text,
  enabled boolean,
  max_total_claims integer,
  max_claims_per_account integer,
  claims_count integer,
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz
)
language plpgsql security definer set search_path=''
as $$
declare
  v_code text:=upper(trim(coalesce(p_plaintext_code,'')));
  v_hash text;
  v_hint text;
begin
  if v_code !~ '^VEL-[A-Z0-9][A-Z0-9-]{10,46}[A-Z0-9]$' then raise exception 'INVALID_REDEEM_CODE'; end if;
  if p_grant_kind not in ('vip','vip_plus','supporter_1m','supporter_3m','supporter_6m','supporter_lifetime') then
    raise exception 'COMMERCE_GRANT_KIND_INVALID';
  end if;
  if length(trim(coalesce(p_label,'')))<3 then raise exception 'COMMERCE_REDEEM_LABEL_TOO_SHORT'; end if;
  if p_max_total_claims is not null and (p_max_total_claims<1 or p_max_total_claims>1000000) then
    raise exception 'COMMERCE_REDEEM_MAX_TOTAL_INVALID';
  end if;
  if p_max_claims_per_account<1 or p_max_claims_per_account>1000 then
    raise exception 'COMMERCE_REDEEM_MAX_PER_ACCOUNT_INVALID';
  end if;

  v_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_code,'UTF8')),'hex');
  v_hint:=left(v_code,10) || '...' || right(v_code,4);

  insert into private.commerce_redeem_codes_v1(
    code_hash,code_hint,label,grant_kind,enabled,max_total_claims,max_claims_per_account,claims_count
  )
  values(v_hash,v_hint,trim(p_label),p_grant_kind,true,p_max_total_claims,p_max_claims_per_account,0);

  return query
    select c.code_hash,c.code_hint,c.label,c.grant_kind,c.enabled,c.max_total_claims,
           c.max_claims_per_account,c.claims_count,c.redeemed_by,c.redeemed_at,c.created_at
    from private.commerce_redeem_codes_v1 c
    where c.code_hash=v_hash;
end $$;

revoke all on function public.admin_list_commerce_redeem_codes_v1() from public,anon,authenticated;
revoke all on function public.admin_set_commerce_redeem_code_enabled_v1(text,boolean) from public,anon,authenticated;
revoke all on function public.admin_create_commerce_redeem_code_v1(text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_list_commerce_redeem_codes_v1() to service_role;
grant execute on function public.admin_set_commerce_redeem_code_enabled_v1(text,boolean) to service_role;
grant execute on function public.admin_create_commerce_redeem_code_v1(text,text,text,integer,integer) to service_role;

insert into private.commerce_redeem_codes_v1(
  code_hash,code_hint,label,grant_kind,enabled,max_total_claims,max_claims_per_account,claims_count
) values
 ('bbb6109f742094f0e87765bbdc391c53132599a507cdf4b752c254c17e21ffc3','VEL-TEST-V...9M2','Testing VIP','vip',true,null,20,0),
 ('bd0da084342c20c15bff5b36c7f3d3cb7f0f54e6fbc9b5fc074659a92b8e20b5','VEL-TEST-V...X8C','Testing VIP Plus','vip_plus',true,null,20,0),
 ('ae12d975c0cc0e17b5b4b55917a4fed147ebbc796af89dcac1f9967bf0d9e12f','VEL-TEST-S...A2P','Testing Supporter 1 month','supporter_1m',true,null,20,0),
 ('761c86f1641664e472ab66e0ec480db4230bc70fcb349f0ff0102d8a75e0dc8f','VEL-TEST-S...V7R','Testing Supporter 3 months','supporter_3m',true,null,20,0),
 ('d64cdcce0a9ab483f8bb950fb92b6c49ad7516542b4bc456889a07252cff01ea','VEL-TEST-S...D4T','Testing Supporter 6 months','supporter_6m',true,null,20,0),
 ('ccad4ff31aa162e190ac84c1ac74734b27d8d6af399a520b9a690c2b30db0c01','VEL-TEST-L...Z8W','Testing Supporter lifetime','supporter_lifetime',true,null,20,0)
on conflict(code_hash) do update set
  code_hint=excluded.code_hint,
  label=excluded.label,
  max_total_claims=excluded.max_total_claims,
  max_claims_per_account=excluded.max_claims_per_account;

commit;
