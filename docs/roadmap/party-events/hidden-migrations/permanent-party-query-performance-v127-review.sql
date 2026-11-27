-- DISPOSABLE PG17 REVIEW ONLY, after V125/V126.
-- Alternative reader for benchmark/parity; existing V125 reader unchanged.
-- No new runtime polling, no new grants, no retention policy change.
create index party_recruitment_pending_leader_v127
 on private.party_recruitment_applications_v124(party_id,leader_account_id,expires_at,id)
 where state='pending';

create function private.read_party_chat_outbox_v127(p_actor uuid,p_party uuid,p_limit integer default 50)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
 if p_actor is null or p_party is null or p_limit is null or p_limit not between 1 and 50
 then raise exception 'party_outbox_v125_invalid_read';end if;
 -- Resolve Party and membership scope once, not once per candidate hint.
 with scope as materialized (
  select s.party_id,s.roster_revision,s.activity_locked,s.leader_account_id,
   exists(select 1 from private.party_registration_members_v110 m
    where m.party_id=s.party_id and m.account_id=p_actor) as is_member
  from private.party_registration_state_v110 s join public.parties p on p.id=s.party_id
  where s.party_id=p_party and s.qa_fixture_ready and s.lifecycle_status='active' and p.status<>'disbanded'
 ), candidates as materialized (
  select q.id,q.party_id,q.kind,q.source_id,q.terminal,q.roster_changed,q.created_at,
   s.roster_revision,s.activity_locked,s.leader_account_id
  from private.party_chat_outbox_v125 q cross join scope s
  where q.recipient_account_id=p_actor and q.party_id=p_party and q.acknowledged_at is null
   and (case q.audience
    when 'member' then s.is_member
    when 'leader' then s.is_member and s.leader_account_id=p_actor
    when 'applicant' then q.kind='recruitment_request' and exists(
     select 1 from private.party_recruitment_applications_v124 a
     where a.id=q.source_id and a.party_id=q.party_id and a.applicant_account_id=p_actor)
    else false end)
  order by q.created_at,q.id limit p_limit
 )
 select coalesce(jsonb_agg(jsonb_build_object('eventId',n.id,'accountId',p_actor,'partyId',n.party_id,
  'kind',n.kind,'terminal',n.terminal,'rosterChanged',n.roster_changed,
  'needsResponse',case when n.terminal or n.activity_locked then false
   when n.kind='role_swap' then exists(
    select 1 from private.party_role_swap_proposals_v108 p
    join private.party_role_swap_participants_v108 x on x.proposal_id=p.id
    where p.id=n.source_id and p.party_id=n.party_id and p.state='pending'
     and p.roster_revision=n.roster_revision and p.expires_at>statement_timestamp()
     and x.account_id=p_actor and x.decision is null)
   when n.kind='recruitment_request' then exists(
    select 1 from private.party_recruitment_applications_v124 a
    where a.id=n.source_id and a.party_id=n.party_id and a.state='pending'
    and a.roster_revision=n.roster_revision and a.expires_at>statement_timestamp()
    and a.leader_account_id=p_actor and n.leader_account_id=p_actor)
   else false end) order by n.created_at,n.id),'[]'::jsonb) into v_result
 from candidates n;
 return v_result;
end
$$;
revoke all on function private.read_party_chat_outbox_v127(uuid,uuid,integer) from public,anon,authenticated,service_role;
