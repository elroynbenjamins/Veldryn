-- PRIVATE REVIEW ONLY. No active migration, endpoint or grants.
BEGIN;
CREATE TABLE private.world_boss_gathering_moves_v107(
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id text NOT NULL CHECK(request_id ~ '^[A-Za-z0-9:_-]{1,180}$'),
 instance_id uuid NOT NULL,
 character_id uuid NOT NULL,
 request_digest text NOT NULL CHECK(request_digest ~ '^[a-f0-9]{64}$'),
 receipt_digest text NOT NULL CHECK(receipt_digest ~ '^[a-f0-9]{64}$'),
 receipt jsonb NOT NULL CHECK(jsonb_typeof(receipt)='object'),
 source_revision bigint NOT NULL CHECK(source_revision>=1),
 next_revision bigint NOT NULL CHECK(next_revision=source_revision+1),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,request_id),
 FOREIGN KEY(instance_id,account_id) REFERENCES private.world_boss_gathering_mints_v102(id,account_id) ON DELETE CASCADE,
 CHECK((receipt->>'accountId'=account_id::text AND receipt->>'requestId'=request_id AND receipt->>'instanceId'=instance_id::text
 AND (receipt->>'sourceRevision')::bigint=source_revision AND (receipt->>'nextRevision')::bigint=next_revision) IS TRUE)
);
CREATE FUNCTION private.world_boss_gathering_move_immutable_v107() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $v107$
BEGIN
 IF TG_OP='DELETE' AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=OLD.account_id) THEN RETURN OLD; END IF;
 RAISE EXCEPTION 'WB_MOVE_V107_IMMUTABLE';
END
$v107$;
CREATE TRIGGER wb_gathering_move_immutable_v107 BEFORE UPDATE OR DELETE ON private.world_boss_gathering_moves_v107
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_gathering_move_immutable_v107();
ALTER TABLE private.world_boss_gathering_moves_v107 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_gathering_moves_v107 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.world_boss_gathering_move_immutable_v107() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
