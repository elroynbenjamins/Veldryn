-- Party Events V47 — UNPROMOTED crash-safe outbox lease/ack protocol.
-- Internal service-role functions only. NO scheduler, endpoint, EP or reward.
-- Apply only after the unpromoted V46 source outbox draft, once approved.
begin;

alter table private.party_event_source_outbox_v46
 add column lease_token uuid;
alter table private.party_event_source_outbox_v46
 add constraint party_event_source_outbox_v47_lease_shape check (
 (state='leased' and lease_token is not null and lease_expires_at is not null)
 or (state<>'leased' and lease_token is null and lease_expires_at is null)
 );

create or replace function private.lease_party_event_sources_v47(
 p_max_rows integer default 10,
 p_lease_seconds integer default 90
) returns table(
 source_type text,
 source_ref uuid,
 lease_token uuid,
 attempt_count integer)
language plpgsql security definer set search_path='' as $$
declare
 v_now timestamptz:=clock_timestamp();
begin
 if p_max_rows is null or p_max_rows not between 1 and 25
  or p_lease_seconds is null or p_lease_seconds not between 30 and 300
 then raise exception 'party_event_v47_invalid_lease_bounds';end if;

 return query
 with candidate as (
  select q.source_type,q.source_ref
  from private.party_event_source_outbox_v46 q
  where (q.state='pending' and q.next_attempt_at<=v_now)
     or (q.state='leased' and q.lease_expires_at<=v_now)
  order by q.next_attempt_at,q.queued_at,q.source_type,q.source_ref
  for update of q skip locked
  limit p_max_rows
 )
 update private.party_event_source_outbox_v46 q
 set state='leased',
     lease_token=gen_random_uuid(),
     lease_expires_at=v_now+make_interval(secs=>p_lease_seconds),
     attempt_count=q.attempt_count+1,
     last_error_code=null
 from candidate c
 where q.source_type=c.source_type and q.source_ref=c.source_ref
 returning q.source_type,q.source_ref,q.lease_token,q.attempt_count;
end;$$;

-- Returns false for stale lease owners (even if the V14 credit succeeded).
-- The newer lease holder will replay the canonical source safely.
create or replace function private.complete_party_event_source_v47(
 p_source_type text,
 p_source_ref uuid,
 p_lease_token uuid
) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_source_type is null or p_source_type not in ('craft','idle')
  or p_source_ref is null or p_lease_token is null
 then raise exception 'party_event_v47_invalid_completion';end if;
 update private.party_event_source_outbox_v46 q
 set state='complete',completed_at=clock_timestamp(),
     lease_token=null,lease_expires_at=null,last_error_code=null
 where q.source_type=p_source_type and q.source_ref=p_source_ref
  and q.state='leased' and q.lease_token=p_lease_token
  and q.lease_expires_at>clock_timestamp();
 return found;
end;$$;

-- Retry only an owned active lease; preserve the source and retry forever
-- (bounded exponential delay, never silent permanent loss). Future audited
-- terminal classification requires a separate explicitly reviewed policy.
create or replace function private.retry_party_event_source_v47(
 p_source_type text,
 p_source_ref uuid,
 p_lease_token uuid,
 p_reason text
) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_source_type is null or p_source_type not in ('craft','idle')
  or p_source_ref is null or p_lease_token is null
  or p_reason is null or p_reason not in (
   'private_credit_unavailable','malformed_private_credit',
   'worker_backend_unavailable','worker_ack_unavailable')
 then raise exception 'party_event_v47_invalid_retry';end if;
 update private.party_event_source_outbox_v46 q
 set state='pending',
     next_attempt_at=clock_timestamp()+make_interval(
      secs=>least(3600,5*power(2,least(q.attempt_count,9))::integer)),
     lease_token=null,lease_expires_at=null,last_error_code=p_reason
 where q.source_type=p_source_type and q.source_ref=p_source_ref
  and q.state='leased' and q.lease_token=p_lease_token
  and q.lease_expires_at>clock_timestamp();
 return found;
end;$$;

revoke all on function private.lease_party_event_sources_v47(integer,integer)
 from public,anon,authenticated,service_role;
revoke all on function private.complete_party_event_source_v47(text,uuid,uuid)
 from public,anon,authenticated,service_role;
revoke all on function private.retry_party_event_source_v47(text,uuid,uuid,text)
 from public,anon,authenticated,service_role;
grant execute on function private.lease_party_event_sources_v47(integer,integer)
 to service_role;
grant execute on function private.complete_party_event_source_v47(text,uuid,uuid)
 to service_role;
grant execute on function private.retry_party_event_source_v47(text,uuid,uuid,text)
 to service_role;

commit;
