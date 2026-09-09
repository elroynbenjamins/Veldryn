-- Reusable contracts, shop, event decisions and contribution ledger.
alter table public.event_progress
  add column if not exists prestige_balance bigint not null default 0 check(prestige_balance >= 0),
  add column if not exists repeat_cache_claims integer not null default 0 check(repeat_cache_claims >= 0),
  add column if not exists activity_totals jsonb not null default '{}'::jsonb;
alter table public.event_drop_receipts add column if not exists activity_units integer not null default 1 check(activity_units > 0);

create table if not exists public.event_objective_claims (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  contract_day date not null,
  objective_id text not null,
  claimed_at timestamptz not null default now(),
  primary key(account_id,event_id,contract_day,objective_id)
);

create table if not exists public.event_contract_acceptances (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  contract_day date not null,
  objective_id text not null,
  progress_baseline bigint not null default 0 check(progress_baseline >= 0),
  accepted_at timestamptz not null default now(),
  primary key(account_id,event_id,contract_day,objective_id)
);

create table if not exists public.event_weekly_claims (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  week_start date not null,
  objective_id text not null,
  claimed_at timestamptz not null default now(),
  primary key(account_id,event_id,week_start,objective_id)
);

create table if not exists public.event_shop_purchases (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  offer_id text not null,
  quantity integer not null default 1 check(quantity > 0),
  purchased_at timestamptz not null default now(),
  primary key(account_id,event_id,offer_id)
);

create table if not exists public.event_choices (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  choice_id text not null,
  chosen_at timestamptz not null default now(),
  primary key(account_id,event_id)
);

create table if not exists public.event_contributions (
  id bigint generated always as identity primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  project_id text not null,
  quantity integer not null check(quantity > 0),
  receipt_id uuid not null unique,
  contributed_at timestamptz not null default now()
);

alter table public.event_objective_claims enable row level security;
alter table public.event_contract_acceptances enable row level security;
alter table public.event_weekly_claims enable row level security;
alter table public.event_shop_purchases enable row level security;
alter table public.event_choices enable row level security;
alter table public.event_contributions enable row level security;

create policy "read own event objective claims" on public.event_objective_claims for select to authenticated using(account_id=auth.uid());
create policy "read own event contract acceptances" on public.event_contract_acceptances for select to authenticated using(account_id=auth.uid());
create policy "read own event weekly claims" on public.event_weekly_claims for select to authenticated using(account_id=auth.uid());
create policy "read own event purchases" on public.event_shop_purchases for select to authenticated using(account_id=auth.uid());
create policy "read own event choices" on public.event_choices for select to authenticated using(account_id=auth.uid());
create policy "read own event contributions" on public.event_contributions for select to authenticated using(account_id=auth.uid());

-- Updating the data definition preserves the operator-controlled enabled flag and schedule.
update public.live_events set config='{
  "progressionName":"Harvest Reputation","maxProgress":10000,
  "currencyName":"Harvest Marks","prestigeCurrencyId":"AMBER_SEED","prestigeCurrencyName":"Amber Seeds",
  "dropRates":{"combat":0.18,"gathering":1.1,"crafting":30,"boss":250},
  "objectives":[
    {"id":"field_work","source":"gathering","required":180,"rewardCurrency":250,"rewardPrestige":1},
    {"id":"hearth_orders","source":"crafting","required":12,"rewardCurrency":350,"rewardPrestige":1},
    {"id":"spirit_defense","source":"combat","required":300,"rewardCurrency":300,"rewardPrestige":1},
    {"id":"folklore_guardian","source":"boss","required":1,"rewardCurrency":500,"rewardPrestige":2}
  ],
  "weeklyObjectives":[
    {"id":"weekly_supplier","source":"gathering","required":900,"rewardCurrency":900,"rewardPrestige":2},
    {"id":"weekly_artisan","source":"crafting","required":50,"rewardCurrency":1100,"rewardPrestige":2},
    {"id":"weekly_watch","source":"combat","required":1800,"rewardCurrency":1000,"rewardPrestige":2}
  ],
  "communityStages":[25,50,75,100],
  "choices":["preserved_supplies","reinforced_workshop","travelers_stock","guild_pantry"],
  "milestones":[
    {"points":400,"kind":"emote","rewardId":"emote_harvest_cheer"},
    {"points":1000,"kind":"title","rewardId":"title_feast_friend"},
    {"points":2250,"kind":"pet","rewardId":"pet_harvest_fox"},
    {"points":4000,"kind":"background","rewardId":"bg_grand_storehouse"},
    {"points":6500,"kind":"border","rewardId":"frame_amber_vine"},
    {"points":10000,"kind":"skin","rewardId":"skin_harvestwake_class"}
  ],
  "shop":[
    {"offerId":"market_golden_fields","kind":"background","rewardId":"bg_harvestwake","currency":"common","cost":900,"limit":1},
    {"offerId":"market_wheat_crown","kind":"border","rewardId":"frame_wheat_crown","currency":"common","cost":1800,"limit":1},
    {"offerId":"market_field_mouse","kind":"pet","rewardId":"pet_field_mouse","currency":"common","cost":2400,"limit":1},
    {"offerId":"pantry_amber_owl","kind":"pet","rewardId":"pet_amber_owl","currency":"prestige","cost":4,"limit":1}
  ]
}'::jsonb,updated_at=now()
where event_id='EVT_ANNUAL_009_2026';

