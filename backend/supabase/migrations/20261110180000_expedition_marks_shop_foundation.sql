-- Expedition Marks shop foundation.
-- Mirrors the guild-shop precedent: price-authoritative catalogue, server-only
-- purchase RPC, idempotent request keys, consumable vs. one-time entitlement.
-- Catalogue rows default disabled until their matching entitlement delivery
-- is verified in GameState. No funds move until a row is enabled.

create table if not exists public.expedition_shop_catalogue (
 item_id text primary key,
 category text not null check (category in ('cosmetic_border','cosmetic_icon','consumable','currency_pack','utility')),
 mark_cost bigint not null check (mark_cost > 0),
 required_account_level integer not null default 1 check (required_account_level between 1 and 200),
 weekly_limit integer not null default 0 check (weekly_limit between 0 and 50),
 enabled boolean not null default false,
 sort_order integer not null default 100,
 created_at timestamptz not null default now()
);

create table if not exists public.expedition_shop_owned (
 account_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.expedition_shop_catalogue(item_id) on delete cascade,
 purchased_at timestamptz not null default now(),
 primary key (account_id, item_id)
);

create table if not exists public.expedition_shop_weekly (
 account_id uuid not null references auth.users(id) on delete cascade,
 week_key date not null,
 item_id text not null references public.expedition_shop_catalogue(item_id) on delete cascade,
 count integer not null default 0 check (count between 0 and 50),
 primary key (account_id, week_key, item_id)
);

create table if not exists public.expedition_shop_ledger (
 account_id uuid not null references auth.users(id) on delete cascade,
 request_id text not null,
 item_id text not null,
 mark_amount bigint not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key (account_id, request_id)
);

alter table public.expedition_shop_catalogue enable row level security;
alter table public.expedition_shop_owned enable row level security;
alter table public.expedition_shop_weekly enable row level security;
alter table public.expedition_shop_ledger enable row level security;

-- Starter catalogue — ALL DISABLED. Enable one row at a time after its content
-- entitlement is wired and reviewed. Prices are authoritative and server-owned.
insert into public.expedition_shop_catalogue(item_id,category,mark_cost,required_account_level,weekly_limit,sort_order) values
 ('exp_border_bronze','cosmetic_border',1500,5,0,10),
 ('exp_border_silver','cosmetic_border',4500,15,0,20),
 ('exp_icon_wayfinder','cosmetic_icon',1200,5,0,30),
 ('exp_icon_vaultbreaker','cosmetic_icon',3500,15,0,40),
 ('exp_consumable_boon_reroll','consumable',500,10,3,50),
 ('exp_consumable_second_chance','consumable',750,10,2,60),
 ('exp_currency_relic_pack','currency_pack',1000,10,2,70),
 ('exp_currency_commendation_pack','currency_pack',800,8,3,80),
 ('exp_utility_charge_refresh','utility',1200,12,1,90)
on conflict (item_id) do nothing;

create or replace function public.expedition_shop_state_v1()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
 v_uid uuid := auth.uid();
 v_week date := public.expedition_week_key(now());
 v_balance bigint;
 v_level integer;
 v_offers jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

 insert into public.expedition_wallets(account_id) values(v_uid) on conflict do nothing;
 select expedition_marks into v_balance from public.expedition_wallets where account_id = v_uid;
 select coalesce(max(level),1) into v_level from public.characters where account_id = v_uid;

 select coalesce(jsonb_agg(row), '[]'::jsonb) into v_offers from (
  select jsonb_build_object(
   'itemId', c.item_id,
   'category', c.category,
   'markCost', c.mark_cost,
   'requiredAccountLevel', c.required_account_level,
   'weeklyLimit', c.weekly_limit,
   'owned', coalesce(o.item_id is not null, false),
   'weeklyPurchased', coalesce(w.count, 0),
   'lockedReason', case
    when v_level < c.required_account_level then 'account_level_locked'
    when o.item_id is not null and c.weekly_limit = 0 then 'already_owned'
    when c.weekly_limit > 0 and coalesce(w.count, 0) >= c.weekly_limit then 'weekly_limit_reached'
    else null
   end
  ) as row
  from public.expedition_shop_catalogue c
  left join public.expedition_shop_owned o on o.account_id = v_uid and o.item_id = c.item_id
  left join public.expedition_shop_weekly w on w.account_id = v_uid and w.item_id = c.item_id and w.week_key = v_week
  where c.enabled
  order by c.sort_order, c.item_id
 ) ordered;

 return jsonb_build_object(
  'balance', coalesce(v_balance, 0),
  'weekKey', v_week,
  'offers', v_offers
 );
