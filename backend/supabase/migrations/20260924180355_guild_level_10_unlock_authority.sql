
create or replace function public.create_guild(p_name text,p_join_policy text,p_minimum_level integer,p_tag text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_id uuid;v_tag text:=upper(trim(coalesce(p_tag,'')));v_level integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
  if exists(select 1 from public.guild_members where account_id=v_uid) then raise exception 'ALREADY_IN_GUILD';end if;
  select coalesce(max(c.level),0) into v_level from public.characters c where c.account_id=v_uid;
  if v_level<10 then raise exception 'GUILD_LEVEL_10_REQUIRED';end if;
  if char_length(trim(p_name)) not between 3 and 24 then raise exception 'INVALID_GUILD_NAME';end if;
  if p_join_policy not in('open','apply','invite') then raise exception 'INVALID_JOIN_POLICY';end if;
  if p_minimum_level not between 1 and 100 then raise exception 'INVALID_MINIMUM_LEVEL';end if;
  if v_tag !~ '^[A-Z]{3}$' then raise exception 'GUILD_TAG_INVALID_FORMAT';end if;
  if exists(select 1 from public.guild_tag_blocklist where tag=v_tag) then raise exception 'GUILD_TAG_BLOCKED';end if;
  if exists(select 1 from public.guild_tag_registry where tag=v_tag) then raise exception 'GUILD_TAG_TAKEN';end if;
  insert into public.guilds(name,owner_account_id,minimum_level,join_policy,tag,tag_color_id)
    values(trim(p_name),v_uid,p_minimum_level,p_join_policy,v_tag,'tag_silver') returning id into v_id;
  begin
    insert into public.guild_tag_registry(tag,guild_id) values(v_tag,v_id);
  exception when unique_violation then raise exception 'GUILD_TAG_TAKEN';
  end;
  insert into public.guild_members(guild_id,account_id,role) values(v_id,v_uid,'leader');
  return v_id;
end $$;

create or replace function public.request_guild_membership(p_guild_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_guild public.guilds%rowtype;
  v_level integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if exists(select 1 from public.guild_members where account_id=v_uid) then raise exception 'ALREADY_IN_GUILD';end if;
  select * into v_guild from public.guilds where id=p_guild_id;
  if not found then raise exception 'GUILD_NOT_FOUND';end if;
  select coalesce(max(c.level),0) into v_level from public.characters c where c.account_id=v_uid;
  if v_level<10 then raise exception 'GUILD_LEVEL_10_REQUIRED';end if;
  if v_level<v_guild.minimum_level then raise exception 'MINIMUM_LEVEL_%',v_guild.minimum_level;end if;
  if v_guild.join_policy='invite' then raise exception 'INVITE_ONLY';end if;
  if v_guild.join_policy='open' then
    insert into public.guild_members(guild_id,account_id,role) values(p_guild_id,v_uid,'member');
    return 'joined';
  end if;
  insert into public.guild_applications(guild_id,account_id,status) values(p_guild_id,v_uid,'pending')
    on conflict(guild_id,account_id) do update set status='pending',created_at=now();
  return 'applied';
end $$;

create or replace function public.review_guild_application(p_application_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_app public.guild_applications%rowtype;
  v_guild public.guilds%rowtype;
  v_member_count integer;
  v_level integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  select * into v_app from public.guild_applications where id=p_application_id for update;
  if not found then raise exception 'APPLICATION_NOT_FOUND';end if;
  if not exists(select 1 from public.guild_members where guild_id=v_app.guild_id and account_id=v_uid and role in('leader','officer')) then raise exception 'NOT_GUILD_OFFICER';end if;
  if v_app.status<>'pending' then raise exception 'APPLICATION_NOT_PENDING';end if;
  if not p_accept then update public.guild_applications set status='declined' where id=v_app.id;return 'declined';end if;
  select * into v_guild from public.guilds where id=v_app.guild_id for update;
  select count(*) into v_member_count from public.guild_members where guild_id=v_app.guild_id;
  if v_member_count>=v_guild.member_cap then raise exception 'GUILD_FULL';end if;
  if exists(select 1 from public.guild_members where account_id=v_app.account_id) then raise exception 'APPLICANT_ALREADY_IN_GUILD';end if;
  select coalesce(max(c.level),0) into v_level from public.characters c where c.account_id=v_app.account_id;
  if v_level<10 then raise exception 'GUILD_LEVEL_10_REQUIRED';end if;
  if v_level<v_guild.minimum_level then raise exception 'MINIMUM_LEVEL_%',v_guild.minimum_level;end if;
  insert into public.guild_members(guild_id,account_id,role) values(v_app.guild_id,v_app.account_id,'member');
  update public.guild_applications set status='accepted' where id=v_app.id;
  return 'accepted';
end $$;

create or replace function public.respond_guild_application(p_application_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_app record;
  v_cap integer;
  v_min_level integer;
  v_count integer;
  v_level integer;
begin
  if v_uid is null then raise exception 'authentication_required';end if;
  select * into v_app from public.guild_applications where id=p_application_id for update;
  if v_app.id is null or v_app.status<>'pending' then raise exception 'application_not_available';end if;
  if v_app.expires_at<=now() then update public.guild_applications set status='expired',responded_at=now() where id=v_app.id;raise exception 'application_expired';end if;
  if not exists(select 1 from public.guild_members where guild_id=v_app.guild_id and account_id=v_uid and role in('leader','officer')) then raise exception 'recruitment_permission_required';end if;
  if not p_accept then update public.guild_applications set status='declined',responded_at=now() where id=v_app.id;return false;end if;
  if exists(select 1 from public.guild_members where account_id=v_app.account_id) then raise exception 'applicant_already_in_guild';end if;
  select member_cap,minimum_level into v_cap,v_min_level from public.guilds where id=v_app.guild_id for update;
  select count(*) into v_count from public.guild_members where guild_id=v_app.guild_id;
  if v_count>=v_cap then raise exception 'guild_full';end if;
  select coalesce(max(c.level),0) into v_level from public.characters c where c.account_id=v_app.account_id;
  if v_level<10 then raise exception 'guild_level_10_required';end if;
  if v_level<v_min_level then raise exception 'minimum_level_not_met';end if;
  insert into public.guild_members(guild_id,account_id,role) values(v_app.guild_id,v_app.account_id,'member');
  update public.guild_applications set status='accepted',responded_at=now() where id=v_app.id;
  return true;
end $$;

create or replace function public.respond_guild_invite(p_invite_id uuid,p_character_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_inv record;
  v_cap integer;
  v_min_level integer;
  v_count integer;
  v_level integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'character_not_owned';end if;
  select * into v_inv from public.guild_invites where id=p_invite_id and account_id=v_uid for update;
  if v_inv.id is null or v_inv.status<>'pending' then raise exception 'invite_not_available';end if;
  if v_inv.expires_at<=now() then update public.guild_invites set status='expired',responded_at=now() where id=v_inv.id;raise exception 'invite_expired';end if;
  if not p_accept then update public.guild_invites set status='declined',responded_at=now() where id=v_inv.id;return false;end if;
  if exists(select 1 from public.guild_members where account_id=v_uid) then raise exception 'already_in_guild';end if;
  select member_cap,minimum_level into v_cap,v_min_level from public.guilds where id=v_inv.guild_id for update;
  select count(*) into v_count from public.guild_members where guild_id=v_inv.guild_id;
  if v_count>=v_cap then raise exception 'guild_full';end if;
  select coalesce(max(c.level),0) into v_level from public.characters c where c.account_id=v_uid;
  if v_level<10 then raise exception 'guild_level_10_required';end if;
  if v_level<v_min_level then raise exception 'minimum_level_not_met';end if;
  insert into public.guild_members(guild_id,account_id,role) values(v_inv.guild_id,v_uid,'member');
  update public.guild_invites set status='accepted',responded_at=now() where id=v_inv.id;
  return true;
end $$;

create or replace function public.respond_guild_invitation_v1(p_invitation_id uuid,p_accept boolean)
returns text language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid:=auth.uid();
  v_invite public.guild_invitations_v1%rowtype;
  v_guild public.guilds%rowtype;
  v_count integer;
  v_level integer;
begin
  if v_uid is null then raise exception 'authentication_required';end if;
  perform pg_advisory_xact_lock(hashtextextended('guild-invite-response:'||v_uid::text,0));
  select * into v_invite from public.guild_invitations_v1 i where i.id=p_invitation_id for update;
  if not found or v_invite.recipient_account_id<>v_uid then raise exception 'guild_invite_not_found';end if;
  if v_invite.status='accepted' then return 'accepted';end if;
  if v_invite.status<>'pending' then raise exception 'guild_invite_not_pending';end if;
  if v_invite.expires_at<=now() then update public.guild_invitations_v1 set status='expired',responded_at=now() where id=v_invite.id;raise exception 'guild_invite_expired';end if;
  if not p_accept then update public.guild_invitations_v1 set status='declined',responded_at=now() where id=v_invite.id;return 'declined';end if;
  if public.party_social_blocked_v16(v_invite.inviter_account_id) then raise exception 'player_unavailable';end if;
  if exists(select 1 from public.guild_members gm where gm.account_id=v_uid) then raise exception 'already_in_guild';end if;
  select * into v_guild from public.guilds g where g.id=v_invite.guild_id for update;
  if not found then raise exception 'guild_not_found';end if;
  select count(*) into v_count from public.guild_members gm where gm.guild_id=v_guild.id;
  if v_count>=v_guild.member_cap then raise exception 'guild_full';end if;
  select coalesce(max(c.level),0) into v_level from public.characters c where c.account_id=v_uid;
  if v_level<10 then raise exception 'guild_level_10_required';end if;
  if v_level<v_guild.minimum_level then raise exception 'minimum_level_not_met';end if;
  insert into public.guild_members(guild_id,account_id,role) values(v_guild.id,v_uid,'member');
  update public.guild_invitations_v1 set status='accepted',responded_at=now() where id=v_invite.id;
  update public.guild_invitations_v1 set status='cancelled',responded_at=now()
    where recipient_account_id=v_uid and status='pending' and id<>v_invite.id;
  update public.guild_applications set status='withdrawn' where account_id=v_uid and status='pending';
  return 'accepted';
end $$;
;
