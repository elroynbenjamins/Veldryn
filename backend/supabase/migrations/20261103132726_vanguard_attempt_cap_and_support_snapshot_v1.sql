-- Supabase remote migration ledger marker; NO SCHEMA CHANGE.
-- SQL was already applied and verified in Veldryn staging.
-- Actual canonical DDL: backend/supabase/migrations/20261104000612_vanguard_attempt_cap_and_support_snapshot_v1.sql
-- This marker prevents a later CLI migration push from treating the
-- remote-assigned deployment timestamp as an unknown/untracked migration.
select 1;
