-- Idle claim receipts are a server-owned idempotency ledger, never a client API.
-- This migration only depends on the August transactional-economy foundation.
begin;
alter table public.idle_claim_receipts enable row level security;
revoke all privileges on table public.idle_claim_receipts from public, anon, authenticated;
grant all privileges on table public.idle_claim_receipts to service_role;
revoke execute on function public.claim_idle_progress_atomic(uuid,text,text,integer,text,bigint,bigint) from public, anon, authenticated;
grant execute on function public.claim_idle_progress_atomic(uuid,text,text,integer,text,bigint,bigint) to service_role;
commit;
