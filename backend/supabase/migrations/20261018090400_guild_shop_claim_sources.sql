-- Corrected wallet snapshot is intentionally server-only.
-- SECURITY DEFINER would be dangerous here without an explicit account check.
-- Service-role access is verified by the gateway, and RLS stays enabled.
-- The server transaction must use the same database connection for entitlement
-- delivery; client-visible purchase success must only follow a committed reward.
create table if not exists public.guild_shop_claim_sources (
 account_id uuid not null references auth.users(id) on delete cascade,
 claim_key text not null,
 verified_at timestamptz not null default now(),
 consumed_at timestamptz,
 primary key (account_id,claim_key)
);
alter table public.guild_shop_claim_sources enable row level security;
revoke all on public.guild_shop_claim_sources from anon,authenticated;
-- No client INSERT/UPDATE grants. Source rows must be inserted by trusted
-- verification of real guild actions or event milestone completion.
