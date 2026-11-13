-- Veldryn Party Events v14 — verified recurring activity EP and stage readiness.
-- Hidden, zero rewards. Requires v11, v12 and v13; DO NOT deploy before release gate.
-- Does not mutate v11 objective receipts (which are intentionally 0 EP).
-- 15 minutes / EP, 40 verified-activity EP / member / event week.
begin;

create table private.party_event_member_progress_v14 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 activity_points integer not null default 0 check(activity_points between 0 and 40),
 carried_seconds integer not null default 0 check(carried_seconds between 0 and 899),
 updated_at timestamptz not null default now(),
 primary key (party_id,event_starts_at,account_id),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id)
  on delete cascade
);

create table private.party_event_activity_credits_v14 (
 id uuid primary key default gen_random_uuid(),
 source_event_id text not null unique check(length(source_event_id) between 8 and 180),
 request_id text not null unique check(length(request_id) between 8 and 180),
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 stage smallint not null check(stage between 1 and 3),
 source_type text not null check(source_type in ('idle','craft','coop_node')),
 source_ref uuid not null,
 node_id text,
 verified_seconds integer not null check(verified_seconds between 1 and 86400),
 points_credited smallint not null check(points_credited between 0 and 40),
 carried_seconds_after integer not null check(carried_seconds_after between 0 and 899),
 committed_at timestamptz not null default now(),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id)
  on delete cascade,
 foreign key(party_id,event_starts_at,stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage)
  on delete cascade,
 constraint party_event_credit_v14_source_shape check(
  (source_type='coop_node' and node_id is not null and length(node_id) between 1 and 100)
   or (source_type in ('idle','craft') and node_id is null))
);
comment on table private.party_event_activity_credits_v14 is
 'Hidden 1/900s verified activity points, one globally unique canonical source, no rewards or balance credit.';

alter table private.party_event_member_progress_v14 enable row level security;
alter table private.party_event_activity_credits_v14 enable row level security;
revoke all on private.party_event_member_progress_v14,
 private.party_event_activity_credits_v14 from public,anon,authenticated;
-- Only internal SECURITY DEFINER functions may INSERT/UPDATE; service can inspect.
grant select on private.party_event_member_progress_v14,
 private.party_event_activity_credits_v14 to service_role;

create or replace function private.party_event_progress_immutable_v14()
returns trigger language plpgsql security definer set search_path='' as $$
begin raise exception 'party_event_progress_immutable';end;$$;
create trigger party_event_activity_immutable_v14
 before update on private.party_event_activity_credits_v14
 for each row execute function private.party_event_progress_immutable_v14();

