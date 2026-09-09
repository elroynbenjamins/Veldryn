-- Server-controlled limited-time events. Rewards are account-bound cosmetics only.
create table if not exists public.live_events (
  event_id text primary key,
  name text not null,
  currency_id text not null,
  enabled boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.event_progress (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  progress bigint not null default 0 check(progress >= 0),
  currency_balance bigint not null default 0 check(currency_balance >= 0),
  updated_at timestamptz not null default now(),
  primary key(account_id,event_id)
);

create table if not exists public.event_cosmetic_unlocks (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  reward_id text not null,
  reward_type text not null check(reward_type in ('skin','pet','background','border','emote','title')),
  unlocked_at timestamptz not null default now(),
  primary key(account_id,reward_id)
);

-- A unique server receipt prevents reconnects from awarding the same activity twice.
create table if not exists public.event_drop_receipts (
  receipt_id uuid primary key,
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  source text not null check(source in ('combat','gathering','crafting','boss')),
  quantity integer not null check(quantity > 0),
  created_at timestamptz not null default now()
);

alter table public.live_events enable row level security;
alter table public.event_progress enable row level security;
alter table public.event_cosmetic_unlocks enable row level security;
alter table public.event_drop_receipts enable row level security;

create policy "read currently active events" on public.live_events for select to anon,authenticated
  using(enabled and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "read own event progress" on public.event_progress for select to authenticated using(account_id=auth.uid());
create policy "read own event cosmetics" on public.event_cosmetic_unlocks for select to authenticated using(account_id=auth.uid());

create or replace function public.active_live_events()
returns table(event_id text,name text,currency_id text,starts_at timestamptz,ends_at timestamptz,config jsonb)
language sql stable security definer set search_path=public as $$
  select e.event_id,e.name,e.currency_id,e.starts_at,e.ends_at,e.config
  from public.live_events e
  where e.enabled and (e.starts_at is null or e.starts_at<=now()) and (e.ends_at is null or e.ends_at>now())
  order by e.starts_at desc nulls last;
$$;

revoke all on function public.active_live_events() from public;
grant execute on function public.active_live_events() to anon,authenticated;

-- The first event is intentionally disabled. Operators enable it and set its dates in the dashboard.
insert into public.live_events(event_id,name,currency_id,enabled,config)
values('EVT_ANNUAL_009_2026','Harvestwake','HARVEST_MARK',false,'{
  "currencyName":"Harvest Marks",
  "dropRates":{"combat":0.18,"gathering":0.24,"crafting":8,"boss":50},
  "milestones":[
    {"points":40,"kind":"emote","rewardId":"emote_harvest_cheer","name":"Harvest Cheer"},
    {"points":100,"kind":"title","rewardId":"title_feast_friend","name":"Friend of the Feast"},
    {"points":225,"kind":"pet","rewardId":"pet_harvest_fox","name":"Harvest Fox"},
    {"points":400,"kind":"background","rewardId":"bg_grand_storehouse","name":"Grand Storehouse"},
    {"points":650,"kind":"border","rewardId":"frame_amber_vine","name":"Amber Vine"},
    {"points":1000,"kind":"skin","rewardId":"skin_harvestwake_class","name":"Class Harvest Skin"}
  ]
}'::jsonb)
on conflict(event_id) do nothing;
