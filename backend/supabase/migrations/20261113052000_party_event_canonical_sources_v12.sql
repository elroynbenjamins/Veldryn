-- Party Events v12: server-verified gameplay source bridge.
-- Intentionally hidden. Depends on 20261113041500_party_event_receipt_ledger_v11.sql.
-- No Event Points, consumables, rewards, public RPCs or auto-triggered production writes.
-- Never apply to production until the draft Party Events release gates are approved.
begin;

-- v11 intentionally allowed service-role INSERT while the canonical evidence source
-- was not wired. Close that temporary trust gap. A service can request verified
-- source conversion only through the function below; it cannot fabricate rows.
revoke insert on private.party_event_sources_v11 from service_role;

create or replace function private.record_party_event_canonical_action_v12(
 p_party_id uuid,
 p_event_starts_at timestamptz,
 p_source_type text,           -- 'craft' or 'coop_node'
 p_source_id uuid,             -- canonical craft receipt ID or co-op run ID
 p_node_id text,               -- canonical co-op node ID; null for crafting
 p_actor_account_id uuid,     -- used ONLY to select a real human run participant
 p_action_id text,
 p_request_id text,
 p_stage_context_hash text
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 v_stage smallint;
 v_week private.party_event_weeks_v11%rowtype;
 v_account_id uuid;
 v_character_id uuid;
 v_occurred_at timestamptz;
 v_source_event_id text;
 v_kind text;
 v_now timestamptz:=clock_timestamp();
 v_participant_count integer;
begin
 -- No caller-supplied account, timestamp, class, role, activity units or
 -- arbitrary source identity is accepted as evidence. Every such value is read
 -- from immutable or server-committed gameplay tables below.
 if p_party_id is null or p_event_starts_at is null or p_source_id is null
  or p_source_type is null or p_action_id is null
 then raise exception 'party_event_v12_invalid_request';end if;

 v_stage:=case p_action_id
  when 'scout_route' then 1
  when 'secure_approach' then 2
  when 'support_expedition' then 2
  when 'prepare_finale' then 3
  else null end;
 if v_stage is null then raise exception 'party_event_v12_invalid_action';end if;

 select * into v_week from private.party_event_weeks_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v12_week_not_found';end if;

 if p_source_type='craft' then
  -- Craft receipts are inserted by the authoritative crafting settlement
  -- pipeline, and only recipes with positive server-configured Party activity
  -- weights count. Stage 1 scouting deliberately cannot be claimed via crafts.
  if p_action_id not in ('support_expedition','prepare_finale')
   or p_node_id is not null or p_actor_account_id is not null
  then raise exception 'party_event_v12_wrong_source_for_action';end if;

  select c.account_id,c.id,r.created_at
   into v_account_id,v_character_id,v_occurred_at
  from public.craft_receipts r
  join public.characters c on c.id=r.character_id
  join public.party_activity_weights_v16 w
   on w.kind='crafting' and w.content_id=r.recipe_id
  where r.receipt_id=p_source_id and r.quantity>0 and w.units_per_action>0;
  if not found then raise exception 'party_event_v12_missing_canonical_craft';end if;
  v_source_event_id:='craft:'||p_source_id::text;
  v_kind:='verified_noncombat';

 elsif p_source_type='coop_node' then
  -- A node result is not proof of a combat action unless it actually cleared
  -- a recognized combat-content node. Count only real human participants who
  -- were on this event's frozen party roster and in the real co-op run.
  if p_action_id<>'secure_approach'
    or p_node_id is null or length(p_node_id) not between 1 and 100
    or p_actor_account_id is null
  then raise exception 'party_event_v12_wrong_source_for_action';end if;

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
  where n.run_id=p_source_id and n.node_id=p_node_id and n.success=true
    and exists (
     select 1
      from public.expedition_runs r,
       lateral jsonb_array_elements(
         coalesce(r.route_graph_json->'nodes','[]'::jsonb)) route_node
      join public.party_activity_weights_v16 w
        on w.kind='combat' and w.content_id=route_node->>'contentId'
        and w.units_per_action>0
      where r.id=n.run_id and route_node->>'nodeId'=n.node_id
    );
  if not found then raise exception 'party_event_v12_missing_canonical_combat';end if;

  select count(distinct er.account_id) into v_participant_count
  from private.party_event_roster_v11 er
  join public.expedition_run_members m on m.run_id=p_source_id
   and m.account_id=er.account_id
   and m.active_participant_account_id=er.account_id
   and m.member_kind='human' and m.echo_profile_version is null
  join public.coop_run_access_memberships access
   on access.run_id=m.run_id and access.account_id=m.account_id
   and access.active
  where er.party_id=p_party_id and er.event_starts_at=p_event_starts_at;
  if v_participant_count<2
  then raise exception 'party_event_v12_not_a_party_encounter';end if;

  -- Source ID is deterministic, fixed-length, and unique per true player
  -- participation in this specific combat node (no repeated echo credit).
  v_source_event_id:='coop:'||encode(sha256(convert_to(
   p_source_id::text||':'||p_node_id||':'||v_account_id::text,'UTF8')),'hex');
  v_kind:='verified_combat';

 else
  raise exception 'party_event_v12_unknown_source';
 end if;

 -- Sources are bound to a particular frozen character, account and original
 -- event week. Once a player switches parties they cannot retroactively claim.
 if not exists(
  select 1 from private.party_event_roster_v11 r
  where r.party_id=p_party_id and r.event_starts_at=p_event_starts_at
    and r.account_id=v_account_id and r.character_id=v_character_id
    and r.joined_at<=v_occurred_at
 ) or v_occurred_at is null or v_occurred_at>v_now
 then raise exception 'party_event_v12_not_enrolled_for_source';end if;

 -- v11 revalidates stage, vote lock, close time and idempotency, and inserts
 -- the receipt in this same SQL transaction. If it rejects, the source INSERT
 -- also rolls back. An existing identical canonical event is a stable replay.
 insert into private.party_event_sources_v11(
  source_event_id,party_id,event_starts_at,account_id,stage,kind,
  occurred_at,committed_at)
 values(v_source_event_id,p_party_id,p_event_starts_at,v_account_id,
  v_stage,v_kind,v_occurred_at,v_occurred_at)
 on conflict(source_event_id) do nothing;

 return private.record_party_event_action_v11(
  p_party_id,p_event_starts_at,v_source_event_id,p_action_id,
  p_request_id,p_stage_context_hash);
end;
$$;

revoke all on function private.record_party_event_canonical_action_v12(
 uuid,timestamptz,text,uuid,text,uuid,text,text,text)
 from public,anon,authenticated;
grant execute on function private.record_party_event_canonical_action_v12(
 uuid,timestamptz,text,uuid,text,uuid,text,text,text) to service_role;

comment on function private.record_party_event_canonical_action_v12(
 uuid,timestamptz,text,uuid,text,uuid,text,text,text) is
 'Hidden Party Events: atomic source verification from real craft/coop receipts plus zero-EP v11 objective insert. No client access.';

commit;
