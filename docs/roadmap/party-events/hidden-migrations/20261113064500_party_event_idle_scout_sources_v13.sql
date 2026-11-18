-- Veldryn Party Events v13: hidden server-verified gathering scout bridge.
-- Requires v11 and v12; no public endpoint, no Event Points, no production deploy.
-- Validates EXISTING service-settled idle claim receipts (never client counters).
begin;

-- Explicit allowlist: existing canonical gathering nodes in Veldryn's legacy
-- gathering settlement. New nodes require an audited gameplay-content mapping,
-- rather than accepting arbitrary skill IDs supplied by a client.
create table private.party_event_gathering_activities_v13 (
 activity_id text primary key,
 skill text not null check (skill in ('mining','woodcutting','fishing')),
 min_elapsed_sec integer not null default 60 check(min_elapsed_sec>=60),
 enabled boolean not null default true
);
insert into private.party_event_gathering_activities_v13(activity_id,skill) values
 ('COPPER_VEIN','mining'),('ASTER_IRON_VEIN','mining'),('OATHSTONE_SEAM','mining'),
 ('GREENWOOD_TREE','woodcutting'),('IRONWOOD_TREE','woodcutting'),('CROWNWOOD_TREE','woodcutting'),
 ('SILVERBROOK_SHOAL','fishing'),('RIVER_EEL_POOL','fishing'),('OATHSCALE_POOL','fishing');
alter table private.party_event_gathering_activities_v13 enable row level security;
revoke all on private.party_event_gathering_activities_v13 from public,anon,authenticated;
grant select on private.party_event_gathering_activities_v13 to service_role;
comment on table private.party_event_gathering_activities_v13 is
 'Hidden Stage 1 scout whitelist. Not a source of rewards. Enable future gathering nodes after verifying canonical activity and settlement behavior.';

create or replace function private.record_party_event_idle_scout_v13(
 p_party_id uuid,p_event_starts_at timestamptz,p_claim_id uuid,
 p_request_id text,p_stage_context_hash text
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 v_week private.party_event_weeks_v11%rowtype;
 v_stage private.party_event_stages_v11%rowtype;
 v_claim public.idle_claim_receipts%rowtype;
 v_account_id uuid;
 v_member_joined_at timestamptz;
 v_min_elapsed_sec integer;
 v_source_event_id text;
begin
 if p_party_id is null or p_event_starts_at is null or p_claim_id is null
 then raise exception 'party_event_v13_invalid_input';end if;

 select * into v_week from private.party_event_weeks_v11
  where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v13_week_missing';end if;

 v_source_event_id:='idle:'||p_claim_id::text;
 -- A previously verified retry stays valid after the claim has been pruned
 -- or the week closes; v11 still validates exact request and hash.
 if exists(select 1 from private.party_event_receipts_v11 r
  where r.party_id=p_party_id and r.event_starts_at=p_event_starts_at
   and r.source_event_id=v_source_event_id and r.action_id='scout_route'
   and r.request_id=p_request_id)
 then
  return private.record_party_event_action_v11(
   p_party_id,p_event_starts_at,v_source_event_id,'scout_route',
   p_request_id,p_stage_context_hash);
 end if;

 -- Take Stage 1, not just whichever stage is currently open.
 if v_week.status<>'active' or v_week.active_stage<>1
 then raise exception 'party_event_v13_scout_stage_closed';end if;
 select * into v_stage from private.party_event_stages_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at and stage=1 for update;
 if not found then raise exception 'party_event_v13_stage_missing';end if;

 select * into v_claim from public.idle_claim_receipts
 where claim_id=p_claim_id for update;
 if not found then raise exception 'party_event_v13_missing_canonical_idle_claim';end if;

 select c.account_id into v_account_id from public.characters c
 where c.id=v_claim.character_id;
 select min_elapsed_sec into v_min_elapsed_sec
 from private.party_event_gathering_activities_v13
 where activity_id=v_claim.activity_id and enabled=true;
 select joined_at into v_member_joined_at from private.party_event_roster_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and account_id=v_account_id and character_id=v_claim.character_id;

 -- Whole claimed interval must have happened after Stage 1 opening and
 -- after enrollment; this forbids pre-party banked idle claims.
 if v_account_id is null or v_member_joined_at is null
  or v_min_elapsed_sec is null or v_claim.elapsed_sec<v_min_elapsed_sec
  or v_claim.elapsed_sec>86400 or v_claim.resource_amount<=0
  or v_claim.xp_amount<0
  or v_claim.created_at>clock_timestamp()
  or v_claim.created_at-make_interval(secs=>v_claim.elapsed_sec)
     <greatest(v_member_joined_at,v_stage.opened_at)
 then raise exception 'party_event_v13_invalid_gathering_evidence';end if;

 insert into private.party_event_sources_v11
  (source_event_id,party_id,event_starts_at,account_id,stage,kind,
   occurred_at,committed_at)
 values(v_source_event_id,p_party_id,p_event_starts_at,v_account_id,1,
  'verified_noncombat',v_claim.created_at,v_claim.created_at)
 on conflict(source_event_id) do nothing;

 return private.record_party_event_action_v11(
  p_party_id,p_event_starts_at,v_source_event_id,'scout_route',
  p_request_id,p_stage_context_hash);
end;$$;

revoke all on function private.record_party_event_idle_scout_v13(
 uuid,timestamptz,uuid,text,text) from public,anon,authenticated;
grant execute on function private.record_party_event_idle_scout_v13(
 uuid,timestamptz,uuid,text,text) to service_role;
comment on function private.record_party_event_idle_scout_v13(
 uuid,timestamptz,uuid,text,text) is
 'Hidden Party Events: one verified settled gathering interval -> one zero-EP Stage 1 scout receipt, service only.';

commit;
