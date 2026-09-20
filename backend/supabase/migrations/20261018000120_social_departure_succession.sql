-- VELDRYN — safe departure, leadership succession, and 21-day inactivity recovery.
-- Uses server-recorded activity/presence plus auth sign-in fallback. Never trusts client timestamps.
begin;

create table if not exists public.guild_leadership_history_v1(
 id uuid primary key default gen_random_uuid(),
 guild_id uuid not null references public.guilds(id) on delete cascade,
 previous_account_id uuid not null references auth.users(id) on delete cascade,
 next_account_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(reason in('manual','inactivity')),
 created_at timestamptz not null default now()
);
alter table public.guild_leadership_history_v1 enable row level security;
revoke all on public.guild_leadership_history_v1 from public,anon,authenticated;
grant all on public.guild_leadership_history_v1 to service_role;

create or replace function public.social_account_last_active_v1(p_account_id uuid,p_fallback timestamptz default null)
returns timestamptz
language sql
stable
security definer
set search_path=''
as $$
 select max(v.ts)
 from (values
  ((select max(a.last_seen_at) from public.player_activity_daily a where a.account_id=p_account_id)),
  ((select u.last_sign_in_at from auth.users u where u.id=p_account_id)),
  (p_fallback)
 ) v(ts);
$$;

