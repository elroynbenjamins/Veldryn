-- Canonical Guild Skill Trees: 9 nodes x 3 ranks, seeded from
-- apps/mobile/src/content/guild-skill-paths.ts.
-- This prepares authoritative snapshots and an idempotent spending operation.
-- IMPORTANT: is_released is FALSE until every skill bonus is server-enforced,
-- and the Guild Bank active-requirements guard includes enabled skill costs.
-- Do not let players pay for visual-only or nonfunctional buffs.
create table if not exists public.guild_skill_catalogue_v1 (
 skill_id text primary key,
 label text not null,
 major_branch text not null check(major_branch in ('Professions','Fellowship','Vanguard')),
 bonus_per_rank integer not null check(bonus_per_rank between 1 and 100),
 max_rank integer not null default 3 check(max_rank between 1 and 3),
 is_released boolean not null default false
);
create table if not exists public.guild_skill_rank_costs_v1 (
 skill_id text not null references public.guild_skill_catalogue_v1(skill_id),
 rank integer not null check(rank between 1 and 3),
 resource_id text not null,
 amount integer not null check(amount between 1 and 1000000),
 primary key(skill_id,rank,resource_id)
);
create table if not exists public.guild_skill_upgrade_receipts_v1 (
 account_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null check(request_key ~ '^[A-Za-z0-9_-]{8,128}$'),
 guild_id uuid not null references public.guilds(id) on delete cascade,
 skill_id text not null references public.guild_skill_catalogue_v1(skill_id),
 from_rank integer not null,
 to_rank integer not null,
 costs jsonb not null check(jsonb_typeof(costs)='object'),
 created_at timestamptz not null default now(),
 primary key(account_id,request_key),
 check(from_rank>=0 and to_rank=from_rank+1 and to_rank<=3)
);
alter table public.guild_skill_catalogue_v1 enable row level security;
alter table public.guild_skill_rank_costs_v1 enable row level security;
alter table public.guild_skill_upgrade_receipts_v1 enable row level security;
alter table public.guild_skill_allocations enable row level security;
revoke all on public.guild_skill_catalogue_v1,public.guild_skill_rank_costs_v1,
 public.guild_skill_upgrade_receipts_v1,public.guild_skill_allocations from public,anon,authenticated;
grant select on public.guild_skill_catalogue_v1,public.guild_skill_rank_costs_v1 to service_role;
grant select,insert on public.guild_skill_upgrade_receipts_v1 to service_role;
grant select,insert,update on public.guild_skill_allocations to service_role;
-- Rank is bounded even if an outdated writer attempts to set a larger value.
alter table public.guild_skill_allocations drop constraint if exists guild_skill_allocations_rank_check;
alter table public.guild_skill_allocations add constraint guild_skill_allocations_rank_check check(rank between 0 and 3);
-- Keep all purchases on the existing service-role-only ledger.
alter table public.guild_bank_ledger drop constraint if exists guild_bank_ledger_kind_check;
alter table public.guild_bank_ledger add constraint guild_bank_ledger_kind_check
 check(kind in ('deposit','construction','skill_upgrade'));

insert into public.guild_skill_catalogue_v1
 (skill_id,label,major_branch,bonus_per_rank,max_rank,is_released)
values
('professions_gathering','Gathering','Professions',2,3,false),
('professions_crafting','Crafting','Professions',2,3,false),
('professions_mastery','Skilling Mastery','Professions',2,3,false),
('fellowship_membership','Membership','Fellowship',1,3,false),
('fellowship_quests','Guild Quests','Fellowship',2,3,false),
('fellowship_projects','Projects & Cooperation','Fellowship',2,3,false),
('vanguard_boss','Guild Boss','Vanguard',2,3,false),
('vanguard_defence','Defensive Doctrine','Vanguard',2,3,false),
('vanguard_support','Battle Support','Vanguard',2,3,false)
on conflict(skill_id) do update set
 label=excluded.label,major_branch=excluded.major_branch,bonus_per_rank=excluded.bonus_per_rank,
 max_rank=excluded.max_rank;
