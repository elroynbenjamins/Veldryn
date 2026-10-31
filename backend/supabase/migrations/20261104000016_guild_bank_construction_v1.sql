-- Guild Bank v1: shared, audited, idempotent deposits and construction spending.
-- No free withdrawal path. Only server-verified members may move personal stock,
-- and bank stock may be allocated only to enabled project requirements.
create table if not exists public.guild_bank_balances(
 guild_id uuid not null references public.guilds(id) on delete cascade,
 resource_id text not null,
 amount bigint not null default 0 check(amount>=0 and amount<=1000000000000),
 primary key(guild_id,resource_id)
);
create table if not exists public.guild_bank_deposits(
 account_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null,
 guild_id uuid not null references public.guilds(id) on delete cascade,
 resource_id text not null,
 amount integer not null check(amount between 1 and 1000000),
 created_at timestamptz not null default now(),
 primary key(account_id,request_key)
);
create table if not exists public.guild_bank_ledger(
 id bigint generated always as identity primary key,
 guild_id uuid not null references public.guilds(id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null,
 kind text not null check(kind in('deposit','construction')),
 resource_id text not null,
 amount integer not null check(amount between 1 and 1000000),
 template_id text,
 created_at timestamptz not null default now(),
 unique(account_id,kind,request_key)
);
create index if not exists guild_bank_ledger_guild_recent on public.guild_bank_ledger(guild_id,id desc);
alter table public.guild_bank_balances enable row level security;
alter table public.guild_bank_deposits enable row level security;
alter table public.guild_bank_ledger enable row level security;
revoke all on public.guild_bank_balances,public.guild_bank_deposits,public.guild_bank_ledger from public,anon,authenticated;
grant select,insert,update on public.guild_bank_balances to service_role;
grant select,insert on public.guild_bank_deposits to service_role;
grant select,insert on public.guild_bank_ledger to service_role;

-- Verified account-scoped read, never a caller-provided guild ID.
create or replace function public.guild_bank_snapshot_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_gid uuid;
begin
 select guild_id into v_gid from public.guild_members where account_id=p_account_id;
 if v_gid is null then raise exception 'guild_membership_required';end if;
 return jsonb_build_object(
  'balances',coalesce((select jsonb_agg(jsonb_build_object('resourceId',b.resource_id,'amount',b.amount) order by b.resource_id)
    from public.guild_bank_balances b where b.guild_id=v_gid and b.amount>0),'[]'::jsonb),
  'activity',coalesce((select jsonb_agg(jsonb_build_object(
      'kind',l.kind,'resourceId',l.resource_id,'amount',l.amount,
      'templateId',l.template_id,'mine',l.account_id=p_account_id,'createdAt',l.created_at
     ) order by l.id desc)
    from (select * from public.guild_bank_ledger where guild_id=v_gid order by id desc limit 20) l),'[]'::jsonb)
 );
end $$;
revoke all on function public.guild_bank_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_bank_snapshot_server_v1(uuid) to service_role;

-- The receipt and the player's actual Gold/inventory deduction commit in the
-- SAME transaction as the Guild Bank credit. Request retries are exactly-once.
create or replace function public.guild_bank_deposit_server_v1(
 p_account_id uuid,p_resource_id text,p_amount integer,p_request_key text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_guild uuid;v_level integer;v_existing public.guild_bank_deposits;
 v_game public.online_game_states;v_gold bigint;v_balance bigint;
 v_stacks jsonb;v_next jsonb:='[]'::jsonb;v_stack jsonb;
 v_have integer;v_take integer;v_remaining integer;v_locked boolean;
begin
 if p_account_id is null or p_resource_id is null or p_amount is null
  or p_amount<1 or p_amount>1000000 or p_request_key is null
  or p_request_key !~ '^[A-Za-z0-9_-]{8,128}$'
 then raise exception 'invalid_guild_bank_deposit';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-bank-account:'||p_account_id::text,0));
 select m.guild_id,g.level into v_guild,v_level
 from public.guild_members m join public.guilds g on g.id=m.guild_id
 where m.account_id=p_account_id limit 1;
 if v_guild is null then raise exception 'guild_membership_required';end if;
 select * into v_existing from public.guild_bank_deposits
 where account_id=p_account_id and request_key=p_request_key;
 if found then
  if v_existing.guild_id<>v_guild or v_existing.resource_id<>p_resource_id
    or v_existing.amount<>p_amount then raise exception 'guild_bank_request_conflict';end if;
  return jsonb_build_object('alreadyProcessed',true,'amount',p_amount,'resourceId',p_resource_id);
 end if;
 -- Never trap members' resources in an unreleased or inaccessible project.
 if not exists(
   select 1 from public.guild_construction_templates t
   join public.guild_construction_requirements req on req.template_id=t.template_id
   where t.enabled and t.required_guild_level<=v_level
   and req.resource_id=p_resource_id
 ) then raise exception 'guild_bank_resource_unavailable';end if;
 select * into v_game from public.online_game_states where account_id=p_account_id for update;
 if not found or v_game.character_id is null or v_game.state is null
 then raise exception 'character_required';end if;
 if p_resource_id='gold' then
  select gold into v_gold from public.character_wallets where character_id=v_game.character_id for update;
  if v_gold is null or v_gold<p_amount then raise exception 'insufficient_gold';end if;
  update public.character_wallets set gold=gold-p_amount,updated_at=now()
   where character_id=v_game.character_id;
  update public.online_game_states set revision=revision+1,updated_at=now(),
   state=jsonb_set(state,'{character,gold}',to_jsonb(v_gold-p_amount))
   where account_id=p_account_id;
 else
  v_locked:=coalesce(v_game.state#>'{settings,lockedItemIds}','[]'::jsonb) ? p_resource_id;
  if v_locked then raise exception 'guild_bank_item_locked';end if;
  v_stacks:=coalesce(v_game.state#>'{inventory,stacks}','[]'::jsonb);
  if jsonb_typeof(v_stacks)<>'array' then raise exception 'invalid_inventory';end if;
  v_remaining:=p_amount;
  for v_stack in select value from jsonb_array_elements(v_stacks) loop
   if v_stack->>'itemId'=p_resource_id and coalesce((v_stack->>'locked')::boolean,false)=false and v_remaining>0 then
    v_have:=greatest(0,coalesce((v_stack->>'quantity')::integer,0));
    v_take:=least(v_have,v_remaining);v_remaining:=v_remaining-v_take;
    if v_have>v_take then
     v_next:=v_next||jsonb_build_array(jsonb_set(v_stack,'{quantity}',to_jsonb(v_have-v_take)));
    end if;
   else v_next:=v_next||jsonb_build_array(v_stack);end if;
  end loop;
  if v_remaining>0 then raise exception 'insufficient_construction_materials';end if;
  update public.online_game_states set revision=revision+1,updated_at=now(),
   state=jsonb_set(state,'{inventory,stacks}',v_next) where account_id=p_account_id;
 end if;
 insert into public.guild_bank_balances(guild_id,resource_id,amount)
 values(v_guild,p_resource_id,0) on conflict do nothing;
 select amount into v_balance from public.guild_bank_balances
 where guild_id=v_guild and resource_id=p_resource_id for update;
 if v_balance+p_amount>1000000000000 then raise exception 'guild_bank_capacity_reached';end if;
 update public.guild_bank_balances set amount=amount+p_amount
 where guild_id=v_guild and resource_id=p_resource_id;
 insert into public.guild_bank_deposits(account_id,request_key,guild_id,resource_id,amount)
 values(p_account_id,p_request_key,v_guild,p_resource_id,p_amount);
 insert into public.guild_bank_ledger(guild_id,account_id,request_key,kind,resource_id,amount)
 values(v_guild,p_account_id,p_request_key,'deposit',p_resource_id,p_amount);
 return jsonb_build_object('alreadyProcessed',false,'amount',p_amount,'resourceId',p_resource_id);
end $$;
revoke all on function public.guild_bank_deposit_server_v1(uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.guild_bank_deposit_server_v1(uuid,text,integer,text) to service_role;

-- Allocate shared bank stock to an already released construction goal.
-- Adapted from the tested v2 atomic completion path, preserving unlock triggers,
-- retry receipts, per-goal caps and Guild Level requirements.
create or replace function public.guild_bank_allocate_server_v1(
 p_account_id uuid,p_template_id text,p_resource_id text,p_amount integer,p_request_key text
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare
 v_guild uuid;
 v_level integer;
 v_required_level integer;
 v_enabled boolean;
 v_required bigint;
 v_contributed bigint;
 v_completed timestamptz;
 v_existing public.guild_construction_donations;
 v_bank bigint;
 v_completed_now boolean:=false;
begin
 if p_account_id is null or p_template_id is null or p_resource_id is null
  or p_amount is null or p_amount<=0 or p_amount>1000000
  or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{8,128}$'
 then raise exception 'invalid_guild_construction_donation';end if;

 select m.guild_id,g.level into v_guild,v_level
 from public.guild_members m join public.guilds g on g.id=m.guild_id
 where m.account_id=p_account_id limit 1;
 if v_guild is null then raise exception 'guild_membership_required';end if;
 select t.required_guild_level,t.enabled into v_required_level,v_enabled
 from public.guild_construction_templates t where t.template_id=p_template_id;
 if v_required_level is null then raise exception 'unknown_construction_project';end if;
 if not v_enabled then raise exception 'construction_donations_not_released';end if;
 if v_level<v_required_level then raise exception 'guild_level_locked';end if;
 select r.required_amount into v_required
 from public.guild_construction_requirements r
 where r.template_id=p_template_id and r.resource_id=p_resource_id;
 if v_required is null then raise exception 'invalid_construction_resource';end if;

 insert into public.guild_construction_projects(guild_id,template_id)
 values(v_guild::text,p_template_id) on conflict do nothing;
 select completed_at into v_completed from public.guild_construction_projects
 where guild_id=v_guild::text and template_id=p_template_id for update;

 select * into v_existing from public.guild_construction_donations
 where account_id=p_account_id and donation_key=p_request_key;
 if found then
  if v_existing.guild_id<>v_guild::text or v_existing.template_id<>p_template_id
    or v_existing.resource_id<>p_resource_id or v_existing.amount<>p_amount
  then raise exception 'guild_construction_request_conflict';end if;
  return jsonb_build_object('alreadyProcessed',true,'completed',v_completed is not null);
 end if;
 if v_completed is not null then raise exception 'construction_already_completed';end if;
 select coalesce(sum(amount),0) into v_contributed
 from public.guild_construction_donations where guild_id=v_guild::text
  and template_id=p_template_id and resource_id=p_resource_id;
 if p_amount>v_required-v_contributed then raise exception 'construction_resource_target_exceeded';end if;


 -- Spend only existing Guild Bank stock. No player's inventory is deducted
 -- by a construction allocation.
 insert into public.guild_bank_balances(guild_id,resource_id,amount)
 values(v_guild,p_resource_id,0) on conflict do nothing;
 select amount into v_bank from public.guild_bank_balances
 where guild_id=v_guild and resource_id=p_resource_id for update;
 if v_bank<p_amount then raise exception 'insufficient_guild_bank_balance';end if;
 update public.guild_bank_balances set amount=amount-p_amount
 where guild_id=v_guild and resource_id=p_resource_id;
 insert into public.guild_bank_ledger(guild_id,account_id,request_key,kind,resource_id,amount,template_id)
 values(v_guild,p_account_id,p_request_key,'construction',p_resource_id,p_amount,p_template_id);

 insert into public.guild_construction_donations(
  guild_id,template_id,account_id,donation_key,resource_id,amount
 ) values(v_guild::text,p_template_id,p_account_id,p_request_key,p_resource_id,p_amount);

 if not exists(
  select 1 from public.guild_construction_requirements req
  where req.template_id=p_template_id
   and (select coalesce(sum(d.amount),0) from public.guild_construction_donations d
        where d.guild_id=v_guild::text and d.template_id=p_template_id
        and d.resource_id=req.resource_id)<req.required_amount
 ) then
  update public.guild_construction_projects set completed_at=now()
  where guild_id=v_guild::text and template_id=p_template_id and completed_at is null;
  v_completed_now:=true;
 end if;
 return jsonb_build_object('alreadyProcessed',false,
  'completed',v_completed_now,'resource',p_resource_id,'amount',p_amount);
end $$;

revoke all on function public.guild_bank_allocate_server_v1(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.guild_bank_allocate_server_v1(uuid,text,text,integer,text) to service_role;

-- Default-off in production until the mobile build, bundled gameplay gateway,
-- bank recovery and cosmetic entitlement validations pass together.
