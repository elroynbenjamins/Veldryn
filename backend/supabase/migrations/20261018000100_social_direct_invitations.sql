-- VELDRYN — direct Party and Guild invitations.
-- Server-owned pending invitations layer on top of the existing authoritative
-- Party/Guild membership rules; they never bypass caps, blocks, or level gates.
begin;

create table if not exists public.party_invitations_v1(
 id uuid primary key default gen_random_uuid(),
 party_id uuid not null references public.parties(id) on delete cascade,
 inviter_account_id uuid not null references auth.users(id) on delete cascade,
 recipient_account_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','accepted','declined','cancelled','expired')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours'),
 responded_at timestamptz,
 check(inviter_account_id<>recipient_account_id),
 check(expires_at>created_at)
);
create unique index if not exists party_invitation_one_pending_target_v1
 on public.party_invitations_v1(party_id,recipient_account_id)
 where status='pending';
create index if not exists party_invitation_recipient_v1
 on public.party_invitations_v1(recipient_account_id,status,expires_at);
create index if not exists party_invitation_sender_rate_v1
 on public.party_invitations_v1(inviter_account_id,created_at desc);

create table if not exists public.guild_invitations_v1(
 id uuid primary key default gen_random_uuid(),
 guild_id uuid not null references public.guilds(id) on delete cascade,
 inviter_account_id uuid not null references auth.users(id) on delete cascade,
 recipient_account_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','accepted','declined','cancelled','expired')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours'),
 responded_at timestamptz,
 check(inviter_account_id<>recipient_account_id),
 check(expires_at>created_at)
);
create unique index if not exists guild_invitation_one_pending_target_v1
 on public.guild_invitations_v1(guild_id,recipient_account_id)
 where status='pending';
create index if not exists guild_invitation_recipient_v1
 on public.guild_invitations_v1(recipient_account_id,status,expires_at);
create index if not exists guild_invitation_sender_rate_v1
 on public.guild_invitations_v1(inviter_account_id,created_at desc);

alter table public.party_invitations_v1 enable row level security;
alter table public.guild_invitations_v1 enable row level security;
revoke all on public.party_invitations_v1,public.guild_invitations_v1 from public,anon,authenticated;
grant all on public.party_invitations_v1,public.guild_invitations_v1 to service_role;