-- Never change is_released during replay.
insert into public.guild_skill_rank_costs_v1(skill_id,rank,resource_id,amount)
values
('professions_gathering',1,'MOSS_FIBER',300),
('professions_gathering',1,'GREENWOOD_LOG',150),
('professions_gathering',2,'IRONWOOD_LOG',350),
('professions_gathering',2,'ASTER_IRON_INGOT',40),
('professions_gathering',3,'IRONWOOD_LOG',700),
('professions_gathering',3,'ASTER_IRON_INGOT',110),
('professions_crafting',1,'MOSS_FIBER',400),
('professions_crafting',1,'GREENWOOD_LOG',200),
('professions_crafting',2,'IRONWOOD_LOG',400),
('professions_crafting',2,'ASTER_IRON_INGOT',60),
('professions_crafting',3,'IRONWOOD_LOG',800),
('professions_crafting',3,'ASTER_IRON_INGOT',150),
('professions_mastery',1,'MOSS_FIBER',500),
('professions_mastery',1,'GREENWOOD_LOG',250),
('professions_mastery',2,'IRONWOOD_LOG',500),
('professions_mastery',2,'ASTER_IRON_INGOT',80),
('professions_mastery',3,'IRONWOOD_LOG',900),
('professions_mastery',3,'ASTER_IRON_INGOT',180),
('fellowship_membership',1,'MOSS_FIBER',500),
('fellowship_membership',1,'GREENWOOD_LOG',250),
('fellowship_membership',2,'IRONWOOD_LOG',600),
('fellowship_membership',2,'ASTER_IRON_INGOT',80),
('fellowship_membership',3,'IRONWOOD_LOG',1100),
('fellowship_membership',3,'ASTER_IRON_INGOT',180),
('fellowship_quests',1,'MOSS_FIBER',500),
('fellowship_quests',1,'GREENWOOD_LOG',250),
('fellowship_quests',2,'IRONWOOD_LOG',500),
('fellowship_quests',2,'ASTER_IRON_INGOT',80),
('fellowship_quests',3,'IRONWOOD_LOG',900),
('fellowship_quests',3,'ASTER_IRON_INGOT',180),
('fellowship_projects',1,'MOSS_FIBER',600),
('fellowship_projects',1,'GREENWOOD_LOG',300),
('fellowship_projects',2,'IRONWOOD_LOG',700),
('fellowship_projects',2,'ASTER_IRON_INGOT',100),
('fellowship_projects',3,'IRONWOOD_LOG',1200),
('fellowship_projects',3,'ASTER_IRON_INGOT',225),
('vanguard_boss',1,'IRONWOOD_LOG',400),
('vanguard_boss',1,'ASTER_IRON_INGOT',100),
('vanguard_boss',2,'ASTER_IRON_INGOT',225),
('vanguard_boss',2,'OATHGLASS_SHARD',40),
('vanguard_boss',3,'OATHSTONE_INGOT',120),
('vanguard_boss',3,'OATHGLASS_SHARD',80),
('vanguard_defence',1,'IRONWOOD_LOG',450),
('vanguard_defence',1,'ASTER_IRON_INGOT',110),
('vanguard_defence',2,'ASTER_IRON_INGOT',250),
('vanguard_defence',2,'OATHGLASS_SHARD',50),
('vanguard_defence',3,'OATHSTONE_INGOT',140),
('vanguard_defence',3,'OATHGLASS_SHARD',90),
('vanguard_support',1,'IRONWOOD_LOG',500),
('vanguard_support',1,'ASTER_IRON_INGOT',120),
('vanguard_support',2,'ASTER_IRON_INGOT',275),
('vanguard_support',2,'OATHGLASS_SHARD',60),
('vanguard_support',3,'OATHSTONE_INGOT',160),
('vanguard_support',3,'OATHGLASS_SHARD',100)
on conflict(skill_id,rank,resource_id) do update set amount=excluded.amount;

-- Read-only snapshot consumed by the authenticated gameplay Edge gateway.
create or replace function public.guild_skill_snapshot_server_v1(p_account_id uuid)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare v_guild uuid;v_role text;v_level integer;v_spent integer;v_points integer;
begin
 if p_account_id is null then raise exception 'account_required';end if;
 select m.guild_id,m.role,g.level into v_guild,v_role,v_level
 from public.guild_members m join public.guilds g on g.id=m.guild_id
 where m.account_id=p_account_id limit 1;
 if v_guild is null then raise exception 'guild_membership_required';end if;
 select coalesce(sum(rank),0)::integer into v_spent
 from public.guild_skill_allocations where guild_id=v_guild;
 v_points:=greatest(0,v_level-1-v_spent);
 return jsonb_build_object(
  'guildId',v_guild,'guildLevel',v_level,'role',v_role,
  'canUpgrade',v_role in ('leader','officer'),
  'totalSkillPoints',greatest(0,v_level-1),'spentSkillPoints',v_spent,
  'skillPoints',v_points,
  'nodes',coalesce((
    select jsonb_agg(jsonb_build_object(
     'id',c.skill_id,'name',c.label,'branch',c.major_branch,
     'perTier',c.bonus_per_rank,'maxRank',c.max_rank,
     'rank',coalesce(a.rank,0),'released',c.is_released,
     'costs',coalesce((
       select jsonb_agg(jsonb_build_object('rank',z.rank,'resourceId',z.resource_id,'amount',z.amount)
         order by z.rank,z.resource_id)
       from public.guild_skill_rank_costs_v1 z where z.skill_id=c.skill_id
     ),'[]'::jsonb))
     order by c.major_branch,c.skill_id)
    from public.guild_skill_catalogue_v1 c
    left join public.guild_skill_allocations a on a.guild_id=v_guild and a.skill_id=c.skill_id
  ),'[]'::jsonb),
  'bank',coalesce((
    select jsonb_agg(jsonb_build_object('resourceId',b.resource_id,'amount',b.amount)
      order by b.resource_id)
    from public.guild_bank_balances b where b.guild_id=v_guild and b.amount>0
  ),'[]'::jsonb)
 );
