-- First client-facing social pass. Content moderation and rate limiting remain
-- server-side follow-up work; world chat is intentionally restricted to the
-- four announced channels.
alter table public.chat_messages add column if not exists sender_name text not null default 'Adventurer';

drop policy if exists "world chat readable" on public.chat_messages;
create policy "world chat readable" on public.chat_messages
  for select to authenticated
  using (channel_type = 'world' and channel_id in ('world-1','world-2','world-3','world-4'));

drop policy if exists "world chat sender can post" on public.chat_messages;
create policy "world chat sender can post" on public.chat_messages
  for insert to authenticated
  with check (
    account_id = auth.uid()
    and channel_type = 'world'
    and channel_id in ('world-1','world-2','world-3','world-4')
    and char_length(body) between 1 and 300
  );

drop policy if exists "guild application owner can create" on public.guild_applications;
create policy "guild application owner can create" on public.guild_applications
  for insert to authenticated with check (account_id = auth.uid());

create or replace function public.request_guild_membership(p_guild_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_guild public.guilds%rowtype;
  v_level integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.guild_members where account_id = v_uid) then raise exception 'ALREADY_IN_GUILD'; end if;
  select * into v_guild from public.guilds where id = p_guild_id;
  if not found then raise exception 'GUILD_NOT_FOUND'; end if;
  select coalesce(max(level), 0) into v_level from public.characters where account_id = v_uid;
  if v_level < v_guild.minimum_level then raise exception 'MINIMUM_LEVEL_%', v_guild.minimum_level; end if;
  if v_guild.join_policy = 'invite' then raise exception 'INVITE_ONLY'; end if;
  if v_guild.join_policy = 'open' then
    insert into public.guild_members(guild_id,account_id,role) values(p_guild_id,v_uid,'member');
    return 'joined';
  end if;
  insert into public.guild_applications(guild_id,account_id,status) values(p_guild_id,v_uid,'pending')
    on conflict(guild_id,account_id) do update set status = 'pending', created_at = now();
  return 'applied';
end $$;

revoke all on function public.request_guild_membership(uuid) from public;
grant execute on function public.request_guild_membership(uuid) to authenticated;

drop policy if exists "guild leaders read applications" on public.guild_applications;
create policy "guild leaders read applications" on public.guild_applications
  for select to authenticated using (exists(
    select 1 from public.guild_members gm
    where gm.guild_id = guild_applications.guild_id
      and gm.account_id = auth.uid()
      and gm.role in ('leader','officer')
  ));

create or replace function public.create_guild(p_name text, p_join_policy text default 'open', p_minimum_level integer default 1)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.guild_members where account_id=v_uid) then raise exception 'ALREADY_IN_GUILD'; end if;
  if char_length(trim(p_name)) < 3 or char_length(trim(p_name)) > 24 then raise exception 'INVALID_GUILD_NAME'; end if;
  if p_join_policy not in ('open','apply','invite') then raise exception 'INVALID_JOIN_POLICY'; end if;
  if p_minimum_level < 1 or p_minimum_level > 100 then raise exception 'INVALID_MINIMUM_LEVEL'; end if;
  insert into public.guilds(name,owner_account_id,minimum_level,join_policy)
    values(trim(p_name),v_uid,p_minimum_level,p_join_policy) returning id into v_id;
  insert into public.guild_members(guild_id,account_id,role) values(v_id,v_uid,'leader');
  return v_id;
end $$;

create or replace function public.review_guild_application(p_application_id uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_app public.guild_applications%rowtype; v_guild public.guilds%rowtype; v_member_count integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_app from public.guild_applications where id=p_application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND'; end if;
  if not exists(select 1 from public.guild_members where guild_id=v_app.guild_id and account_id=v_uid and role in ('leader','officer')) then raise exception 'NOT_GUILD_OFFICER'; end if;
  if v_app.status <> 'pending' then raise exception 'APPLICATION_NOT_PENDING'; end if;
  if not p_accept then update public.guild_applications set status='declined' where id=v_app.id; return 'declined'; end if;
  select * into v_guild from public.guilds where id=v_app.guild_id for update;
  select count(*) into v_member_count from public.guild_members where guild_id=v_app.guild_id;
  if v_member_count >= v_guild.member_cap then raise exception 'GUILD_FULL'; end if;
  if exists(select 1 from public.guild_members where account_id=v_app.account_id) then raise exception 'APPLICANT_ALREADY_IN_GUILD'; end if;
  insert into public.guild_members(guild_id,account_id,role) values(v_app.guild_id,v_app.account_id,'member');
  update public.guild_applications set status='accepted' where id=v_app.id;
  return 'accepted';
end $$;

create or replace function public.guild_roster(p_guild_id uuid)
returns table(account_id uuid, display_name text, role text, joined_at timestamptz)
language sql security definer set search_path = public as $$
  select gm.account_id, coalesce(pp.display_name,'Adventurer'), gm.role, gm.joined_at
  from public.guild_members gm
  left join public.player_profiles pp on pp.account_id=gm.account_id
  where gm.guild_id=p_guild_id
  order by case gm.role when 'leader' then 0 when 'officer' then 1 else 2 end, gm.joined_at;
$$;

revoke all on function public.create_guild(text,text,integer), public.review_guild_application(uuid,boolean), public.guild_roster(uuid) from public;
grant execute on function public.create_guild(text,text,integer), public.review_guild_application(uuid,boolean), public.guild_roster(uuid) to authenticated;
