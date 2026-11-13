-- Veldryn character identity-change credits, intentionally hidden until payment and UI rollout.
-- Redeemed coupons issue RENAME credits only. Google Play and admin credits are
-- issued only by a verified, service_role-only backend action.
BEGIN;

CREATE TABLE IF NOT EXISTS private.character_change_coupons_v1(
 code_hash text PRIMARY KEY CHECK(code_hash ~ '^[0-9a-f]{64}$'),
 change_kind text NOT NULL DEFAULT 'rename' CHECK(change_kind='rename'),
 enabled boolean NOT NULL DEFAULT true,
 starts_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz,
 max_total_claims integer CHECK(max_total_claims IS NULL OR max_total_claims>0),
 max_claims_per_account integer NOT NULL DEFAULT 1 CHECK(max_claims_per_account=1),
 claimed_count integer NOT NULL DEFAULT 0 CHECK(claimed_count>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at IS NULL OR expires_at>starts_at)
);

CREATE TABLE IF NOT EXISTS private.character_change_coupon_claims_v1(
 code_hash text NOT NULL REFERENCES private.character_change_coupons_v1(code_hash) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(code_hash,account_id)
);

CREATE TABLE IF NOT EXISTS private.character_change_credits_v1(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 change_kind text NOT NULL CHECK(change_kind IN ('rename','class')),
 source_kind text NOT NULL CHECK(source_kind IN ('coupon','google_play','admin')),
 source_ref text NOT NULL CHECK(length(source_ref) BETWEEN 8 AND 200),
 issued_at timestamptz NOT NULL DEFAULT now(),
 consumed_at timestamptz,
 consumed_character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
 request_id text,
 CHECK((consumed_at IS NULL AND consumed_character_id IS NULL AND request_id IS NULL)
   OR (consumed_at IS NOT NULL AND consumed_character_id IS NOT NULL AND request_id IS NOT NULL)),
 UNIQUE(source_kind,source_ref)
);
CREATE INDEX IF NOT EXISTS character_change_unspent_v1
 ON private.character_change_credits_v1(account_id,change_kind,issued_at)
 WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS private.character_change_receipts_v1(
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id text NOT NULL CHECK(request_id ~ '^[a-zA-Z0-9_-]{8,128}$'),
 request_hash text NOT NULL CHECK(request_hash ~ '^[0-9a-f]{64}$'),
 credit_id uuid NOT NULL REFERENCES private.character_change_credits_v1(id),
 character_id uuid NOT NULL REFERENCES public.characters(id),
 response jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,request_id)
);

ALTER TABLE private.character_change_coupons_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.character_change_coupon_claims_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.character_change_credits_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.character_change_receipts_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.character_change_coupons_v1,
 private.character_change_coupon_claims_v1,
 private.character_change_credits_v1,
 private.character_change_receipts_v1 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON private.character_change_coupons_v1,
 private.character_change_coupon_claims_v1,
 private.character_change_credits_v1,
 private.character_change_receipts_v1 TO service_role;

-- This function is for a trusted Google Play verifier or staff service only.
-- Purchase tokens must be hashed before being used as source_ref.
CREATE OR REPLACE FUNCTION public.issue_character_change_credit_server_v1(
 p_account_id uuid, p_change_kind text, p_source_kind text, p_source_ref text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $fn$
DECLARE v_credit private.character_change_credits_v1%rowtype;
BEGIN
 IF current_user <> 'service_role' THEN RAISE EXCEPTION 'server_role_required'; END IF;
 IF p_account_id IS NULL OR p_change_kind NOT IN ('rename','class')
   OR p_source_kind NOT IN ('google_play','admin')
   OR length(coalesce(p_source_ref,'')) NOT BETWEEN 8 AND 200
 THEN RAISE EXCEPTION 'invalid_change_credit'; END IF;
 IF p_source_kind='google_play' AND p_source_ref !~ '^[0-9a-f]{64}$'
 THEN RAISE EXCEPTION 'invalid_purchase_reference'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_account_id)
 THEN RAISE EXCEPTION 'account_not_found'; END IF;
 INSERT INTO private.character_change_credits_v1(account_id,change_kind,source_kind,source_ref)
 VALUES(p_account_id,p_change_kind,p_source_kind,p_source_ref)
 ON CONFLICT(source_kind,source_ref) DO NOTHING
 RETURNING * INTO v_credit;
 IF NOT FOUND THEN
   SELECT * INTO STRICT v_credit FROM private.character_change_credits_v1
   WHERE source_kind=p_source_kind AND source_ref=p_source_ref;
   IF v_credit.account_id<>p_account_id OR v_credit.change_kind<>p_change_kind
   THEN RAISE EXCEPTION 'credit_source_account_conflict'; END IF;
 END IF;
 RETURN v_credit.id;