end $$;
revoke all on function public.guild_skill_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_skill_snapshot_server_v1(uuid) to service_role;

-- Serializes all purchases by locking the Guild row. The receipt, bank debits,
-- skill rank and audit entries commit atomically; retries with same key are free.
-- Gate intentionally defaults closed until gameplay effects are actually applied.
create or replace function public.guild_skill_upgrade_server_v1(
 p_account_id uuid,p_skill_id text,p_request_key text
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_guild uuid;v_role text;v_level integer;v_skill public.guild_skill_catalogue_v1;
 v_current integer;v_spent integer;v_cost record;v_bank bigint;v_costs jsonb:='{}'::jsonb;
 v_prior public.guild_skill_upgrade_receipts_v1;
begin
 if p_account_id is null or p_skill_id is null or p_request_key is null
    or p_request_key !~ '^[A-Za-z0-9_-]{8,128}$'
 then raise exception 'invalid_guild_skill_request';end if;
 select m.guild_id,m.role,g.level into v_guild,v_role,v_level
 from public.guild_members m join public.guilds g on g.id=m.guild_id
 where m.account_id=p_account_id for update of g;
 if v_guild is null then raise exception 'guild_membership_required';end if;
 select * into v_prior from public.guild_skill_upgrade_receipts_v1
 where account_id=p_account_id and request_key=p_request_key;
 if found then
  if v_prior.guild_id<>v_guild or v_prior.skill_id<>p_skill_id
  then raise exception 'guild_skill_request_conflict';end if;
  return jsonb_build_object('alreadyProcessed',true,'skillId',p_skill_id,'rank',v_prior.to_rank);
 end if;
 if v_role not in ('leader','officer') then raise exception 'guild_skill_officer_required';end if;
 select * into v_skill from public.guild_skill_catalogue_v1
 where skill_id=p_skill_id;
 if not found then raise exception 'unknown_guild_skill';end if;
 if not v_skill.is_released then raise exception 'guild_skill_not_released';end if;
 select rank into v_current from public.guild_skill_allocations
 where guild_id=v_guild and skill_id=p_skill_id for update;
 v_current:=coalesce(v_current,0);
 if v_current>=v_skill.max_rank then raise exception 'guild_skill_max_rank';end if;
 select coalesce(sum(rank),0)::integer into v_spent
 from public.guild_skill_allocations where guild_id=v_guild;
 if v_spent>=greatest(0,v_level-1) then raise exception 'guild_skill_points_exhausted';end if;
 for v_cost in
   select resource_id,amount from public.guild_skill_rank_costs_v1
   where skill_id=p_skill_id and rank=v_current+1 order by resource_id
 loop
  select amount into v_bank from public.guild_bank_balances
  where guild_id=v_guild and resource_id=v_cost.resource_id for update;
  if coalesce(v_bank,0)<v_cost.amount then raise exception 'guild_skill_bank_materials_missing';end if;
  update public.guild_bank_balances set amount=amount-v_cost.amount
  where guild_id=v_guild and resource_id=v_cost.resource_id;
  insert into public.guild_bank_ledger
   (guild_id,account_id,request_key,kind,resource_id,amount,template_id)
  values(v_guild,p_account_id,p_request_key||':'||v_cost.resource_id,
    'skill_upgrade',v_cost.resource_id,v_cost.amount,p_skill_id);
  v_costs:=v_costs||jsonb_build_object(v_cost.resource_id,v_cost.amount);
 end loop;
 if v_costs='{}'::jsonb then raise exception 'guild_skill_costs_missing';end if;
 insert into public.guild_skill_allocations(guild_id,skill_id,rank,updated_at)
 values(v_guild,p_skill_id,v_current+1,now())
 on conflict(guild_id,skill_id) do update
 set rank=excluded.rank,updated_at=excluded.updated_at;
 insert into public.guild_skill_upgrade_receipts_v1
  (account_id,request_key,guild_id,skill_id,from_rank,to_rank,costs)
 values(p_account_id,p_request_key,v_guild,p_skill_id,v_current,v_current+1,v_costs);
 return jsonb_build_object('alreadyProcessed',false,'skillId',p_skill_id,
  'rank',v_current+1,'costs',v_costs);
end $$;
revoke all on function public.guild_skill_upgrade_server_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.guild_skill_upgrade_server_v1(uuid,text,text) to service_role;
