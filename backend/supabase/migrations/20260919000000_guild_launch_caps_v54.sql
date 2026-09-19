-- VELDRYN v54 — launch guild population caps.
--
-- Launch goals:
-- * keep guilds socially dense while the overall player population is still small;
-- * start every guild at 12 member slots;
-- * let Open Halls expand capacity by +2 per rank to 20;
-- * gate Open Halls ranks behind Guild Levels 2 / 4 / 7 / 10;
-- * cap Guild Level at 10 for launch, with a later migration able to raise it.
--
-- Existing join/application/invite flows already enforce guilds.member_cap, so keeping
-- that column authoritative makes this apply consistently to every recruitment path.

alter table public.guilds alter column member_cap set default 12;

-- The game is pre-launch. Normalize any development fixtures into the launch envelope
-- before adding the stricter constraints. Existing members are never deleted.
update public.guild_skill_allocations
   set rank = least(rank, 4),
       updated_at = now()
 where skill_id = 'member_capacity'
   and rank > 4;

update public.guilds
   set level = least(greatest(level, 1), 10);

update public.guilds g
   set member_cap = 12 + 2 * least(
     coalesce((
       select gsa.rank
         from public.guild_skill_allocations gsa
        where gsa.guild_id = g.id
          and gsa.skill_id = 'member_capacity'
        limit 1
     ), 0),
     4
   );

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.guilds'::regclass
       and conname = 'guilds_launch_level_v54_check'
  ) then
    alter table public.guilds
      add constraint guilds_launch_level_v54_check
      check (level between 1 and 10);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.guilds'::regclass
       and conname = 'guilds_launch_member_cap_v54_check'
  ) then
    alter table public.guilds
      add constraint guilds_launch_member_cap_v54_check
      check (member_cap between 12 and 20);
  end if;
end $$;

create or replace function public.guild_open_halls_required_level_v54(p_rank integer)
returns integer
language sql
immutable
as $$
  select case p_rank
    when 0 then 1
    when 1 then 2
    when 2 then 4
    when 3 then 7
    when 4 then 10
    else 2147483647
  end
$$;

create or replace function public.guild_launch_caps_guard_v54()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rank integer := 0;
begin
  if new.level < 1 or new.level > 10 then
    raise exception 'GUILD_LEVEL_CAP_10';
  end if;

  if new.id is not null then
    select coalesce(rank, 0)
      into v_rank
      from public.guild_skill_allocations
     where guild_id = new.id
       and skill_id = 'member_capacity'
     limit 1;
  end if;

  new.member_cap := 12 + 2 * least(coalesce(v_rank, 0), 4);
  return new;
end
$$;

drop trigger if exists guild_launch_caps_guard_v54 on public.guilds;
create trigger guild_launch_caps_guard_v54
before insert or update of level, member_cap on public.guilds
for each row execute function public.guild_launch_caps_guard_v54();

create or replace function public.guild_open_halls_guard_v54()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level integer;
  v_required integer;
begin
  if new.skill_id <> 'member_capacity' then
    return new;
  end if;

  if new.rank < 0 or new.rank > 4 then
    raise exception 'GUILD_OPEN_HALLS_MAX_RANK_4';
  end if;

  select level into v_level
    from public.guilds
   where id = new.guild_id
   for update;

  if v_level is null then
    raise exception 'GUILD_NOT_FOUND';
  end if;

  v_required := public.guild_open_halls_required_level_v54(new.rank);
  if v_level < v_required then
    raise exception 'GUILD_LEVEL_%_REQUIRED_FOR_OPEN_HALLS_%', v_required, new.rank;
  end if;

  return new;
end
$$;

drop trigger if exists guild_open_halls_guard_v54 on public.guild_skill_allocations;
create trigger guild_open_halls_guard_v54
before insert or update of rank, skill_id on public.guild_skill_allocations
for each row execute function public.guild_open_halls_guard_v54();

create or replace function public.guild_open_halls_sync_v54()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild_id uuid := coalesce(new.guild_id, old.guild_id);
  v_rank integer := 0;
begin
  select coalesce(rank, 0)
    into v_rank
    from public.guild_skill_allocations
   where guild_id = v_guild_id
     and skill_id = 'member_capacity'
   limit 1;

  update public.guilds
     set member_cap = 12 + 2 * least(coalesce(v_rank, 0), 4)
   where id = v_guild_id;

  return coalesce(new, old);
end
$$;

drop trigger if exists guild_open_halls_sync_v54 on public.guild_skill_allocations;
create trigger guild_open_halls_sync_v54
after insert or update or delete on public.guild_skill_allocations
for each row
when (
  coalesce(new.skill_id, old.skill_id) = 'member_capacity'
)
execute function public.guild_open_halls_sync_v54();

comment on function public.guild_open_halls_required_level_v54(integer)
  is 'Launch v54 Open Halls gates: rank 1/2/3/4 require Guild Level 2/4/7/10.';
comment on function public.guild_launch_caps_guard_v54()
  is 'Launch v54 guard: Guild Level max 10 and member capacity derived from Open Halls, 12..20.';
