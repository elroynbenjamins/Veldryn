-- Party Events v17: transactional stage advances and auditable party votes.
-- Hidden; requires v11-v16. No boss grant, currency, chest or public RPC.
begin;

-- Close v11's temporary service-role UPDATE bypass. Future stage changes
-- and vote locks require the checked private routines defined below.
revoke update on private.party_event_weeks_v11 from service_role;
revoke update on private.party_event_stages_v11 from service_role;

create table private.party_event_stage_seals_v17 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 stage smallint not null check(stage between 1 and 3),
 required_orders_count integer not null check(required_orders_count>=3),
 orders_hash text not null check(orders_hash ~ '^[0-9a-f]{64}$'),
 sealed_at timestamptz not null default now(),
 primary key(party_id,event_starts_at,stage),
 foreign key(party_id,event_starts_at,stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage)
  on delete cascade
);
create table private.party_event_ballots_v17 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 stage smallint not null check(stage in (2,3)),
 account_id uuid not null,
 choice text not null,
 cast_at timestamptz not null default now(),
 primary key(party_id,event_starts_at,stage,account_id),
 foreign key(party_id,event_starts_at,stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage)
  on delete cascade,
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id)
  on delete cascade
);
create table private.party_event_stage_transitions_v17 (
 id uuid primary key default gen_random_uuid(),
 request_id text not null unique check(length(request_id) between 8 and 180),
 party_id uuid not null,
 event_starts_at timestamptz not null,
 from_stage smallint not null check(from_stage in (1,2)),
 to_stage smallint not null check(to_stage=from_stage+1),
 from_stage_orders_hash text not null check(from_stage_orders_hash ~ '^[0-9a-f]{64}$'),
 verified_ep integer not null check(verified_ep>=0),
 transitioned_at timestamptz not null default now(),
 unique(party_id,event_starts_at,from_stage),
 foreign key(party_id,event_starts_at,from_stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage)
  on delete cascade
);
alter table private.party_event_stage_seals_v17 enable row level security;
alter table private.party_event_ballots_v17 enable row level security;
alter table private.party_event_stage_transitions_v17 enable row level security;
revoke all on private.party_event_stage_seals_v17,
 private.party_event_ballots_v17,
 private.party_event_stage_transitions_v17 from public,anon,authenticated;
grant select on private.party_event_stage_seals_v17,
 private.party_event_ballots_v17,
 private.party_event_stage_transitions_v17 to service_role;

create trigger party_event_seal_immutable_v17 before update
 on private.party_event_stage_seals_v17 for each row
 execute function private.party_event_progress_immutable_v14();
create trigger party_event_ballot_immutable_v17 before update
 on private.party_event_ballots_v17 for each row
 execute function private.party_event_progress_immutable_v14();
create trigger party_event_transition_immutable_v17 before update
 on private.party_event_stage_transitions_v17 for each row
 execute function private.party_event_progress_immutable_v14();

-- No new required OR optional orders may be added after sealing a stage;
-- existing v16 orders remain immutable apart from monotone donated_quantity.
create or replace function private.party_event_order_seal_guard_v17()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.party_event_stage_seals_v17
  where party_id=new.party_id and event_starts_at=new.event_starts_at
   and stage=new.stage)
 then raise exception 'party_event_v17_supply_plan_sealed';end if;
 return new;
end;$$;
create trigger party_event_order_seal_guard_v17 before insert
 on private.party_event_supply_orders_v16 for each row
 execute function private.party_event_order_seal_guard_v17();

-- Keep initial week state defensively constrained, even if a privileged
-- service accidentally specifies stage=3 on first INSERT.
create or replace function private.party_event_initial_week_guard_v17()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.active_stage<>1 or new.status<>'active'
 then raise exception 'party_event_v17_invalid_initial_week';end if;
 return new;
end;$$;
create trigger party_event_initial_week_guard_v17 before insert
 on private.party_event_weeks_v11 for each row
 execute function private.party_event_initial_week_guard_v17();

