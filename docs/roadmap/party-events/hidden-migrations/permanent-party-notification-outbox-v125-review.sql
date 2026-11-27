-- DISPOSABLE PG17 REVIEW ONLY, after V124. Private in-app invalidations,
-- not push notifications or an external delivery service.
create table private.party_chat_outbox_v125 (
 id uuid primary key default gen_random_uuid(),
 recipient_account_id uuid not null references auth.users(id) on delete cascade,
 party_id uuid not null references private.party_registration_state_v110(party_id) on delete cascade,
 kind text not null check(kind in ('role_swap','recruitment_request')),
 source_id uuid not null,
 event_key text not null check(length(event_key) between 1 and 180),
 audience text not null check(audience in ('member','leader','applicant')),
 terminal boolean not null,
 roster_changed boolean not null check(not roster_changed or terminal),
 created_at timestamptz not null default clock_timestamp(),
 acknowledged_at timestamptz,
 unique(recipient_account_id,event_key),
 check(acknowledged_at is null or acknowledged_at>=created_at)
);
create index party_chat_outbox_pending_v125
 on private.party_chat_outbox_v125(recipient_account_id,party_id,created_at,id)
 where acknowledged_at is null;
alter table private.party_chat_outbox_v125 enable row level security;
revoke all on private.party_chat_outbox_v125 from public,anon,authenticated,service_role;

-- Runs inside the action receipt transaction, never on a client success hint.
create function private.party_swap_outbox_v125()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
 e private.party_role_swap_effects_v122%rowtype;
 p private.party_role_swap_proposals_v108%rowtype;
 v_state text;
begin
 if new.kind<>'role_swap' then return new;end if;
 select * into e from private.party_role_swap_effects_v122 where id=new.effect_id;
 if not found or e.party_id<>new.party_id or e.proposal_id<>new.source_id
 or e.actor_account_id<>new.account_id or e.request_id<>new.request_id
 or e.request_digest<>new.request_digest
 or encode(sha256(convert_to(e.response::text,'UTF8')),'hex')<>new.effect_digest
 then raise exception 'party_outbox_v125_invalid_receipt';end if;
 select * into p from private.party_role_swap_proposals_v108 where id=e.proposal_id and party_id=e.party_id;
 v_state:=e.response->>'state';
 if not found or v_state is distinct from p.state
 or v_state not in ('pending','completed','declined','expired')
 or (v_state='completed' and (p.committed_revision is null or not exists(
  select 1 from private.party_registration_state_v110 s where s.party_id=p.party_id
  and s.roster_revision=p.committed_revision)))
 then raise exception 'party_outbox_v125_invalid_effect';end if;
 insert into private.party_chat_outbox_v125
 (recipient_account_id,party_id,kind,source_id,event_key,audience,terminal,roster_changed)
 select m.account_id,p.party_id,'role_swap',p.id,'swap:'||e.id::text,'member',
 v_state<>'pending',v_state='completed'
 from private.party_registration_members_v110 m where m.party_id=p.party_id;
 return new;
end
$$;
create trigger party_swap_outbox_v125 after insert on private.party_chat_action_receipts_v108
 for each row execute function private.party_swap_outbox_v125();

-- Recruitment is still a private fixture owner workflow; its row transition
-- and registration join are atomic. Do not send applicant identity in hints.
create function private.party_recruitment_outbox_v125()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_key text;
begin
 if tg_op='UPDATE' and old.state=new.state then return new;end if;
 v_key:='recruit:'||new.id::text||':'||new.state;
 if new.state='pending' then
  insert into private.party_chat_outbox_v125
  (recipient_account_id,party_id,kind,source_id,event_key,audience,terminal,roster_changed)
  values(new.leader_account_id,new.party_id,'recruitment_request',new.id,v_key,'leader',false,false);
 else
  if new.state='accepted' and not exists(
   select 1 from private.party_registration_members_v110 m
   join private.party_registration_state_v110 s on s.party_id=m.party_id
   where m.registration_id=new.joined_registration_id and m.account_id=new.applicant_account_id
    and m.party_id=new.party_id and m.character_id=new.character_id and m.role=new.role
    and s.roster_revision=new.committed_revision)
  then raise exception 'party_outbox_v125_missing_join';end if;
  insert into private.party_chat_outbox_v125
  (recipient_account_id,party_id,kind,source_id,event_key,audience,terminal,roster_changed)
  values(new.applicant_account_id,new.party_id,'recruitment_request',new.id,v_key,'applicant',true,new.state='accepted');
  if new.state='accepted' then
   insert into private.party_chat_outbox_v125
   (recipient_account_id,party_id,kind,source_id,event_key,audience,terminal,roster_changed)
   select m.account_id,new.party_id,'recruitment_request',new.id,v_key,'member',true,true
   from private.party_registration_members_v110 m
   where m.party_id=new.party_id and m.account_id<>new.applicant_account_id;
  else
   insert into private.party_chat_outbox_v125
   (recipient_account_id,party_id,kind,source_id,event_key,audience,terminal,roster_changed)
   select s.leader_account_id,new.party_id,'recruitment_request',new.id,v_key,'leader',true,false
   from private.party_registration_state_v110 s
   where s.party_id=new.party_id and s.leader_account_id=new.leader_account_id;
  end if;
 end if;
 return new;