end $$;

create or replace function public.expedition_shop_purchase_v1(
 p_item_id text,
 p_request_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
 v_uid uuid := auth.uid();
 v_week date := public.expedition_week_key(now());
 v_cost bigint;
 v_category text;
 v_required_level integer;
 v_weekly_limit integer;
 v_enabled boolean;
 v_level integer;
 v_balance bigint;
 v_weekly_count integer;
 v_prior jsonb;
 v_result jsonb;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 if p_item_id is null or p_request_id is null then raise exception 'INVALID_PURCHASE_INPUT'; end if;
 if length(p_request_id) not between 8 and 64 then raise exception 'INVALID_REQUEST_ID'; end if;

 select result into v_prior from public.expedition_shop_ledger
  where account_id = v_uid and request_id = p_request_id;
 if found then return v_prior || jsonb_build_object('idempotent_replay', true); end if;

 select mark_cost, category, required_account_level, weekly_limit, enabled
  into v_cost, v_category, v_required_level, v_weekly_limit, v_enabled
  from public.expedition_shop_catalogue where item_id = p_item_id;
 if not found then raise exception 'unknown_shop_item'; end if;
 if not v_enabled then raise exception 'shop_item_not_released'; end if;

 select coalesce(max(level),1) into v_level from public.characters where account_id = v_uid;
 if v_level < v_required_level then raise exception 'account_level_locked'; end if;

 insert into public.expedition_wallets(account_id) values(v_uid) on conflict do nothing;
 select expedition_marks into v_balance from public.expedition_wallets
  where account_id = v_uid for update;
 if v_balance < v_cost then raise exception 'insufficient_expedition_marks'; end if;

 if v_weekly_limit = 0 then
  if exists (select 1 from public.expedition_shop_owned
   where account_id = v_uid and item_id = p_item_id) then
   raise exception 'already_owned';
  end if;
  insert into public.expedition_shop_owned(account_id, item_id) values(v_uid, p_item_id);
 else
  insert into public.expedition_shop_weekly(account_id, week_key, item_id)
   values(v_uid, v_week, p_item_id) on conflict do nothing;
  select count into v_weekly_count from public.expedition_shop_weekly
   where account_id = v_uid and week_key = v_week and item_id = p_item_id for update;
  if v_weekly_count >= v_weekly_limit then raise exception 'weekly_limit_reached'; end if;
  update public.expedition_shop_weekly set count = count + 1
   where account_id = v_uid and week_key = v_week and item_id = p_item_id;
 end if;

 update public.expedition_wallets
  set expedition_marks = expedition_marks - v_cost, updated_at = now()
  where account_id = v_uid;

 insert into public.expedition_currency_ledger(account_id, run_id, currency, amount, reason, idempotency_key)
  values(v_uid, null, 'expedition_mark', -v_cost, 'shop_purchase:'||p_item_id,
   'exp-shop:'||v_uid::text||':'||p_request_id);

 v_result := jsonb_build_object(
  'status', 'purchased',
  'itemId', p_item_id,
  'category', v_category,
  'markCost', v_cost,
  'balance', v_balance - v_cost,
  'weekKey', v_week
 );

 insert into public.expedition_shop_ledger(account_id, request_id, item_id, mark_amount, result)
  values(v_uid, p_request_id, p_item_id, -v_cost, v_result);

 return v_result;
exception
 when unique_violation then
  select result into v_prior from public.expedition_shop_ledger
   where account_id = v_uid and request_id = p_request_id;
  if found then return v_prior || jsonb_build_object('idempotent_replay', true); end if;
  raise;
end $$;

revoke all on public.expedition_shop_catalogue, public.expedition_shop_owned,
 public.expedition_shop_weekly, public.expedition_shop_ledger
 from public, anon, authenticated;

revoke all on function public.expedition_shop_state_v1() from public, anon;
grant execute on function public.expedition_shop_state_v1() to authenticated;

revoke all on function public.expedition_shop_purchase_v1(text, text)
 from public, anon, authenticated;
-- Purchase RPC stays service_role only until entitlement delivery is reviewed
-- per enabled row, matching the guild shop precedent.
grant execute on function public.expedition_shop_purchase_v1(text, text) to service_role;