-- Validate that all three resource categories are represented with
-- audited item IDs before marking a *specific* stage's order set immutable.
-- The deterministically computed quantities must still come from the server
-- v2 planner; this function cannot assert it ran the planner.
create or replace function private.seal_party_event_supplies_v17(
 p_party_id uuid,p_event_starts_at timestamptz,p_stage integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 v_existing private.party_event_stage_seals_v17%rowtype;
 v_required integer;
 v_categories integer;
 v_disabled integer;
 v_hash text;
 v_now timestamptz:=clock_timestamp();
begin
 if p_party_id is null or p_event_starts_at is null or p_stage not between 1 and 3
 then raise exception 'party_event_v17_invalid_seal_request';end if;
 select * into w from private.party_event_weeks_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v17_week_missing';end if;
 select * into v_existing from private.party_event_stage_seals_v17
  where party_id=p_party_id and event_starts_at=p_event_starts_at and stage=p_stage;
 if found then return jsonb_build_object('replayed',true,
   'stage',p_stage,'ordersHash',v_existing.orders_hash);end if;
 if w.status<>'active' or w.active_stage<>p_stage
  or v_now<w.event_starts_at or v_now>=w.event_ends_at
 then raise exception 'party_event_v17_seal_wrong_stage';end if;
 select count(*) filter(where o.kind='required')::int,
   count(distinct o.category) filter(where o.kind='required')::int,
   count(*) filter(where c.enabled is distinct from true
       or c.category is distinct from o.category)::int
 into v_required,v_categories,v_disabled
 from private.party_event_supply_orders_v16 o
 left join private.party_event_supply_catalogue_v16 c on c.item_id=o.item_id
 where o.party_id=p_party_id and o.event_starts_at=p_event_starts_at
   and o.stage=p_stage;
 if v_required<3 or v_categories<>3 or v_disabled<>0
 then raise exception 'party_event_v17_incomplete_canonical_supplies';end if;
 select encode(sha256(convert_to(string_agg(
   concat_ws(':',o.stage,o.kind,o.category,o.item_id,o.target_quantity),
   '|' order by o.kind,o.category,o.item_id),'UTF8')),'hex')
 into v_hash from private.party_event_supply_orders_v16 o
 where o.party_id=p_party_id and o.event_starts_at=p_event_starts_at
   and o.stage=p_stage;
 insert into private.party_event_stage_seals_v17(
   party_id,event_starts_at,stage,required_orders_count,orders_hash)
 values(p_party_id,p_event_starts_at,p_stage,v_required,v_hash);
 return jsonb_build_object('replayed',false,
  'stage',p_stage,'ordersHash',v_hash,'requiredOrders',v_required);
end;$$;

-- Server records the character's ballot once. Each ballot belongs to a
-- frozen roster member and to a valid stage/family choice. No re-votes.
create or replace function private.cast_party_event_ballot_v17(
 p_party_id uuid,p_event_starts_at timestamptz,p_stage integer,
 p_account_id uuid,p_choice text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 s private.party_event_stages_v11%rowtype;
 existing private.party_event_ballots_v17%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_choices text[];
begin
 if p_party_id is null or p_event_starts_at is null or p_stage not in (2,3)
  or p_account_id is null or p_choice is null
 then raise exception 'party_event_v17_invalid_ballot';end if;
 select * into w from private.party_event_weeks_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v17_week_missing';end if;
 select * into existing from private.party_event_ballots_v17
  where party_id=p_party_id and event_starts_at=p_event_starts_at
    and stage=p_stage and account_id=p_account_id;
 if found then
  if existing.choice is distinct from p_choice then
   raise exception 'party_event_v17_vote_already_cast';end if;
  return jsonb_build_object('replayed',true,'choice',existing.choice);end if;
 if w.status<>'active' or w.active_stage<>p_stage
   or v_now<w.event_starts_at or v_now>=w.event_ends_at
 then raise exception 'party_event_v17_vote_closed';end if;
 select * into s from private.party_event_stages_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=p_stage for update;
 if not found or s.vote_locked_at is not null or v_now<s.opened_at
  or v_now>=s.opened_at+interval '6 hours'
 then raise exception 'party_event_v17_ballot_window_closed';end if;
 if not exists(select 1 from private.party_event_roster_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at
    and account_id=p_account_id and joined_at<=s.opened_at)
 then raise exception 'party_event_v17_voter_not_enrolled';end if;
 v_choices:=case
  when w.family='broken_caravan' and p_stage=2 then array['safe_pass','fast_pass']
  when w.family='broken_caravan' and p_stage=3 then array['brace_wagons','disrupt_raiders']
  when w.family='nightfall_hunt' and p_stage=2 then array['clear_trail','shadow_trail']
  when w.family='nightfall_hunt' and p_stage=3 then array['hold_ground','hunt_alpha']
  when w.family='broken_wards' and p_stage=2 then array['ground_spires','charge_sigils']
  when w.family='broken_wards' and p_stage=3 then array['protect_wards','overload_wards']
  when w.family='lost_reliquary' and p_stage=2 then array['quiet_passage','deep_passage']
  when w.family='lost_reliquary' and p_stage=3 then array['preserve_seals','break_seals']
 end;
 if p_choice<>all(v_choices) then raise exception 'party_event_v17_invalid_vote_choice';end if;
 insert into private.party_event_ballots_v17(
  party_id,event_starts_at,stage,account_id,choice,cast_at)
 values(p_party_id,p_event_starts_at,p_stage,p_account_id,p_choice,v_now);
 return jsonb_build_object('replayed',false,'choice',p_choice);
end;$$;

-- Resolve only when >50% of the frozen roster voted for the same option,
-- or when the real 6-hour ballot timeout elapses (first option by family).
create or replace function private.resolve_party_event_ballot_v17(
 p_party_id uuid,p_event_starts_at timestamptz,p_stage integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 s private.party_event_stages_v11%rowtype;
 v_now timestamptz:=now();
 -- v11 stage vote guard compares vote_locked_at to transaction_timestamp().
 -- A consistent transaction timestamp avoids false future-vote rejection.
 v_members integer;v_choice text;v_count integer;v_default text;
 v_reason text;
begin
 if p_party_id is null or p_event_starts_at is null or p_stage not in (2,3)
 then raise exception 'party_event_v17_invalid_vote_resolve';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v17_week_missing';end if;
 select * into s from private.party_event_stages_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at
   and stage=p_stage for update;
 if not found then raise exception 'party_event_v17_stage_missing';end if;
 if s.vote_locked_at is not null then
  return jsonb_build_object('replayed',true,'choice',s.vote_choice);end if;
 if w.status<>'active' or w.active_stage<>p_stage
  or v_now<w.event_starts_at or v_now>=w.event_ends_at
 then raise exception 'party_event_v17_vote_closed';end if;
 select count(*)::int into v_members from private.party_event_roster_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and joined_at<=s.opened_at;
 if v_members not between 2 and 4 then raise exception 'party_event_v17_invalid_voters';end if;
 select choice,count(*)::int into v_choice,v_count
 from private.party_event_ballots_v17
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=p_stage
 group by choice order by count(*) desc,choice asc limit 1;
 if coalesce(v_count,0)>=floor(v_members/2.0)::int+1 then
  v_reason:='majority';
 elsif v_now>=s.opened_at+interval '6 hours' then
  v_choice:=case
   when w.family='broken_caravan' and p_stage=2 then 'safe_pass'
   when w.family='broken_caravan' and p_stage=3 then 'brace_wagons'
   when w.family='nightfall_hunt' and p_stage=2 then 'clear_trail'
   when w.family='nightfall_hunt' and p_stage=3 then 'hold_ground'
   when w.family='broken_wards' and p_stage=2 then 'ground_spires'
   when w.family='broken_wards' and p_stage=3 then 'protect_wards'
   when w.family='lost_reliquary' and p_stage=2 then 'quiet_passage'
   when w.family='lost_reliquary' and p_stage=3 then 'preserve_seals' end;
  v_reason:='timeout';
 else raise exception 'party_event_v17_vote_unresolved';end if;
 update private.party_event_stages_v11 set
  vote_choice=v_choice,vote_locked_at=v_now
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=p_stage;
 return jsonb_build_object('replayed',false,'choice',v_choice,'reason',v_reason);
end;$$;

-- The single stage-transition mutation. Requires a sealed complete order
-- plan, fulfilled required supplies, verified activity/objective EP,
-- previous stage's actual verified objectives and majority/timeout vote.
-- Stage 3 stays pending: boss proof and rewards are a separate release gate.
create or replace function private.advance_party_event_stage_v17(
 p_party_id uuid,p_event_starts_at timestamptz,
 p_expected_from_stage integer,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 existing private.party_event_stage_transitions_v17%rowtype;
 seal private.party_event_stage_seals_v17%rowtype;
 v_readiness jsonb;v_now timestamptz:=now();
 -- Use the same transactional clock as v11's opened_at/vote guards.
 v_next integer;v_required_actions text[];
 v_missing_actions integer;v_done integer;
begin
 if p_party_id is null or p_event_starts_at is null
  or p_expected_from_stage not in (1,2)
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v17_invalid_advance';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v17_week_missing';end if;
 select * into existing from private.party_event_stage_transitions_v17
 where request_id=p_request_id or
  (party_id=p_party_id and event_starts_at=p_event_starts_at
   and from_stage=p_expected_from_stage) for update;
 if found then
  if existing.request_id is distinct from p_request_id
   or existing.party_id is distinct from p_party_id
   or existing.event_starts_at is distinct from p_event_starts_at
   or existing.from_stage is distinct from p_expected_from_stage
  then raise exception 'party_event_v17_advance_conflict';end if;
  return jsonb_build_object('replayed',true,'fromStage',existing.from_stage,
   'toStage',existing.to_stage,'transitionId',existing.id);end if;
 if w.status<>'active' or w.active_stage<>p_expected_from_stage
  or v_now<w.event_starts_at or v_now>=w.event_ends_at
 then raise exception 'party_event_v17_wrong_stage_or_closed';end if;
 select * into seal from private.party_event_stage_seals_v17
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=p_expected_from_stage for update;
 if not found then raise exception 'party_event_v17_unsealed_supply_plan';end if;
 v_readiness:=private.party_event_stage_readiness_v16(
  p_party_id,p_event_starts_at);
 if (v_readiness->>'requiredSuppliesVerified')::boolean is distinct from true
 then raise exception 'party_event_v17_supplies_incomplete';end if;
 if (v_readiness->>'verifiedTotalEventPoints')::integer
    <(v_readiness->>'cumulativeStageTarget')::integer
 then raise exception 'party_event_v17_insufficient_ep';end if;
 if (v_readiness->>'voteLocked')::boolean is distinct from true
 then raise exception 'party_event_v17_vote_unresolved';end if;
 v_required_actions:=case p_expected_from_stage
  when 1 then array['scout_route']
  when 2 then array['secure_approach','support_expedition'] end;
 select count(*)::int into v_missing_actions
 from unnest(v_required_actions) required_action
 where not exists(select 1 from private.party_event_receipts_v11 r
  where r.party_id=p_party_id and r.event_starts_at=p_event_starts_at
   and r.stage=p_expected_from_stage
   and r.action_id=required_action);
 if v_missing_actions>0 then raise exception 'party_event_v17_missing_objectives';end if;
 -- Vote must be a true majority/timeout proof, never a direct SQL
 -- choice update. Locking via v17 vote resolver is the only service path.
 if p_expected_from_stage=2 and not exists(
  select 1 from private.party_event_stages_v11 s
   where s.party_id=p_party_id and s.event_starts_at=p_event_starts_at
    and s.stage=2 and s.vote_locked_at is not null)
 then raise exception 'party_event_v17_no_vote_proof';end if;
 v_next:=p_expected_from_stage+1;
 update private.party_event_weeks_v11 set active_stage=v_next
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p_party_id,p_event_starts_at,v_next,v_now);
 insert into private.party_event_stage_transitions_v17(
  request_id,party_id,event_starts_at,from_stage,to_stage,
  from_stage_orders_hash,verified_ep,transitioned_at)
 values(p_request_id,p_party_id,p_event_starts_at,p_expected_from_stage,
  v_next,seal.orders_hash,
  (v_readiness->>'verifiedTotalEventPoints')::integer,v_now);
 return jsonb_build_object('replayed',false,
  'fromStage',p_expected_from_stage,'toStage',v_next,
  'verifiedEventPoints',(v_readiness->>'verifiedTotalEventPoints')::integer);
end;$$;


-- A read-only projection that matches the v17 mutation gates, unlike the
-- deliberately conservative v16 preview. Stage 3 never completes from EP.
create or replace function private.party_event_stage_readiness_v17(
 p_party_id uuid,p_event_starts_at timestamptz
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 b jsonb;
 w private.party_event_weeks_v11%rowtype;
 v_sealed boolean;
 v_missing integer;
 v_required_actions text[];
 v_stage integer;
 v_ready boolean;
 v_status text;
begin
 b:=private.party_event_stage_readiness_v16(p_party_id,p_event_starts_at);
 select * into w from private.party_event_weeks_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at;
 v_stage:=w.active_stage;
 select exists(select 1 from private.party_event_stage_seals_v17 s
   where s.party_id=p_party_id and s.event_starts_at=p_event_starts_at
    and s.stage=v_stage) into v_sealed;
 v_required_actions:=case v_stage
  when 1 then array['scout_route']
  when 2 then array['secure_approach','support_expedition']
  else array['prepare_finale'] end;
 select count(*)::int into v_missing from unnest(v_required_actions) action_required
 where not exists(select 1 from private.party_event_receipts_v11 r
  where r.party_id=p_party_id and r.event_starts_at=p_event_starts_at
   and r.stage=v_stage and r.action_id=action_required);
 v_ready:=w.status='active' and v_stage in (1,2)
  and now()>=w.event_starts_at and now()<w.event_ends_at
  and v_sealed and v_missing=0
  and (b->>'requiredSuppliesVerified')::boolean=true
  and (b->>'voteLocked')::boolean=true
  and (b->>'verifiedTotalEventPoints')::integer
   >=(b->>'cumulativeStageTarget')::integer;
 v_status:=case
  when w.status<>'active' or now()<w.event_starts_at
    or now()>=w.event_ends_at then 'closed'
  when (b->>'verifiedTotalEventPoints')::integer
       <(b->>'cumulativeStageTarget')::integer then 'awaiting_progress'
  when not v_sealed then 'awaiting_supply_seal'
  when (b->>'requiredSuppliesVerified')::boolean is distinct from true
    then 'awaiting_supplies'
  when (b->>'voteLocked')::boolean is distinct from true then 'awaiting_vote'
  when v_missing>0 then 'awaiting_objectives'
  when v_stage=3 then 'awaiting_finale'
  else 'ready_to_advance' end;
 return b||jsonb_build_object(
  'stageSupplyPlanSealed',v_sealed,
  'missingRequiredObjectives',v_missing,
  'stageReadyToAdvance',v_ready,
  'status',v_status,
  'finaleVerified',false);
end;$$;

revoke all on function private.seal_party_event_supplies_v17(uuid,timestamptz,integer),
 private.cast_party_event_ballot_v17(uuid,timestamptz,integer,uuid,text),
 private.resolve_party_event_ballot_v17(uuid,timestamptz,integer),
 private.advance_party_event_stage_v17(uuid,timestamptz,integer,text),
 private.party_event_stage_readiness_v17(uuid,timestamptz)
 from public,anon,authenticated;
grant execute on function private.seal_party_event_supplies_v17(uuid,timestamptz,integer),
 private.cast_party_event_ballot_v17(uuid,timestamptz,integer,uuid,text),
 private.resolve_party_event_ballot_v17(uuid,timestamptz,integer),
 private.advance_party_event_stage_v17(uuid,timestamptz,integer,text),
 private.party_event_stage_readiness_v17(uuid,timestamptz)
 to service_role;
revoke all on function private.party_event_order_seal_guard_v17(),
 private.party_event_initial_week_guard_v17() from public,anon,authenticated;
commit;
