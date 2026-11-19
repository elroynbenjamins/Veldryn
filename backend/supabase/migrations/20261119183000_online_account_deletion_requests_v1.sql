-- REVIEW-ONLY, NOT DEPLOYED: authenticated request intake for full online-account deletion.
-- This migration creates a request queue, NOT a destructive Auth-user erasure path.
-- No service/client role may directly modify the private queue.
begin;

create table if not exists private.online_account_deletion_requests_v1 (
 account_id uuid primary key references auth.users(id) on delete cascade,
 request_id uuid not null,
 status text not null default 'pending_review'
   check (status in ('pending_review','cancelled','reviewing','erasure_blocked')),
 policy_version text not null default 'deletion-request-v1',
 requested_at timestamptz not null default pg_catalog.transaction_timestamp(),
 updated_at timestamptz not null default pg_catalog.transaction_timestamp()
);

alter table private.online_account_deletion_requests_v1 enable row level security;
revoke all on table private.online_account_deletion_requests_v1 from public, anon, authenticated;
-- Service access is read-only for support reconciliation. The three narrowly scoped
-- SECURITY DEFINER RPCs below are the only request write surface for players.
grant select on table private.online_account_deletion_requests_v1 to service_role;

-- Never trust a caller-supplied account UUID or session age from the client.
-- Validate both the signed JWT subject and the still-active Auth session row;
-- a stale JWT from a revoked session cannot submit or withdraw a request.
create or replace function public.online_account_deletion_request_guard_v1()
returns uuid language plpgsql security definer set search_path=''
as $function$
declare
 v_actor uuid := (select auth.uid());
 v_session_text text := auth.jwt()->>'session_id';
begin
 if v_actor is null then raise exception 'AUTH_REQUIRED';end if;
 if v_session_text is null or
    v_session_text !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
 then raise exception 'ACTIVE_SESSION_REQUIRED';end if;
 if not exists(select 1 from auth.sessions s
  where s.id=v_session_text::uuid and s.user_id=v_actor)
 then raise exception 'ACTIVE_SESSION_REQUIRED';end if;
 if not exists(select 1 from auth.users u where u.id=v_actor and u.is_anonymous is false)
 then raise exception 'LINKED_ACCOUNT_REQUIRED';end if;
 return v_actor;
end;
$function$;
revoke all on function public.online_account_deletion_request_guard_v1()
 from public,anon,authenticated;
-- A helper reached exclusively through the wrappers below, not callable by a mobile token.

create or replace function public.submit_online_account_deletion_request_v1(
 p_confirmation text,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid;v_row private.online_account_deletion_requests_v1;
begin
 v_actor:=public.online_account_deletion_request_guard_v1();
 if p_confirmation is distinct from 'DELETE ACCOUNT' or p_request_id is null
 then raise exception 'INVALID_DELETION_CONFIRMATION';end if;
 insert into private.online_account_deletion_requests_v1 as current_request
  (account_id,request_id,status,policy_version)
 values(v_actor,p_request_id,'pending_review','deletion-request-v1')
 on conflict(account_id) do update
 set request_id=case
       when current_request.status='cancelled'
       then excluded.request_id
       else current_request.request_id end,
     status=case
       when current_request.status='cancelled'
       then 'pending_review'
       else current_request.status end,
     requested_at=case
       when current_request.status='cancelled'
       then pg_catalog.transaction_timestamp()
       else current_request.requested_at end,
     updated_at=case
       when current_request.status='cancelled'
       then pg_catalog.transaction_timestamp()
       else current_request.updated_at end
 returning * into v_row;
 return pg_catalog.jsonb_build_object('status',v_row.status,
  'requestId',v_row.request_id::text,
  'requestedAtMs',pg_catalog.floor(extract(epoch from v_row.requested_at)*1000)::bigint,
  'erasureCompleted',false);
end;
$function$;
revoke all on function public.submit_online_account_deletion_request_v1(text,uuid)
 from public,anon,authenticated;
grant execute on function public.submit_online_account_deletion_request_v1(text,uuid) to authenticated;

create or replace function public.online_account_deletion_request_status_v1()
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_actor uuid;v_row private.online_account_deletion_requests_v1;
begin
 v_actor:=public.online_account_deletion_request_guard_v1();
 select * into v_row from private.online_account_deletion_requests_v1
 where account_id=v_actor;
 if not found then return '{"status":"none","erasureCompleted":false}'::jsonb;end if;
 return pg_catalog.jsonb_build_object('status',v_row.status,
  'requestId',v_row.request_id::text,
  'requestedAtMs',pg_catalog.floor(extract(epoch from v_row.requested_at)*1000)::bigint,
  'erasureCompleted',false);
end;
$function$;
revoke all on function public.online_account_deletion_request_status_v1()
 from public,anon,authenticated;
grant execute on function public.online_account_deletion_request_status_v1() to authenticated;

create or replace function public.cancel_online_account_deletion_request_v1(
 p_confirmation text
) returns jsonb language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid;v_row private.online_account_deletion_requests_v1;
begin
 v_actor:=public.online_account_deletion_request_guard_v1();
 if p_confirmation is distinct from 'KEEP ACCOUNT' then
  raise exception 'INVALID_CANCELLATION_CONFIRMATION';end if;
 update private.online_account_deletion_requests_v1
 set status='cancelled',updated_at=pg_catalog.transaction_timestamp()
 where account_id=v_actor and status='pending_review'
 returning * into v_row;
 if found then
  return pg_catalog.jsonb_build_object('status','cancelled','erasureCompleted',false);
 end if;
 select * into v_row from private.online_account_deletion_requests_v1
 where account_id=v_actor;
 return pg_catalog.jsonb_build_object('status',coalesce(v_row.status,'none'),
   'erasureCompleted',false);
end;
$function$;
revoke all on function public.cancel_online_account_deletion_request_v1(text)
 from public,anon,authenticated;
grant execute on function public.cancel_online_account_deletion_request_v1(text) to authenticated;
commit;
