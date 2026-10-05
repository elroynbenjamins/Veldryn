begin;

do $$
declare
  policy_count integer;
  recursive_policy_count integer;
begin
  select count(*)
    into policy_count
    from pg_policies
   where schemaname='public'
     and tablename='guild_members'
     and cmd='SELECT';

  if policy_count <> 1 then
    raise exception 'guild_members must have exactly one SELECT policy, found %',policy_count;
  end if;

  select count(*)
    into recursive_policy_count
    from pg_policies
   where schemaname='public'
     and tablename='guild_members'
     and (
       coalesce(qual,'') ilike '%from guild_members%'
       or coalesce(with_check,'') ilike '%from guild_members%'
     );

  if recursive_policy_count <> 0 then
    raise exception 'guild_members SELECT policy must not self-query';
  end if;

  if has_function_privilege('anon','private.is_current_user_guild_member(uuid)'::regprocedure,'EXECUTE') then
    raise exception 'anon must not execute guild membership helper';
  end if;

  if not has_function_privilege('authenticated','private.is_current_user_guild_member(uuid)'::regprocedure,'EXECUTE') then
    raise exception 'authenticated must execute guild membership helper for RLS';
  end if;
end $$;

insert into public.guilds(id,name,owner_account_id)
values
  ('00000000-0000-4000-8000-000000000101','Rls Test Alpha','00000000-0000-4000-8000-000000000201'),
  ('00000000-0000-4000-8000-000000000102','Rls Test Beta','00000000-0000-4000-8000-000000000203');

insert into public.guild_members(guild_id,account_id,role)
values
  ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000201','leader'),
  ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000202','member'),
  ('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000203','leader');

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000201',true);
set local role authenticated;
select 1 / case when count(*)=2 then 1 else 0 end as own_guild_members_visible
from public.guild_members;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000203',true);
set local role authenticated;
select 1 / case when count(*)=1 then 1 else 0 end as other_guild_hidden
from public.guild_members;
reset role;

select 'PASS: guild_members RLS is non-recursive and guild-scoped' as result;
rollback;
