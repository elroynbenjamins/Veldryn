-- Veldryn Party Events v16 — frozen canonical supply orders and transactional
-- material destruction. Draft only, no reward grant, stage advance or live API.
-- Depends on v11–v15. Missing verified herb availability blocks readiness.
begin;

create table private.party_event_supply_catalogue_v16 (
 item_id text primary key check (length(item_id) between 3 and 100),
 category text not null check(category in ('wood','ore','herb')),
 enabled boolean not null default false
);
-- Known live item IDs from the existing Guild supply catalogue.
insert into private.party_event_supply_catalogue_v16(item_id,category,enabled)
 select item_id,category,true from public.guild_project_supply_catalogue_v1
 where category in ('wood','ore');
-- Exists in the current Alchemy recipe content, but its gathering source,
-- availability and level unlock are not audited. NEVER enable implicitly.
insert into private.party_event_supply_catalogue_v16(item_id,category,enabled)
 values('THORN_SAP','herb',false);

create table private.party_event_supply_orders_v16 (
 id uuid primary key default gen_random_uuid(),
 party_id uuid not null,
 event_starts_at timestamptz not null,
 stage smallint not null check(stage between 1 and 3),
 item_id text not null references private.party_event_supply_catalogue_v16(item_id),
 category text not null check(category in ('wood','ore','herb')),
 kind text not null check(kind in ('required','optional')),
 target_quantity integer not null check(target_quantity between 1 and 10000),
 donated_quantity integer not null default 0 check(donated_quantity>=0),
 frozen_at timestamptz not null default now(),
 unique(party_id,event_starts_at,stage,item_id,kind),
 foreign key(party_id,event_starts_at,stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage)
  on delete cascade,
 constraint party_event_v16_no_overfill check(donated_quantity<=target_quantity)
);
create table private.party_event_supply_donations_v16 (
 id uuid primary key default gen_random_uuid(),
 request_id text not null unique check(length(request_id) between 8 and 180),
 order_id uuid not null references private.party_event_supply_orders_v16(id) on delete cascade,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 character_id uuid not null,
 item_id text not null,
 quantity integer not null check(quantity between 1 and 10000),
 created_at timestamptz not null default now(),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id)
  on delete cascade
);
create index party_event_supply_donations_order_v16
 on private.party_event_supply_donations_v16(order_id);

alter table private.party_event_supply_catalogue_v16 enable row level security;
alter table private.party_event_supply_orders_v16 enable row level security;
alter table private.party_event_supply_donations_v16 enable row level security;
revoke all on private.party_event_supply_catalogue_v16,
 private.party_event_supply_orders_v16,
 private.party_event_supply_donations_v16 from public,anon,authenticated;
grant select on private.party_event_supply_catalogue_v16,
 private.party_event_supply_orders_v16,
 private.party_event_supply_donations_v16 to service_role;
-- Only explicitly audited administration may enable new herb IDs.
-- No ad-hoc service_role write grant is provided.

create or replace function private.party_event_supply_order_guard_v16()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.id is distinct from new.id
  or old.party_id is distinct from new.party_id
  or old.event_starts_at is distinct from new.event_starts_at
  or old.stage is distinct from new.stage
  or old.item_id is distinct from new.item_id
  or old.category is distinct from new.category
  or old.kind is distinct from new.kind
  or old.target_quantity is distinct from new.target_quantity
  or old.frozen_at is distinct from new.frozen_at
  or new.donated_quantity<old.donated_quantity
 then raise exception 'party_event_v16_order_immutable';end if;
 return new;
end;$$;
create trigger party_event_supply_order_guard_v16 before update
 on private.party_event_supply_orders_v16 for each row
 execute function private.party_event_supply_order_guard_v16();
create trigger party_event_supply_donation_immutable_v16 before update
 on private.party_event_supply_donations_v16 for each row
 execute function private.party_event_progress_immutable_v14();

