-- REVIEW ONLY; load after V17 and existing persistent Party/chat schema.
begin;
-- V112 hidden Party Chat binding. One server-authored system message per
-- event/week/stage. This is linkage only, never a second ballot table.
create table private.party_event_chat_vote_links_v112 (
 message_id uuid primary key references public.chat_messages(id) on delete cascade,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 stage smallint not null check(stage in (2,3)),
 opened_at timestamptz not null,
 unique(party_id,event_starts_at,stage),
 foreign key(party_id,event_starts_at,stage)
 references private.party_event_stages_v11(party_id,event_starts_at,stage) on delete cascade
);
alter table private.party_event_chat_vote_links_v112 enable row level security;
revoke all on private.party_event_chat_vote_links_v112 from public,anon,authenticated,service_role;

-- Host supplies the authenticated actor, never an account ID from the
-- client's body. No service/public execute grants until real integration.
create or replace function private.party_event_chat_vote_scope_v112(
 p_party_id uuid,p_message_id uuid,p_account_id uuid
) returns private.party_event_chat_vote_links_v112
 language plpgsql stable security invoker set search_path='' as $$
declare l private.party_event_chat_vote_links_v112%rowtype;
begin
 if p_party_id is null or p_message_id is null or p_account_id is null
 then raise exception 'party_event_v112_invalid_scope';end if;
 select * into l from private.party_event_chat_vote_links_v112
 where message_id=p_message_id and party_id=p_party_id;
 if not found or not exists(select 1 from public.chat_messages m
  where m.id=p_message_id and m.channel_type='party'
   and m.channel_id=p_party_id::text and m.is_system=true and m.account_id is null)
 then raise exception 'party_event_v112_unverified_message';end if;
 if not exists(select 1 from public.parties p join public.party_members m on m.party_id=p.id
  where p.id=p_party_id and p.status<>'disbanded'
   and m.account_id=p_account_id and m.left_at is null)
 then raise exception 'party_event_v112_not_current_member';end if;
 if not exists(select 1 from private.party_event_stages_v11 s
  where s.party_id=l.party_id and s.event_starts_at=l.event_starts_at
   and s.stage=l.stage and s.opened_at=l.opened_at)
 then raise exception 'party_event_v112_stale_stage';end if;
 return l;
end;$$;

create or replace function private.read_party_event_chat_vote_v112(
 p_party_id uuid,p_message_id uuid,p_account_id uuid
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 l private.party_event_chat_vote_links_v112%rowtype;
 w private.party_event_weeks_v11%rowtype;
 s private.party_event_stages_v11%rowtype;
 v_options text[];
 v_eligible integer;
 v_my_vote text;
 v_ballots jsonb;
 v_open boolean;
 v_enrolled boolean;
 v_end timestamptz;
begin
 l:=private.party_event_chat_vote_scope_v112(p_party_id,p_message_id,p_account_id);
 select * into strict w from private.party_event_weeks_v11
 where party_id=l.party_id and event_starts_at=l.event_starts_at;
 select * into strict s from private.party_event_stages_v11
 where party_id=l.party_id and event_starts_at=l.event_starts_at and stage=l.stage;
 v_options:=private.party_event_ballot_choices_v112(w.family,l.stage);
 if v_options is null then raise exception 'party_event_v112_invalid_options';end if;
 v_end:=least(w.event_ends_at,s.opened_at+interval '6 hours');
 select count(*) into v_eligible from private.party_event_roster_v11 r
 where r.party_id=l.party_id and r.event_starts_at=l.event_starts_at and r.joined_at<=s.opened_at;
 select exists(select 1 from private.party_event_roster_v11 r
 where r.party_id=l.party_id and r.event_starts_at=l.event_starts_at
 and r.account_id=p_account_id and r.joined_at<=s.opened_at) into v_enrolled;
 select b.choice into v_my_vote from private.party_event_ballots_v17 b
 where b.party_id=l.party_id and b.event_starts_at=l.event_starts_at
 and b.stage=l.stage and b.account_id=p_account_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.choice,'votes',
  (select count(*) from private.party_event_ballots_v17 b where b.party_id=l.party_id
   and b.event_starts_at=l.event_starts_at and b.stage=l.stage and b.choice=o.choice))
  order by o.ord),'[]'::jsonb) into v_ballots
 from unnest(v_options) with ordinality as o(choice,ord);
 v_open:=w.status='active' and w.active_stage=l.stage and s.vote_locked_at is null
  and now()>=greatest(s.opened_at,w.event_starts_at) and now()<v_end;
 return jsonb_build_object('kind','event_vote','partyId',l.party_id,'messageId',l.message_id,
  'eventStartsAt',l.event_starts_at,'stage',l.stage,'openedAt',s.opened_at,'expiresAt',v_end,
  'options',v_ballots,'eligibleCount',v_eligible,'myVote',v_my_vote,
  'selectedOptionId',s.vote_choice,'status',case when s.vote_locked_at is not null then 'completed'
  when v_open then 'pending' else 'expired' end,'eligibleToRespond',v_open and v_enrolled and v_my_vote is null,
  'releaseEnabled',false,'canExecute',false,'canGrantRewards',false);
end;$$;

create or replace function private.cast_party_event_chat_ballot_v112(
 p_party_id uuid,p_message_id uuid,p_account_id uuid,p_choice text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l private.party_event_chat_vote_links_v112%rowtype;
begin
 -- Serialize with existing permanent Party membership changes before
 -- delegating to V17's week and stage locks. Future lock graph QA required.
 perform 1 from public.parties where id=p_party_id and status<>'disbanded' for update;
 if not found then raise exception 'party_event_v112_party_missing';end if;
 l:=private.party_event_chat_vote_scope_v112(p_party_id,p_message_id,p_account_id);
 -- The native ballot function owns enrollment, deadline, immutable choice,
 -- and exact replay. Resolver remains the only source of vote outcomes.
 return private.cast_party_event_ballot_v17(l.party_id,l.event_starts_at,l.stage,p_account_id,p_choice);
end;$$;
revoke all on function private.party_event_chat_vote_scope_v112(uuid,uuid,uuid),
 private.read_party_event_chat_vote_v112(uuid,uuid,uuid),
 private.cast_party_event_chat_ballot_v112(uuid,uuid,uuid,text)
 from public,anon,authenticated,service_role;

commit;
