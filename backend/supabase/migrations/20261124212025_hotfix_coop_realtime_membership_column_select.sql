-- Minimal ACL fix for realtime.apply_rls: preserve existing owner-only RLS.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='coop_run_access_memberships' AND c.relrowsecurity) THEN RAISE EXCEPTION 'Membership RLS must be enabled'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='coop_run_access_memberships' AND policyname='coop_access_read_self' AND cmd='SELECT' AND qual='(account_id = auth.uid())') THEN RAISE EXCEPTION 'Expected owner-only membership policy missing'; END IF;
END $$;
GRANT SELECT (run_id, account_id, active) ON public.coop_run_access_memberships TO authenticated;
