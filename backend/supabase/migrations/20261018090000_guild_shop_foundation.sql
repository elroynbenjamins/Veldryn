-- Guild Shop foundation. No purchase/grant functions are exposed by this migration.
-- UUID account identity matches Supabase auth; guild identity must be adapted during integration.
create table if not exists public.guild_shop_wallets (
 account_id uuid primary key references auth.users(id) on delete cascade,
 balance bigint not null default 0 check (balance >= 0)
);
create table if not exists public.guild_shop_ledger (
 account_id uuid not null references auth.users(id) on delete cascade,
 claim_key text not null,
 amount bigint not null check (amount <> 0),
 kind text not null check (kind in ('standard','event','purchase')),
 created_at timestamptz not null default now(),
 primary key (account_id, claim_key)
);
create table if not exists public.guild_shop_weekly (
 account_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null,
 earned integer not null default 0 check (earned between 0 and 250),
 primary key (account_id, week_start)
);
create table if not exists public.guild_shop_owned (
 account_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null,
 purchased_at timestamptz not null default now(),
 primary key (account_id, item_id)
);
alter table public.guild_shop_wallets enable row level security;
alter table public.guild_shop_ledger enable row level security;
alter table public.guild_shop_weekly enable row level security;
alter table public.guild_shop_owned enable row level security;
revoke all on public.guild_shop_wallets, public.guild_shop_ledger, public.guild_shop_weekly, public.guild_shop_owned from anon, authenticated;
