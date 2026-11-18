-- INTERNAL STAGING DRAFT, NOT AN APPLIED MIGRATION.
-- Do not apply to production or expose these RPCs to client-side credentials.
-- Generate/review an actual versioned migration with Supabase CLI once tested.
-- This shadow store never touches live player wallets, Forge jobs or equipment.
begin;

create schema if not exists private;

create table if not exists private.equipment_crafting_v2_shadow_accounts (
 account_id uuid primary key,
 version bigint not null default 0 check (version >= 0),
 snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
 updated_at timestamptz not null default now()
);
create table if not exists private.equipment_crafting_v2_shadow_receipts (
 account_id uuid not null references private.equipment_crafting_v2_shadow_accounts(account_id) on delete cascade,
 request_id text not null check (length(request_id) between 8 and 128),
 fingerprint text not null,
 response jsonb not null check (jsonb_typeof(response)='object'),
 created_at timestamptz not null default now(),
 primary key (account_id,request_id)
);
create index if not exists equipment_crafting_v2_shadow_receipts_created_at
 on private.equipment_crafting_v2_shadow_receipts(account_id,created_at desc);

alter table private.equipment_crafting_v2_shadow_accounts enable row level security;
alter table private.equipment_crafting_v2_shadow_receipts enable row level security;
revoke all on private.equipment_crafting_v2_shadow_accounts from public,anon,authenticated;
revoke all on private.equipment_crafting_v2_shadow_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update on private.equipment_crafting_v2_shadow_accounts to service_role;
grant select,insert on private.equipment_crafting_v2_shadow_receipts to service_role;

-- Service-role only read of isolated QA snapshot. Never call from the mobile app.
create or replace function public.equipment_crafting_v2_shadow_read(p_account_id uuid)
returns jsonb
language plpgsql volatile security invoker set search_path=''
as $$
declare v_snapshot jsonb;
begin
 select a.snapshot into v_snapshot
 from private.equipment_crafting_v2_shadow_accounts as a
 where a.account_id=p_account_id;
 if not found then
  return pg_catalog.jsonb_build_object('status','unseeded');
 end if;
 return pg_catalog.jsonb_build_object('status','loaded','snapshot',v_snapshot);
end;
$$;
revoke all on function public.equipment_crafting_v2_shadow_read(uuid)
 from public,anon,authenticated;
grant execute on function public.equipment_crafting_v2_shadow_read(uuid) to service_role;

-- Single account-serialized commit: replay, CAS version, snapshot and receipt
-- are observed/written in ONE Postgres transaction. A service-side TS resolver
-- validates canonical costs/stock/skills before asking to commit.
create or replace function public.equipment_crafting_v2_shadow_commit(
 p_account_id uuid,
 p_expected_version bigint,
 p_request_id text,
 p_fingerprint text,
 p_next_snapshot jsonb,
 p_response jsonb
)
returns jsonb
language plpgsql volatile security invoker set search_path=''
as $$
declare
 v_version bigint;
 v_fingerprint text;
 v_prior_response jsonb;
begin
 if p_account_id is null or p_request_id is null
    or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
    or p_expected_version < 0
    or p_fingerprint is null or length(p_fingerprint) > 512
    or p_next_snapshot is null or p_response is null
    or pg_catalog.jsonb_typeof(p_next_snapshot) <> 'object'
    or pg_catalog.jsonb_typeof(p_response) <> 'object'
    or pg_catalog.pg_column_size(p_next_snapshot) > 2000000
 then
  raise exception 'invalid_v2_shadow_commit';
 end if;

 -- Row-level locking serializes all commits for this QA account.
 select version into v_version
 from private.equipment_crafting_v2_shadow_accounts
 where account_id=p_account_id
 for update;

 if not found then
  return pg_catalog.jsonb_build_object('status','unseeded');
 end if;

 select r.fingerprint,r.response into v_fingerprint,v_prior_response
 from private.equipment_crafting_v2_shadow_receipts as r
 where r.account_id=p_account_id and r.request_id=p_request_id;

 if found then
  if v_fingerprint <> p_fingerprint then
   return pg_catalog.jsonb_build_object('status','conflict');
  end if;
  return pg_catalog.jsonb_build_object('status','replayed','response',v_prior_response);
 end if;

 if p_expected_version <> v_version then
  return pg_catalog.jsonb_build_object('status','stale','version',v_version);
 end if;

 if p_next_snapshot->>'accountId' is distinct from p_account_id::text
    or p_next_snapshot->>'version' is distinct from (v_version+1)::text
 then
  raise exception 'invalid_v2_shadow_snapshot';
 end if;

 update private.equipment_crafting_v2_shadow_accounts
 set version=v_version+1,snapshot=p_next_snapshot,updated_at=now()
 where account_id=p_account_id;

 insert into private.equipment_crafting_v2_shadow_receipts
   (account_id,request_id,fingerprint,response)
 values(p_account_id,p_request_id,p_fingerprint,p_response);
 return pg_catalog.jsonb_build_object('status','committed','response',p_response,'version',v_version+1);
end;
$$;
revoke all on function public.equipment_crafting_v2_shadow_commit(uuid,bigint,text,text,jsonb,jsonb)
 from public,anon,authenticated;
grant execute on function public.equipment_crafting_v2_shadow_commit(uuid,bigint,text,text,jsonb,jsonb)
 to service_role;

commit;

-- Staging verification checklist, before ANY activation:
-- 1. Seed a synthetic account UUID and a trusted V2DraftSnapshot in shadow_accounts
--    via a server-only QA script, never from a user request.
-- 2. Probe RPC privilege denies for anon/authenticated and EXECUTE for service_role.
-- 3. Race two commit RPC calls for same account/version; exactly one must commit.
-- 4. Retry same request ID; it must replay identical response without a write.
-- 5. Retry same ID/different fingerprint; it must return conflict.
-- 6. Verify no writes to public.characters, character_wallets or active Forge.
-- 7. Do not turn on either v2 client/backend flag for a shadow-only store.