END $fn$;

-- Existing redeem-commerce-code behavior is deliberately untouched.
-- Character name coupons are claimed through a separate, authenticated RPC.
CREATE OR REPLACE FUNCTION public.redeem_character_change_coupon_v1(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_uid uuid:=auth.uid();
 v_code_text text:=upper(btrim(coalesce(p_code,'')));
 v_hash text;
 v_code private.character_change_coupons_v1%rowtype;
 v_credit_id uuid;
 v_anonymous boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT u.is_anonymous INTO v_anonymous FROM auth.users u
 WHERE u.id=v_uid FOR UPDATE;
 IF NOT FOUND OR coalesce(v_anonymous,true) THEN RAISE EXCEPTION 'LINK_ACCOUNT_REQUIRED'; END IF;
 IF v_code_text !~ '^VEL-REN-[A-Z0-9]{12,32}$'
 THEN RAISE EXCEPTION 'INVALID_REDEEM_CODE'; END IF;
 v_hash:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_code_text,'UTF8')),'hex');
 SELECT * INTO v_code FROM private.character_change_coupons_v1
 WHERE code_hash=v_hash FOR UPDATE;
 IF NOT FOUND OR NOT v_code.enabled THEN RAISE EXCEPTION 'INVALID_REDEEM_CODE'; END IF;
 IF now()<v_code.starts_at OR (v_code.expires_at IS NOT NULL AND now()>=v_code.expires_at)
 THEN RAISE EXCEPTION 'REDEEM_CODE_EXPIRED'; END IF;
 IF v_code.max_total_claims IS NOT NULL AND v_code.claimed_count>=v_code.max_total_claims
 THEN RAISE EXCEPTION 'REDEEM_LIMIT_REACHED'; END IF;
 IF EXISTS(SELECT 1 FROM private.character_change_coupon_claims_v1
           WHERE code_hash=v_hash AND account_id=v_uid)
 THEN RAISE EXCEPTION 'REDEEM_LIMIT_REACHED'; END IF;
 INSERT INTO private.character_change_coupon_claims_v1(code_hash,account_id)
 VALUES(v_hash,v_uid);
 INSERT INTO private.character_change_credits_v1(account_id,change_kind,source_kind,source_ref)
 VALUES(v_uid,'rename','coupon',v_hash||':'||v_uid::text)
 RETURNING id INTO v_credit_id;
 UPDATE private.character_change_coupons_v1 SET claimed_count=claimed_count+1
 WHERE code_hash=v_hash;
 RETURN jsonb_build_object('grant','rename_credit','creditId',v_credit_id);
END $fn$;

-- No raw coupon values, purchase tokens or other accounts' credit rows leak.
CREATE OR REPLACE FUNCTION public.character_change_credit_balance_self_v1()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $fn$
 SELECT jsonb_build_object(
  'rename',count(*) FILTER(WHERE change_kind='rename'),
  'class',count(*) FILTER(WHERE change_kind='class'))
 FROM private.character_change_credits_v1
 WHERE account_id=auth.uid() AND consumed_at IS NULL;
$fn$;

REVOKE ALL ON FUNCTION public.issue_character_change_credit_server_v1(uuid,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_character_change_credit_server_v1(uuid,text,text,text)
 TO service_role;
REVOKE ALL ON FUNCTION public.redeem_character_change_coupon_v1(text),
 public.character_change_credit_balance_self_v1()
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.redeem_character_change_coupon_v1(text),
 public.character_change_credit_balance_self_v1()
 TO authenticated;

COMMENT ON TABLE private.character_change_credits_v1 IS
 'Verified one-use credits for a future atomic character identity change; no player-side grant API.';
COMMENT ON FUNCTION public.issue_character_change_credit_server_v1(uuid,text,text,text) IS
 'Server-only idempotent issue after verified Google Play receipt or staff authorization; never accept a client-supplied payment claim.';
COMMIT;