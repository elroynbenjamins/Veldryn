begin;

create table private.commerce_redeem_codes_v1(
  code_hash text primary key check(code_hash ~ '^[0-9a-f]{64}$'),
  grant_kind text not null check(grant_kind in('vip','vip_plus','supporter_1m','supporter_3m','supporter_6m','supporter_lifetime')),
  enabled boolean not null default true,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  check((redeemed_by is null)=(redeemed_at is null))
);

create table private.commerce_promo_entitlements_v1(
  account_id uuid primary key references auth.users(id) on delete cascade,
  vip boolean not null default false,
  vip_plus boolean not null default false,
  supporter_lifetime boolean not null default false,
  supporter_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table private.commerce_redeem_codes_v1 enable row level security;
alter table private.commerce_promo_entitlements_v1 enable row level security;
revoke all on private.commerce_redeem_codes_v1,private.commerce_promo_entitlements_v1 from public,anon,authenticated;
grant select,insert,update on private.commerce_redeem_codes_v1,private.commerce_promo_entitlements_v1 to service_role;

create or replace function private.commerce_entitlements_v1(p_account_id uuid)
returns table(vip boolean,vip_plus boolean,supporter boolean)
language sql stable security definer set search_path=''
as $$
 select
   coalesce(e.vip,false) or coalesce(e.vip_plus,false) or coalesce(p.vip,false) or coalesce(p.vip_plus,false),
   coalesce(e.vip_plus,false) or coalesce(p.vip_plus,false),
   (coalesce(e.supporter_active,false) and (e.supporter_expires_at is null or e.supporter_expires_at>now()))
     or coalesce(p.supporter_lifetime,false) or coalesce(p.supporter_expires_at>now(),false)
 from (select 1) seed
 left join private.account_commerce_entitlements_v1 e on e.account_id=p_account_id
 left join private.commerce_promo_entitlements_v1 p on p.account_id=p_account_id;
$$;

create or replace function public.commerce_entitlements_self_v1()
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_ent record;
  v_play private.account_commerce_entitlements_v1%rowtype;
  v_promo private.commerce_promo_entitlements_v1%rowtype;
  v_exp timestamptz;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  select * into v_ent from private.commerce_entitlements_v1(v_uid);
  select * into v_play from private.account_commerce_entitlements_v1 where account_id=v_uid;
  select * into v_promo from private.commerce_promo_entitlements_v1 where account_id=v_uid;
  if coalesce(v_promo.supporter_lifetime,false) or (coalesce(v_play.supporter_active,false) and v_play.supporter_expires_at is null) then
    v_exp:=null;
  else
    v_exp:=greatest(v_play.supporter_expires_at,v_promo.supporter_expires_at);
  end if;
  return jsonb_build_object('vip',v_ent.vip,'vipPlus',v_ent.vip_plus,'supporter',v_ent.supporter,'supporterExpiresAt',v_exp);
end $$;

create or replace function public.redeem_commerce_code_v1(p_code text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_anonymous boolean;
  v_hash text;
  v_code private.commerce_redeem_codes_v1%rowtype;
  v_months integer;
  v_base timestamptz;
  v_exp timestamptz;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  select coalesce(u.is_anonymous,false) into v_anonymous from auth.users u where u.id=v_uid for update;
  if not found or v_anonymous then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
  if upper(trim(coalesce(p_code,''))) !~ '^VEL-[0-9A-F]{32}$' then raise exception 'INVALID_REDEEM_CODE';end if;
  v_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(upper(trim(p_code)),'UTF8')),'hex');
  select * into v_code from private.commerce_redeem_codes_v1 where code_hash=v_hash for update;
  if not found or not v_code.enabled or v_code.redeemed_at is not null then raise exception 'INVALID_REDEEM_CODE';end if;

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
  update private.commerce_redeem_codes_v1 set redeemed_by=v_uid,redeemed_at=now() where code_hash=v_hash;
  return jsonb_build_object('grant',v_code.grant_kind,'entitlements',public.commerce_entitlements_self_v1());
end $$;

revoke all on function public.redeem_commerce_code_v1(text) from public,anon;
grant execute on function public.redeem_commerce_code_v1(text) to authenticated;

create or replace function public.admin_list_commerce_redeem_codes_v1()
returns table(
  code_hash text,
  code_hint text,
  grant_kind text,
  enabled boolean,
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path=''
as $$
 select
   c.code_hash,
   left(c.code_hash,8)||'...'||right(c.code_hash,8) as code_hint,
   c.grant_kind,
   c.enabled,
   c.redeemed_by,
   c.redeemed_at,
   c.created_at
 from private.commerce_redeem_codes_v1 c
 order by c.created_at desc,c.grant_kind asc;
$$;

create or replace function public.admin_set_commerce_redeem_code_enabled_v1(p_code_hash text,p_enabled boolean)
returns table(
  code_hash text,
  code_hint text,
  grant_kind text,
  enabled boolean,
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz
)
language plpgsql security definer set search_path=''
as $$
begin
  if p_code_hash is null or p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_COMMERCE_CODE_HASH';
  end if;
  update private.commerce_redeem_codes_v1
  set enabled=coalesce(p_enabled,false)
  where private.commerce_redeem_codes_v1.code_hash=p_code_hash
    and private.commerce_redeem_codes_v1.redeemed_at is null;
  if not found then raise exception 'COMMERCE_CODE_NOT_FOUND_OR_REDEEMED'; end if;
  return query
  select
    c.code_hash,
    left(c.code_hash,8)||'...'||right(c.code_hash,8) as code_hint,
    c.grant_kind,
    c.enabled,
    c.redeemed_by,
    c.redeemed_at,
    c.created_at
  from private.commerce_redeem_codes_v1 c
  where c.code_hash=p_code_hash;
end $$;

revoke all on function public.admin_list_commerce_redeem_codes_v1() from public,anon,authenticated;
revoke all on function public.admin_set_commerce_redeem_code_enabled_v1(text,boolean) from public,anon,authenticated;
grant execute on function public.admin_list_commerce_redeem_codes_v1() to service_role;
grant execute on function public.admin_set_commerce_redeem_code_enabled_v1(text,boolean) to service_role;

insert into private.commerce_redeem_codes_v1(code_hash,grant_kind) values
 ('98840a89a256f0f4ef37ff154ef9cba395232fbb2a94da7f0c64aa60a2fa7d10','vip'),
 ('98f6331bb827d35a1a159a500e54f257688fbf13e5155712f37eca497a7537f6','vip_plus'),
 ('58803f8f258a2aeb3e875d8893d5fd10398c89cd7b49a92266cee73559985903','supporter_1m'),
 ('c1de233df0d5277aac67c9714966fa5eae6bc27281a63cfd9341c33290b73128','supporter_3m'),
 ('f864e52f1b69cd7513ac735aa646a9ec953e9ee222b17805265f5c7c914e8f84','supporter_6m'),
 ('6f4a1712c479d1f0b2a031967a705e3de9d5502ffd6c7c111525ce717be99963','supporter_lifetime')
on conflict(code_hash) do nothing;

comment on table private.commerce_redeem_codes_v1 is 'Single-use complimentary entitlement codes; only SHA-256 hashes are stored.';
comment on table private.commerce_promo_entitlements_v1 is 'Complimentary grants kept separate from Google Play purchase projections.';
commit;;
