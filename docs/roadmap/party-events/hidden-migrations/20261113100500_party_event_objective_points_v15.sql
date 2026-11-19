-- Party Events v15: one-time verified objectives -> special EP.
-- Requires v11–v14. Private draft-only; no rewards or stage mutation.
-- Fixed 5 EP per canonical v11 objective. Four action slots = 20 EP per
-- member maximum. This DOES NOT update v11's immutable zero-EP receipt.
begin;

create table private.party_event_special_credits_v15 (
 receipt_id uuid primary key references private.party_event_receipts_v11(id) on delete cascade,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 stage smallint not null check(stage between 1 and 3),
 action_id text not null check(action_id in
  ('scout_route','secure_approach','support_expedition','prepare_finale')),
 points_credited smallint not null default 5 check(points_credited=5),
 created_at timestamptz not null default now(),
 unique(event_starts_at,account_id,action_id),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id)
   on delete cascade,
 foreign key(party_id,event_starts_at,stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage)
   on delete cascade
);
alter table private.party_event_special_credits_v15 enable row level security;
revoke all on private.party_event_special_credits_v15 from public,anon,authenticated;
grant select on private.party_event_special_credits_v15 to service_role;

create trigger party_event_special_credit_immutable_v15
 before update on private.party_event_special_credits_v15
 for each row execute function private.party_event_progress_immutable_v14();

create or replace function private.credit_party_event_objective_v15(
 p_party_id uuid,p_event_starts_at timestamptz,p_receipt_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_week private.party_event_weeks_v11%rowtype;
 v_receipt private.party_event_receipts_v11%rowtype;
 v_credit private.party_event_special_credits_v15%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_total integer;
begin
 if p_party_id is null or p_event_starts_at is null or p_receipt_id is null
 then raise exception 'party_event_v15_invalid_input';end if;
 select * into v_week from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v15_week_missing';end if;
 select * into v_credit from private.party_event_special_credits_v15
 where receipt_id=p_receipt_id for update;
 if found then
  if v_credit.party_id is distinct from p_party_id
    or v_credit.event_starts_at is distinct from p_event_starts_at
  then raise exception 'party_event_v15_receipt_other_week';end if;
  return jsonb_build_object('creditReceiptId',p_receipt_id,
   'replayed',true,'eventPointsGranted',0,
   'originalPointsCredited',v_credit.points_credited);
 end if;
 if v_week.status<>'active' or v_now<v_week.event_starts_at
   or v_now>=v_week.event_ends_at
 then raise exception 'party_event_v15_window_closed';end if;
 select * into v_receipt from private.party_event_receipts_v11
 where id=p_receipt_id and party_id=p_party_id
   and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v15_unverified_objective';end if;
 if v_receipt.stage<>v_week.active_stage or
   not exists(select 1 from private.party_event_stages_v11 s
     where s.party_id=p_party_id and s.event_starts_at=p_event_starts_at
      and s.stage=v_receipt.stage and s.opened_at<=v_now)
 then raise exception 'party_event_v15_wrong_stage';end if;
 -- The only four valid one-time action slots each award five EP.
 -- This derives solely from the verified receipt; no caller-supplied points.
 select coalesce(sum(points_credited),0)::integer into v_total
 from private.party_event_special_credits_v15
 where event_starts_at=p_event_starts_at and account_id=v_receipt.account_id;
 if v_total+5>20 then raise exception 'party_event_v15_special_cap';end if;

 insert into private.party_event_special_credits_v15(
  receipt_id,party_id,event_starts_at,account_id,stage,action_id)
 values(v_receipt.id,p_party_id,p_event_starts_at,v_receipt.account_id,
  v_receipt.stage,v_receipt.action_id);
 return jsonb_build_object('creditReceiptId',p_receipt_id,
  'replayed',false,'eventPointsGranted',5,'originalPointsCredited',5);
end;$$;

create or replace function private.party_event_stage_readiness_v15(
 p_party_id uuid,p_event_starts_at timestamptz
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_base jsonb;
 v_total integer;
 v_special integer;
 v_activity integer;
 v_target integer;
 v_vote_locked boolean;
 v_status text;
begin
 v_base:=private.party_event_stage_readiness_v14(p_party_id,p_event_starts_at);
 select coalesce(sum(points_credited),0)::integer into v_special
 from private.party_event_special_credits_v15
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 v_activity:=(v_base->>'verifiedActivityPoints')::integer;
 v_total:=v_activity+v_special;
 v_target:=(v_base->>'cumulativeStageTarget')::integer;
 v_vote_locked:=(v_base->>'voteLocked')::boolean;
 v_status:=case when v_base->>'eventStatus'<>'active' then 'closed'
  when v_total<v_target then 'awaiting_progress'
  when not v_vote_locked then 'awaiting_vote'
  else 'awaiting_supplies' end;
 return v_base || jsonb_build_object(
  'verifiedSpecialPoints',v_special,'verifiedTotalEventPoints',v_total,
  'missingPoints',greatest(0,v_target-v_total),
  'status',v_status,'requiredSuppliesVerified',false,
  'finaleVerified',false,'stageReadyToAdvance',false);
end;$$;

revoke all on function private.credit_party_event_objective_v15(
 uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function private.credit_party_event_objective_v15(
 uuid,timestamptz,uuid) to service_role;
revoke all on function private.party_event_stage_readiness_v15(
 uuid,timestamptz) from public,anon,authenticated;
grant execute on function private.party_event_stage_readiness_v15(
 uuid,timestamptz) to service_role;
commit;