create or replace function public.reconcile_guild_leadership_v1(p_guild_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_guild public.guilds%rowtype;v_leader_joined timestamptz;v_leader_last timestamptz;
 v_next_account uuid;v_next_role text;v_next_last timestamptz;
begin
 select * into v_guild from public.guilds g where g.id=p_guild_id for update;
 if not found then return jsonb_build_object('changed',false,'reason','guild_not_found');end if;
 select gm.joined_at into v_leader_joined from public.guild_members gm
  where gm.guild_id=p_guild_id and gm.account_id=v_guild.owner_account_id and gm.role='leader'
  limit 1;
 if v_leader_joined is null then
  select gm.account_id,gm.joined_at into v_guild.owner_account_id,v_leader_joined
  from public.guild_members gm where gm.guild_id=p_guild_id and gm.role='leader'
  order by gm.joined_at,gm.account_id limit 1;
  if v_guild.owner_account_id is null then return jsonb_build_object('changed',false,'reason','leader_missing');end if;
 end if;
 v_leader_last:=public.social_account_last_active_v1(v_guild.owner_account_id,v_leader_joined);
 if v_leader_last>clock_timestamp()-interval '21 days' then
  return jsonb_build_object('changed',false,'reason','leader_active','leaderAccountId',v_guild.owner_account_id,'leaderLastActiveAt',v_leader_last);
 end if;

 select candidate.account_id,candidate.role,candidate.last_active
 into v_next_account,v_next_role,v_next_last
 from (
  select gm.account_id,gm.role,gm.joined_at,
         public.social_account_last_active_v1(gm.account_id,gm.joined_at) last_active
  from public.guild_members gm
  where gm.guild_id=p_guild_id
    and gm.account_id<>v_guild.owner_account_id
    and gm.role in('officer','member')
 ) candidate
 where candidate.last_active>clock_timestamp()-interval '21 days'
 order by case candidate.role when 'officer' then 0 else 1 end,candidate.joined_at,candidate.account_id
 limit 1;

 if v_next_account is null then
  return jsonb_build_object('changed',false,'reason','no_active_successor','leaderAccountId',v_guild.owner_account_id,'leaderLastActiveAt',v_leader_last);
 end if;

 update public.guild_members set role='officer'
  where guild_id=p_guild_id and account_id=v_guild.owner_account_id and role='leader';
 update public.guild_members set role='leader'
  where guild_id=p_guild_id and account_id=v_next_account;
 update public.guilds set owner_account_id=v_next_account where id=p_guild_id;
 insert into public.guild_leadership_history_v1(guild_id,previous_account_id,next_account_id,reason)
 values(p_guild_id,v_guild.owner_account_id,v_next_account,'inactivity');
 return jsonb_build_object('changed',true,'reason','inactivity','previousAccountId',v_guild.owner_account_id,'leaderAccountId',v_next_account,'successorPreviousRole',v_next_role,'leaderLastActiveAt',v_next_last);
end
$$;

create or replace function public.reconcile_party_leadership_v1(p_party_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_party public.parties%rowtype;v_leader_joined timestamptz;v_leader_last timestamptz;
 v_next_account uuid;v_next_character uuid;v_next_last timestamptz;
begin
 select * into v_party from public.parties p where p.id=p_party_id for update;
 if not found or v_party.status='disbanded' then return jsonb_build_object('changed',false,'reason','party_inactive');end if;
 select pm.joined_at into v_leader_joined from public.party_members pm
  where pm.party_id=p_party_id and pm.account_id=v_party.leader_account_id and pm.left_at is null limit 1;
 if v_leader_joined is null then return jsonb_build_object('changed',false,'reason','leader_missing');end if;
 v_leader_last:=public.social_account_last_active_v1(v_party.leader_account_id,v_leader_joined);
 if v_leader_last>clock_timestamp()-interval '21 days' then
  return jsonb_build_object('changed',false,'reason','leader_active','leaderAccountId',v_party.leader_account_id,'leaderLastActiveAt',v_leader_last);
 end if;

 select candidate.account_id,candidate.character_id,candidate.last_active
 into v_next_account,v_next_character,v_next_last
 from (
  select pm.account_id,pm.character_id,pm.joined_at,
         public.social_account_last_active_v1(pm.account_id,pm.joined_at) last_active
  from public.party_members pm
  where pm.party_id=p_party_id and pm.left_at is null and pm.account_id<>v_party.leader_account_id
 ) candidate
 where candidate.last_active>clock_timestamp()-interval '21 days'
 order by candidate.joined_at,candidate.account_id
 limit 1;
 if v_next_account is null then
  return jsonb_build_object('changed',false,'reason','no_active_successor','leaderAccountId',v_party.leader_account_id,'leaderLastActiveAt',v_leader_last);
 end if;

 update public.parties set leader_account_id=v_next_account,leader_character_id=v_next_character,updated_at=now() where id=p_party_id;
 update public.party_invitations_v1 set status='cancelled',responded_at=now()
  where party_id=p_party_id and status='pending' and inviter_account_id<>v_next_account;
 return jsonb_build_object('changed',true,'reason','inactivity','previousAccountId',v_party.leader_account_id,'leaderAccountId',v_next_account,'leaderLastActiveAt',v_next_last);
end
$$;

create or replace function public.social_activity_leadership_reconcile_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_gid uuid;v_pid uuid;
begin
 select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=new.account_id limit 1;
 if v_gid is not null then perform public.reconcile_guild_leadership_v1(v_gid);end if;
 select pm.party_id into v_pid from public.party_members pm join public.parties p on p.id=pm.party_id
  where pm.account_id=new.account_id and pm.left_at is null and p.status<>'disbanded' limit 1;
 if v_pid is not null then perform public.reconcile_party_leadership_v1(v_pid);end if;
 return new;
end
$$;
drop trigger if exists social_activity_leadership_reconcile_v1 on public.player_activity_daily;
create trigger social_activity_leadership_reconcile_v1
after insert or update of last_seen_at on public.player_activity_daily
for each row execute function public.social_activity_leadership_reconcile_v1();

create or replace function public.guild_leadership_status_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_uid uuid:=auth.uid();v_gid uuid;v_result jsonb;v_leader uuid;v_leader_joined timestamptz;v_last timestamptz;v_name text;
 v_candidate uuid;v_candidate_name text;v_candidate_role text;v_candidate_last timestamptz;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then return null;end if;
 perform public.reconcile_guild_leadership_v1(v_gid);
 select gm.account_id,gm.joined_at,coalesce(nullif(pp.display_name,''),'Adventurer')
  into v_leader,v_leader_joined,v_name
  from public.guild_members gm left join public.player_profiles pp on pp.account_id=gm.account_id
  where gm.guild_id=v_gid and gm.role='leader' limit 1;
 if v_leader is null then return jsonb_build_object('guildId',v_gid,'leaderMissing',true,'thresholdDays',21);end if;
 v_last:=public.social_account_last_active_v1(v_leader,v_leader_joined);
 select c.account_id,coalesce(nullif(pp.display_name,''),'Adventurer'),c.role,c.last_active
 into v_candidate,v_candidate_name,v_candidate_role,v_candidate_last
 from (
  select gm.account_id,gm.role,gm.joined_at,public.social_account_last_active_v1(gm.account_id,gm.joined_at) last_active
  from public.guild_members gm where gm.guild_id=v_gid and gm.account_id<>v_leader
 ) c left join public.player_profiles pp on pp.account_id=c.account_id
 where c.last_active>clock_timestamp()-interval '21 days'
 order by case c.role when 'officer' then 0 when 'member' then 1 else 2 end,c.joined_at,c.account_id
 limit 1;
 return jsonb_build_object(
  'guildId',v_gid,'leaderAccountId',v_leader,'leaderName',v_name,'leaderLastActiveAt',v_last,
  'inactiveDays',greatest(0,floor(extract(epoch from(clock_timestamp()-v_last))/86400)::integer),
  'thresholdDays',21,'eligibleForSuccession',v_last<=clock_timestamp()-interval '21 days' and v_candidate is not null,
  'successorAccountId',v_candidate,'successorName',v_candidate_name,'successorRole',v_candidate_role,'successorLastActiveAt',v_candidate_last
 );
end
$$;

create or replace function public.transfer_guild_leadership_v1(p_target_account_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_target_role text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 if p_target_account_id is null or p_target_account_id=v_uid then raise exception 'invalid_leadership_target';end if;
 select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid and gm.role='leader' limit 1;
 if v_gid is null then raise exception 'guild_leader_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-leadership:'||v_gid::text,0));
 perform 1 from public.guilds g where g.id=v_gid for update;
 select gm.role into v_target_role from public.guild_members gm where gm.guild_id=v_gid and gm.account_id=p_target_account_id for update;
 if v_target_role is null then raise exception 'target_not_guild_member';end if;
 if v_target_role='leader' then raise exception 'target_already_leader';end if;
 update public.guild_members set role='officer' where guild_id=v_gid and account_id=v_uid and role='leader';
 update public.guild_members set role='leader' where guild_id=v_gid and account_id=p_target_account_id;
 update public.guilds set owner_account_id=p_target_account_id where id=v_gid;
 insert into public.guild_leadership_history_v1(guild_id,previous_account_id,next_account_id,reason)
 values(v_gid,v_uid,p_target_account_id,'manual');
 return 'transferred';
end
$$;

create or replace function public.leave_guild_v1()
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select gm.guild_id,gm.role into v_gid,v_role from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'not_in_guild';end if;
 if v_role='leader' then raise exception 'guild_leader_must_transfer_or_disband';end if;
 delete from public.guild_members where guild_id=v_gid and account_id=v_uid;
 update public.guild_applications set status='withdrawn' where account_id=v_uid and status='pending';
 update public.guild_invitations_v1 set status='cancelled',responded_at=now()
  where guild_id=v_gid and inviter_account_id=v_uid and status='pending';
 return 'left';
end
$$;

create or replace function public.disband_guild_v1()
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid and gm.role='leader' limit 1;
 if v_gid is null then raise exception 'guild_leader_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('guild-disband:'||v_gid::text,0));
 delete from public.guilds where id=v_gid;
 return 'disbanded';
end
$$;

create or replace function public.disband_party_v1(p_party_id uuid)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_leader uuid;
begin
 if v_uid is null then raise exception 'authentication_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-disband:'||p_party_id::text,0));
 select p.leader_account_id into v_leader from public.parties p where p.id=p_party_id and p.status<>'disbanded' for update;
 if v_leader is null then raise exception 'party_not_found';end if;
 if v_leader<>v_uid then raise exception 'party_leader_required';end if;
 update public.party_members set left_at=coalesce(left_at,now()) where party_id=p_party_id and left_at is null;
 update public.parties set status='disbanded',updated_at=now() where id=p_party_id;
 update public.party_invitations_v1 set status='cancelled',responded_at=now() where party_id=p_party_id and status='pending';
 return 'disbanded';
