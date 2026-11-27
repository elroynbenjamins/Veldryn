-- DISPOSABLE PG17 REVIEW ONLY, after V129. No live RPC, contract credit,
-- account deletion, or deployment. Authoritative fenced registrations only.
-- V130: evidence of current eligible registration, not a gameplay receipt.
-- Capture inside the verified gameplay producer's transaction; do not infer
-- historical eligibility from a current registration or from client clocks.
create function private.capture_party_contract_scope_v130(
 p_actor uuid,p_party uuid,p_registration uuid,p_character uuid,p_revision bigint,p_occurred_at timestamptz
) returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare s private.party_registration_state_v110%rowtype;
 m private.party_registration_members_v110%rowtype;
begin
 if p_actor is null or p_party is null or p_registration is null or p_character is null
 or p_revision is null or p_occurred_at is null then raise exception 'party_custody_v130_invalid';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_actor::text,0));
 perform 1 from public.parties where id=p_party for update;
 if not found then raise exception 'party_custody_v130_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready or s.lifecycle_status<>'active'
 or not exists(select 1 from private.party_registration_cutover_fence_v126 where party_id=p_party)
 or s.roster_revision<>p_revision then raise exception 'party_custody_v130_stale';end if;
 select * into m from private.party_registration_members_v110
 where party_id=p_party and account_id=p_actor for update;
 if not found or m.registration_id<>p_registration or m.character_id<>p_character
 or p_occurred_at<m.joined_at or p_occurred_at>clock_timestamp()
 or exists(select 1 from private.party_registration_exchange_history_v110 h
 where h.registration_id=m.registration_id and h.changed_at>p_occurred_at)
 then raise exception 'party_custody_v130_ineligible';end if;
 return jsonb_build_object('partyId',p_party,'accountId',p_actor,'registrationId',m.registration_id,
 'characterId',m.character_id,'rosterRevision',s.roster_revision,'occurredAt',p_occurred_at,
 'canCredit',false,'releaseEnabled',false);
end
$$;
revoke all on function private.capture_party_contract_scope_v130(uuid,uuid,uuid,uuid,bigint,timestamptz) from public,anon,authenticated,service_role;

-- Shared exact-key receipts with lifecycle V129. A rejoin creates a NEW
-- registration ID and joined_at; never revives archived participation.
create function private.enter_party_registration_v131(
 p_actor uuid,p_party uuid,p_character uuid,p_request_id text,p_revision bigint,p_operation text
) returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare
 s private.party_registration_state_v110%rowtype;
 c public.characters%rowtype;
 r private.party_membership_receipts_v129%rowtype;
 v_hash text;v_role text;v_now timestamptz;v_id uuid;v_revision bigint;v_result jsonb;
begin
 if p_actor is null or p_party is null or p_character is null or p_request_id is null
 or p_request_id !~ '^[A-Za-z0-9:_-]{1,128}$' or p_operation is null
 or p_operation not in ('create','join') or p_revision is null
 or (p_operation='create' and p_revision<>0) or (p_operation='join' and p_revision<1)
 then raise exception 'party_entry_v131_invalid';end if;
 v_hash:=encode(sha256(convert_to(jsonb_build_object('actor',p_actor,'party',p_party,'character',p_character,
 'request',p_request_id,'revision',p_revision,'operation',p_operation)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('party-membership-v129:'||p_actor::text||':'||p_request_id,0));
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_actor::text,0));
 select * into r from private.party_membership_receipts_v129 where actor_account_id=p_actor and request_id=p_request_id;
 if found then
  if r.party_id<>p_party or r.request_digest<>v_hash then raise exception 'party_entry_v131_conflicting_replay';end if;
  return r.response||jsonb_build_object('newlyRecorded',false);
 end if;
 if not private.party_entry_account_available_v131(p_actor) then raise exception 'party_entry_v131_already_member';end if;
 if p_operation='create' then
  -- Parent allocation is deliberately fixture-only (minimal schema).
  insert into public.parties(id,status,leader_account_id,leader_character_id,minimum_level)
  values(p_party,'active',p_actor,p_character,10);
  insert into private.party_registration_state_v110(party_id,roster_revision,leader_account_id,minimum_level,activity_locked,qa_fixture_ready)
  values(p_party,1,p_actor,10,false,true);
  insert into private.party_registration_cutover_fence_v126(party_id,legacy_snapshot)
  values(p_party,jsonb_build_object('fixtureCreated',true,'members','[]'::jsonb));
 end if;
 perform 1 from public.parties where id=p_party and status<>'disbanded' for update;
 if not found then raise exception 'party_entry_v131_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready or s.activity_locked or s.lifecycle_status<>'active'
 or not exists(select 1 from private.party_registration_cutover_fence_v126 where party_id=p_party)
 or (p_operation='join' and s.roster_revision<>p_revision)
 then raise exception 'party_entry_v131_stale_or_locked';end if;
 if (select count(*) from private.party_registration_members_v110 where party_id=p_party)>=4
 then raise exception 'party_entry_v131_full';end if;
 perform private.party_registration_block_guard_v126(p_party,p_actor);
 perform 1 from public.characters where account_id=p_actor order by id for update;
 select * into c from public.characters where id=p_character and account_id=p_actor;
 if not found then raise exception 'party_entry_v131_not_owned';end if;
 v_role:=private.party_registration_role_v111(c.class_id);
 if v_role is null or c.level<greatest(1,s.minimum_level)
 or not exists(select 1 from public.characters where account_id=p_actor and level>=10)
 then raise exception 'party_entry_v131_ineligible';end if;
 v_now:=clock_timestamp();v_revision:=case when p_operation='create' then 1 else s.roster_revision+1 end;
 insert into private.party_registration_members_v110(party_id,account_id,character_id,role,joined_at)
 values(p_party,p_actor,p_character,v_role,v_now) returning registration_id into v_id;
 update private.party_registration_state_v110 set roster_revision=v_revision where party_id=p_party;
 update private.party_role_swap_proposals_v108 set state='cancelled',closed_at=v_now where party_id=p_party and state='pending';
 if not exists(select 1 from private.party_registration_members_v110 where registration_id=v_id
 and account_id=p_actor and party_id=p_party and character_id=p_character and joined_at=v_now)
 then raise exception 'party_entry_v131_readback';end if;
 v_result:=jsonb_build_object('partyId',p_party,'registrationId',v_id,'rosterRevision',v_revision,'role',v_role);
 insert into private.party_membership_receipts_v129 values(p_actor,p_request_id,p_party,v_hash,v_result);
 return v_result||jsonb_build_object('newlyRecorded',true);
