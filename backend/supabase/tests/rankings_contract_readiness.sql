-- Read-only release-preflight for Rankings. Run against staging after the intended
-- v2 RPC migration is installed; it deliberately fails while the contract is missing.
-- Do not apply this as a migration or enable Rankings to satisfy this test.
BEGIN;
DO $check$
DECLARE v_rpc text := 'public.rankings_board_server_v2(uuid,text,integer,integer)';
BEGIN
  IF to_regprocedure(v_rpc) IS NULL THEN
    RAISE EXCEPTION 'RANKINGS_NOT_READY: rankings_board_server_v2 RPC is not installed';
  END IF;
  IF has_function_privilege('anon',v_rpc,'EXECUTE')
    OR has_function_privilege('authenticated',v_rpc,'EXECUTE')
  THEN
    RAISE EXCEPTION 'RANKINGS_NOT_READY: rankings v2 RPC is client-callable';
  END IF;
  IF NOT has_function_privilege('service_role',v_rpc,'EXECUTE') THEN
    RAISE EXCEPTION 'RANKINGS_NOT_READY: service_role cannot call rankings v2 RPC';
  END IF;
  RAISE NOTICE 'Rankings v2 RPC signature and permissions verified; seed-data/visibility checks still required';
END $check$;
ROLLBACK;
