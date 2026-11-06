-- Previous global active-weekly index is incompatible with two slots.
-- uq_guild_project_active_slot already enforces one active project per (guild,slot).
-- The new choice-week index additionally prevents a rerun after completion.
BEGIN;
DO $verify$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public'
    AND tablename='guild_project_instances'
    AND indexname='uq_guild_project_active_slot')
 THEN RAISE EXCEPTION 'GUILD_PROJECT_PER_SLOT_GUARD_MISSING'; END IF;
END $verify$;
DROP INDEX IF EXISTS public.uq_guild_project_one_weekly_active;
COMMIT;
