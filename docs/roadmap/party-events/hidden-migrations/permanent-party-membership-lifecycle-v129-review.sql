-- DISPOSABLE PG17 REVIEW ONLY, after V126/V128. Not a public RPC.
-- Authoritative fixture registrations only. No live dual-write.
create table private.party_registration_departures_v129 (
 registration_id uuid primary key,
 party_id uuid not null references private.party_registration_state_v110(party_id) on delete cascade,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null,
 role text not null check(role in ('tank','damage','support')),
 joined_at timestamptz not null,
 left_at timestamptz not null check(left_at>=joined_at),
 roster_revision bigint not null,
 reason text not null check(reason in ('leave','remove','disband'))
);
create table private.party_membership_receipts_v129(
 actor_account_id uuid not null references auth.users(id) on delete cascade,
 request_id text not null,
 party_id uuid not null references private.party_registration_state_v110(party_id) on delete cascade,
 request_digest text not null,
 response jsonb not null,
 primary key(actor_account_id,request_id)
);
alter table private.party_registration_departures_v129 enable row level security;
alter table private.party_membership_receipts_v129 enable row level security;
revoke all on private.party_registration_departures_v129,private.party_membership_receipts_v129 from public,anon,authenticated,service_role;

create function private.change_party_membership_v129(
 p_actor uuid,p_party uuid,p_request_id text,p_revision bigint,p_operation text,p_target uuid default null
) returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare
 s private.party_registration_state_v110%rowtype;
 r private.party_membership_receipts_v129%rowtype;
 v_hash text;v_now timestamptz;v_revision bigint;v_leader uuid;
 v_result jsonb;v_status text;v_count integer;v_affected uuid[];
begin
 if p_actor is null or p_party is null or p_request_id is null or p_request_id !~ '^[A-Za-z0-9:_-]{1,128}$'
 or p_revision is null or p_revision<1 or p_operation is null
 or p_operation not in ('leave','remove','transfer','disband')
 or (p_operation in ('remove','transfer') and (p_target is null or p_target=p_actor))
 or (p_operation in ('leave','disband') and p_target is not null)
 then raise exception 'party_membership_v129_invalid_request';end if;
 v_hash:=encode(sha256(convert_to(jsonb_build_object('actor',p_actor,'party',p_party,
 'request',p_request_id,'revision',p_revision,'operation',p_operation,'target',p_target)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('party-membership-v129:'||p_actor::text||':'||p_request_id,0));
 -- Match existing join/leave account -> Party lock order. Removal locks
 -- the affected account, not the leader. Disband serializes on Party row.
 if p_operation in ('leave','remove') then
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||coalesce(p_target,p_actor)::text,0));
 end if;
 perform 1 from public.parties where id=p_party for update;
 if not found then raise exception 'party_membership_v129_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready or not exists(select 1 from private.party_registration_cutover_fence_v126 where party_id=p_party)
 then raise exception 'party_membership_v129_unreleased';end if;
 select * into r from private.party_membership_receipts_v129 where actor_account_id=p_actor and request_id=p_request_id;
 if found then
  if r.party_id<>p_party or r.request_digest<>v_hash then raise exception 'party_membership_v129_conflicting_replay';end if;
  return r.response||jsonb_build_object('newlyRecorded',false);
 end if;
 if s.lifecycle_status<>'active' or s.roster_revision<>p_revision or s.activity_locked
 then raise exception 'party_membership_v129_stale_or_locked';end if;
 perform 1 from private.party_registration_members_v110 where party_id=p_party order by account_id for update;
 if not exists(select 1 from private.party_registration_members_v110 where party_id=p_party and account_id=p_actor)
 then raise exception 'party_membership_v129_not_member';end if;
 if p_operation<>'leave' and s.leader_account_id<>p_actor
 then raise exception 'party_membership_v129_not_leader';end if;
 if p_target is not null and not exists(select 1 from private.party_registration_members_v110 where party_id=p_party and account_id=p_target)
 then raise exception 'party_membership_v129_target_missing';end if;
 v_revision:=s.roster_revision+1;v_now:=clock_timestamp();v_leader:=s.leader_account_id;v_status:='active';
 if p_operation='transfer' then
  v_leader:=p_target;
 else
  select array_agg(account_id order by account_id) into v_affected
  from private.party_registration_members_v110 where party_id=p_party
   and (p_operation='disband' or account_id=coalesce(p_target,p_actor));
  insert into private.party_registration_departures_v129(registration_id,party_id,account_id,character_id,role,joined_at,left_at,roster_revision,reason)
  select registration_id,party_id,account_id,character_id,role,joined_at,v_now,v_revision,p_operation
  from private.party_registration_members_v110 where party_id=p_party and account_id=any(v_affected);
  get diagnostics v_count=row_count;
  if v_count<>cardinality(v_affected) then raise exception 'party_membership_v129_archive_count';end if;
  delete from private.party_registration_members_v110 where party_id=p_party and account_id=any(v_affected);
  get diagnostics v_count=row_count;
  if v_count<>cardinality(v_affected) then raise exception 'party_membership_v129_remove_count';end if;
  if not exists(select 1 from private.party_registration_members_v110 where party_id=p_party) then
   -- Keep historical leader in private state, but no active leader in response.
   v_status:='disbanded';
  elsif v_leader=any(v_affected) then
   select account_id into v_leader from private.party_registration_members_v110 where party_id=p_party
    order by joined_at,account_id limit 1;
  end if;
 end if;
 update private.party_registration_state_v110 set roster_revision=v_revision,leader_account_id=v_leader,
 lifecycle_status=v_status,activity_locked=(v_status='disbanded') where party_id=p_party;
 update private.party_role_swap_proposals_v108 set state='cancelled',closed_at=v_now
 where party_id=p_party and state='pending';
 -- V124 has no cancelled terminal state; invalidate via revision, retain
 -- applicant withdrawal and future reapplication. Do not impersonate them.
 v_result:=jsonb_build_object('operation',p_operation,'partyId',p_party,'rosterRevision',v_revision,
 'status',v_status,'leaderAccountId',case when v_status='active' then v_leader else null end,
 'removedAccounts',coalesce(to_jsonb(v_affected),'[]'::jsonb));
 if not exists(select 1 from private.party_registration_state_v110 where party_id=p_party and roster_revision=v_revision
  and lifecycle_status=v_status and leader_account_id=v_leader)
 or (v_status='active' and not exists(select 1 from private.party_registration_members_v110 where party_id=p_party and account_id=v_leader))
 or exists(select 1 from private.party_registration_members_v110 where party_id=p_party and account_id=any(v_affected))
 then raise exception 'party_membership_v129_readback';end if;
 insert into private.party_membership_receipts_v129 values(p_actor,p_request_id,p_party,v_hash,v_result);
 return v_result||jsonb_build_object('newlyRecorded',true);
end
$$;
revoke all on function private.change_party_membership_v129(uuid,uuid,text,bigint,text,uuid) from public,anon,authenticated,service_role;
