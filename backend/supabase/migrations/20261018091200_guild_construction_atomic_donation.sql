-- Canonical construction costs and transactional inventory/gold donation.
-- Requires all earlier guild construction migrations; never run before staging tests.
create table if not exists public.guild_construction_templates (
 template_id text primary key,
 required_guild_level integer not null check(required_guild_level between 1 and 100),
 unlock_id text not null
);
create table if not exists public.guild_construction_requirements (
 template_id text not null references public.guild_construction_templates(template_id),
 resource_id text not null,
 required_amount bigint not null check(required_amount>0),
 primary key(template_id,resource_id)
);
insert into public.guild_construction_templates(template_id,required_guild_level,unlock_id)
 values('stormwatch_banner',5,'guild_banner_stormwatch') on conflict do nothing;
insert into public.guild_construction_requirements(template_id,resource_id,required_amount) values
 ('stormwatch_banner','gold',300000),
 ('stormwatch_banner','GREENWOOD_LOG',10000),
 ('stormwatch_banner','ASTER_IRON_INGOT',5000),
 ('stormwatch_banner','MOSS_FIBER',2000)
on conflict do nothing;
alter table public.guild_construction_templates enable row level security;
alter table public.guild_construction_requirements enable row level security;
revoke all on public.guild_construction_templates,public.guild_construction_requirements from anon,authenticated;

create or replace function public.guild_construction_donate_server_v1(
 p_account_id uuid,p_template_id text,p_resource_id text,p_amount integer,p_request_key text
) returns jsonb language plpgsql security invoker set search_path=public as $$
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
        and d.resource_id=req.resource_id)<req.required_amount
 ) then
  update public.guild_construction_projects set completed_at=now()
  where guild_id=v_guild::text and template_id=p_template_id and completed_at is null;
  v_completed_now:=true;
 end if;
 return jsonb_build_object('alreadyProcessed',false,
  'completed',v_completed_now,'resource',p_resource_id,'amount',p_amount);
end $$;
revoke all on function public.guild_construction_donate_server_v1(uuid,text,text,integer,text)
 from public,anon,authenticated;
-- Deployment gate: do NOT grant EXECUTE until entitlement delivery, current-state
-- refresh and concurrency tests are validated in staging.
revoke all on function public.guild_construction_donate_server_v1(uuid,text,text,integer,text)
 from service_role;
