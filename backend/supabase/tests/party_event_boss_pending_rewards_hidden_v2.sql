-- No Party Events reward can be claimed or distributed by these private
-- reservation tables before the full Rewards Inbox implementation.
BEGIN;
DO $tests$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_gate_v2
    WHERE id=1 AND enabled=false
  ) THEN RAISE EXCEPTION 'Party Events unexpectedly enabled'; END IF;

  IF NOT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='private'
      AND table_name='party_weekly_event_reward_entitlements_v2'
      AND column_name='boss_reward_band'
  ) THEN RAISE EXCEPTION 'Day 8 reward band column missing'; END IF;

  IF has_table_privilege('authenticated',
      'private.party_weekly_event_reward_entitlements_v2','SELECT')
    OR has_table_privilege('anon',
      'private.party_weekly_event_reward_entitlements_v2','SELECT')
    OR has_table_privilege('authenticated',
      'private.party_weekly_event_reward_entitlements_v2','INSERT')
    OR has_function_privilege('authenticated',
      'private.party_event_boss_reserve_entitlements_v2()','EXECUTE')
    OR has_function_privilege('anon',
      'private.party_event_boss_reserve_entitlements_v2()','EXECUTE')
  THEN RAISE EXCEPTION 'Pending party reward ledger exposed to players'; END IF;

  IF NOT EXISTS(
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private'
      AND c.relname='party_event_boss_results_v2'
      AND t.tgname='party_event_boss_reserve_entitlements_v2'
      AND NOT t.tgisinternal
      AND t.tgenabled IN ('O','A')
  ) THEN RAISE EXCEPTION 'Atomic pending reward trigger missing'; END IF;

  RAISE NOTICE 'Party Event Day 8 rewards remain pending and private';
END $tests$;
ROLLBACK;
