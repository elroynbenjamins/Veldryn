-- DISPOSABLE PG17 REVIEW ONLY, after V108/V110/V111/V122.
-- Not a live join endpoint. Never changes public.party_members.
-- Explicit applicant consent, one pending request per applicant and Party.
-- Existing direct joining remains unchanged. 24h deadline is provisional.
create table private.party_recruitment_applications_v124 (
 id uuid primary key,
 party_id uuid not null references private.party_registration_state_v110(party_id) on delete cascade,
 applicant_account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 role text not null check(role in ('tank','damage','support')),
 leader_account_id uuid not null references auth.users(id) on delete cascade,
 roster_revision bigint not null check(roster_revision>0),
 chat_message_id uuid not null unique references public.chat_messages(id) on delete cascade,
 created_at timestamptz not null,
 expires_at timestamptz not null check(expires_at=created_at+interval '24 hours'),
 state text not null default 'pending' check(state in ('pending','accepted','declined','withdrawn','expired')),
 decided_at timestamptz,
 joined_registration_id uuid,
 committed_revision bigint,
 foreign key(character_id,applicant_account_id) references public.characters(id,account_id) on delete cascade,
 check((state='pending' and decided_at is null) or (state<>'pending' and decided_at>=created_at and decided_at is not null)),
 check((state='accepted' and joined_registration_id is not null and committed_revision=roster_revision+1 and committed_revision is not null)
 or (state<>'accepted' and joined_registration_id is null and committed_revision is null))
);
create unique index party_recruitment_one_pending_v124
 on private.party_recruitment_applications_v124(party_id,applicant_account_id) where state='pending';
alter table private.party_recruitment_applications_v124 enable row level security;
revoke all on private.party_recruitment_applications_v124 from public,anon,authenticated,service_role;

-- Mirror the existing bidirectional player-block restriction over the
-- authoritative private active roster. Recheck at approval, not just open.
create function private.party_registration_block_guard_v126(p_party uuid,p_applicant uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from private.party_registration_members_v110 m
 join public.player_blocks b on
 (b.blocker_id=p_applicant and b.blocked_id=m.account_id)
 or (b.blocked_id=p_applicant and b.blocker_id=m.account_id)
 where m.party_id=p_party)
 then raise exception 'party_recruit_v124_player_unavailable';end if;
end
$$;
revoke all on function private.party_registration_block_guard_v126(uuid,uuid) from public,anon,authenticated,service_role;

-- The host supplies the authenticated applicant and a reserved canonical
-- system message, created in the SAME transaction. No applicant impersonation.
create function private.open_party_recruitment_application_v124(
 p_id uuid,p_actor uuid,p_party uuid,p_character uuid,p_message uuid
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
 s private.party_registration_state_v110%rowtype;
 a private.party_recruitment_applications_v124%rowtype;
 c public.characters%rowtype;
 v_now timestamptz;
 v_role text;
begin
 if p_id is null or p_actor is null or p_party is null or p_character is null or p_message is null
 then raise exception 'party_recruit_v124_invalid_request';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_actor::text,0));
 perform 1 from public.parties where id=p_party and status<>'disbanded' for update;
 if not found then raise exception 'party_recruit_v124_party_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready then raise exception 'party_recruit_v124_unreleased';end if;
 select * into a from private.party_recruitment_applications_v124 where id=p_id;
 if found then
  if a.applicant_account_id<>p_actor or a.party_id<>p_party or a.character_id<>p_character or a.chat_message_id<>p_message
  then raise exception 'party_recruit_v124_conflicting_application';end if;
  return a.id;
 end if;
 if s.lifecycle_status<>'active' or s.activity_locked or not exists(select 1 from private.party_registration_members_v110
  where party_id=p_party and account_id=s.leader_account_id)
 then raise exception 'party_recruit_v124_locked';end if;
 if not private.party_entry_account_available_v131(p_actor)
 then raise exception 'party_recruit_v124_already_in_party';end if;
 if (select count(*) from private.party_registration_members_v110 where party_id=p_party)>=4
 then raise exception 'party_recruit_v124_full';end if;
 perform private.party_registration_block_guard_v126(p_party,p_actor);
 perform 1 from public.characters where account_id=p_actor order by id for update;
 select * into c from public.characters where id=p_character and account_id=p_actor;
 if not found then raise exception 'party_recruit_v124_not_owned';end if;
 v_role:=private.party_registration_role_v111(c.class_id);
 if v_role is null or c.level is null or c.level<greatest(1,s.minimum_level)
 or not exists(select 1 from public.characters where account_id=p_actor and level>=10)
 then raise exception 'party_recruit_v124_ineligible';end if;
 if not exists(select 1 from public.chat_messages where id=p_message and account_id is null
  and is_system=true and channel_type='party' and channel_id=p_party::text)
 then raise exception 'party_recruit_v124_unverified_message';end if;
 v_now:=clock_timestamp();
 update private.party_recruitment_applications_v124 set state='expired',decided_at=v_now
  where party_id=p_party and applicant_account_id=p_actor and state='pending' and expires_at<=v_now;
 insert into private.party_recruitment_applications_v124
 (id,party_id,applicant_account_id,character_id,role,leader_account_id,roster_revision,chat_message_id,created_at,expires_at)
 values(p_id,p_party,p_actor,p_character,v_role,s.leader_account_id,s.roster_revision,p_message,v_now,v_now+interval '24 hours');
 return p_id;