create or replace function private.credit_party_event_activity_v14(
 p_party_id uuid,p_event_starts_at timestamptz,
 p_source_type text,p_source_ref uuid,p_node_id text,
 p_actor_account_id uuid,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 s private.party_event_stages_v11%rowtype;
 member_progress private.party_event_member_progress_v14%rowtype;
 existing private.party_event_activity_credits_v14%rowtype;
 v_account_id uuid;
 v_character_id uuid;
 v_joined_at timestamptz;
 v_occurred_at timestamptz;
 v_begin_at timestamptz;
 v_seconds integer;
 v_source_id text;
 v_participants integer;
 v_weight numeric;
 v_points integer;
 v_available integer;
 v_next_carry integer;
 v_now timestamptz:=clock_timestamp();
 v_total_points integer;
begin
 if p_party_id is null or p_event_starts_at is null
  or p_source_ref is null or p_source_type is null
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v14_invalid_input';end if;

 -- Stable globally unique source identity; exact retries can be replayed from
 -- the private immutable credit even after party membership/presence expires.
 if p_source_type='idle' and p_node_id is null and p_actor_account_id is null then
  v_source_id:='idle:'||p_source_ref::text;
 elsif p_source_type='craft' and p_node_id is null and p_actor_account_id is null then
  v_source_id:='craft:'||p_source_ref::text;
 elsif p_source_type='coop_node' and p_node_id is not null
   and length(p_node_id) between 1 and 100 and p_actor_account_id is not null then
  v_source_id:='coop:'||encode(sha256(convert_to(
   p_source_ref::text||':'||p_node_id||':'||p_actor_account_id::text,'UTF8')),'hex');
 else raise exception 'party_event_v14_invalid_source_shape';end if;

 -- Lock the entire week: serializes different accounts, source replays and
 -- stage transitions, so 40-EP caps and party total cannot race.
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v14_week_missing';end if;

 select * into existing from private.party_event_activity_credits_v14
  where source_event_id=v_source_id or request_id=p_request_id for update;
 if found then
  if existing.source_event_id is distinct from v_source_id
   or existing.request_id is distinct from p_request_id
   or existing.party_id is distinct from p_party_id
   or existing.event_starts_at is distinct from p_event_starts_at
  then raise exception 'party_event_v14_conflicting_replay';end if;
  return jsonb_build_object('creditId',existing.id,'replayed',true,
    'eventPointsGranted',existing.points_credited,'totalMemberPoints',
    (select activity_points from private.party_event_member_progress_v14
       where party_id=p_party_id and event_starts_at=p_event_starts_at
        and account_id=existing.account_id),'stage',existing.stage);
 end if;

 if w.status<>'active' or w.active_stage not between 1 and 3
  or v_now<w.event_starts_at or v_now>=w.event_ends_at
 then raise exception 'party_event_v14_closed';end if;
 select * into s from private.party_event_stages_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at
   and stage=w.active_stage for update;
 if not found or v_now<s.opened_at
 then raise exception 'party_event_v14_stage_not_open';end if;

 if p_source_type='idle' then
  if w.active_stage<>1 then raise exception 'party_event_v14_source_wrong_stage';end if;
  select c.account_id,c.id,r.created_at,
    r.created_at-make_interval(secs=>r.elapsed_sec),
    r.elapsed_sec
   into v_account_id,v_character_id,v_occurred_at,v_begin_at,v_seconds
  from public.idle_claim_receipts r
  join public.characters c on c.id=r.character_id
  join private.party_event_gathering_activities_v13 a
   on a.activity_id=r.activity_id and a.enabled
  where r.claim_id=p_source_ref and r.elapsed_sec>=a.min_elapsed_sec
    and r.elapsed_sec between 60 and 86400
    and r.resource_amount>0 and r.xp_amount>=0;
  if not found then raise exception 'party_event_v14_unverified_idle';end if;

 elsif p_source_type='craft' then
  if w.active_stage not in (2,3) then
   raise exception 'party_event_v14_source_wrong_stage';end if;
  select c.account_id,c.id,r.created_at,wgt.units_per_action
   into v_account_id,v_character_id,v_occurred_at,v_weight
  from public.craft_receipts r
  join public.characters c on c.id=r.character_id
  join public.party_activity_weights_v16 wgt
    on wgt.kind='crafting' and wgt.content_id=r.recipe_id
  where r.receipt_id=p_source_ref and r.quantity>0
    and r.quantity<=100000 and wgt.units_per_action>0;
  if not found then raise exception 'party_event_v14_unverified_craft';end if;
  -- Existing v16 crafting weights are measured against roughly one minute
  -- of baseline effort. Convert those server-authoritative weights to
  -- conservative whole seconds; cap one craft receipt at one hour of effort
  -- to avoid minting 40 EP from a bulk claim banked before the event.
  select least(3600::numeric, greatest(1::numeric,ceil(r.quantity*v_weight*60)))::integer
  into v_seconds from public.craft_receipts r where r.receipt_id=p_source_ref;
  v_begin_at:=v_occurred_at;

 elsif p_source_type='coop_node' then
  if w.active_stage<>2 then raise exception 'party_event_v14_source_wrong_stage';end if;
  select m.account_id,m.character_id,n.committed_at
   into v_account_id,v_character_id,v_occurred_at
   from public.coop_node_results n
   join public.expedition_run_members m on m.run_id=n.run_id
    and m.account_id=p_actor_account_id
    and m.active_participant_account_id=p_actor_account_id
    and m.member_kind='human' and m.echo_profile_version is null
   join public.coop_run_access_memberships access
    on access.run_id=n.run_id and access.account_id=m.account_id
     and access.active and access.membership_kind in ('controller','live_participant')
   where n.run_id=p_source_ref and n.node_id=p_node_id
    and n.success=true and exists (
      select 1 from public.expedition_runs r,
       lateral jsonb_array_elements(coalesce(r.route_graph_json->'nodes','[]'::jsonb)) route_node
      join public.party_activity_weights_v16 wgt
       on wgt.kind='combat' and wgt.content_id=route_node->>'contentId'
        and wgt.units_per_action>0
      where r.id=n.run_id and route_node->>'nodeId'=n.node_id
    );
  if not found then raise exception 'party_event_v14_unverified_combat';end if;
  select count(distinct roster.account_id) into v_participants
   from private.party_event_roster_v11 roster
   join public.expedition_run_members run_member
    on run_member.run_id=p_source_ref and run_member.account_id=roster.account_id
     and run_member.active_participant_account_id=roster.account_id
     and run_member.member_kind='human' and run_member.echo_profile_version is null
   join public.coop_run_access_memberships access
    on access.run_id=run_member.run_id and access.account_id=run_member.account_id
     and access.active
   where roster.party_id=p_party_id and roster.event_starts_at=p_event_starts_at;
  if v_participants<2 then raise exception 'party_event_v14_solo_combat';end if;
  -- One successful, eligible shared node = one 15-minute-equivalent EP.
  v_seconds:=900;v_begin_at:=v_occurred_at;
 end if;

 select joined_at into v_joined_at from private.party_event_roster_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at
   and account_id=v_account_id and character_id=v_character_id;
 if v_joined_at is null or v_begin_at is null
   or v_begin_at<greatest(v_joined_at,s.opened_at)
   or v_occurred_at<v_begin_at or v_occurred_at>v_now
   or v_occurred_at>=w.event_ends_at or v_seconds is null
   or v_seconds<1 or v_seconds>86400
 then raise exception 'party_event_v14_not_enrolled_or_outside_stage';end if;

 insert into private.party_event_member_progress_v14(
  party_id,event_starts_at,account_id)
 values(p_party_id,p_event_starts_at,v_account_id)
 on conflict(party_id,event_starts_at,account_id) do nothing;
 select * into member_progress from private.party_event_member_progress_v14
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and account_id=v_account_id for update;
 v_available:=greatest(0,40-member_progress.activity_points);
 v_points:=least(v_available,floor((member_progress.carried_seconds+v_seconds)/900.0)::integer);
 v_next_carry:=case when v_points>=v_available then 0
  else mod(member_progress.carried_seconds+v_seconds,900) end;

 update private.party_event_member_progress_v14
  set activity_points=activity_points+v_points,
   carried_seconds=v_next_carry,updated_at=v_now
  where party_id=p_party_id and event_starts_at=p_event_starts_at
   and account_id=v_account_id;

 insert into private.party_event_activity_credits_v14(
  source_event_id,request_id,party_id,event_starts_at,account_id,
  stage,source_type,source_ref,node_id,verified_seconds,points_credited,
  carried_seconds_after,committed_at)
 values(v_source_id,p_request_id,p_party_id,p_event_starts_at,v_account_id,
  w.active_stage,p_source_type,p_source_ref,p_node_id,v_seconds,
  v_points,v_next_carry,v_now);

 select coalesce(sum(activity_points),0)::integer into v_total_points
 from private.party_event_member_progress_v14
 where party_id=p_party_id and event_starts_at=p_event_starts_at;

 return jsonb_build_object(
  'replayed',false,'eventPointsGranted',v_points,
  'totalMemberPoints',member_progress.activity_points+v_points,
  'totalPartyActivityPoints',v_total_points,
  'memberCarriedSeconds',v_next_carry,'stage',w.active_stage);
end;$$;

-- Readiness is read-only. Do not advance stages or grant any reward until
-- frozen required supply orders, majority votes and final boss evidence
-- have verified, private, transactional ledgers of their own.
create or replace function private.party_event_stage_readiness_v14(
 p_party_id uuid,p_event_starts_at timestamptz
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 v_members integer;
 v_total integer;
 v_target integer;
 v_first integer;
 v_second integer;
 v_needed integer;
 v_vote_locked boolean;
begin
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 if not found then raise exception 'party_event_v14_week_missing';end if;
 select count(*) into v_members from private.party_event_roster_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 if v_members not between 2 and 4 then raise exception 'party_event_v14_invalid_roster';end if;
 -- Match weeklyPartyBudget() exactly (2/3/4 players -> 100/135/170).
 v_target:=case v_members when 2 then 100 when 3 then 135 else 170 end;
 v_first:=floor(v_target*.25+.5)::integer;
 v_second:=floor(v_target*.5+.5)::integer;
 v_needed:=case w.active_stage
  when 1 then v_first when 2 then v_first+v_second else v_target end;
 select coalesce(sum(activity_points),0)::integer into v_total
 from private.party_event_member_progress_v14
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 select exists(select 1 from private.party_event_stages_v11
   where party_id=p_party_id and event_starts_at=p_event_starts_at
   and stage=w.active_stage and (stage=1 or vote_locked_at is not null))
 into v_vote_locked;
 return jsonb_build_object(
  'stage',w.active_stage,
  'eventStatus',w.status,
  'memberCount',v_members,
  'progressTarget',v_target,
  'cumulativeStageTarget',v_needed,
  'verifiedActivityPoints',v_total,
  'missingPoints',greatest(0,v_needed-v_total),
  'voteLocked',v_vote_locked,
  'requiredSuppliesVerified',false,
  'finaleVerified',false,
  'stageReadyToAdvance',false,
  'status',case
   when w.status<>'active' then 'closed'
   when v_total<v_needed then 'awaiting_progress'
   when not v_vote_locked then 'awaiting_vote'
   else 'awaiting_supplies' end
 );
end;$$;

revoke all on function private.credit_party_event_activity_v14(
 uuid,timestamptz,text,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function private.credit_party_event_activity_v14(
 uuid,timestamptz,text,uuid,text,uuid,text) to service_role;
revoke all on function private.party_event_stage_readiness_v14(
 uuid,timestamptz) from public,anon,authenticated;
grant execute on function private.party_event_stage_readiness_v14(
 uuid,timestamptz) to service_role;
revoke all on function private.party_event_progress_immutable_v14()
 from public,anon,authenticated;
commit;
