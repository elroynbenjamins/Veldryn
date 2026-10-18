-- Construction completion unlocks are durable and belong to the Guild.
-- They are separate from guild leveling and must not be auto-equipped.
create table if not exists public.guild_construction_unlocks (
 guild_id uuid not null references public.guilds(id) on delete cascade,
 unlock_id text not null,
 template_id text not null,
 unlocked_at timestamptz not null default now(),
 primary key(guild_id,unlock_id)
);
alter table public.guild_construction_unlocks enable row level security;
revoke all on public.guild_construction_unlocks from anon,authenticated;

create or replace function public.guild_construction_completion_unlock_v1()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_unlock text;
begin
 if old.completed_at is null and new.completed_at is not null then
  select unlock_id into v_unlock from public.guild_construction_templates
   where template_id=new.template_id;
  if v_unlock is null then raise exception 'construction_unlock_not_configured';end if;
  insert into public.guild_construction_unlocks(guild_id,unlock_id,template_id)
  values(new.guild_id::uuid,v_unlock,new.template_id)
  on conflict(guild_id,unlock_id) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists guild_construction_completion_unlock
 on public.guild_construction_projects;
create trigger guild_construction_completion_unlock
 after update of completed_at on public.guild_construction_projects
 for each row execute function public.guild_construction_completion_unlock_v1();

-- Explicitly grant only trusted gateway roles the table permissions necessary
-- for invoking authorized RPCs. RLS is enabled, service_role bypasses RLS.
grant select,insert,update,delete on public.guild_shop_wallets,
 public.guild_shop_ledger,public.guild_shop_weekly,public.guild_shop_owned,
 public.guild_shop_claim_sources,public.guild_shop_reward_catalogue,
 public.guild_construction_templates,public.guild_construction_requirements,
 public.guild_construction_projects,public.guild_construction_donations,
 public.guild_construction_unlocks to service_role;
