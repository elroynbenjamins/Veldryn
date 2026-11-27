-- DISPOSABLE PG17 REVIEW ONLY, after V124/V125.
-- Current leader receives application details. No applicant data in shared
-- chat text or other members' projections. Verified host supplies actor.
create function private.read_party_recruitment_chat_v128(p_actor uuid,p_party uuid,p_message uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 a private.party_recruitment_applications_v124%rowtype;
 s private.party_registration_state_v110%rowtype;
 c public.characters%rowtype;
 v_status text;
 v_actions jsonb:='[]'::jsonb;
begin
 select * into s from private.party_registration_state_v110 where party_id=p_party;
 if not found or not s.qa_fixture_ready or s.leader_account_id is distinct from p_actor
 or not exists(select 1 from public.parties where id=p_party and status<>'disbanded')
 or not exists(select 1 from private.party_registration_members_v110 where party_id=p_party and account_id=p_actor)
 then return null;end if;
 select * into a from private.party_recruitment_applications_v124 where party_id=p_party and chat_message_id=p_message;
 if not found or a.leader_account_id<>p_actor
 or not exists(select 1 from public.chat_messages where id=p_message and account_id is null
  and is_system and channel_type='party' and channel_id=p_party::text)
 then return null;end if;
 select * into c from public.characters where id=a.character_id and account_id=a.applicant_account_id;
 if not found then return null;end if;
 v_status:=case a.state when 'accepted' then 'completed' when 'withdrawn' then 'cancelled' else a.state end;
 if a.state='pending' then
  if statement_timestamp()>=a.expires_at then v_status:='expired';
  elsif s.roster_revision<>a.roster_revision or s.activity_locked
   or private.party_registration_role_v111(c.class_id) is distinct from a.role
   or c.level is null or c.level<greatest(1,s.minimum_level)
   or not exists(select 1 from public.characters where account_id=a.applicant_account_id and level>=10)
   or exists(select 1 from private.party_registration_members_v110 where account_id=a.applicant_account_id)
   or exists(select 1 from public.party_members where account_id=a.applicant_account_id and left_at is null)
   or (select count(*) from private.party_registration_members_v110 where party_id=p_party)>=4
   or exists(select 1 from private.party_registration_members_v110 m join public.player_blocks b on
    (b.blocker_id=a.applicant_account_id and b.blocked_id=m.account_id)
    or (b.blocked_id=a.applicant_account_id and b.blocker_id=m.account_id) where m.party_id=p_party)
  then v_status:='stale';
  else v_actions:='["accept","decline"]'::jsonb;end if;
 end if;
 return jsonb_build_object('id',a.id,'kind','recruitment_request','partyId',a.party_id,'messageId',a.chat_message_id,
  'status',v_status,'expiresAtMs',floor(extract(epoch from a.expires_at)*1000)::bigint,
  'rosterRevision',s.roster_revision,'sourceRevision',1,'allowedActions',v_actions,
  'applicantAccountId',a.applicant_account_id,'classId',c.class_id,'role',a.role,'combatLevel',c.level,
  'releaseEnabled',false);
end
$$;
revoke all on function private.read_party_recruitment_chat_v128(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create table private.party_recruitment_effects_v128(
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references private.party_recruitment_applications_v124(id) on delete cascade,
 party_id uuid not null references public.parties(id) on delete cascade,
 actor_account_id uuid not null references auth.users(id) on delete cascade,
 request_id text not null,
 request_digest text not null,
 response jsonb not null,
 unique(actor_account_id,request_id)
);
alter table private.party_recruitment_effects_v128 enable row level security;
revoke all on private.party_recruitment_effects_v128 from public,anon,authenticated,service_role;

-- Chat approvals delegate to the existing owner routine, including its
-- applicant lock, membership revalidation, stable join and V125 outbox.
create function private.respond_party_recruitment_chat_v128(
 p_actor uuid,p_request_id text,p_party uuid,p_application uuid,p_message uuid,
 p_roster_revision bigint,p_source_revision bigint,p_decision text
) returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $$
declare
 a private.party_recruitment_applications_v124%rowtype;
 s private.party_registration_state_v110%rowtype;
 r private.party_chat_action_receipts_v108%rowtype;
 e private.party_recruitment_effects_v128%rowtype;
 v_hash text;v_effect_hash text;v_result jsonb;v_applicant uuid;
begin
 if p_actor is null or p_request_id is null or p_request_id !~ '^[A-Za-z0-9:_-]{1,128}$'
 or p_party is null or p_application is null or p_message is null or p_roster_revision is null
 or p_roster_revision<1 or p_source_revision is distinct from 1
 or p_decision is null or p_decision not in ('accept','decline')
 then raise exception 'party_recruit_chat_v128_invalid_request';end if;
 v_hash:=encode(sha256(convert_to(jsonb_build_object('version','recruit-chat-v128','actor',p_actor,
 'requestId',p_request_id,'party',p_party,'application',p_application,'message',p_message,
 'rosterRevision',p_roster_revision,'sourceRevision',p_source_revision,'decision',p_decision)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('party-chat-v122:'||p_actor::text||':'||p_request_id,0));
 -- Match V124's applicant-account -> Party -> state -> application order.
 select applicant_account_id into v_applicant from private.party_recruitment_applications_v124
 where id=p_application and party_id=p_party;
 if not found then raise exception 'party_recruit_chat_v128_missing';end if;
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_applicant::text,0));
 perform 1 from public.parties where id=p_party and status<>'disbanded' for update;
 if not found then raise exception 'party_recruit_chat_v128_missing';end if;
 select * into s from private.party_registration_state_v110 where party_id=p_party for update;
 if not found or not s.qa_fixture_ready then raise exception 'party_recruit_chat_v128_unreleased';end if;
 select * into a from private.party_recruitment_applications_v124 where id=p_application and party_id=p_party for update;
 if not found or a.applicant_account_id<>v_applicant or a.leader_account_id<>p_actor or s.leader_account_id<>p_actor
 or not exists(select 1 from private.party_registration_members_v110 where party_id=p_party and account_id=p_actor)
 then raise exception 'party_recruit_chat_v128_not_leader';end if;
 select * into r from private.party_chat_action_receipts_v108 where account_id=p_actor and request_id=p_request_id;
 if found then
  if r.kind<>'recruitment_request' or r.party_id<>p_party or r.source_id<>p_application
   or r.message_id<>p_message or r.request_digest<>v_hash
  then raise exception 'party_recruit_chat_v128_conflicting_replay';end if;
  select * into e from private.party_recruitment_effects_v128 where id=r.effect_id;
  if not found or e.application_id<>p_application or e.party_id<>p_party or e.actor_account_id<>p_actor
   or e.request_id<>p_request_id or e.request_digest<>v_hash
   or r.effect_digest<>encode(sha256(convert_to(e.response::text,'UTF8')),'hex')
  then raise exception 'party_recruit_chat_v128_missing_evidence';end if;
  return jsonb_build_object('effectId',e.id,'response',e.response,'newlyRecorded',false);
 end if;
 if a.chat_message_id<>p_message or a.roster_revision<>p_roster_revision or s.roster_revision<>p_roster_revision
 or not exists(select 1 from public.chat_messages where id=p_message and account_id is null and is_system
 and channel_type='party' and channel_id=p_party::text)
 then raise exception 'party_recruit_chat_v128_stale_scope';end if;
 v_result:=private.respond_party_recruitment_application_v124(p_actor,p_party,p_application,p_decision);
 if v_result->>'replayed' is distinct from 'false' then raise exception 'party_recruit_chat_v128_already_recorded';end if;
 if v_result->>'state' is null or v_result->>'state' not in ('accepted','declined','expired')
 then raise exception 'party_recruit_chat_v128_invalid_effect';end if;
 insert into private.party_recruitment_effects_v128(application_id,party_id,actor_account_id,request_id,request_digest,response)
 values(p_application,p_party,p_actor,p_request_id,v_hash,v_result) returning * into e;
 v_effect_hash:=encode(sha256(convert_to(v_result::text,'UTF8')),'hex');
 insert into private.party_chat_action_receipts_v108(account_id,request_id,party_id,source_id,message_id,kind,request_digest,effect_id,effect_digest)
 values(p_actor,p_request_id,p_party,p_application,p_message,'recruitment_request',v_hash,e.id,v_effect_hash);
 if not exists(select 1 from private.party_chat_action_receipts_v108 x join private.party_recruitment_effects_v128 y on y.id=x.effect_id
 where x.account_id=p_actor and x.request_id=p_request_id and x.party_id=p_party and x.source_id=p_application
 and x.message_id=p_message and x.kind='recruitment_request' and x.request_digest=v_hash and x.effect_digest=v_effect_hash
 and y.application_id=p_application and y.party_id=p_party and y.actor_account_id=p_actor
 and y.request_id=p_request_id and y.request_digest=v_hash and y.response=v_result)
 then raise exception 'party_recruit_chat_v128_readback';end if;
 return jsonb_build_object('effectId',e.id,'response',v_result,'newlyRecorded',true);
end
$$;
revoke all on function private.respond_party_recruitment_chat_v128(uuid,text,uuid,uuid,uuid,bigint,bigint,text) from public,anon,authenticated,service_role;