create or replace function public.accept_event_contract(p_event_id text,p_objective_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_day date:=(now() at time zone 'utc')::date;v_source text;v_baseline bigint:=0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select objective->>'source' into v_source from public.live_events e cross join lateral jsonb_array_elements(e.config->'objectives') objective
    where e.event_id=p_event_id and e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now()) and objective->>'id'=p_objective_id;
  if v_source is null then raise exception 'CONTRACT_NOT_AVAILABLE'; end if;
  if (select count(*) from public.event_contract_acceptances where account_id=v_uid and event_id=p_event_id and contract_day=v_day)>=2 then raise exception 'CONTRACT_LIMIT_REACHED'; end if;
  select coalesce((activity_totals->>v_source)::bigint,0) into v_baseline from public.event_progress where account_id=v_uid and event_id=p_event_id;
  insert into public.event_contract_acceptances(account_id,event_id,contract_day,objective_id,progress_baseline) values(v_uid,p_event_id,v_day,p_objective_id,coalesce(v_baseline,0)) on conflict do nothing;
end $$;

create or replace function public.claim_event_contract(p_event_id text,p_objective_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_day date:=(now() at time zone 'utc')::date;v_source text;v_required bigint;v_common bigint;v_prestige bigint;v_baseline bigint;v_total bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select objective->>'source',(objective->>'required')::bigint,(objective->>'rewardCurrency')::bigint,(objective->>'rewardPrestige')::bigint
    into v_source,v_required,v_common,v_prestige from public.live_events e cross join lateral jsonb_array_elements(e.config->'objectives') objective
    where e.event_id=p_event_id and e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now()) and objective->>'id'=p_objective_id;
  select progress_baseline into v_baseline from public.event_contract_acceptances where account_id=v_uid and event_id=p_event_id and contract_day=v_day and objective_id=p_objective_id;
  if v_source is null or v_baseline is null then raise exception 'CONTRACT_NOT_ACCEPTED'; end if;
  select coalesce((activity_totals->>v_source)::bigint,0) into v_total from public.event_progress where account_id=v_uid and event_id=p_event_id for update;
  if coalesce(v_total,0)-v_baseline<v_required then raise exception 'CONTRACT_INCOMPLETE'; end if;
  insert into public.event_objective_claims(account_id,event_id,contract_day,objective_id) values(v_uid,p_event_id,v_day,p_objective_id) on conflict do nothing;
  if not found then raise exception 'CONTRACT_ALREADY_CLAIMED'; end if;
  update public.event_progress set progress=progress+v_common,currency_balance=currency_balance+v_common,prestige_balance=prestige_balance+v_prestige,updated_at=now() where account_id=v_uid and event_id=p_event_id;
end $$;

revoke all on function public.accept_event_contract(text,text),public.claim_event_contract(text,text) from public;
grant execute on function public.accept_event_contract(text,text),public.claim_event_contract(text,text) to authenticated;

create or replace function public.claim_event_weekly(p_event_id text,p_objective_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_week date:=date_trunc('week',now() at time zone 'utc')::date;v_source text;v_required bigint;v_common bigint;v_prestige bigint;v_total bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select objective->>'source',(objective->>'required')::bigint,(objective->>'rewardCurrency')::bigint,(objective->>'rewardPrestige')::bigint
    into v_source,v_required,v_common,v_prestige from public.live_events e cross join lateral jsonb_array_elements(e.config->'weeklyObjectives') objective
    where e.event_id=p_event_id and e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now()) and objective->>'id'=p_objective_id;
  if v_source is null then raise exception 'WEEKLY_NOT_AVAILABLE'; end if;
  select coalesce(sum(activity_units),0) into v_total from public.event_drop_receipts where account_id=v_uid and event_id=p_event_id and source=v_source and created_at>=v_week::timestamptz and created_at<(v_week+7)::timestamptz;
  if v_total<v_required then raise exception 'WEEKLY_INCOMPLETE'; end if;
  insert into public.event_weekly_claims(account_id,event_id,week_start,objective_id) values(v_uid,p_event_id,v_week,p_objective_id) on conflict do nothing;
  if not found then raise exception 'WEEKLY_ALREADY_CLAIMED'; end if;
  update public.event_progress set progress=progress+v_common,currency_balance=currency_balance+v_common,prestige_balance=prestige_balance+v_prestige,updated_at=now() where account_id=v_uid and event_id=p_event_id;
