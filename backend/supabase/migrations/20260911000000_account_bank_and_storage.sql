-- Account-wide Bank and authoritative storage operations.
-- Inventory remains character-scoped; Bank ownership belongs to auth.uid().

alter table public.characters add column if not exists inventory_capacity integer not null default 30 check (inventory_capacity between 30 and 100);
alter table public.item_instances add column if not exists stackable boolean not null default true;
update public.item_instances set stackable=false where equipped_slot is not null;

create table if not exists public.account_storage (
  account_id uuid primary key references auth.users(id) on delete cascade,
  bank_capacity integer not null default 120 check (bank_capacity between 120 and 500),
  updated_at timestamptz not null default now()
);
create table if not exists public.account_bank_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  source_character_id uuid references public.characters(id) on delete set null,
  item_id text not null,
  quantity integer not null check (quantity > 0),
  stackable boolean not null default true,
  bound boolean not null default false,
  upgrade_rank smallint not null default 0 check (upgrade_rank between 0 and 10),
  enchant_rank smallint not null default 0 check (enchant_rank between 0 and 5),
  rarity text not null default 'common' check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists account_bank_items_owner_idx on public.account_bank_items(account_id,item_id);

create table if not exists public.storage_operation_receipts (
  account_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  operation text not null check (operation in ('deposit','withdraw','upgrade_inventory','upgrade_bank')),
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key(account_id,idempotency_key)
);

alter table public.account_storage enable row level security;
alter table public.account_bank_items enable row level security;
alter table public.storage_operation_receipts enable row level security;
create policy "owner reads storage" on public.account_storage for select using(account_id=auth.uid());
create policy "owner reads bank items" on public.account_bank_items for select using(account_id=auth.uid());
create policy "owner reads storage receipts" on public.storage_operation_receipts for select using(account_id=auth.uid());
grant select on public.account_storage,public.account_bank_items,public.storage_operation_receipts to authenticated;