end
$$;

-- Keep stale Party invitations from surviving any leadership change, manual or automatic.
create or replace function public.party_leader_invitation_reconcile_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
 if new.leader_account_id is distinct from old.leader_account_id then
  update public.party_invitations_v1 set status='cancelled',responded_at=now()
   where party_id=new.id and status='pending' and inviter_account_id<>new.leader_account_id;
 end if;
 return new;
end
$$;
drop trigger if exists party_leader_invitation_reconcile_v1 on public.parties;
create trigger party_leader_invitation_reconcile_v1
after update of leader_account_id on public.parties
for each row execute function public.party_leader_invitation_reconcile_v1();

revoke all on function public.social_account_last_active_v1(uuid,timestamptz),public.reconcile_guild_leadership_v1(uuid),public.reconcile_party_leadership_v1(uuid),public.social_activity_leadership_reconcile_v1(),public.party_leader_invitation_reconcile_v1() from public,anon,authenticated;
grant execute on function public.social_account_last_active_v1(uuid,timestamptz),public.reconcile_guild_leadership_v1(uuid),public.reconcile_party_leadership_v1(uuid) to service_role;
revoke all on function public.guild_leadership_status_v1(),public.transfer_guild_leadership_v1(uuid),public.leave_guild_v1(),public.disband_guild_v1(),public.disband_party_v1(uuid) from public,anon;
grant execute on function public.guild_leadership_status_v1(),public.transfer_guild_leadership_v1(uuid),public.leave_guild_v1(),public.disband_guild_v1(),public.disband_party_v1(uuid) to authenticated;

comment on function public.guild_leadership_status_v1() is 'Guild leader inactivity status using a 21-day server-authoritative activity threshold.';
comment on function public.reconcile_guild_leadership_v1(uuid) is 'Transfers 21-day inactive Guild leadership to oldest active Officer, else oldest active Member.';
comment on function public.reconcile_party_leadership_v1(uuid) is 'Transfers 21-day inactive Party leadership to oldest active remaining Party member.';
commit;