end $$;

revoke all on function public.claim_event_weekly(text,text) from public;
grant execute on function public.claim_event_weekly(text,text) to authenticated;

create or replace function public.choose_event_project(p_event_id text,p_choice_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_existing text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.live_events e cross join lateral jsonb_array_elements_text(e.config->'choices') choice where e.event_id=p_event_id and e.enabled and choice=p_choice_id) then raise exception 'CHOICE_NOT_AVAILABLE'; end if;
  select choice_id into v_existing from public.event_choices where account_id=v_uid and event_id=p_event_id;
  if v_existing is not null and v_existing<>p_choice_id then raise exception 'CHOICE_ALREADY_LOCKED'; end if;
  insert into public.event_choices(account_id,event_id,choice_id) values(v_uid,p_event_id,p_choice_id) on conflict do nothing;
end $$;

create or replace function public.contribute_event_currency(p_event_id text,p_quantity integer,p_receipt_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_choice text;v_balance bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_quantity<=0 then raise exception 'INVALID_QUANTITY'; end if;
  if exists(select 1 from public.event_contributions where receipt_id=p_receipt_id) then return; end if;
  select choice_id into v_choice from public.event_choices where account_id=v_uid and event_id=p_event_id;
  if v_choice is null then raise exception 'CHOOSE_PROJECT_FIRST'; end if;
  select currency_balance into v_balance from public.event_progress where account_id=v_uid and event_id=p_event_id for update;
  if coalesce(v_balance,0)<p_quantity then raise exception 'INSUFFICIENT_EVENT_CURRENCY'; end if;
  update public.event_progress set currency_balance=currency_balance-p_quantity,updated_at=now() where account_id=v_uid and event_id=p_event_id;
  insert into public.event_contributions(account_id,event_id,project_id,quantity,receipt_id) values(v_uid,p_event_id,v_choice,p_quantity,p_receipt_id);
end $$;

create or replace function public.purchase_event_offer(p_event_id text,p_offer_id text)
returns void language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_offer jsonb;v_cost bigint;v_currency text;v_reward_id text;v_kind text;v_balance bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select offer into v_offer from public.live_events e cross join lateral jsonb_array_elements(e.config->'shop') offer
    where e.event_id=p_event_id and e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now()) and offer->>'offerId'=p_offer_id;
  if v_offer is null then raise exception 'OFFER_NOT_AVAILABLE'; end if;
  v_cost:=(v_offer->>'cost')::bigint;v_currency:=v_offer->>'currency';v_reward_id:=v_offer->>'rewardId';v_kind:=v_offer->>'kind';
  if exists(select 1 from public.event_shop_purchases where account_id=v_uid and event_id=p_event_id and offer_id=p_offer_id) then raise exception 'PURCHASE_LIMIT_REACHED'; end if;
  select case when v_currency='prestige' then prestige_balance else currency_balance end into v_balance from public.event_progress where account_id=v_uid and event_id=p_event_id for update;
  if coalesce(v_balance,0)<v_cost then raise exception 'INSUFFICIENT_EVENT_CURRENCY'; end if;
  if v_currency='prestige' then update public.event_progress set prestige_balance=prestige_balance-v_cost,updated_at=now() where account_id=v_uid and event_id=p_event_id;else update public.event_progress set currency_balance=currency_balance-v_cost,updated_at=now() where account_id=v_uid and event_id=p_event_id;end if;
  insert into public.event_shop_purchases(account_id,event_id,offer_id) values(v_uid,p_event_id,p_offer_id);
  insert into public.event_cosmetic_unlocks(account_id,event_id,reward_id,reward_type) values(v_uid,p_event_id,v_reward_id,v_kind) on conflict do nothing;
end $$;

revoke all on function public.choose_event_project(text,text),public.contribute_event_currency(text,integer,uuid),public.purchase_event_offer(text,text) from public;
grant execute on function public.choose_event_project(text,text),public.contribute_event_currency(text,integer,uuid),public.purchase_event_offer(text,text) to authenticated;
