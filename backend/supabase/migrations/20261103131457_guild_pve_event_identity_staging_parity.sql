-- Supabase remote migration ledger marker; NO SCHEMA CHANGE.
-- SQL was already applied and verified in Veldryn staging.
-- Actual canonical DDL: backend/supabase/migrations/20261017130951_guild_pve_event_identity.sql
-- This marker prevents a later CLI migration push from treating the
-- remote-assigned deployment timestamp as an unknown/untracked migration.
select 1;