end
$$;
revoke all on function private.enter_party_registration_v131(uuid,uuid,uuid,text,bigint,text) from public,anon,authenticated,service_role;

-- V132: preflight only. Never delete or auto-replace a registered hero.
-- Full account erasure must reconcile all FK cascades, retained receipts and
-- other game systems; this report cannot authorize deletion.
create function private.inspect_party_deletion_v132(p_actor uuid,p_character uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_members integer;v_legacy integer;v_pending integer;v_history integer;v_leaders integer;
 v_exchanges integer;v_applications integer;v_parent_leaders integer;v_receipts integer;v_outbox integer;
begin
 if p_actor is null or not exists(select 1 from auth.users where id=p_actor)
 or (p_character is not null and not exists(select 1 from public.characters where id=p_character and account_id=p_actor))
 then raise exception 'party_deletion_v132_not_owned';end if;
 select count(*) into v_members from private.party_registration_members_v110
 where account_id=p_actor and (p_character is null or character_id=p_character);
 select count(*) into v_legacy from public.party_members
 where account_id=p_actor and (p_character is null or character_id=p_character);
 select count(*) into v_pending from private.party_role_swap_participants_v108 x
 join private.party_role_swap_proposals_v108 p on p.id=x.proposal_id
 where p.state='pending' and x.account_id=p_actor
 and (p_character is null or p_character in (x.from_character_id,x.to_character_id));
 select v_pending+count(*) into v_pending from private.party_recruitment_applications_v124
 where state='pending' and applicant_account_id=p_actor and (p_character is null or character_id=p_character);
 select count(*) into v_history from private.party_registration_departures_v129
 where account_id=p_actor and (p_character is null or character_id=p_character);
 select count(*) into v_leaders from private.party_registration_state_v110
 where leader_account_id=p_actor and p_character is null;
 select count(*) into v_exchanges from private.party_registration_exchange_history_v110
 where account_id=p_actor and (p_character is null or p_character in (from_character_id,to_character_id));
 select count(*) into v_applications from private.party_recruitment_applications_v124
 where (applicant_account_id=p_actor and (p_character is null or character_id=p_character))
 or (p_character is null and leader_account_id=p_actor);
 select count(*) into v_parent_leaders from public.parties
 where leader_account_id=p_actor and (p_character is null or leader_character_id=p_character);
 select case when p_character is null then
 (select count(*) from private.party_membership_receipts_v129 where actor_account_id=p_actor)+
 (select count(*) from private.party_chat_action_receipts_v108 where account_id=p_actor)
 else 0 end into v_receipts;
 select case when p_character is null then
 (select count(*) from private.party_chat_outbox_v125 where recipient_account_id=p_actor)
 else 0 end into v_outbox;
 return jsonb_build_object('activeRegistrations',v_members,'legacyRows',v_legacy,
 'pendingRequests',v_pending,'departureHistory',v_history,'leaderReferences',v_leaders,
 'exchangeHistory',v_exchanges,'applications',v_applications,'legacyLeaderReferences',v_parent_leaders,
 'actionReceipts',v_receipts,'outboxRows',v_outbox,
 'requiresReconciliation',v_members+v_legacy+v_pending+v_history+v_leaders+v_exchanges+v_applications+v_parent_leaders+v_receipts+v_outbox>0,
 'canDelete',false,'releaseEnabled',false);
end
$$;
revoke all on function private.inspect_party_deletion_v132(uuid,uuid) from public,anon,authenticated,service_role;