end
$$;
create trigger party_recruitment_outbox_v125 after insert or update of state
 on private.party_recruitment_applications_v124 for each row execute function private.party_recruitment_outbox_v125();

-- A future authenticated host supplies p_actor. Recheck audience on every
-- read, including applicant results when not yet a member. No raw source
-- data, player names, character IDs or chat text are returned.
create function private.party_chat_outbox_visible_v125(n private.party_chat_outbox_v125,p_actor uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select n.recipient_account_id=p_actor and exists(
  select 1 from private.party_registration_state_v110 s join public.parties p on p.id=s.party_id
  where s.party_id=n.party_id and s.qa_fixture_ready and s.lifecycle_status='active' and p.status<>'disbanded'
  and (case n.audience
   when 'member' then exists(select 1 from private.party_registration_members_v110 m where m.party_id=n.party_id and m.account_id=p_actor)
   when 'leader' then s.leader_account_id=p_actor and exists(select 1 from private.party_registration_members_v110 m where m.party_id=n.party_id and m.account_id=p_actor)
   when 'applicant' then n.kind='recruitment_request' and exists(
    select 1 from private.party_recruitment_applications_v124 a where a.id=n.source_id and a.party_id=n.party_id and a.applicant_account_id=p_actor)
   else false end))
$$;
create function private.read_party_chat_outbox_v125(p_actor uuid,p_party uuid,p_limit integer default 50)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
 if p_actor is null or p_party is null or p_limit is null or p_limit not between 1 and 50
 then raise exception 'party_outbox_v125_invalid_read';end if;
 select coalesce(jsonb_agg(jsonb_build_object('eventId',n.id,'accountId',p_actor,'partyId',n.party_id,
  'kind',n.kind,'terminal',n.terminal,'rosterChanged',n.roster_changed,
  'needsResponse',case when n.terminal then false
   when n.kind='role_swap' then exists(
    select 1 from private.party_role_swap_proposals_v108 p
    join private.party_role_swap_participants_v108 x on x.proposal_id=p.id
    join private.party_registration_state_v110 s on s.party_id=p.party_id
    where p.id=n.source_id and p.party_id=n.party_id and p.state='pending'
     and p.roster_revision=s.roster_revision and not s.activity_locked
     and p.expires_at>statement_timestamp() and x.account_id=p_actor and x.decision is null)
   when n.kind='recruitment_request' then exists(
    select 1 from private.party_recruitment_applications_v124 a
    join private.party_registration_state_v110 s on s.party_id=a.party_id
    where a.id=n.source_id and a.party_id=n.party_id and a.state='pending'
    and a.roster_revision=s.roster_revision and not s.activity_locked
    and a.expires_at>statement_timestamp() and a.leader_account_id=p_actor and s.leader_account_id=p_actor)
   else false end) order by n.created_at,n.id),'[]'::jsonb) into v_result
 from (select * from private.party_chat_outbox_v125 q where q.recipient_account_id=p_actor
  and q.party_id=p_party and q.acknowledged_at is null and private.party_chat_outbox_visible_v125(q,p_actor)
  order by q.created_at,q.id limit p_limit) n;
 return v_result;
end
$$;
-- Acknowledge only IDs actually processed by the current recipient.
-- Replays are harmless; forged/foreign IDs modify zero rows.
create function private.ack_party_chat_outbox_v125(p_actor uuid,p_party uuid,p_ids uuid[])
returns integer language plpgsql security invoker set search_path='' as $$
declare v_count integer;
begin
 if p_actor is null or p_party is null or p_ids is null or cardinality(p_ids) not between 1 and 50
 or array_position(p_ids,null) is not null then raise exception 'party_outbox_v125_invalid_ack';end if;
 update private.party_chat_outbox_v125 q set acknowledged_at=clock_timestamp()
 where q.recipient_account_id=p_actor and q.party_id=p_party and q.id=any(p_ids)
 and q.acknowledged_at is null and private.party_chat_outbox_visible_v125(q,p_actor);
 get diagnostics v_count=row_count;
 return v_count;
end
$$;
revoke all on function private.party_swap_outbox_v125(),private.party_recruitment_outbox_v125(),
 private.party_chat_outbox_visible_v125(private.party_chat_outbox_v125,uuid),
 private.read_party_chat_outbox_v125(uuid,uuid,integer),private.ack_party_chat_outbox_v125(uuid,uuid,uuid[])
 from public,anon,authenticated,service_role;