-- Server-only creation of immutable quantities determined from the v2
-- deterministic supply planner, never client user input. An order is
-- inserted once, cannot be reconfigured, and must use audited content IDs.
create or replace function private.freeze_party_event_supply_order_v16(
 p_party_id uuid,p_event_starts_at timestamptz,p_stage integer,
 p_item_id text,p_kind text,p_target_quantity integer
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 v_category text;v_id uuid;
begin
 if p_party_id is null or p_event_starts_at is null or
  p_stage not between 1 and 3 or p_kind not in ('required','optional')
  or p_target_quantity not between 1 and 10000 or
  p_item_id is null
 then raise exception 'party_event_v16_invalid_order';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found or w.status<>'active' or w.active_stage>p_stage
 then raise exception 'party_event_v16_order_window_closed';end if;
 select category into v_category from private.party_event_supply_catalogue_v16
 where item_id=p_item_id and enabled=true;
 if v_category is null then raise exception 'party_event_v16_resource_unverified';end if;
 if not exists(select 1 from private.party_event_stages_v11
   where party_id=p_party_id and event_starts_at=p_event_starts_at
     and stage=p_stage)
 then raise exception 'party_event_v16_stage_missing';end if;
 insert into private.party_event_supply_orders_v16(
  party_id,event_starts_at,stage,item_id,category,kind,target_quantity)
 values(p_party_id,p_event_starts_at,p_stage,p_item_id,v_category,p_kind,p_target_quantity)
 on conflict(party_id,event_starts_at,stage,item_id,kind) do nothing
 returning id into v_id;
 if v_id is null then
  select id into v_id from private.party_event_supply_orders_v16
   where party_id=p_party_id and event_starts_at=p_event_starts_at
    and stage=p_stage and item_id=p_item_id and kind=p_kind
    and target_quantity=p_target_quantity;
  if v_id is null then raise exception 'party_event_v16_order_conflict';end if;
 end if;
 return v_id;
end;$$;

create or replace function private.donate_party_event_supply_v16(
 p_party_id uuid,p_event_starts_at timestamptz,p_order_id uuid,
 p_account_id uuid,p_quantity integer,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 o private.party_event_supply_orders_v16%rowtype;
 existing private.party_event_supply_donations_v16%rowtype;
 g public.online_game_states%rowtype;
 v_character_id uuid;
 v_stacks jsonb;
 v_stack jsonb;
 v_new_stacks jsonb:='[]'::jsonb;
 v_take integer;
 v_left integer;
 v_have integer;
 v_now timestamptz:=clock_timestamp();
 v_locked_item_ids jsonb;
 v_donation_id uuid;
begin
 if p_party_id is null or p_event_starts_at is null or p_order_id is null
  or p_account_id is null or p_quantity not between 1 and 10000
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v16_invalid_donation';end if;

 -- Serialize against week transitions, order donations and account inventory.
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v16_week_missing';end if;

 select * into existing from private.party_event_supply_donations_v16
 where request_id=p_request_id for update;
 if found then
  if existing.party_id is distinct from p_party_id
    or existing.event_starts_at is distinct from p_event_starts_at
    or existing.order_id is distinct from p_order_id
    or existing.account_id is distinct from p_account_id
    or existing.quantity is distinct from p_quantity
  then raise exception 'party_event_v16_donation_request_conflict';end if;
  return jsonb_build_object('donationId',existing.id,'replayed',true,
   'itemsConsumed',0,'originalQuantity',existing.quantity);
 end if;

 if w.status<>'active' or v_now<w.event_starts_at
   or v_now>=w.event_ends_at
 then raise exception 'party_event_v16_donations_closed';end if;

 select * into o from private.party_event_supply_orders_v16
 where id=p_order_id and party_id=p_party_id and event_starts_at=p_event_starts_at
  for update;
 if not found then raise exception 'party_event_v16_order_not_found';end if;
 if o.stage<>w.active_stage then raise exception 'party_event_v16_wrong_stage';end if;
 if p_quantity>o.target_quantity-o.donated_quantity
 then raise exception 'party_event_v16_order_overfill';end if;
 if not exists(select 1 from private.party_event_supply_catalogue_v16
  where item_id=o.item_id and category=o.category and enabled=true)
 then raise exception 'party_event_v16_material_inactive';end if;

 select character_id into v_character_id
 from private.party_event_roster_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and account_id=p_account_id;
 if v_character_id is null then raise exception 'party_event_v16_not_enrolled';end if;

 select * into g from public.online_game_states
 where account_id=p_account_id and character_id=v_character_id for update;
 if not found or g.state is null then raise exception 'party_event_v16_online_inventory_required';end if;

 v_stacks:=coalesce(g.state#>'{inventory,stacks}','[]'::jsonb);
 v_locked_item_ids:=coalesce(g.state#>'{settings,lockedItemIds}','[]'::jsonb);
 if jsonb_typeof(v_stacks)<>'array' or jsonb_typeof(v_locked_item_ids)<>'array'
 then raise exception 'party_event_v16_inventory_invalid';end if;
 if v_locked_item_ids ? o.item_id then raise exception 'party_event_v16_item_locked';end if;

 v_left:=p_quantity;
 for v_stack in select value from jsonb_array_elements(v_stacks) loop
  if v_stack->>'itemId'=o.item_id and v_left>0
    and coalesce((v_stack->>'locked')::boolean,false)=false
    and coalesce((v_stack->>'bound')::boolean,false)=false
  then
   if (v_stack->>'quantity') is null or
      (v_stack->>'quantity') !~ '^[0-9]{1,9}$'
   then raise exception 'party_event_v16_inventory_quantity_invalid';end if;
   v_have:=(v_stack->>'quantity')::integer;
   v_take:=least(v_have,v_left);
   v_left:=v_left-v_take;
   if v_have>v_take then
    v_new_stacks:=v_new_stacks||jsonb_build_array(
      jsonb_set(v_stack,'{quantity}',to_jsonb(v_have-v_take)));
   end if;
  else
   v_new_stacks:=v_new_stacks||jsonb_build_array(v_stack);
  end if;
 end loop;
 if v_left>0 then raise exception 'party_event_v16_insufficient_items';end if;

 update public.online_game_states
 set state=jsonb_set(g.state,'{inventory,stacks}',v_new_stacks),
  revision=revision+1,updated_at=v_now
 where account_id=p_account_id and character_id=v_character_id;
 update private.party_event_supply_orders_v16
 set donated_quantity=donated_quantity+p_quantity where id=o.id;
 insert into private.party_event_supply_donations_v16(
  request_id,order_id,party_id,event_starts_at,account_id,character_id,
  item_id,quantity)
 values(p_request_id,o.id,p_party_id,p_event_starts_at,p_account_id,
  v_character_id,o.item_id,p_quantity)
 returning id into v_donation_id;

 return jsonb_build_object('donationId',v_donation_id,
  'replayed',false,'itemsConsumed',p_quantity,
  'itemId',o.item_id,'remaining',o.target_quantity-o.donated_quantity-p_quantity);
end;$$;

-- Read-only progress gates. The optional orders never block a stage.
-- All THREE resource categories are required to ensure the missing herb
-- catalogue is not silently reinterpreted as fish or ignored.
create or replace function private.party_event_stage_readiness_v16(
 p_party_id uuid,p_event_starts_at timestamptz
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 b jsonb;
 v_stage integer;
 v_categories integer;
 v_missing integer;
 v_verified boolean;
 v_all_present boolean;
 v_total integer;
 v_target integer;
 v_vote boolean;
 v_status text;
begin
 b:=private.party_event_stage_readiness_v15(p_party_id,p_event_starts_at);
 v_stage:=(b->>'stage')::integer;
 select count(distinct category)::integer,
  coalesce(sum(target_quantity-donated_quantity),0)::integer
 into v_categories,v_missing from private.party_event_supply_orders_v16
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=v_stage and kind='required';
 v_all_present:=v_categories=3 and
  exists(select 1 from private.party_event_supply_orders_v16
    where party_id=p_party_id and event_starts_at=p_event_starts_at
     and stage=v_stage and kind='required' and category='wood')
  and exists(select 1 from private.party_event_supply_orders_v16
    where party_id=p_party_id and event_starts_at=p_event_starts_at
     and stage=v_stage and kind='required' and category='ore')
  and exists(select 1 from private.party_event_supply_orders_v16
    where party_id=p_party_id and event_starts_at=p_event_starts_at
     and stage=v_stage and kind='required' and category='herb');
 v_verified:=v_all_present and v_missing=0;
 v_total:=(b->>'verifiedTotalEventPoints')::integer;
 v_target:=(b->>'cumulativeStageTarget')::integer;
 v_vote:=(b->>'voteLocked')::boolean;
 v_status:=case
  when b->>'eventStatus'<>'active' then 'closed'
  when v_total<v_target then 'awaiting_progress'
  when not v_verified then 'awaiting_supplies'
  when not v_vote then 'awaiting_vote'
  when v_stage=3 then 'awaiting_finale'
  else 'ready_for_manual_advance' end;
 return b||jsonb_build_object(
  'requiredSupplyCategories',v_categories,
  'requiredSuppliesRemaining',v_missing,
  'requiredSupplyPlanComplete',v_all_present,
  'requiredSuppliesVerified',v_verified,
  'status',v_status,
  'finaleVerified',false,
  'stageReadyToAdvance',false);
end;$$;

revoke all on function private.freeze_party_event_supply_order_v16(
 uuid,timestamptz,integer,text,text,integer) from public,anon,authenticated;
grant execute on function private.freeze_party_event_supply_order_v16(
 uuid,timestamptz,integer,text,text,integer) to service_role;
revoke all on function private.donate_party_event_supply_v16(
 uuid,timestamptz,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function private.donate_party_event_supply_v16(
 uuid,timestamptz,uuid,uuid,integer,text) to service_role;
revoke all on function private.party_event_stage_readiness_v16(
 uuid,timestamptz) from public,anon,authenticated;
grant execute on function private.party_event_stage_readiness_v16(
 uuid,timestamptz) to service_role;
revoke all on function private.party_event_supply_order_guard_v16()
 from public,anon,authenticated;
commit;
