begin;

create table if not exists private.google_play_account_links_v1(
  account_id uuid primary key references auth.users(id) on delete cascade,
  obfuscated_account_id text not null unique check(obfuscated_account_id ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.google_play_purchases_v1(
  purchase_token text primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check(product_id in('vip','vip_plus','vip_plus_upgrade','supporter_monthly')),
  product_type text not null check(product_type in('in-app','subs')),
  google_state text not null,
  entitlement_active boolean not null default false,
  order_id text,
  purchased_at timestamptz,
  expires_at timestamptz,
  auto_renewing boolean,
  acknowledgement_state text,
  linked_purchase_token text,
  obfuscated_account_id text,
  is_test boolean not null default false,
  region_code text,
  base_plan_id text,
  offer_id text,
  last_source text not null default 'client',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(obfuscated_account_id is null or obfuscated_account_id ~ '^[0-9a-f]{64}$')
);

create table if not exists private.google_play_rtdn_events_v1(
  message_id text primary key,
  processed_at timestamptz not null default now()
);

create index if not exists google_play_purchases_account_product_idx
  on private.google_play_purchases_v1(account_id,product_id);
create index if not exists google_play_purchases_subscription_expiry_idx
  on private.google_play_purchases_v1(account_id,expires_at)
  where product_type='subs';

alter table private.google_play_account_links_v1 enable row level security;
alter table private.google_play_purchases_v1 enable row level security;
alter table private.google_play_rtdn_events_v1 enable row level security;
revoke all on private.google_play_account_links_v1,private.google_play_purchases_v1,private.google_play_rtdn_events_v1 from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on private.google_play_account_links_v1,private.google_play_purchases_v1,private.google_play_rtdn_events_v1 to service_role;

create or replace function private.google_play_recompute_entitlements_v1(p_account_id uuid)
returns void
language plpgsql security definer set search_path=''
as $$
declare
  v_vip boolean:=false;
  v_vip_plus_direct boolean:=false;
  v_vip_plus_upgrade boolean:=false;
  v_supporter_expiry timestamptz;
begin
  select exists(
    select 1 from private.google_play_purchases_v1 p
    where p.account_id=p_account_id and p.product_id='vip' and p.entitlement_active
  ) into v_vip;

  select exists(
    select 1 from private.google_play_purchases_v1 p
    where p.account_id=p_account_id and p.product_id='vip_plus' and p.entitlement_active
  ) into v_vip_plus_direct;

  select exists(
    select 1 from private.google_play_purchases_v1 p
    where p.account_id=p_account_id and p.product_id='vip_plus_upgrade' and p.entitlement_active
  ) into v_vip_plus_upgrade;

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
    p_account_id,
    v_vip,
    v_vip_plus_direct or (v_vip and v_vip_plus_upgrade),
    v_supporter_expiry is not null,
    v_supporter_expiry,
    'google_play',
    now()
  )
  on conflict(account_id) do update set
    vip=excluded.vip,
    vip_plus=excluded.vip_plus,
    supporter_active=excluded.supporter_active,
    supporter_expires_at=excluded.supporter_expires_at,
    source='google_play',
    updated_at=now();
end $$;

create or replace function public.google_play_register_account_link_v1(
  p_account_id uuid,
  p_obfuscated_account_id text
)
returns void
language plpgsql security definer set search_path=''
as $$
begin
  if p_account_id is null or p_obfuscated_account_id !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_GOOGLE_PLAY_ACCOUNT_LINK';
  end if;
  insert into private.google_play_account_links_v1(account_id,obfuscated_account_id,updated_at)
  values(p_account_id,p_obfuscated_account_id,now())
  on conflict(account_id) do update set
    obfuscated_account_id=excluded.obfuscated_account_id,
    updated_at=now();
end $$;

create or replace function public.google_play_purchase_owner_v1(p_purchase_token text)
returns uuid
language sql stable security definer set search_path=''
as $$
  select p.account_id from private.google_play_purchases_v1 p
  where p.purchase_token=p_purchase_token
  limit 1;
$$;

create or replace function public.google_play_account_from_obfuscated_v1(p_obfuscated_account_id text)
returns uuid
language sql stable security definer set search_path=''
as $$
  select l.account_id from private.google_play_account_links_v1 l
  where l.obfuscated_account_id=p_obfuscated_account_id
  limit 1;
$$;

create or replace function public.google_play_tokens_for_account_v1(p_account_id uuid)
returns table(purchase_token text,product_id text,product_type text)
language sql stable security definer set search_path=''
as $$
  select p.purchase_token,p.product_id,p.product_type
  from private.google_play_purchases_v1 p
  where p.account_id=p_account_id
  order by p.created_at;
$$;

create or replace function public.google_play_record_purchase_v1(
  p_account_id uuid,
  p_purchase_token text,
  p_product_id text,
  p_product_type text,
  p_google_state text,
  p_entitlement_active boolean,
  p_order_id text default null,
  p_purchased_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_auto_renewing boolean default null,
  p_acknowledgement_state text default null,
  p_linked_purchase_token text default null,
  p_obfuscated_account_id text default null,
  p_is_test boolean default false,
  p_region_code text default null,
  p_base_plan_id text default null,
  p_offer_id text default null,
  p_source text default 'client'
)
returns void
language plpgsql security definer set search_path=''
as $$
declare
  v_owner uuid;
  v_link text;
  v_has_vip boolean;
begin
  if p_account_id is null or nullif(trim(p_purchase_token),'') is null then
    raise exception 'INVALID_GOOGLE_PLAY_PURCHASE';
  end if;
  if p_product_id not in('vip','vip_plus','vip_plus_upgrade','supporter_monthly') then
    raise exception 'UNKNOWN_GOOGLE_PLAY_PRODUCT';
  end if;
  if (p_product_id='supporter_monthly' and p_product_type<>'subs')
     or (p_product_id<>'supporter_monthly' and p_product_type<>'in-app') then
    raise exception 'GOOGLE_PLAY_PRODUCT_TYPE_MISMATCH';
  end if;

  select p.account_id into v_owner
  from private.google_play_purchases_v1 p
  where p.purchase_token=p_purchase_token;
  if v_owner is not null and v_owner<>p_account_id then
    raise exception 'GOOGLE_PLAY_PURCHASE_ALREADY_BOUND';
  end if;

  select l.obfuscated_account_id into v_link
  from private.google_play_account_links_v1 l
  where l.account_id=p_account_id;
  if p_obfuscated_account_id is not null
     and (v_link is null or v_link<>p_obfuscated_account_id) then
    raise exception 'GOOGLE_PLAY_ACCOUNT_MISMATCH';
  end if;

  if p_product_id='vip_plus_upgrade' and p_entitlement_active then
    select exists(
      select 1 from private.google_play_purchases_v1 p
      where p.account_id=p_account_id and p.product_id='vip' and p.entitlement_active
    ) into v_has_vip;
    if not v_has_vip then raise exception 'VIP_REQUIRED_FOR_UPGRADE';end if;
  end if;

  insert into private.google_play_purchases_v1(
    purchase_token,account_id,product_id,product_type,google_state,entitlement_active,
    order_id,purchased_at,expires_at,auto_renewing,acknowledgement_state,
    linked_purchase_token,obfuscated_account_id,is_test,region_code,base_plan_id,offer_id,
    last_source,last_verified_at,updated_at
  )
  values(
    p_purchase_token,p_account_id,p_product_id,p_product_type,p_google_state,p_entitlement_active,
    p_order_id,p_purchased_at,p_expires_at,p_auto_renewing,p_acknowledgement_state,
    p_linked_purchase_token,p_obfuscated_account_id,coalesce(p_is_test,false),p_region_code,p_base_plan_id,p_offer_id,
    coalesce(nullif(trim(p_source),''),'client'),now(),now()
  )
  on conflict(purchase_token) do update set
    product_id=excluded.product_id,
    product_type=excluded.product_type,
    google_state=excluded.google_state,
    entitlement_active=excluded.entitlement_active,
    order_id=excluded.order_id,
    purchased_at=coalesce(excluded.purchased_at,private.google_play_purchases_v1.purchased_at),
    expires_at=excluded.expires_at,
    auto_renewing=excluded.auto_renewing,
    acknowledgement_state=excluded.acknowledgement_state,
    linked_purchase_token=excluded.linked_purchase_token,
    obfuscated_account_id=coalesce(excluded.obfuscated_account_id,private.google_play_purchases_v1.obfuscated_account_id),
    is_test=excluded.is_test,
    region_code=coalesce(excluded.region_code,private.google_play_purchases_v1.region_code),
    base_plan_id=excluded.base_plan_id,
    offer_id=excluded.offer_id,
    last_source=excluded.last_source,
    last_verified_at=now(),
    updated_at=now()
  where private.google_play_purchases_v1.account_id=excluded.account_id;

  perform private.google_play_recompute_entitlements_v1(p_account_id);
end $$;

create or replace function public.google_play_rtdn_processed_v1(p_message_id text)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from private.google_play_rtdn_events_v1 e
    where e.message_id=p_message_id
  );