end
$$;

-- Caller is the verified current leader or the applicant withdrawing.
-- Every acceptance rechecks the exact applicant, current roster, and owned
-- hero. Same account lock order as legacy direct join; unique registration
-- index is the final cross-Party fence. No hard role quota in permanent Party.
create function private.respond_party_recruitment_application_v124(
 p_actor uuid,p_party uuid,p_id uuid,p_decision text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 a private.party_recruitment_applications_v124%rowtype;
 s private.party_registration_state_v110%rowtype;
 c public.characters%rowtype;
 v_applicant uuid;
 v_now timestamptz;
 v_registration uuid;
 v_terminal text;
 v_revision bigint;
begin
 if p_actor is null or p_party is null or p_id is null or p_decision is null
 or p_decision not in ('accept','decline','withdraw')
 then raise exception 'party_recruit_v124_invalid_request';end if;
 select applicant_account_id into v_applicant from private.party_recruitment_applications_v124
  where id=p_id and party_id=p_party;
 if not found then raise exception 'party_recruit_v124_missing';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_applicant::text,0));
 perform 1 from public.parties where id=p_party and status<>'disbanded' for update;
 if not found then raise exception 'party_recruit_v124_party_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready then raise exception 'party_recruit_v124_unreleased';end if;
 select * into a from private.party_recruitment_applications_v124
  where id=p_id and party_id=p_party for update;
 if not found or a.applicant_account_id<>v_applicant then raise exception 'party_recruit_v124_missing';end if;
 if p_decision='withdraw' then
  if p_actor<>a.applicant_account_id then raise exception 'party_recruit_v124_not_applicant';end if;
  v_terminal:='withdrawn';
 else
  if p_actor<>a.leader_account_id or p_actor<>s.leader_account_id
  or not exists(select 1 from private.party_registration_members_v110 where party_id=p_party and account_id=p_actor)
  then raise exception 'party_recruit_v124_not_leader';end if;
  v_terminal:=case p_decision when 'accept' then 'accepted' else 'declined' end;
 end if;
 if a.state<>'pending' then
  if a.state<>v_terminal then raise exception 'party_recruit_v124_already_closed';end if;
  return jsonb_build_object('state',a.state,'registrationId',a.joined_registration_id,
   'committedRevision',a.committed_revision,'replayed',true);
 end if;
 if p_decision='accept' then
  if s.lifecycle_status<>'active' or s.activity_locked or s.roster_revision<>a.roster_revision then raise exception 'party_recruit_v124_stale_roster';end if;
  if not exists(select 1 from public.chat_messages where id=a.chat_message_id and account_id is null
   and is_system=true and channel_type='party' and channel_id=p_party::text)
  then raise exception 'party_recruit_v124_unverified_message';end if;
  perform 1 from private.party_registration_members_v110 where party_id=p_party order by account_id for update;
  perform 1 from public.characters where account_id=v_applicant order by id for update;
 end if;
 v_now:=clock_timestamp();
 if v_now>=a.expires_at then
  update private.party_recruitment_applications_v124 set state='expired',decided_at=v_now where id=p_id;
  return jsonb_build_object('state','expired','registrationId',null,'committedRevision',null,'replayed',false);
 end if;
 if p_decision='accept' then
  if not private.party_entry_account_available_v131(v_applicant)
  then raise exception 'party_recruit_v124_already_in_party';end if;
  if (select count(*) from private.party_registration_members_v110 where party_id=p_party)>=4
  then raise exception 'party_recruit_v124_full';end if;
  select * into c from public.characters where id=a.character_id and account_id=v_applicant;
  if not found or private.party_registration_role_v111(c.class_id) is distinct from a.role
   or c.level is null or c.level<greatest(1,s.minimum_level)
   or not exists(select 1 from public.characters where account_id=v_applicant and level>=10)
  then raise exception 'party_recruit_v124_ineligible';end if;
  perform private.party_registration_block_guard_v126(p_party,v_applicant);
  insert into private.party_registration_members_v110(party_id,account_id,character_id,role,joined_at)
  values(p_party,v_applicant,a.character_id,a.role,v_now) returning registration_id into v_registration;
  v_revision:=s.roster_revision+1;
  update private.party_registration_state_v110 set roster_revision=v_revision where party_id=p_party;
  if not exists(select 1 from private.party_registration_members_v110 where registration_id=v_registration
   and party_id=p_party and account_id=v_applicant and character_id=a.character_id and role=a.role and joined_at=v_now)
  then raise exception 'party_recruit_v124_readback';end if;
 end if;
 update private.party_recruitment_applications_v124 set state=v_terminal,decided_at=v_now,
  joined_registration_id=v_registration,committed_revision=v_revision where id=p_id;
 return jsonb_build_object('state',v_terminal,'registrationId',v_registration,'committedRevision',v_revision,'replayed',false);
end
$$;
revoke all on function private.open_party_recruitment_application_v124(uuid,uuid,uuid,uuid,uuid),
 private.respond_party_recruitment_application_v124(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
