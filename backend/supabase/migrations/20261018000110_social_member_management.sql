-- VELDRYN — Party leadership and Guild member-management controls.
-- This extends the direct invitation layer without weakening existing membership authority.
begin;

create or replace function public.transfer_party_leadership_v1(p_party_id uuid,p_target_account_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_party public.parties%rowtype;v_character uuid;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_leadership_target';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-manage:'||p_party_id::text,0));
 select * into v_party from public.parties p where p.id=p_party_id for update;
 if not found or v_party.status='disbanded' then raise exception 'party_not_found';end if;
 if v_party.leader_account_id<>v_uid then raise exception 'party_leader_required';end if;
 select m.character_id into v_character from public.party_members m
  where m.party_id=p_party_id and m.account_id=p_target_account_id and m.left_at is null
  limit 1;
 if v_character is null then raise exception 'target_not_party_member';end if;
 update public.parties set leader_account_id=p_target_account_id,leader_character_id=v_character,updated_at=now() where id=p_party_id;
 return 'transferred';
end
$$;

create or replace function public.remove_party_member_v1(p_party_id uuid,p_target_account_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_party public.parties%rowtype;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_party_remove_target';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-manage:'||p_party_id::text,0));
 select * into v_party from public.parties p where p.id=p_party_id for update;
 if not found or v_party.status='disbanded' then raise exception 'party_not_found';end if;
 if v_party.leader_account_id<>v_uid then raise exception 'party_leader_required';end if;
 update public.party_members set left_at=now()
  where party_id=p_party_id and account_id=p_target_account_id and left_at is null;
 if not found then raise exception 'target_not_party_member';end if;
 update public.parties set updated_at=now() where id=p_party_id;
 return 'removed';
end
$$;

create or replace function public.cancel_party_invitation_v1(p_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_invite public.party_invitations_v1%rowtype;v_leader uuid;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select * into v_invite from public.party_invitations_v1 i where i.id=p_invitation_id for update;
 if not found then raise exception 'party_invite_not_found';end if;
 select p.leader_account_id into v_leader from public.parties p where p.id=v_invite.party_id;
 if v_leader<>v_uid then raise exception 'party_leader_required';end if;
 if v_invite.status<>'pending' then raise exception 'party_invite_not_pending';end if;
 update public.party_invitations_v1 set status='cancelled',responded_at=now() where id=v_invite.id;
 return 'cancelled';
end
$$;

create or replace function public.update_guild_member_role_v1(p_target_account_id uuid,p_role text)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_actor_role text;v_target_role text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_role not in('officer','member') then raise exception 'invalid_guild_role';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_guild_role_target';end if;
 select gm.guild_id,gm.role into v_gid,v_actor_role from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'not_in_guild';end if;
 if v_actor_role<>'leader' then raise exception 'guild_leader_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-manage:'||v_gid::text,0));
 select gm.role into v_target_role from public.guild_members gm where gm.guild_id=v_gid and gm.account_id=p_target_account_id for update;
 if v_target_role is null then raise exception 'target_not_guild_member';end if;
 if v_target_role='leader' then raise exception 'cannot_manage_guild_leader';end if;
 update public.guild_members set role=p_role where guild_id=v_gid and account_id=p_target_account_id;
 return p_role;
end
$$;

create or replace function public.remove_guild_member_v1(p_target_account_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_actor_role text;v_target_role text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_guild_remove_target';end if;
 select gm.guild_id,gm.role into v_gid,v_actor_role from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'not_in_guild';end if;
 if v_actor_role not in('leader','officer') then raise exception 'guild_officer_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-manage:'||v_gid::text,0));
 select gm.role into v_target_role from public.guild_members gm where gm.guild_id=v_gid and gm.account_id=p_target_account_id for update;
 if v_target_role is null then raise exception 'target_not_guild_member';end if;
 if v_target_role='leader' then raise exception 'cannot_remove_guild_leader';end if;
 if v_actor_role='officer' and v_target_role<>'member' then raise exception 'officer_can_remove_members_only';end if;
 delete from public.guild_members where guild_id=v_gid and account_id=p_target_account_id;
 update public.guild_invitations_v1 set status='cancelled',responded_at=now()
  where inviter_account_id=p_target_account_id and guild_id=v_gid and status='pending';
 return 'removed';
