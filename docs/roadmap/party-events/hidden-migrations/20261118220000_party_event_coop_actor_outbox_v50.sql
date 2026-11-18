-- Party Events V50 — UNPROMOTED, server-owned co-op actor outbox.
-- Depends on V11 frozen roster, V49 source-time human witnesses and V14.
-- No public RPC, scheduler, EP, reward or activation; draft only.
begin;

create table private.party_event_coop_actor_outbox_v50 (
 run_id uuid not null,
 node_id text not null,
 account_id uuid not null,
 queued_at timestamptz not null default now(),
 state text not null default 'pending'
  check (state in ('pending','leased','complete')),
 attempt_count integer not null default 0 check(attempt_count>=0),
 next_attempt_at timestamptz not null default now(),
 lease_token uuid,
 lease_expires_at timestamptz,
 completed_at timestamptz,
 last_error_code text check(last_error_code is null or
  last_error_code ~ '^[a-z0-9_]{1,64}$'),
 primary key(run_id,node_id,account_id),
 foreign key(run_id,node_id,account_id)
  references private.party_event_coop_node_actors_v49(run_id,node_id,account_id)
  on delete cascade,
 constraint party_event_v50_lease_shape check(
  (state='leased' and lease_token is not null and lease_expires_at is not null
   and completed_at is null)
  or (state='pending' and lease_token is null and lease_expires_at is null
      and completed_at is null)
  or (state='complete' and lease_token is null and lease_expires_at is null
      and completed_at is not null))
);
create index party_event_coop_outbox_v50_available
 on private.party_event_coop_actor_outbox_v50(next_attempt_at,queued_at)
 where state='pending';
alter table private.party_event_coop_actor_outbox_v50 enable row level security;
revoke all on private.party_event_coop_actor_outbox_v50
 from public,anon,authenticated,service_role;
grant select,update on private.party_event_coop_actor_outbox_v50 to service_role;

-- Each attestation is inserted inside the trusted canonical co-op node
-- transaction. Enqueue ONLY if >=2 humans on this very Party Event's frozen
-- roster were witnessed at this node and stage 2 was already open.
-- All quantities and party/week eligibility are derived from private DB rows.
create or replace function private.enqueue_party_event_coop_actor_v50()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'INSERT' or tg_table_schema<>'private'
  or tg_table_name<>'party_event_coop_node_actors_v49'
 then raise exception 'party_event_v50_invalid_source_trigger';end if;

 insert into private.party_event_coop_actor_outbox_v50(run_id,node_id,account_id)
 select new.run_id,new.node_id,new.account_id
 from private.party_event_roster_v11 member
 join private.party_event_weeks_v11 w
  on w.party_id=member.party_id and w.event_starts_at=member.event_starts_at
 join private.party_event_stages_v11 stage
  on stage.party_id=member.party_id and stage.event_starts_at=member.event_starts_at
   and stage.stage=2
 where member.account_id=new.account_id and member.character_id=new.character_id
  and member.joined_at<=new.node_committed_at
  and w.status='active' and w.active_stage=2
  and new.node_committed_at>=w.event_starts_at
  and new.node_committed_at<w.event_ends_at
  and new.node_committed_at>=stage.opened_at
  and (
   select count(distinct cohort.account_id)
   from private.party_event_coop_node_actors_v49 cohort
   join private.party_event_roster_v11 other
    on other.party_id=member.party_id
     and other.event_starts_at=member.event_starts_at
     and other.account_id=cohort.account_id
     and other.character_id=cohort.character_id
     and other.joined_at<=cohort.node_committed_at
   where cohort.run_id=new.run_id and cohort.node_id=new.node_id
    and cohort.node_committed_at=new.node_committed_at
  )>=2
 on conflict(run_id,node_id,account_id) do nothing;
 return new;
end;$$;

create trigger party_event_coop_actor_queued_v50
 after insert on private.party_event_coop_node_actors_v49
 for each row execute function private.enqueue_party_event_coop_actor_v50();