create or replace function public.transfer_storage_item(
  p_character_id uuid,
  p_item_row_id uuid,
  p_quantity integer,
  p_direction text,
  p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid(); v_receipt jsonb; v_inventory public.item_instances%rowtype;
  v_bank public.account_bank_items%rowtype; v_capacity integer; v_slots integer; v_target uuid; v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_direction not in ('deposit','withdraw') then raise exception 'INVALID_DIRECTION'; end if;
  if p_quantity<=0 or char_length(p_idempotency_key)<8 then raise exception 'INVALID_REQUEST'; end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED'; end if;
  select response_json into v_receipt from public.storage_operation_receipts where account_id=v_uid and idempotency_key=p_idempotency_key;
  if found then return v_receipt||jsonb_build_object('replayed',true); end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  insert into public.account_storage(account_id) values(v_uid) on conflict(account_id) do nothing;

  if p_direction='deposit' then
    select * into v_inventory from public.item_instances where id=p_item_row_id and character_id=p_character_id for update;
    if not found then raise exception 'ITEM_NOT_OWNED'; end if;
    if v_inventory.equipped_slot is not null then raise exception 'UNEQUIP_ITEM_FIRST'; end if;
    if p_quantity>v_inventory.quantity then raise exception 'INSUFFICIENT_QUANTITY'; end if;
    select bank_capacity into v_capacity from public.account_storage where account_id=v_uid for update;
    select count(*) into v_slots from public.account_bank_items where account_id=v_uid;
    select id into v_target from public.account_bank_items where account_id=v_uid and stackable and v_inventory.stackable and item_id=v_inventory.item_id and bound=v_inventory.bound and upgrade_rank=v_inventory.upgrade_rank and enchant_rank=v_inventory.enchant_rank and rarity=v_inventory.rarity limit 1 for update;
    if v_target is null and v_slots>=v_capacity then raise exception 'BANK_FULL'; end if;
    if v_target is null then
      insert into public.account_bank_items(account_id,source_character_id,item_id,quantity,stackable,bound,upgrade_rank,enchant_rank,rarity)
      values(v_uid,p_character_id,v_inventory.item_id,p_quantity,v_inventory.stackable,v_inventory.bound,v_inventory.upgrade_rank,v_inventory.enchant_rank,v_inventory.rarity) returning id into v_target;
    else update public.account_bank_items set quantity=quantity+p_quantity,updated_at=now() where id=v_target; end if;
    if p_quantity=v_inventory.quantity then delete from public.item_instances where id=v_inventory.id;
    else update public.item_instances set quantity=quantity-p_quantity where id=v_inventory.id; end if;
  else
    select * into v_bank from public.account_bank_items where id=p_item_row_id and account_id=v_uid for update;
    if not found then raise exception 'BANK_ITEM_NOT_OWNED'; end if;
    if p_quantity>v_bank.quantity then raise exception 'INSUFFICIENT_QUANTITY'; end if;
    select inventory_capacity into v_capacity from public.characters where id=p_character_id for update;
    select count(*) into v_slots from public.item_instances where character_id=p_character_id and equipped_slot is null;
    select id into v_target from public.item_instances where character_id=p_character_id and equipped_slot is null and stackable and v_bank.stackable and item_id=v_bank.item_id and bound=v_bank.bound and upgrade_rank=v_bank.upgrade_rank and enchant_rank=v_bank.enchant_rank and rarity=v_bank.rarity limit 1 for update;
    if v_target is null and v_slots>=v_capacity then raise exception 'INVENTORY_FULL'; end if;
    if v_target is null then
      insert into public.item_instances(character_id,item_id,quantity,stackable,bound,upgrade_rank,enchant_rank,rarity)
      values(p_character_id,v_bank.item_id,p_quantity,v_bank.stackable,v_bank.bound,v_bank.upgrade_rank,v_bank.enchant_rank,v_bank.rarity) returning id into v_target;
    else update public.item_instances set quantity=quantity+p_quantity where id=v_target; end if;
    if p_quantity=v_bank.quantity then delete from public.account_bank_items where id=v_bank.id;
    else update public.account_bank_items set quantity=quantity-p_quantity,updated_at=now() where id=v_bank.id; end if;
  end if;
  v_result=jsonb_build_object('replayed',false,'direction',p_direction,'quantity',p_quantity,'targetRowId',v_target);
  insert into public.storage_operation_receipts(account_id,idempotency_key,operation,response_json) values(v_uid,p_idempotency_key,p_direction,v_result);
  return v_result;
end $$;

create or replace function public.upgrade_storage_capacity(p_character_id uuid,p_location text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid(); v_current integer; v_next integer; v_cost bigint; v_receipt jsonb; v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_location not in ('inventory','bank') or char_length(p_idempotency_key)<8 then raise exception 'INVALID_REQUEST'; end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'CHARACTER_NOT_OWNED'; end if;
  select response_json into v_receipt from public.storage_operation_receipts where account_id=v_uid and idempotency_key=p_idempotency_key;
  if found then return v_receipt||jsonb_build_object('replayed',true); end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
  insert into public.account_storage(account_id) values(v_uid) on conflict(account_id) do nothing;
  if p_location='inventory' then select inventory_capacity into v_current from public.characters where id=p_character_id for update;
  else select bank_capacity into v_current from public.account_storage where account_id=v_uid for update; end if;
  if p_location='inventory' then
    select capacity,cost into v_next,v_cost from (values(40,500::bigint),(50,1500),(60,4000),(75,10000),(100,25000)) as tiers(capacity,cost) where capacity>v_current order by capacity limit 1;
  else select capacity,cost into v_next,v_cost from (values(160,1000::bigint),(220,3000),(300,8000),(400,20000),(500,50000)) as tiers(capacity,cost) where capacity>v_current order by capacity limit 1; end if;
  if v_next is null then raise exception 'STORAGE_MAXED'; end if;
  update public.character_wallets set gold=gold-v_cost,updated_at=now() where character_id=p_character_id and gold>=v_cost;
  if not found then raise exception 'INSUFFICIENT_GOLD'; end if;
  if p_location='inventory' then update public.characters set inventory_capacity=v_next,updated_at=now() where id=p_character_id;
  else update public.account_storage set bank_capacity=v_next,updated_at=now() where account_id=v_uid; end if;
  v_result=jsonb_build_object('replayed',false,'location',p_location,'capacity',v_next,'goldSpent',v_cost);
  insert into public.storage_operation_receipts(account_id,idempotency_key,operation,response_json) values(v_uid,p_idempotency_key,'upgrade_'||p_location,v_result);
  return v_result;
end $$;

revoke all on function public.transfer_storage_item(uuid,uuid,integer,text,text) from public;
revoke all on function public.upgrade_storage_capacity(uuid,text,text) from public;
grant execute on function public.transfer_storage_item(uuid,uuid,integer,text,text) to authenticated;
grant execute on function public.upgrade_storage_capacity(uuid,text,text) to authenticated;