$$;

create or replace function public.google_play_mark_rtdn_processed_v1(p_message_id text)
returns void
language plpgsql security definer set search_path=''
as $$
begin
  if nullif(trim(p_message_id),'') is null then return;end if;
  insert into private.google_play_rtdn_events_v1(message_id,processed_at)
  values(p_message_id,now())
  on conflict(message_id) do nothing;
end $$;

revoke all on function private.google_play_recompute_entitlements_v1(uuid) from public,anon,authenticated;
revoke all on function public.google_play_register_account_link_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.google_play_purchase_owner_v1(text) from public,anon,authenticated;
revoke all on function public.google_play_account_from_obfuscated_v1(text) from public,anon,authenticated;
revoke all on function public.google_play_tokens_for_account_v1(uuid) from public,anon,authenticated;
revoke all on function public.google_play_record_purchase_v1(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,boolean,text,text,text,boolean,text,text,text,text) from public,anon,authenticated;
revoke all on function public.google_play_rtdn_processed_v1(text) from public,anon,authenticated;
revoke all on function public.google_play_mark_rtdn_processed_v1(text) from public,anon,authenticated;

grant execute on function public.google_play_register_account_link_v1(uuid,text) to service_role;
grant execute on function public.google_play_purchase_owner_v1(text) to service_role;
grant execute on function public.google_play_account_from_obfuscated_v1(text) to service_role;
grant execute on function public.google_play_tokens_for_account_v1(uuid) to service_role;
grant execute on function public.google_play_record_purchase_v1(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,boolean,text,text,text,boolean,text,text,text,text) to service_role;
grant execute on function public.google_play_rtdn_processed_v1(text) to service_role;
grant execute on function public.google_play_mark_rtdn_processed_v1(text) to service_role;

comment on table private.google_play_account_links_v1 is 'Server-generated mapping between a recoverable VELDRYN account and Google Play obfuscatedExternalAccountId.';
comment on table private.google_play_purchases_v1 is 'Server-verified Google Play purchase-token ledger. Purchase tokens, not order IDs, are the ownership key.';
comment on table private.google_play_rtdn_events_v1 is 'Successfully processed Google Play Pub/Sub message IDs used to suppress duplicate RTDN work.';
comment on function public.google_play_record_purchase_v1(uuid,text,text,text,text,boolean,text,timestamptz,timestamptz,boolean,text,text,text,boolean,text,text,text,text) is 'Service-role-only verified purchase upsert plus entitlement recomputation. Clients cannot grant paid access.';

commit;
