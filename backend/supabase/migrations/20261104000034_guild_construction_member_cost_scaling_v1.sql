-- Member scaling applies to all material/gold costs for Guild Construction.
-- Additive +20% for each member beyond the first; round each resource UP to a multiple of 20.
-- Lock each project's effective roster size at its first successful allocation so
-- an ongoing build cannot get more expensive (or strand bank stock) as members change.
alter table public.guild_construction_projects
 add column if not exists cost_member_count integer
 check (cost_member_count is null or cost_member_count>=1);

create or replace function public.guild_construction_scaled_amount_v1(p_base bigint,p_members integer)
returns bigint language sql immutable strict set search_path='' as $$
 select (20*ceil((greatest(0,p_base)::numeric*(greatest(1,p_members)+4))/100))::bigint
$$;
revoke all on function public.guild_construction_scaled_amount_v1(bigint,integer) from public,anon,authenticated;
grant execute on function public.guild_construction_scaled_amount_v1(bigint,integer) to service_role;

create or replace function public.guild_construction_project_member_count_v1(p_guild uuid,p_template_id text)
returns integer language sql stable set search_path='' as $$
 select coalesce(
   (select project.cost_member_count from public.guild_construction_projects project
    where project.guild_id=p_guild::text and project.template_id=p_template_id),
   (select greatest(1,count(*))::integer from public.guild_members m where m.guild_id=p_guild)
 )
$$;
revoke all on function public.guild_construction_project_member_count_v1(uuid,text) from public,anon,authenticated;
grant execute on function public.guild_construction_project_member_count_v1(uuid,text) to service_role;

-- Read costs through the same database functions used by the bank and completion RPC.
-- The response is membership-scoped and exposes no other guild's progress.
create or replace function public.guild_construction_costs_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_gid uuid; v_members integer;
begin
 select guild_id into v_gid from public.guild_members where account_id=p_account_id;
 if v_gid is null then raise exception 'guild_membership_required';end if;
 select greatest(1,count(*))::integer into v_members
 from public.guild_members where guild_id=v_gid;
 return jsonb_build_object(
  'memberCount',v_members,
  'requirements',coalesce((
    select jsonb_agg(jsonb_build_object(
      'templateId',r.template_id,
      'resourceId',r.resource_id,
      'amount',public.guild_construction_scaled_amount_v1(
        r.required_amount,
        public.guild_construction_project_member_count_v1(v_gid,r.template_id)
      ),
      'costMemberCount',public.guild_construction_project_member_count_v1(v_gid,r.template_id)
    ) order by r.template_id,r.resource_id)
    from public.guild_construction_requirements r
  ),'[]'::jsonb)
 );
end $$;
revoke all on function public.guild_construction_costs_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_construction_costs_server_v1(uuid) to service_role;

-- If any earlier projects were funded before this release, preserve their
-- existing donation pricing rather than retroactively changing their targets.
update public.guild_construction_projects p
set cost_member_count=greatest(1,(select count(*)::integer from public.guild_members m where m.guild_id=p.guild_id::uuid))
where p.cost_member_count is null
  and exists(select 1 from public.guild_construction_donations d
             where d.guild_id=p.guild_id and d.template_id=p.template_id);

-- Authoritative guild_bank_allocate_server_v1
CREATE OR REPLACE FUNCTION public.guild_bank_allocate_server_v1(p_account_id uuid, p_template_id text, p_resource_id text, p_amount integer, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
 select public.guild_construction_scaled_amount_v1(r.required_amount,public.guild_construction_project_member_count_v1(v_guild,p_template_id)) into v_required
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
 -- Capture roster size only when the project receives its first accepted funding.
 update public.guild_construction_projects
 set cost_member_count=public.guild_construction_project_member_count_v1(v_guild,p_template_id)
 where guild_id=v_guild::text and template_id=p_template_id and cost_member_count is null;
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
        and d.resource_id=req.resource_id)<public.guild_construction_scaled_amount_v1(req.required_amount,public.guild_construction_project_member_count_v1(v_guild,p_template_id))
 ) then
  update public.guild_construction_projects set completed_at=now()
  where guild_id=v_guild::text and template_id=p_template_id and completed_at is null;
  v_completed_now:=true;
 end if;
 return jsonb_build_object('alreadyProcessed',false,
  'completed',v_completed_now,'resource',p_resource_id,'amount',p_amount);
end $function$;

