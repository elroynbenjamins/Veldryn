-- DISPOSABLE PG17 REVIEW ONLY, after V108/V110/V111.
-- This is a private SQL receipt adapter, NOT a production endpoint.
-- SQL canonical JSONB hashes are versioned separately from TS V106.
create table private.party_role_swap_effects_v122 (
 id uuid primary key default gen_random_uuid(),
 party_id uuid not null,
 proposal_id uuid not null,
 actor_account_id uuid not null references auth.users(id) on delete cascade,
 request_id text not null,
 request_digest text not null check(request_digest ~ '^[0-9a-f]{64}$'),
 response jsonb not null check(jsonb_typeof(response)='object'),
 created_at timestamptz not null default clock_timestamp(),
 unique(actor_account_id,request_id),
 foreign key(proposal_id,party_id) references private.party_role_swap_proposals_v108(id,party_id) on delete cascade
);
alter table private.party_role_swap_effects_v122 enable row level security;
revoke all on private.party_role_swap_effects_v122 from public,anon,authenticated,service_role;

create function private.respond_party_registration_chat_v122(
 p_actor uuid,p_request_id text,p_party uuid,p_proposal uuid,p_message uuid,
 p_roster_revision bigint,p_source_revision bigint,p_decision text
) returns jsonb language plpgsql security invoker
set search_path='' set timezone='UTC' as $$
declare
 s private.party_registration_state_v110%rowtype;
 p private.party_role_swap_proposals_v108%rowtype;
 r private.party_chat_action_receipts_v108%rowtype;
 e private.party_role_swap_effects_v122%rowtype;
 v_hash text;
 v_effect_hash text;
 v_result jsonb;
begin
 -- p_actor is supplied by a future authenticated server host, not client JSON.
 -- The isolated proposal source is immutable; its source version is 1.
 if p_actor is null or p_request_id is null or p_request_id !~ '^[A-Za-z0-9:_-]{1,128}$'
 or p_party is null or p_proposal is null or p_message is null
 or p_roster_revision is null or p_roster_revision<1
 or p_source_revision is distinct from 1
 or p_decision is null or p_decision not in ('accept','decline')
 then raise exception 'party_swap_v122_invalid_request';end if;
 v_hash:=encode(sha256(convert_to(jsonb_build_object(
 'version','party-swap-sql-v122','actor',p_actor,'requestId',p_request_id,'party',p_party,
 'proposal',p_proposal,'message',p_message,'rosterRevision',p_roster_revision,
 'sourceRevision',p_source_revision,'decision',p_decision)::text,'UTF8')),'hex');
 -- Global per-actor request key before the Party lock. Same key cannot
 -- execute across two Party scopes; collisions only cause serialization.
 perform pg_advisory_xact_lock(hashtextextended('party-chat-v122:'||p_actor::text||':'||p_request_id,0));
 perform 1 from public.parties where id=p_party for update;
 if not found then raise exception 'party_swap_v122_party_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready then raise exception 'party_swap_v122_unreleased';end if;
 select * into r from private.party_chat_action_receipts_v108
  where account_id=p_actor and request_id=p_request_id for update;
 if found then
  if r.kind<>'role_swap' or r.party_id<>p_party or r.source_id<>p_proposal
   or r.message_id<>p_message or r.request_digest<>v_hash
  then raise exception 'party_swap_v122_conflicting_replay';end if;
  select * into e from private.party_role_swap_effects_v122 where id=r.effect_id;
  if not found or e.party_id<>p_party or e.proposal_id<>p_proposal
   or e.actor_account_id<>p_actor or e.request_id<>p_request_id or e.request_digest<>v_hash
   or r.effect_digest<>encode(sha256(convert_to(e.response::text,'UTF8')),'hex')
  then raise exception 'party_swap_v122_missing_replay_evidence';end if;
  -- Return the exact historical outcome, not the current workflow status.
  return jsonb_build_object('effectId',e.id,'response',e.response,'newlyRecorded',false);
 end if;
 select * into p from private.party_role_swap_proposals_v108
  where id=p_proposal and party_id=p_party for update;
 if not found or p.chat_message_id is distinct from p_message or p.roster_revision<>p_roster_revision
  or s.roster_revision<>p_roster_revision
 then raise exception 'party_swap_v122_stale_scope';end if;
 if not exists(select 1 from public.chat_messages m where m.id=p_message
  and m.account_id is null and m.is_system=true and m.channel_type='party'
  and m.channel_id=p_party::text)
 then raise exception 'party_swap_v122_unverified_message';end if;
 v_result:=private.respond_party_registration_swap_v111(p_party,p_proposal,p_actor,p_decision);
 -- An exact replay requires the original request key. A different key
 -- cannot manufacture a second receipt for an already recorded decision.
 if v_result->>'replayed' is distinct from 'false'
 then raise exception 'party_swap_v122_response_already_recorded';end if;
 if v_result->>'state' not in ('pending','completed','declined','expired') or v_result->>'state' is null
 then raise exception 'party_swap_v122_invalid_effect';end if;
 insert into private.party_role_swap_effects_v122
 (party_id,proposal_id,actor_account_id,request_id,request_digest,response)
 values(p_party,p_proposal,p_actor,p_request_id,v_hash,v_result)
 returning * into e;
 v_effect_hash:=encode(sha256(convert_to(e.response::text,'UTF8')),'hex');
 insert into private.party_chat_action_receipts_v108
 (account_id,request_id,party_id,source_id,message_id,kind,request_digest,effect_id,effect_digest)
 values(p_actor,p_request_id,p_party,p_proposal,p_message,'role_swap',v_hash,e.id,v_effect_hash);
 -- Readback in the same transaction. Any failure rolls back final roster,
 -- journal, participant decision and both receipt rows.
 select * into r from private.party_chat_action_receipts_v108 where account_id=p_actor and request_id=p_request_id;
 if not found or r.effect_id<>e.id or r.effect_digest<>v_effect_hash
 or r.request_digest<>v_hash or r.party_id<>p_party or r.source_id<>p_proposal or r.message_id<>p_message
 or r.kind<>'role_swap' or not exists(select 1 from private.party_role_swap_effects_v122 x
   where x.id=e.id and x.party_id=p_party and x.proposal_id=p_proposal and x.actor_account_id=p_actor
   and x.request_id=p_request_id and x.request_digest=v_hash and x.response=v_result)
 then raise exception 'party_swap_v122_receipt_readback';end if;
 return jsonb_build_object('effectId',e.id,'response',v_result,'newlyRecorded',true);
end
$$;
revoke all on function private.respond_party_registration_chat_v122(uuid,text,uuid,uuid,uuid,bigint,bigint,text)
 from public,anon,authenticated,service_role;
