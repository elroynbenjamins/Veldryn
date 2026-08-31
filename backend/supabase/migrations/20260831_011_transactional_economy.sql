-- v1.0: production transaction boundaries for idle claims, crafting, and market escrow.
create table if not exists public.character_wallets (
  character_id uuid primary key,
  gold bigint not null default 0 check (gold >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.idle_claim_receipts (
  claim_id uuid primary key default gen_random_uuid(), character_id uuid not null,
  idempotency_key text not null, activity_id text not null, elapsed_sec integer not null,
  resource_amount bigint not null, xp_amount bigint not null, created_at timestamptz not null default now(),
  unique(character_id,idempotency_key)
);
create table if not exists public.craft_receipts (
  receipt_id uuid primary key default gen_random_uuid(), character_id uuid not null,
  idempotency_key text not null, recipe_id text not null, quantity integer not null check(quantity>0),
  created_at timestamptz not null default now(), unique(character_id,idempotency_key)
);
alter table if exists public.market_orders add column if not exists wallet_character_id uuid;
alter table if exists public.market_orders add column if not exists escrow_gold bigint not null default 0;
alter table if exists public.market_orders add column if not exists escrow_quantity bigint not null default 0;

create or replace function public.claim_idle_progress_atomic(
  p_character_id uuid, p_idempotency_key text, p_activity_id text,
  p_elapsed_sec integer, p_resource_item_id text, p_resource_amount bigint, p_xp_amount bigint
) returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.idle_claim_receipts;
begin
  if p_elapsed_sec < 0 or p_elapsed_sec > 86400 then raise exception 'invalid_elapsed'; end if;
  select * into r from public.idle_claim_receipts where character_id=p_character_id and idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('replayed',true,'claim_id',r.claim_id); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_character_id::text,0));
  -- Application server must compute rates from canonical content. DB only commits the already server-validated result atomically.
  if p_resource_amount > 2147483647 then raise exception 'resource_amount_too_large'; end if;
  insert into public.item_instances(character_id,item_id,quantity,bound)
    values(p_character_id,p_resource_item_id,p_resource_amount::integer,false);
  insert into public.idle_claim_receipts(character_id,idempotency_key,activity_id,elapsed_sec,resource_amount,xp_amount)
    values(p_character_id,p_idempotency_key,p_activity_id,p_elapsed_sec,p_resource_amount,p_xp_amount) returning * into r;
  return jsonb_build_object('replayed',false,'claim_id',r.claim_id,'resource_amount',p_resource_amount,'xp',p_xp_amount);
end $$;

create or replace function public.reserve_market_buy_gold(p_character_id uuid,p_order_id uuid,p_gold bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
  if p_gold<=0 then raise exception 'invalid_gold'; end if;
  update public.character_wallets set gold=gold-p_gold,updated_at=now() where character_id=p_character_id and gold>=p_gold;
  if not found then raise exception 'insufficient_gold'; end if;
  update public.market_orders set escrow_gold=escrow_gold+p_gold,wallet_character_id=p_character_id where id=p_order_id;
  if not found then raise exception 'order_not_found'; end if;
end $$;