-- Authoritative guild_bank_required_resources_guard_v1
CREATE OR REPLACE FUNCTION public.guild_bank_required_resources_guard_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
    and t.required_guild_level <= g.level
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
  -- Deposits may never exceed all still-unallocated active requirements.
  select amount into v_bank
  from public.guild_bank_balances
  where guild_id = new.guild_id and resource_id = new.resource_id;

  if v_bank is null or v_bank < new.amount or v_bank > v_need then
    raise exception 'guild_bank_resource_exceeds_active_requirements';
  end if;
  return new;
end $function$;

-- Authoritative guild_construction_donate_server_v1
CREATE OR REPLACE FUNCTION public.guild_construction_donate_server_v1(p_account_id uuid, p_template_id text, p_resource_id text, p_amount integer, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_guild uuid;
 v_level integer;
 v_required_level integer;
 v_required bigint;
 v_contributed bigint;
 v_completed timestamptz;
 v_existing public.guild_construction_donations;
 v_game public.online_game_states;
 v_gold bigint;
 v_stacks jsonb;
 v_next jsonb:='[]'::jsonb;
 v_stack jsonb;
 v_have integer;
 v_take integer;
 v_remaining integer;
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
 select t.required_guild_level into v_required_level
 from public.guild_construction_templates t where t.template_id=p_template_id;
 if v_required_level is null then raise exception 'unknown_construction_project';end if;
 if v_level<v_required_level then raise exception 'guild_level_locked';end if;
 select public.guild_construction_scaled_amount_v1(r.required_amount,public.guild_construction_project_member_count_v1(v_guild,p_template_id)) into v_required
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
 -- Capture roster size only when the project receives its first accepted funding.
 update public.guild_construction_projects
 set cost_member_count=public.guild_construction_project_member_count_v1(v_guild,p_template_id)
 where guild_id=v_guild::text and template_id=p_template_id and cost_member_count is null;
 select coalesce(sum(amount),0) into v_contributed
 from public.guild_construction_donations where guild_id=v_guild::text
  and template_id=p_template_id and resource_id=p_resource_id;
 if p_amount>v_required-v_contributed then raise exception 'construction_resource_target_exceeded';end if;

 select * into v_game from public.online_game_states where account_id=p_account_id for update;
 if not found or v_game.character_id is null or v_game.state is null
 then raise exception 'character_required';end if;
 if p_resource_id='gold' then
  select gold into v_gold from public.character_wallets
  where character_id=v_game.character_id for update;
  if v_gold is null or v_gold<p_amount then raise exception 'insufficient_gold';end if;
  update public.character_wallets set gold=gold-p_amount,updated_at=now()
  where character_id=v_game.character_id;
 else
  v_stacks:=coalesce(v_game.state#>'{inventory,stacks}','[]'::jsonb);
  if jsonb_typeof(v_stacks)<>'array' then raise exception 'invalid_inventory';end if;
  v_remaining:=p_amount;
  for v_stack in select value from jsonb_array_elements(v_stacks) loop
   if v_stack->>'itemId'=p_resource_id and v_remaining>0 then
    v_have:=greatest(0,coalesce((v_stack->>'quantity')::integer,0));
    v_take:=least(v_have,v_remaining);
    v_remaining:=v_remaining-v_take;
    if v_have>v_take then
     v_next:=v_next||jsonb_build_array(jsonb_set(v_stack,'{quantity}',to_jsonb(v_have-v_take)));
    end if;
   else
    v_next:=v_next||jsonb_build_array(v_stack);
   end if;
  end loop;
  if v_remaining>0 then raise exception 'insufficient_construction_materials';end if;
  update public.online_game_states set
   state=jsonb_set(state,'{inventory,stacks}',v_next),
   revision=revision+1,updated_at=now()
  where account_id=p_account_id;
 end if;

 insert into public.guild_construction_donations(
  guild_id,template_id,account_id,donation_key,resource_id,amount
 ) values(v_guild::text,p_template_id,p_account_id,p_request_key,p_resource_id,p_amount);

 if not exists(
  select 1 from public.guild_construction_requirements req
  where req.template_id=p_template_id
   and (select coalesce(sum(d.amount),0) from public.guild_construction_donations d
        where d.guild_id=v_guild::text and d.template_id=p_template_id
        and d.resource_id=req.resource_id)<public.guild_construction_scaled_amount_v1(req.required_amount,public.guild_construction_project_member_count_v1(v_guild,p_template_id))
 ) then
  update public.guild_construction_projects set completed_at=now()
  where guild_id=v_guild::text and template_id=p_template_id and completed_at is null;
  v_completed_now:=true;
 end if;
 return jsonb_build_object('alreadyProcessed',false,
  'completed',v_completed_now,'resource',p_resource_id,'amount',p_amount);
end $function$;

-- Authoritative guild_construction_donate_server_v2
CREATE OR REPLACE FUNCTION public.guild_construction_donate_server_v2(p_account_id uuid, p_template_id text, p_resource_id text, p_amount integer, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
 v_guild uuid;
 v_level integer;
 v_required_level integer;
 v_enabled boolean;
 v_required bigint;
 v_contributed bigint;
 v_completed timestamptz;
 v_existing public.guild_construction_donations;
 v_game public.online_game_states;
 v_gold bigint;
 v_stacks jsonb;
 v_next jsonb:='[]'::jsonb;
 v_stack jsonb;
 v_have integer;
 v_take integer;
 v_remaining integer;
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
 select public.guild_construction_scaled_amount_v1(r.required_amount,public.guild_construction_project_member_count_v1(v_guild,p_template_id)) into v_required
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
 -- Capture roster size only when the project receives its first accepted funding.
 update public.guild_construction_projects
 set cost_member_count=public.guild_construction_project_member_count_v1(v_guild,p_template_id)
 where guild_id=v_guild::text and template_id=p_template_id and cost_member_count is null;
 select coalesce(sum(amount),0) into v_contributed
 from public.guild_construction_donations where guild_id=v_guild::text
  and template_id=p_template_id and resource_id=p_resource_id;
 if p_amount>v_required-v_contributed then raise exception 'construction_resource_target_exceeded';end if;

 select * into v_game from public.online_game_states where account_id=p_account_id for update;
 if not found or v_game.character_id is null or v_game.state is null
 then raise exception 'character_required';end if;
 if p_resource_id='gold' then
  select gold into v_gold from public.character_wallets
  where character_id=v_game.character_id for update;
  if v_gold is null or v_gold<p_amount then raise exception 'insufficient_gold';end if;
  update public.character_wallets set gold=gold-p_amount,updated_at=now()
  where character_id=v_game.character_id;
 else
  v_stacks:=coalesce(v_game.state#>'{inventory,stacks}','[]'::jsonb);
  if jsonb_typeof(v_stacks)<>'array' then raise exception 'invalid_inventory';end if;
  v_remaining:=p_amount;
  for v_stack in select value from jsonb_array_elements(v_stacks) loop
   if v_stack->>'itemId'=p_resource_id and v_remaining>0 then
    v_have:=greatest(0,coalesce((v_stack->>'quantity')::integer,0));
    v_take:=least(v_have,v_remaining);
    v_remaining:=v_remaining-v_take;
    if v_have>v_take then
     v_next:=v_next||jsonb_build_array(jsonb_set(v_stack,'{quantity}',to_jsonb(v_have-v_take)));
    end if;
   else
    v_next:=v_next||jsonb_build_array(v_stack);
   end if;
  end loop;
  if v_remaining>0 then raise exception 'insufficient_construction_materials';end if;
  update public.online_game_states set
   state=jsonb_set(state,'{inventory,stacks}',v_next),
   revision=revision+1,updated_at=now()
  where account_id=p_account_id;
 end if;

 insert into public.guild_construction_donations(
  guild_id,template_id,account_id,donation_key,resource_id,amount
 ) values(v_guild::text,p_template_id,p_account_id,p_request_key,p_resource_id,p_amount);

 if not exists(
  select 1 from public.guild_construction_requirements req
  where req.template_id=p_template_id
   and (select coalesce(sum(d.amount),0) from public.guild_construction_donations d
        where d.guild_id=v_guild::text and d.template_id=p_template_id
        and d.resource_id=req.resource_id)<public.guild_construction_scaled_amount_v1(req.required_amount,public.guild_construction_project_member_count_v1(v_guild,p_template_id))
 ) then
  update public.guild_construction_projects set completed_at=now()
  where guild_id=v_guild::text and template_id=p_template_id and completed_at is null;
  v_completed_now:=true;
 end if;
 return jsonb_build_object('alreadyProcessed',false,
  'completed',v_completed_now,'resource',p_resource_id,'amount',p_amount);
end $function$;

-- Idempotent formula smoke checks, including a 4-member live guild.
do $$
begin
 if public.guild_construction_scaled_amount_v1(120,1)<>120
 or public.guild_construction_scaled_amount_v1(120,2)<>160
 or public.guild_construction_scaled_amount_v1(120,3)<>180
 or public.guild_construction_scaled_amount_v1(120,4)<>200
 or public.guild_construction_scaled_amount_v1(120,5)<>220
 or public.guild_construction_scaled_amount_v1(120,10)<>340
 or public.guild_construction_scaled_amount_v1(120,20)<>580
 or public.guild_construction_scaled_amount_v1(100,2)<>120
 then raise exception 'guild_construction_scaled_cost_contract_failed';end if;
end $$;
