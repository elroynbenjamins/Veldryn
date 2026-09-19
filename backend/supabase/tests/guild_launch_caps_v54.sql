-- Run with `supabase db query --linked --file supabase/tests/guild_launch_caps_v54.sql`.
-- Fixtures and mutations are rolled back. Never reset the linked database.
begin;

create or replace function pg_temp.assert_v54(value boolean, message text)
returns void
language plpgsql
as $$
begin
  if value is distinct from true then
    raise exception 'V54 FAIL: %', message;
  end if;
end
$$;

do $$
declare
  g uuid := gen_random_uuid();
  i integer;
  member_id uuid;
begin
  insert into public.guilds(id, name, owner_account_id)
  values (g, 'V54 Launch Cap ' || left(g::text, 8), gen_random_uuid());

  perform pg_temp.assert_v54(
    (select level = 1 and member_cap = 12 from public.guilds where id = g),
    'new guild starts at level 1 with 12 member slots'
  );

  begin
    insert into public.guild_skill_allocations(guild_id, skill_id, rank)
    values (g, 'member_capacity', 1);
    raise exception 'V54 rank 1 accepted before guild level 2';
  exception
    when others then
      if sqlerrm <> 'GUILD_LEVEL_2_REQUIRED_FOR_OPEN_HALLS_1' then
        raise;
      end if;
  end;

  update public.guilds set level = 2 where id = g;
  insert into public.guild_skill_allocations(guild_id, skill_id, rank)
  values (g, 'member_capacity', 1);
  perform pg_temp.assert_v54(
    (select member_cap = 14 from public.guilds where id = g),
    'Open Halls rank 1 expands capacity to 14'
  );

  begin
    update public.guild_skill_allocations
       set rank = 2
     where guild_id = g and skill_id = 'member_capacity';
    raise exception 'V54 rank 2 accepted before guild level 4';
  exception
    when others then
      if sqlerrm <> 'GUILD_LEVEL_4_REQUIRED_FOR_OPEN_HALLS_2' then
        raise;
      end if;
  end;

  update public.guilds set level = 4 where id = g;
  update public.guild_skill_allocations
     set rank = 2
   where guild_id = g and skill_id = 'member_capacity';
  perform pg_temp.assert_v54(
    (select member_cap = 16 from public.guilds where id = g),
    'Open Halls rank 2 expands capacity to 16'
  );

  update public.guilds set level = 7 where id = g;
  update public.guild_skill_allocations
     set rank = 3
   where guild_id = g and skill_id = 'member_capacity';
  perform pg_temp.assert_v54(
    (select member_cap = 18 from public.guilds where id = g),
    'Open Halls rank 3 expands capacity to 18'
  );

  update public.guilds set level = 10 where id = g;
  update public.guild_skill_allocations
     set rank = 4
   where guild_id = g and skill_id = 'member_capacity';
  perform pg_temp.assert_v54(
    (select member_cap = 20 from public.guilds where id = g),
    'Open Halls rank 4 expands capacity to 20'
  );

  begin
    update public.guilds set level = 11 where id = g;
    raise exception 'V54 guild level 11 accepted';
  exception
    when others then
      if sqlerrm <> 'GUILD_LEVEL_CAP_10' then
        raise;
      end if;
  end;

  for i in 1..20 loop
    member_id := gen_random_uuid();
    insert into public.guild_members(guild_id, account_id, role)
    values (g, member_id, case when i = 1 then 'leader' else 'member' end);
  end loop;

  begin
    insert into public.guild_members(guild_id, account_id, role)
    values (g, gen_random_uuid(), 'member');
    raise exception 'V54 21st member accepted';
  exception
    when others then
      if sqlerrm <> 'GUILD_FULL' then
        raise;
      end if;
  end;

  perform pg_temp.assert_v54(
    (select count(*) = 20 from public.guild_members where guild_id = g),
    'member hard cap remains 20'
  );
end
$$;

select 'PASS: v54 guild launch cap 12 -> 20, level gates, level cap, and join enforcement' as result;
rollback;