create or replace function public.social_invite_capabilities_v1(p_target_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();
 v_blocked boolean:=false;
 v_target_exists boolean:=false;
 v_party_id uuid;v_party_leader uuid;v_party_count integer:=0;v_target_in_party boolean:=false;v_party_pending boolean:=false;v_party_reason text;
 v_guild_id uuid;v_guild_name text;v_guild_role text;v_guild_count integer:=0;v_guild_cap integer:=0;v_guild_min integer:=1;v_target_level integer:=0;v_target_in_guild boolean:=false;v_guild_pending boolean:=false;v_guild_reason text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_invite_target';end if;
 select exists(select 1 from auth.users u where u.id=p_target_account_id) into v_target_exists;
 if not v_target_exists then raise exception 'player_not_found';end if;
 select public.party_social_blocked_v16(p_target_account_id) into v_blocked;
 if v_blocked then
  return jsonb_build_object(
   'party',jsonb_build_object('available',false,'pending',false,'reason','player_unavailable'),
   'guild',jsonb_build_object('available',false,'pending',false,'reason','player_unavailable')
  );
 end if;

 select p.id,p.leader_account_id,
        (select count(*) from public.party_members m where m.party_id=p.id and m.left_at is null)
   into v_party_id,v_party_leader,v_party_count
   from public.party_members me join public.parties p on p.id=me.party_id
  where me.account_id=v_uid and me.left_at is null and p.status<>'disbanded'
  limit 1;
 select exists(
  select 1 from public.party_members m join public.parties p on p.id=m.party_id
   where m.account_id=p_target_account_id and m.left_at is null and p.status<>'disbanded'
 ) into v_target_in_party;
 if v_party_id is not null then
  select exists(select 1 from public.party_invitations_v1 i where i.party_id=v_party_id and i.recipient_account_id=p_target_account_id and i.status='pending' and i.expires_at>now()) into v_party_pending;
 end if;
 v_party_reason:=case
  when v_party_id is null then 'no_party'
  when v_party_leader<>v_uid then 'leader_required'
  when v_party_count>=4 then 'party_full'
  when v_target_in_party then 'target_in_party'
  when v_party_pending then 'already_invited'
  else null end;

 select g.id,g.name,gm.role,g.member_cap,g.minimum_level,
        (select count(*) from public.guild_members x where x.guild_id=g.id)
   into v_guild_id,v_guild_name,v_guild_role,v_guild_cap,v_guild_min,v_guild_count
   from public.guild_members gm join public.guilds g on g.id=gm.guild_id
  where gm.account_id=v_uid
  limit 1;
 select exists(select 1 from public.guild_members gm where gm.account_id=p_target_account_id) into v_target_in_guild;
 select coalesce(max(c.level),0) into v_target_level from public.characters c where c.account_id=p_target_account_id;
 if v_guild_id is not null then
  select exists(select 1 from public.guild_invitations_v1 i where i.guild_id=v_guild_id and i.recipient_account_id=p_target_account_id and i.status='pending' and i.expires_at>now()) into v_guild_pending;
 end if;
 v_guild_reason:=case
  when v_guild_id is null then 'no_guild'
  when v_guild_role not in('leader','officer') then 'officer_required'
  when v_guild_count>=v_guild_cap then 'guild_full'
  when v_target_in_guild then 'target_in_guild'
  when v_target_level<v_guild_min then 'minimum_level'
  when v_guild_pending then 'already_invited'
  else null end;

 return jsonb_build_object(
  'party',jsonb_build_object('available',v_party_reason is null,'pending',v_party_pending,'reason',v_party_reason,'partyId',v_party_id,'memberCount',v_party_count,'memberCap',4),
  'guild',jsonb_build_object('available',v_guild_reason is null,'pending',v_guild_pending,'reason',v_guild_reason,'guildId',v_guild_id,'guildName',v_guild_name,'memberCount',v_guild_count,'memberCap',v_guild_cap,'minimumLevel',v_guild_min)
 );
end
$$;

create or replace function public.send_party_invitation_v1(p_target_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_party_id uuid;v_leader uuid;v_count integer;v_existing uuid;v_id uuid;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_invite_target';end if;
 if not exists(select 1 from auth.users u where u.id=p_target_account_id) then raise exception 'player_not_found';end if;
 if public.party_social_blocked_v16(p_target_account_id) then raise exception 'player_unavailable';end if;
 select p.id,p.leader_account_id,(select count(*) from public.party_members m where m.party_id=p.id and m.left_at is null)
   into v_party_id,v_leader,v_count
   from public.party_members me join public.parties p on p.id=me.party_id
  where me.account_id=v_uid and me.left_at is null and p.status<>'disbanded'
  limit 1;
 if v_party_id is null then raise exception 'no_active_party';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-invite:'||v_party_id::text||':'||p_target_account_id::text,0));
 perform 1 from public.parties p where p.id=v_party_id for update;
 if v_leader<>v_uid then raise exception 'party_leader_required';end if;
 select count(*) into v_count from public.party_members m where m.party_id=v_party_id and m.left_at is null;
 if v_count>=4 then raise exception 'party_full';end if;
 if exists(select 1 from public.party_members m join public.parties p on p.id=m.party_id where m.account_id=p_target_account_id and m.left_at is null and p.status<>'disbanded') then raise exception 'target_already_in_party';end if;
 if (select count(*) from public.party_invitations_v1 i where i.inviter_account_id=v_uid and i.created_at>now()-interval '1 hour')>=20 then raise exception 'party_invite_rate_limit';end if;
 update public.party_invitations_v1 set status='expired',responded_at=coalesce(responded_at,now())
  where party_id=v_party_id and recipient_account_id=p_target_account_id and status='pending' and expires_at<=now();
 select i.id into v_existing from public.party_invitations_v1 i
  where i.party_id=v_party_id and i.recipient_account_id=p_target_account_id and i.status='pending' and i.expires_at>now()
  limit 1;
 if v_existing is not null then return jsonb_build_object('id',v_existing,'status','already_pending','expiresAt', (select expires_at from public.party_invitations_v1 where id=v_existing));end if;
 insert into public.party_invitations_v1(party_id,inviter_account_id,recipient_account_id)
 values(v_party_id,v_uid,p_target_account_id) returning id into v_id;
 return jsonb_build_object('id',v_id,'status','sent','expiresAt',now()+interval '24 hours');
end
$$;

create or replace function public.respond_party_invitation_v1(p_invitation_id uuid,p_accept boolean,p_character_id uuid default null)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_invite public.party_invitations_v1%rowtype;v_class text;v_role text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-invite-response:'||v_uid::text,0));
 select * into v_invite from public.party_invitations_v1 i where i.id=p_invitation_id for update;
 if not found or v_invite.recipient_account_id<>v_uid then raise exception 'party_invite_not_found';end if;
 if v_invite.status='accepted' then return 'accepted';end if;
 if v_invite.status<>'pending' then raise exception 'party_invite_not_pending';end if;
 if v_invite.expires_at<=now() then
  update public.party_invitations_v1 set status='expired',responded_at=now() where id=v_invite.id;
  raise exception 'party_invite_expired';
 end if;
 if not p_accept then
  update public.party_invitations_v1 set status='declined',responded_at=now() where id=v_invite.id;
  return 'declined';
 end if;
 if p_character_id is null then raise exception 'character_required';end if;
 select c.class_id into v_class from public.characters c where c.id=p_character_id and c.account_id=v_uid;
 if v_class is null then raise exception 'character_not_owned';end if;
 v_role:=case
  when v_class in('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
  when v_class in('DAWNKEEPER','STONECALLER') then 'support'
  else 'damage' end;
 if public.party_social_blocked_v16(v_invite.inviter_account_id) then raise exception 'player_unavailable';end if;
 perform public.join_persistent_party_v16(v_invite.party_id,p_character_id,v_role,'party-invite-'||v_invite.id::text);
 update public.party_invitations_v1 set status='accepted',responded_at=now() where id=v_invite.id;
 update public.party_invitations_v1 set status='cancelled',responded_at=now()
  where recipient_account_id=v_uid and status='pending' and id<>v_invite.id;
 return 'accepted';
end
$$;

create or replace function public.send_guild_invitation_v1(p_target_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_cap integer;v_min integer;v_count integer;v_target_level integer;v_existing uuid;v_id uuid;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_invite_target';end if;
 if not exists(select 1 from auth.users u where u.id=p_target_account_id) then raise exception 'player_not_found';end if;
 if public.party_social_blocked_v16(p_target_account_id) then raise exception 'player_unavailable';end if;
 select g.id,gm.role,g.member_cap,g.minimum_level into v_gid,v_role,v_cap,v_min
  from public.guild_members gm join public.guilds g on g.id=gm.guild_id
  where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'not_in_guild';end if;
 if v_role not in('leader','officer') then raise exception 'guild_officer_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-invite:'||v_gid::text||':'||p_target_account_id::text,0));
 perform 1 from public.guilds g where g.id=v_gid for update;
 select count(*) into v_count from public.guild_members gm where gm.guild_id=v_gid;
 if v_count>=v_cap then raise exception 'guild_full';end if;
 if exists(select 1 from public.guild_members gm where gm.account_id=p_target_account_id) then raise exception 'target_already_in_guild';end if;
 select coalesce(max(c.level),0) into v_target_level from public.characters c where c.account_id=p_target_account_id;
 if v_target_level<v_min then raise exception 'target_below_minimum_level';end if;
 if (select count(*) from public.guild_invitations_v1 i where i.inviter_account_id=v_uid and i.created_at>now()-interval '1 hour')>=30 then raise exception 'guild_invite_rate_limit';end if;
 update public.guild_invitations_v1 set status='expired',responded_at=coalesce(responded_at,now())
  where guild_id=v_gid and recipient_account_id=p_target_account_id and status='pending' and expires_at<=now();
 select i.id into v_existing from public.guild_invitations_v1 i
  where i.guild_id=v_gid and i.recipient_account_id=p_target_account_id and i.status='pending' and i.expires_at>now()
  limit 1;
 if v_existing is not null then return jsonb_build_object('id',v_existing,'status','already_pending','expiresAt',(select expires_at from public.guild_invitations_v1 where id=v_existing));end if;
 insert into public.guild_invitations_v1(guild_id,inviter_account_id,recipient_account_id)
 values(v_gid,v_uid,p_target_account_id) returning id into v_id;
 return jsonb_build_object('id',v_id,'status','sent','expiresAt',now()+interval '24 hours');
end
$$;

create or replace function public.respond_guild_invitation_v1(p_invitation_id uuid,p_accept boolean)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_invite public.guild_invitations_v1%rowtype;v_guild public.guilds%rowtype;v_count integer;v_level integer;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-invite-response:'||v_uid::text,0));
 select * into v_invite from public.guild_invitations_v1 i where i.id=p_invitation_id for update;
 if not found or v_invite.recipient_account_id<>v_uid then raise exception 'guild_invite_not_found';end if;
 if v_invite.status='accepted' then return 'accepted';end if;
 if v_invite.status<>'pending' then raise exception 'guild_invite_not_pending';end if;
 if v_invite.expires_at<=now() then
  update public.guild_invitations_v1 set status='expired',responded_at=now() where id=v_invite.id;
  raise exception 'guild_invite_expired';
 end if;
 if not p_accept then
  update public.guild_invitations_v1 set status='declined',responded_at=now() where id=v_invite.id;
  return 'declined';
 end if;
 if public.party_social_blocked_v16(v_invite.inviter_account_id) then raise exception 'player_unavailable';end if;
 if exists(select 1 from public.guild_members gm where gm.account_id=v_uid) then raise exception 'already_in_guild';end if;
 select * into v_guild from public.guilds g where g.id=v_invite.guild_id for update;
 if not found then raise exception 'guild_not_found';end if;
 select count(*) into v_count from public.guild_members gm where gm.guild_id=v_guild.id;
 if v_count>=v_guild.member_cap then raise exception 'guild_full';end if;
 select coalesce(max(c.level),0) into v_level from public.characters c where c.account_id=v_uid;
 if v_level<v_guild.minimum_level then raise exception 'minimum_level_not_met';end if;
 insert into public.guild_members(guild_id,account_id,role) values(v_guild.id,v_uid,'member');
 update public.guild_invitations_v1 set status='accepted',responded_at=now() where id=v_invite.id;
 update public.guild_invitations_v1 set status='cancelled',responded_at=now()
  where recipient_account_id=v_uid and status='pending' and id<>v_invite.id;
 update public.guild_applications set status='withdrawn'
  where account_id=v_uid and status='pending';
 return 'accepted';
end
$$;

create or replace function public.social_invitation_state_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_party jsonb;v_guild jsonb;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 update public.party_invitations_v1 set status='expired',responded_at=coalesce(responded_at,now())
  where recipient_account_id=v_uid and status='pending' and expires_at<=now();
 update public.guild_invitations_v1 set status='expired',responded_at=coalesce(responded_at,now())
  where recipient_account_id=v_uid and status='pending' and expires_at<=now();
 update public.party_invitations_v1 set status='cancelled',responded_at=now()
  where recipient_account_id=v_uid and status='pending' and public.party_social_blocked_v16(inviter_account_id);
 update public.guild_invitations_v1 set status='cancelled',responded_at=now()
  where recipient_account_id=v_uid and status='pending' and public.party_social_blocked_v16(inviter_account_id);

 select coalesce(jsonb_agg(jsonb_build_object(
  'id',i.id,'partyId',i.party_id,'inviterAccountId',i.inviter_account_id,
  'inviterName',coalesce(nullif(pp.display_name,''),'Adventurer'),
  'focus',p.focus,'memberCount',(select count(*) from public.party_members m where m.party_id=i.party_id and m.left_at is null),
  'openSpots',greatest(0,4-(select count(*) from public.party_members m where m.party_id=i.party_id and m.left_at is null)),
  'expiresAt',i.expires_at
 ) order by i.created_at desc),'[]'::jsonb) into v_party
 from public.party_invitations_v1 i
 join public.parties p on p.id=i.party_id and p.status<>'disbanded'
 left join public.player_profiles pp on pp.account_id=i.inviter_account_id
 where i.recipient_account_id=v_uid and i.status='pending' and i.expires_at>now();

 select coalesce(jsonb_agg(jsonb_build_object(
  'id',i.id,'guildId',i.guild_id,'inviterAccountId',i.inviter_account_id,
  'inviterName',coalesce(nullif(pp.display_name,''),'Adventurer'),
  'guildName',g.name,'guildTag',g.tag,'memberCount',(select count(*) from public.guild_members gm where gm.guild_id=i.guild_id),
  'memberCap',g.member_cap,'minimumLevel',g.minimum_level,'expiresAt',i.expires_at
 ) order by i.created_at desc),'[]'::jsonb) into v_guild
 from public.guild_invitations_v1 i
 join public.guilds g on g.id=i.guild_id
 left join public.player_profiles pp on pp.account_id=i.inviter_account_id
 where i.recipient_account_id=v_uid and i.status='pending' and i.expires_at>now();

 return jsonb_build_object('party',v_party,'guild',v_guild,'serverTime',now());
end
$$;

revoke all on function public.social_invite_capabilities_v1(uuid),public.send_party_invitation_v1(uuid),public.respond_party_invitation_v1(uuid,boolean,uuid),public.send_guild_invitation_v1(uuid),public.respond_guild_invitation_v1(uuid,boolean),public.social_invitation_state_v1() from public,anon;
grant execute on function public.social_invite_capabilities_v1(uuid),public.send_party_invitation_v1(uuid),public.respond_party_invitation_v1(uuid,boolean,uuid),public.send_guild_invitation_v1(uuid),public.respond_guild_invitation_v1(uuid,boolean),public.social_invitation_state_v1() to authenticated;

comment on table public.party_invitations_v1 is '24-hour direct invitations to persistent Parties; membership remains server-authoritative.';
comment on table public.guild_invitations_v1 is '24-hour direct Guild invitations issued by leaders/officers; caps and minimum levels remain authoritative.';
commit;
