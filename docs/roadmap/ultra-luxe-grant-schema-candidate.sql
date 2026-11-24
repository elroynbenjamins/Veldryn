-- DRAFT ONLY. Not a migration. Run only in an isolated test database first.
-- The deployment must include transactional game commit and public identity checks.
begin;
create table private.ultra_luxe_collection_grants_v1 (
 account_id uuid not null references auth.users(id) on delete cascade,
 collection_id text not null check(collection_id in ('ascendant-celestial-sovereign','ascendant-draconic-dominion')),
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key(account_id,collection_id)
);
create table private.ultra_luxe_grant_audit_v1 (
 id bigint generated always as identity primary key,
 account_id uuid not null,
 collection_id text not null,
 action text not null check(action in ('grant','revoke')),
 reason text not null check(length(trim(reason)) between 1 and 240),
 recorded_at timestamptz not null default now()
);
alter table private.ultra_luxe_collection_grants_v1 enable row level security;
alter table private.ultra_luxe_grant_audit_v1 enable row level security;
revoke all on private.ultra_luxe_collection_grants_v1,private.ultra_luxe_grant_audit_v1 from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update on private.ultra_luxe_collection_grants_v1 to service_role;
grant select,insert on private.ultra_luxe_grant_audit_v1 to service_role;
grant usage on sequence private.ultra_luxe_grant_audit_v1_id_seq to service_role;

-- Existing backend convention: public RPC transport, service role only; invoker security.
create function public.ultra_luxe_grants_server_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(collection_id order by collection_id),'[]'::jsonb)
 from private.ultra_luxe_collection_grants_v1
 where account_id=p_account_id and revoked_at is null
$$;
revoke all on function public.ultra_luxe_grants_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.ultra_luxe_grants_server_v1(uuid) to service_role;

create function public.set_ultra_luxe_grant_server_v1(p_account_id uuid,p_collection_id text,p_granted boolean,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 if p_account_id is null or p_collection_id is null or p_collection_id not in ('ascendant-celestial-sovereign','ascendant-draconic-dominion') or p_granted is null or p_reason is null or length(trim(p_reason)) not between 1 and 240 then
  raise exception 'INVALID_ULTRA_LUXE_GRANT';
 end if;
 -- The account must exist even for a no-op revoke.
 if not exists(select 1 from auth.users where id=p_account_id) then raise exception 'ACCOUNT_NOT_FOUND';end if;
 -- Serialize grant/revoke operations for the same pair, including an absent row.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_account_id::text||':'||p_collection_id,0));
 if p_granted then
  insert into private.ultra_luxe_collection_grants_v1(account_id,collection_id)
  values(p_account_id,p_collection_id)
  on conflict(account_id,collection_id) do update set granted_at=now(),revoked_at=null
  where private.ultra_luxe_collection_grants_v1.revoked_at is not null;
 else
  update private.ultra_luxe_collection_grants_v1 set revoked_at=now()
  where account_id=p_account_id and collection_id=p_collection_id and revoked_at is null;
 end if;
 get diagnostics changed=row_count;
 if changed>0 then
  insert into private.ultra_luxe_grant_audit_v1(account_id,collection_id,action,reason)
  values(p_account_id,p_collection_id,case when p_granted then 'grant' else 'revoke' end,trim(p_reason));
 end if;
 return jsonb_build_object('changed',changed>0,'collectionIds',public.ultra_luxe_grants_server_v1(p_account_id));
end $$;
revoke all on function public.set_ultra_luxe_grant_server_v1(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.set_ultra_luxe_grant_server_v1(uuid,text,boolean,text) to service_role;
commit;
-- Before migration: verify service_role permissions (including auth.users read),
-- RLS/execute privileges, no-op audit behavior, pair serialization, revocation,
-- receipt replay sanitization, and existing profile privacy/block enforcement.