end
$$;

create or replace function public.cancel_guild_invitation_v1(p_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_invite public.guild_invitations_v1%rowtype;v_role text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select * into v_invite from public.guild_invitations_v1 i where i.id=p_invitation_id for update;
 if not found then raise exception 'guild_invite_not_found';end if;
 select gm.role into v_role from public.guild_members gm where gm.guild_id=v_invite.guild_id and gm.account_id=v_uid limit 1;
 if v_role not in('leader','officer') then raise exception 'guild_officer_required';end if;
 if v_invite.status<>'pending' then raise exception 'guild_invite_not_pending';end if;
 update public.guild_invitations_v1 set status='cancelled',responded_at=now() where id=v_invite.id;
 return 'cancelled';
end
$$;

create or replace function public.social_outgoing_invitation_state_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_party jsonb:='[]'::jsonb;v_guild jsonb:='[]'::jsonb;v_pid uuid;v_gid uuid;v_party_leader uuid;v_guild_role text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select p.id,p.leader_account_id into v_pid,v_party_leader
  from public.party_members me join public.parties p on p.id=me.party_id
  where me.account_id=v_uid and me.left_at is null and p.status<>'disbanded'
  limit 1;
 if v_pid is not null and v_party_leader=v_uid then
  update public.party_invitations_v1 set status='expired',responded_at=coalesce(responded_at,now())
   where party_id=v_pid and status='pending' and expires_at<=now();
  select coalesce(jsonb_agg(jsonb_build_object(
   'id',i.id,'recipientAccountId',i.recipient_account_id,
   'recipientName',coalesce(nullif(pp.display_name,''),'Adventurer'),
   'expiresAt',i.expires_at
  ) order by i.created_at desc),'[]'::jsonb) into v_party
  from public.party_invitations_v1 i left join public.player_profiles pp on pp.account_id=i.recipient_account_id
  where i.party_id=v_pid and i.status='pending' and i.expires_at>now();
 end if;

 select gm.guild_id,gm.role into v_gid,v_guild_role from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is not null and v_guild_role in('leader','officer') then
  update public.guild_invitations_v1 set status='expired',responded_at=coalesce(responded_at,now())
   where guild_id=v_gid and status='pending' and expires_at<=now();
  select coalesce(jsonb_agg(jsonb_build_object(
   'id',i.id,'recipientAccountId',i.recipient_account_id,
   'recipientName',coalesce(nullif(pp.display_name,''),'Adventurer'),
   'expiresAt',i.expires_at
  ) order by i.created_at desc),'[]'::jsonb) into v_guild
  from public.guild_invitations_v1 i left join public.player_profiles pp on pp.account_id=i.recipient_account_id
  where i.guild_id=v_gid and i.status='pending' and i.expires_at>now();
 end if;
 return jsonb_build_object('party',v_party,'guild',v_guild,'serverTime',now());
end
$$;

revoke all on function public.transfer_party_leadership_v1(uuid,uuid),public.remove_party_member_v1(uuid,uuid),public.cancel_party_invitation_v1(uuid),public.update_guild_member_role_v1(uuid,text),public.remove_guild_member_v1(uuid),public.cancel_guild_invitation_v1(uuid),public.social_outgoing_invitation_state_v1() from public,anon;
grant execute on function public.transfer_party_leadership_v1(uuid,uuid),public.remove_party_member_v1(uuid,uuid),public.cancel_party_invitation_v1(uuid),public.update_guild_member_role_v1(uuid,text),public.remove_guild_member_v1(uuid),public.cancel_guild_invitation_v1(uuid),public.social_outgoing_invitation_state_v1() to authenticated;

comment on function public.transfer_party_leadership_v1(uuid,uuid) is 'Current Party leader may transfer leadership to another active member.';
comment on function public.remove_party_member_v1(uuid,uuid) is 'Current Party leader may remove another active Party member.';
comment on function public.update_guild_member_role_v1(uuid,text) is 'Guild leader may promote members to officer or demote officers to member.';
comment on function public.remove_guild_member_v1(uuid) is 'Guild leader may remove officers/members; officers may remove ordinary members only.';
commit;
