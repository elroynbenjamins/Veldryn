-- DISPOSABLE PG17 REVIEW ONLY, after V108 and V110.
-- Mutates ONLY isolated private QA registration/proposal tables.
-- No public party membership updates, no endpoint/grants or live cutover.
create function private.party_registration_role_v111(p_class text)
returns text language sql immutable security invoker set search_path='' as $$
 select case
 when p_class in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
 when p_class in ('WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER') then 'damage'
 when p_class in ('DAWNKEEPER','STONECALLER') then 'support'
 else null end
$$;
revoke all on function private.party_registration_role_v111(text) from public,anon,authenticated,service_role;

create function private.respond_party_registration_swap_v111(
 p_party uuid,p_proposal uuid,p_actor uuid,p_decision text
) returns jsonb language plpgsql security invoker
set search_path='' set timezone='UTC' as $$
declare
 s private.party_registration_state_v110%rowtype;
 p private.party_role_swap_proposals_v108%rowtype;
 v_member private.party_role_swap_participants_v108%rowtype;
 v_snapshot jsonb;
 v_now timestamptz;
 v_count integer;
 v_changed integer;
 v_expected_revision bigint;
begin
 if p_party is null or p_proposal is null or p_actor is null or
    p_decision is null or p_decision not in ('accept','decline') then
  raise exception 'party_swap_v111_invalid_request';
 end if;
 -- Existing membership writers lock public.parties. Match that ordering,
 -- but production compatibility/lock graph has not been certified.
 perform 1 from public.parties where id=p_party and status<>'disbanded' for update;
 if not found then raise exception 'party_swap_v111_party_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready then raise exception 'party_swap_v111_unreleased';end if;
 select * into p from private.party_role_swap_proposals_v108
  where id=p_proposal and party_id=p_party for update;
 if not found then raise exception 'party_swap_v111_proposal_missing';end if;
 select * into v_member from private.party_role_swap_participants_v108
  where proposal_id=p_proposal and account_id=p_actor for update;
 if not found or not exists(select 1 from private.party_registration_members_v110
  where party_id=p_party and account_id=p_actor) then
  raise exception 'party_swap_v111_not_participant';
 end if;
 -- Idempotent exact participant response. This is not yet a V106
 -- request-ID/effect receipt adapter; an immutable receipt remains required.
 if v_member.decision is not null then
  if v_member.decision<>p_decision then raise exception 'party_swap_v111_conflicting_response';end if;
  return jsonb_build_object('state',p.state,'committedRevision',p.committed_revision,'replayed',true);
 end if;
 if p.state<>'pending' or s.activity_locked then raise exception 'party_swap_v111_locked';end if;
 perform 1 from private.party_registration_members_v110 where party_id=p_party order by account_id for update;
 perform 1 from private.party_role_swap_participants_v108 where proposal_id=p_proposal order by account_id for update;
 -- Lock all characters of current participants in stable order; final
 -- production adapter must also serialize account creation/deletion paths.
 perform 1 from public.characters c where c.account_id in
  (select account_id from private.party_registration_members_v110 where party_id=p_party)
  order by c.id for update;
 v_now:=clock_timestamp();
 if v_now>=p.expires_at then
  update private.party_role_swap_proposals_v108 set state='expired',closed_at=v_now where id=p_proposal;
  return jsonb_build_object('state','expired','committedRevision',null,'replayed',false);
 end if;
 v_snapshot:=private.party_registration_snapshot_v110(p_party);
 if s.roster_revision<>p.roster_revision or v_snapshot is distinct from p.original_roster
 or encode(sha256(convert_to(v_snapshot::text,'UTF8')),'hex') is distinct from p.original_roster_digest then
  raise exception 'party_swap_v111_stale_roster';
 end if;
 if not exists(select 1 from private.party_registration_members_v110
 where party_id=p_party and account_id=s.leader_account_id) then
  raise exception 'party_swap_v111_invalid_leader';
 end if;
 select count(*) into v_count from private.party_role_swap_participants_v108 where proposal_id=p_proposal;
 if v_count not between 2 and 4 or
  (select count(*) from private.party_registration_members_v110 where party_id=p_party) not between 2 and 4
  or not exists(select 1 from private.party_role_swap_participants_v108
     where proposal_id=p_proposal and account_id=p.proposer_account_id)
  or exists(select 1 from private.party_role_swap_participants_v108
     where proposal_id=p_proposal and (decision='decline' or decided_at>=p.expires_at or decided_at<p.created_at))
 then raise exception 'party_swap_v111_invalid_participants';end if;
 if exists(
 select 1 from private.party_role_swap_participants_v108 x
 left join private.party_registration_members_v110 m
  on m.party_id=p_party and m.account_id=x.account_id
 left join public.characters old_c on old_c.id=x.from_character_id and old_c.account_id=x.account_id
 left join public.characters new_c on new_c.id=x.to_character_id and new_c.account_id=x.account_id
 where x.proposal_id=p_proposal and
 (m.registration_id is null or m.character_id<>x.from_character_id or m.role<>x.from_role
  or old_c.id is null or new_c.id is null
  or private.party_registration_role_v111(old_c.class_id) is distinct from x.from_role
  or private.party_registration_role_v111(new_c.class_id) is distinct from x.to_role
  or new_c.level<greatest(1,s.minimum_level)
  or not exists(select 1 from public.characters c where c.account_id=x.account_id and c.level>=10))
 ) then raise exception 'party_swap_v111_character_mismatch';end if;
 if exists(select 1 from public.characters c
  where c.account_id in(select account_id from private.party_role_swap_participants_v108 where proposal_id=p_proposal)
  group by c.account_id,private.party_registration_role_v111(c.class_id)
  having count(*)>1 or private.party_registration_role_v111(c.class_id) is null)
 then raise exception 'party_swap_v111_duplicate_role';end if;
 if exists(select 1 from (values('tank'),('damage'),('support')) r(role)
  where (select count(*) from private.party_role_swap_participants_v108
   where proposal_id=p_proposal and from_role=r.role)
  <> (select count(*) from private.party_role_swap_participants_v108
   where proposal_id=p_proposal and to_role=r.role))
 then raise exception 'party_swap_v111_role_distribution';end if;
 update private.party_role_swap_participants_v108
  set decision=p_decision,decided_at=v_now where proposal_id=p_proposal and account_id=p_actor;
 if p_decision='decline' then
  update private.party_role_swap_proposals_v108 set state='declined',closed_at=v_now where id=p_proposal;
  return jsonb_build_object('state','declined','committedRevision',null,'replayed',false);
 end if;
 if exists(select 1 from private.party_role_swap_participants_v108
  where proposal_id=p_proposal and decision is distinct from 'accept') then
  return jsonb_build_object('state','pending','committedRevision',null,'replayed',false);
 end if;
 -- All changed accounts consented. Same transaction: journal, in-place
 -- private registration update, revision, terminal state and readback.
 v_expected_revision:=s.roster_revision+1;
 insert into private.party_registration_exchange_history_v110
 (proposal_id,registration_id,account_id,party_id,from_character_id,to_character_id,
  from_role,to_role,original_joined_at,roster_revision,changed_at)
 select p_proposal,m.registration_id,m.account_id,m.party_id,x.from_character_id,x.to_character_id,
 x.from_role,x.to_role,m.joined_at,v_expected_revision,v_now
 from private.party_registration_members_v110 m join private.party_role_swap_participants_v108 x
 on x.account_id=m.account_id and x.proposal_id=p_proposal
 where m.party_id=p_party;
 get diagnostics v_changed=row_count;
 if v_changed<>v_count then raise exception 'party_swap_v111_history_count';end if;
 update private.party_registration_members_v110 m set character_id=x.to_character_id,role=x.to_role
 from private.party_role_swap_participants_v108 x
 where x.proposal_id=p_proposal and m.party_id=p_party and m.account_id=x.account_id
 and m.character_id=x.from_character_id and m.role=x.from_role;
 get diagnostics v_changed=row_count;
 if v_changed<>v_count then raise exception 'party_swap_v111_update_count';end if;
 update private.party_registration_state_v110 set roster_revision=v_expected_revision where party_id=p_party;
 v_now:=clock_timestamp();
 if v_now>=p.expires_at then raise exception 'party_swap_v111_expired_during_commit';end if;
 update private.party_role_swap_proposals_v108 set state='completed',closed_at=v_now,
  committed_revision=v_expected_revision where id=p_proposal;
 if exists(select 1 from private.party_registration_exchange_history_v110 h
 left join private.party_registration_members_v110 m on m.registration_id=h.registration_id
 where h.proposal_id=p_proposal and (m.registration_id is null or m.party_id<>h.party_id
  or m.account_id<>h.account_id or m.character_id<>h.to_character_id or m.role<>h.to_role
  or m.joined_at<>h.original_joined_at))
 then raise exception 'party_swap_v111_readback';end if;
 return jsonb_build_object('state','completed','committedRevision',v_expected_revision,'replayed',false);
end
$$;
revoke all on function private.respond_party_registration_swap_v111(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
