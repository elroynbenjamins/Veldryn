-- Hidden V9 buyer gear transfer: still inaccessible, no client RPC grants.
-- V1 and V8 disabled CHECK constraints remain unchanged.
begin;

alter table private.market_equipment_escrows_v8
  drop constraint if exists market_equipment_escrows_v8_status_check;
alter table private.market_equipment_escrows_v8
  add constraint market_equipment_escrow_status_v9
    check(status in ('held','returned','sold'));

alter table private.market_action_receipts_v2
  drop constraint if exists market_action_receipt_action_v8;
alter table private.market_action_receipts_v2
  add constraint market_action_receipt_action_v9
    check(action in ('reserve','cancel','expire','claim_return','claim_purchase',
      'publish_offer','cancel_offer','reserve_equipment',
      'cancel_equipment','claim_equipment_return',
      'publish_equipment_offer','cancel_equipment_offer',
      'claim_equipment_purchase'));

create table private.market_equipment_purchase_deliveries_v9(
  delivery_id uuid primary key default pg_catalog.gen_random_uuid(),
  source_hold_id uuid not null unique
    references private.market_equipment_escrows_v8(source_hold_id) on delete restrict,
  buyer_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  seller_account_id uuid not null references public.online_game_states(account_id)
    on delete restrict,
  exact_instance_id text not null check(length(exact_instance_id) between 1 and 180),
  item_id text not null check(length(item_id) between 1 and 180),
  stack_payload jsonb not null check(pg_catalog.jsonb_typeof(stack_payload)='object'),
  receipt_payload jsonb not null check(pg_catalog.jsonb_typeof(receipt_payload)='object'),
  status text not null default 'pending' check(status in ('pending','claimed')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  destination_location text,
  destination_character_id text,
  destination_revision bigint,
  constraint market_gear_purchase_distinct_v9 check(buyer_account_id<>seller_account_id),
  constraint market_gear_purchase_claim_shape_v9 check(
    (status='pending' and claimed_at is null and destination_location is null
     and destination_character_id is null and destination_revision is null)
    or (status='claimed' and claimed_at is not null
     and destination_location in ('inventory','bank','equipment_pouch')
     and destination_character_id is not null and destination_revision>=0)
  )
);
create index market_equipment_purchase_buyer_pending_v9
  on private.market_equipment_purchase_deliveries_v9(buyer_account_id,created_at)
  where status='pending';
alter table private.market_equipment_purchase_deliveries_v9 enable row level security;
revoke all on table private.market_equipment_purchase_deliveries_v9
  from public,anon,authenticated,service_role;
commit;
