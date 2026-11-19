-- Party Events V49 — UNPROMOTED immutable source-time co-op witness.
-- This schema is hidden. NO player feature, EP or reward and NO production DDL.
-- Source is captured by the already trusted finalization transaction that
-- inserts public.coop_node_results (live node success only).
begin;

create table private.party_event_coop_node_actors_v49 (
 run_id uuid not null,
 node_id text not null check(length(node_id) between 1 and 100),
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null references public.characters(id) on delete cascade,
 node_committed_at timestamptz not null,
 content_id text not null check(length(content_id) between 1 and 120),
 fencing_generation bigint not null,
 start_state_hash text not null,
 attested_at timestamptz not null default now(),
 primary key(run_id,node_id,account_id)
);
create index party_event_coop_node_actors_v49_run_node
 on private.party_event_coop_node_actors_v49(run_id,node_id);
alter table private.party_event_coop_node_actors_v49 enable row level security;
revoke all on private.party_event_coop_node_actors_v49
 from public,anon,authenticated,service_role;
grant select on private.party_event_coop_node_actors_v49 to service_role;
comment on table private.party_event_coop_node_actors_v49 is
 'UNRELEASED V49 append-only source-time human witness. Created from a successful committed live co-op node; never from an actor-supplied claim. Account/character erasure cascades. No EP/loot.';

create or replace function private.capture_party_event_coop_node_v49()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_content_id text;
 v_matches integer;
 v_live boolean;
begin
 if tg_op<>'INSERT' or tg_table_schema<>'public'
  or tg_table_name<>'coop_node_results'
 then raise exception 'party_event_v49_invalid_source_trigger';end if;
 if new.success is distinct from true then return new;end if;

 -- Don't store evidence for failed/Q-mode/Echo-only nodes. The actual
 -- finalized node is committed by the authoritative co-op server RPC.
 select r.coop_mode='live' into v_live
 from public.expedition_runs r where r.id=new.run_id;
 if v_live is distinct from true then return new;end if;

 -- Validate the successful node against the frozen run route and its
 -- existing positive combat weight; identical node IDs are ambiguous.
 select count(*),min(route.value->>'contentId')
 into v_matches,v_content_id
 from public.expedition_runs r
 cross join lateral jsonb_array_elements(
   coalesce(r.route_graph_json->'nodes','[]'::jsonb)) route(value)
 join public.party_activity_weights_v16 wgt
  on wgt.kind='combat' and wgt.content_id=route.value->>'contentId'
   and wgt.units_per_action>0
 where r.id=new.run_id and route.value->>'nodeId'=new.node_id;
 if v_matches<>1 or v_content_id is null then return new;end if;

 -- Freeze the ACTIVE human run membership at exact node insertion time;
 -- later disconnect/leave/cleanup cannot retroactively invalidate it.
 -- "Echo" source accounts and Q-mode offline substitutes never qualify.
 with eligible as (
  select m.account_id,m.character_id
  from public.expedition_run_members m
  where m.run_id=new.run_id and m.member_kind='human'
   and m.account_id is not null and m.character_id is not null
   and m.active_participant_account_id=m.account_id
   and m.echo_profile_version is null
   and exists(
    select 1 from public.coop_run_access_memberships access
    where access.run_id=m.run_id and access.account_id=m.account_id
     and access.active
     and access.membership_kind in ('controller','live_participant'))
 ),
 qualified as (
  select actor.* from eligible actor
  where (select count(distinct account_id) from eligible) between 2 and 4
 )
 insert into private.party_event_coop_node_actors_v49(
  run_id,node_id,account_id,character_id,node_committed_at,
  content_id,fencing_generation,start_state_hash)
 select new.run_id,new.node_id,actor.account_id,actor.character_id,
  new.committed_at,v_content_id,new.fencing_generation,new.start_state_hash
 from qualified actor
 on conflict(run_id,node_id,account_id) do nothing;
 return new;
end;$$;

create trigger party_event_coop_node_attested_v49
 after insert on public.coop_node_results
 for each row execute function private.capture_party_event_coop_node_v49();

revoke all on function private.capture_party_event_coop_node_v49()
 from public,anon,authenticated,service_role;

commit;
