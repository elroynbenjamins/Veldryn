-- Prevent Guild Bank deposits for resources no longer needed by any currently
-- released, level-eligible, incomplete Guild Construction project.
-- The existing deposit RPC first deducts the player's inventory and credits a
-- row-locked bank balance; this trigger runs before its receipt is inserted.
-- Any rejection rolls back the entire transaction, including deductions.
-- Idempotent replays return from the original RPC before this trigger runs.
create or replace function public.guild_bank_required_resources_guard_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  v_need bigint;
  v_bank bigint;
begin
  select coalesce(sum(greatest(0,
    r.required_amount - coalesce((
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
end $$;

revoke all on function public.guild_bank_required_resources_guard_v1()
  from public, anon, authenticated;

drop trigger if exists guild_bank_required_resources_guard
  on public.guild_bank_deposits;
create trigger guild_bank_required_resources_guard
  before insert on public.guild_bank_deposits
  for each row execute function public.guild_bank_required_resources_guard_v1();