-- Leases are a separate queue from V47 crafting/idle sources; they never
-- change those source types or interfere with the V47 dispatcher.
create or replace function private.lease_party_event_coop_actors_v50(
 p_max_rows integer default 10,p_lease_seconds integer default 90
) returns table(run_id uuid,node_id text,actor_account_id uuid,
 lease_token uuid,attempt_count integer)
language plpgsql security definer set search_path='' as $$
declare v_now timestamptz:=clock_timestamp();
begin
 if p_max_rows is null or p_max_rows not between 1 and 25
  or p_lease_seconds is null or p_lease_seconds not between 30 and 300
 then raise exception 'party_event_v50_invalid_lease_bounds';end if;
 return query
 with candidate as (
  select q.run_id,q.node_id,q.account_id
  from private.party_event_coop_actor_outbox_v50 q
  where (q.state='pending' and q.next_attempt_at<=v_now)
     or (q.state='leased' and q.lease_expires_at<=v_now)
  order by q.next_attempt_at,q.queued_at,q.run_id,q.node_id,q.account_id
  for update of q skip locked limit p_max_rows
 )
 update private.party_event_coop_actor_outbox_v50 q
 set state='leased',lease_token=gen_random_uuid(),
  lease_expires_at=v_now+make_interval(secs=>p_lease_seconds),
  attempt_count=q.attempt_count+1,last_error_code=null
 from candidate c
 where q.run_id=c.run_id and q.node_id=c.node_id and q.account_id=c.account_id
 returning q.run_id,q.node_id,q.account_id,q.lease_token,q.attempt_count;
end;$$;

create or replace function private.complete_party_event_coop_actor_v50(
 p_run_id uuid,p_node_id text,p_account_id uuid,p_lease_token uuid
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_run_id is null or p_node_id is null
  or length(p_node_id) not between 1 and 100
  or p_account_id is null or p_lease_token is null
 then raise exception 'party_event_v50_invalid_ack';end if;
 update private.party_event_coop_actor_outbox_v50 q
 set state='complete',completed_at=clock_timestamp(),
  lease_token=null,lease_expires_at=null,last_error_code=null
 where q.run_id=p_run_id and q.node_id=p_node_id
  and q.account_id=p_account_id and q.state='leased'
  and q.lease_token=p_lease_token and q.lease_expires_at>clock_timestamp();
 return found;
end;$$;

create or replace function private.retry_party_event_coop_actor_v50(
 p_run_id uuid,p_node_id text,p_account_id uuid,p_lease_token uuid,
 p_reason text
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_run_id is null or p_node_id is null
  or length(p_node_id) not between 1 and 100
  or p_account_id is null or p_lease_token is null
  or p_reason is null or p_reason not in (
   'private_credit_unavailable','malformed_private_credit',
   'worker_backend_unavailable','worker_ack_unavailable')
 then raise exception 'party_event_v50_invalid_retry';end if;
 update private.party_event_coop_actor_outbox_v50 q
 set state='pending',next_attempt_at=clock_timestamp()+make_interval(
    secs=>least(3600,5*power(2,least(q.attempt_count,9))::integer)),
  lease_token=null,lease_expires_at=null,last_error_code=p_reason
 where q.run_id=p_run_id and q.node_id=p_node_id
  and q.account_id=p_account_id and q.state='leased'
  and q.lease_token=p_lease_token and q.lease_expires_at>clock_timestamp();
 return found;
end;$$;

revoke all on function private.enqueue_party_event_coop_actor_v50()
 from public,anon,authenticated,service_role;
revoke all on function private.lease_party_event_coop_actors_v50(integer,integer)
 from public,anon,authenticated,service_role;
revoke all on function private.complete_party_event_coop_actor_v50(uuid,text,uuid,uuid)
 from public,anon,authenticated,service_role;
revoke all on function private.retry_party_event_coop_actor_v50(uuid,text,uuid,uuid,text)
 from public,anon,authenticated,service_role;
grant execute on function private.lease_party_event_coop_actors_v50(integer,integer)
 to service_role;
grant execute on function private.complete_party_event_coop_actor_v50(uuid,text,uuid,uuid)
 to service_role;
grant execute on function private.retry_party_event_coop_actor_v50(uuid,text,uuid,uuid,text)
 to service_role;

commit;
