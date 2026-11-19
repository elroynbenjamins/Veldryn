-- REVIEW ONLY. DO NOT PLACE THIS FILE IN supabase/migrations OR EXECUTE.
-- This is a schema proposal for the private single-transaction Combat 2.0
-- victory-reward ledger, not a completed wallet/XP/inventory/Inbox settlement.
-- Never activate until audited transaction-local grant adapters exist.
--
-- The required future transaction must:
-- 1. Lock private.combat_v2_solo_snapshots_v1 (encounter_id) and verify
--    ownership + exact server-verified snapshot / replay outcome digest.
-- 2. Lock the source key; if a receipt exists return it unchanged after
--    verifying its stored provenance (including old policy version).
-- 3. Apply all gold/XP/essence/material/equipment+Inbox effects through
--    transaction-local, idempotent adapters with unique grant_source_id.
-- 4. Insert immutable receipt (same transaction) and COMMIT.
-- 5. On ANY error ROLLBACK EVERYTHING. Never commit a receipt without grants.
-- 6. Clients never supply combat results, reward plans, amounts or source keys.
--
-- The following DDL is INTENTIONALLY NON-EXECUTABLE until reviewed.
-- Keep as a reference for future migration generation from Supabase CLI.

/*
create table private.combat_v2_solo_reward_receipts_v1 (
 encounter_id text primary key
   references private.combat_v2_solo_snapshots_v1(encounter_id),
 account_id uuid not null,
 character_id uuid not null references public.characters(id),
 source_key text not null unique,
 snapshot_digest text not null check (snapshot_digest ~ '^[0-9a-f]{64}$'),
 outcome_digest text not null check (outcome_digest ~ '^[0-9a-f]{64}$'),
 grant_digest text not null check (grant_digest ~ '^[0-9a-f]{64}$'),
 receipt_digest text not null check (receipt_digest ~ '^[0-9a-f]{64}$'),
 policy_id text not null,
 receipt jsonb not null check (jsonb_typeof(receipt)='object'),
 settled_at timestamptz not null default now()
);
alter table private.combat_v2_solo_reward_receipts_v1 enable row level security;
revoke all on private.combat_v2_solo_reward_receipts_v1
 from public, anon, authenticated;
-- NO client roles granted table rights. No public RPC or SECURITY DEFINER
-- settlement function in this draft. Add only after complete adapter wiring.
*/
