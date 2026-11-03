-- Guild Bank: accept stock for PUBLISHED upcoming construction tiers as well as
-- the guild's current tiers. Never accept disabled/unreleased projects, completed
-- projects, or any resource beyond the remaining unallocated total.
-- Guild Skill rank costs keep their existing released-only eligibility and caps.
-- Both checks run inside the existing row-locked, idempotent deposit transaction.
-- No withdrawal/transfer path is introduced.
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
 -- Only resources used by a published, incomplete Guild Construction upgrade
 -- or a RELEASED, next-rank Guild Skill purchase may enter the Guild Bank.
 -- Unreleased Guild Skills remain excluded; only published next-rank costs are accepted.
 if not exists(
   select 1 from public.guild_construction_templates t
   join public.guild_construction_requirements req on req.template_id=t.template_id
   left join public.guild_construction_projects p
     on p.guild_id=v_guild::text and p.template_id=t.template_id
   where t.enabled
   and p.completed_at is null and req.resource_id=p_resource_id
   and public.guild_construction_scaled_amount_v1(req.required_amount,public.guild_construction_project_member_count_v1(v_guild,t.template_id))>coalesce((
     select sum(d.amount) from public.guild_construction_donations d
     where d.guild_id=v_guild::text and d.template_id=t.template_id
       and d.resource_id=req.resource_id),0)
 ) and not (
   v_level-1>coalesce((
     select sum(a.rank) from public.guild_skill_allocations a
     where a.guild_id=v_guild),0)
   and exists(
     select 1 from public.guild_skill_catalogue_v1 c
     join public.guild_skill_rank_costs_v1 cost on cost.skill_id=c.skill_id
     left join public.guild_skill_allocations a
       on a.guild_id=v_guild and a.skill_id=c.skill_id
     where c.is_released and coalesce(a.rank,0)<c.max_rank
       and cost.rank=coalesce(a.rank,0)+1
       and cost.resource_id=p_resource_id
   )
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
create or replace function public.guild_bank_required_resources_guard_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  v_need bigint;
  v_bank bigint;
  v_skill_need bigint := 0;
begin
  select coalesce(sum(greatest(0,
    public.guild_construction_scaled_amount_v1(r.required_amount,public.guild_construction_project_member_count_v1(new.guild_id,r.template_id)) - coalesce((
      select sum(d.amount)
      from public.guild_construction_donations d
      where d.guild_id = new.guild_id::text
        and d.template_id = r.template_id
        and d.resource_id = r.resource_id
    ),0)
  )),0)::bigint
  into v_need
  from public.guild_construction_requirements r
  join public.guild_construction_templates t
    on t.template_id = r.template_id
  join public.guilds g on g.id = new.guild_id
  left join public.guild_construction_projects p
    on p.guild_id = new.guild_id::text and p.template_id = t.template_id
  where r.resource_id = new.resource_id
    and t.enabled
    -- Published future construction tiers can be bank-funded in advance.
    and p.completed_at is null;

  -- Include only the NEXT rank of actually released Guild Skills when the
  -- guild has unused skill points. No unshipped skills generate demand.
  select coalesce(sum(c.amount),0)::bigint into v_skill_need
  from public.guild_skill_catalogue_v1 skill
  join public.guild_skill_rank_costs_v1 c on c.skill_id=skill.skill_id
  join public.guilds g on g.id=new.guild_id
  left join public.guild_skill_allocations a
    on a.guild_id=new.guild_id and a.skill_id=skill.skill_id
  where skill.is_released
    and coalesce(a.rank,0)<skill.max_rank
    and c.rank=coalesce(a.rank,0)+1
    and c.resource_id=new.resource_id
    and (select coalesce(sum(spent.rank),0) from public.guild_skill_allocations spent
      where spent.guild_id=new.guild_id)<greatest(0,g.level-1);
  v_need:=v_need+v_skill_need;

  if v_need <= 0 then
    raise exception 'guild_bank_resource_unavailable';
  end if;

  -- This is the bank balance *after* the deposit RPC's row-locked credit.
  -- Deposits may never exceed all remaining published current/upcoming construction and released skill requirements.
  select amount into v_bank
  from public.guild_bank_balances
  where guild_id = new.guild_id and resource_id = new.resource_id;

  if v_bank is null or v_bank < new.amount or v_bank > v_need then
    raise exception 'guild_bank_resource_exceeds_active_requirements';
  end if;
  return new;
end $$;
revoke all on function public.guild_bank_deposit_server_v1(uuid,text,integer,text)
 from public,anon,authenticated;
grant execute on function public.guild_bank_deposit_server_v1(uuid,text,integer,text)
 to service_role;
revoke all on function public.guild_bank_required_resources_guard_v1()
 from public,anon,authenticated;
