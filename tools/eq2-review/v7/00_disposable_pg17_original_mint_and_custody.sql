-- Veldryn EQ2 V7: DISPOSABLE POSTGRESQL 17 TRANSACTION HARNESS ONLY.
-- NOT A SUPABASE MIGRATION, NOT A GAMEPLAY LOOT FUNCTION OR MARKET API.
-- NEVER EXECUTE AGAINST STAGING OR PRODUCTION.
-- Existing live source rows are represented by synthetic trusted-join fixtures.
-- Caller-provided outcomes/UUIDs are valid ONLY inside this disposable harness.
DO $review_guard$
BEGIN
  IF current_database() <> 'eq2_review_v7' THEN
    RAISE EXCEPTION 'eq2_v7_disposable_database_only';
  END IF;
END $review_guard$;

BEGIN;
CREATE SCHEMA eq2review_v7;
REVOKE ALL ON SCHEMA eq2review_v7 FROM PUBLIC;

CREATE TABLE eq2review_v7.authored_pool (
  dungeon_id text NOT NULL,
  boss_id text NOT NULL,
  template_id text NOT NULL,
  PRIMARY KEY(dungeon_id,boss_id,template_id)
);

-- This fixture stands in for a *privileged, locked join* of expedition_runs,
-- coop_reward_entitlements and coop_node_results; client rows NEVER do this.
CREATE TABLE eq2review_v7.synthetic_trusted_source (
  entitlement_id uuid PRIMARY KEY,
  run_id uuid NOT NULL,
  account_id uuid NOT NULL,
  character_id uuid NOT NULL,
  dungeon_id text NOT NULL,
  boss_id text NOT NULL,
  reward_kind text NOT NULL DEFAULT 'participant',
  reward_stage text NOT NULL DEFAULT 'final',
  completed_boss boolean NOT NULL,
  enhanced_reward boolean NOT NULL,
  signed_origin_verified boolean NOT NULL,
  claimed_at timestamptz NOT NULL,
  boss_result_at timestamptz NOT NULL,
  CONSTRAINT boss_before_claim CHECK (boss_result_at <= claimed_at)
);

CREATE TABLE eq2review_v7.frozen_decision (
  entitlement_id uuid PRIMARY KEY REFERENCES eq2review_v7.synthetic_trusted_source(entitlement_id),
  original_run_id uuid NOT NULL,
  original_account_id uuid NOT NULL,
  original_character_id uuid NOT NULL,
  original_dungeon_id text NOT NULL,
  original_boss_id text NOT NULL,
  policy_version text NOT NULL,
  awarded boolean NOT NULL,
  template_id text,
  minted_instance_id uuid UNIQUE,
  decided_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT all_or_nothing_award CHECK (
    (awarded AND template_id IS NOT NULL AND minted_instance_id IS NOT NULL)
    OR (NOT awarded AND template_id IS NULL AND minted_instance_id IS NULL)
  )
);

-- Original mint lineage is NEVER updated during a first sale or later resale.
CREATE TABLE eq2review_v7.original_mint (
  instance_id uuid PRIMARY KEY,
  entitlement_id uuid NOT NULL UNIQUE
    REFERENCES eq2review_v7.frozen_decision(entitlement_id),
  generation text NOT NULL DEFAULT 'equipment_2_0'
    CHECK (generation = 'equipment_2_0'),
  original_mint_source text NOT NULL DEFAULT 'dungeon_boss_terminal_victory'
    CHECK (original_mint_source = 'dungeon_boss_terminal_victory'),
  original_run_id uuid NOT NULL,
  original_dungeon_id text NOT NULL,
  original_boss_id text NOT NULL,
  original_owner_id uuid NOT NULL,
  template_id text NOT NULL,
  immutable_roll_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT source_snapshot_not_empty CHECK (
    jsonb_typeof(immutable_roll_snapshot) = 'object'
    AND immutable_roll_snapshot ? 'rarity'
    AND immutable_roll_snapshot ? 'quality'
  )
);

CREATE TABLE eq2review_v7.current_custody (
  instance_id uuid PRIMARY KEY REFERENCES eq2review_v7.original_mint(instance_id),
  owner_id uuid NOT NULL,
  custody_state text NOT NULL CHECK (custody_state IN ('inventory','escrow')),
  custody_revision bigint NOT NULL DEFAULT 1 CHECK (custody_revision > 0)
);

CREATE TABLE eq2review_v7.simulated_offer (
  offer_id uuid PRIMARY KEY,
  instance_id uuid NOT NULL REFERENCES eq2review_v7.original_mint(instance_id),
  seller_id uuid NOT NULL,
  price_gold integer NOT NULL CHECK (price_gold > 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','cancelled','simulated_transferred')),
  seller_custody_revision bigint NOT NULL CHECK (seller_custody_revision > 0),
  buyer_id uuid,
  transfer_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT transferred_pair CHECK (
    (status='simulated_transferred' AND buyer_id IS NOT NULL AND transfer_request_id IS NOT NULL)
    OR (status<>'simulated_transferred' AND buyer_id IS NULL AND transfer_request_id IS NULL)
  )
);
CREATE UNIQUE INDEX eq2_review_one_active_offer_per_instance
  ON eq2review_v7.simulated_offer(instance_id) WHERE status='active';
CREATE UNIQUE INDEX eq2_review_transfer_request_unique
  ON eq2review_v7.simulated_offer(transfer_request_id)
  WHERE transfer_request_id IS NOT NULL;

CREATE TABLE eq2review_v7.synthetic_transfer_history (
  offer_id uuid PRIMARY KEY REFERENCES eq2review_v7.simulated_offer(offer_id),
  instance_id uuid NOT NULL REFERENCES eq2review_v7.original_mint(instance_id),
  previous_owner_id uuid NOT NULL,
  new_owner_id uuid NOT NULL,
  request_id uuid NOT NULL UNIQUE,
  from_revision bigint NOT NULL CHECK (from_revision > 0),
  to_revision bigint NOT NULL CHECK (to_revision = from_revision + 1),
  simulated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT no_self_buy CHECK (previous_owner_id<>new_owner_id)
);

-- The original mint and original decision cannot be rewritten, relabeled, or
-- deleted after settlement; ownership changes ONLY through custody.
CREATE FUNCTION eq2review_v7.deny_original_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'eq2_original_provenance_immutable';
END $$;
CREATE TRIGGER eq2review_v7_immutable_decision
 BEFORE UPDATE OR DELETE ON eq2review_v7.frozen_decision
 FOR EACH ROW EXECUTE FUNCTION eq2review_v7.deny_original_mutation();
CREATE TRIGGER eq2review_v7_immutable_mint
 BEFORE UPDATE OR DELETE ON eq2review_v7.original_mint
 FOR EACH ROW EXECUTE FUNCTION eq2review_v7.deny_original_mutation();

-- ONLY synthetic server-owned reward decision fixtures can call this function.
-- p_award, p_template and p_instance are TEST INPUTS, never production API.
CREATE FUNCTION eq2review_v7.simulate_record_reward(
 p_entitlement uuid, p_award boolean, p_template text, p_instance uuid,
 p_policy_version text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 s eq2review_v7.synthetic_trusted_source%ROWTYPE;
 d eq2review_v7.frozen_decision%ROWTYPE;
BEGIN
 IF p_entitlement IS NULL OR p_award IS NULL OR p_policy_version IS NULL
    OR length(p_policy_version)<3 THEN
   RAISE EXCEPTION 'eq2_review_invalid_decision_parameters';
 END IF;

 -- Acquire a row lock BEFORE checking for any existing original decision.
 SELECT * INTO STRICT s
 FROM eq2review_v7.synthetic_trusted_source
 WHERE entitlement_id=p_entitlement FOR UPDATE;
 SELECT * INTO d FROM eq2review_v7.frozen_decision
 WHERE entitlement_id=p_entitlement;
 IF FOUND THEN
   RETURN pg_catalog.jsonb_build_object(
    'replay',true,'awarded',d.awarded,'instance_id',d.minted_instance_id,
    'template_id',d.template_id,'policy',d.policy_version,
    'authority',false);
 END IF;

 IF s.reward_kind<>'participant' OR s.reward_stage<>'final'
    OR NOT s.completed_boss OR NOT s.enhanced_reward
    OR NOT s.signed_origin_verified THEN
   RAISE EXCEPTION 'eq2_review_unverified_boss_enhanced_source';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM eq2review_v7.authored_pool p
   WHERE p.dungeon_id=s.dungeon_id AND p.boss_id=s.boss_id
 ) THEN
   RAISE EXCEPTION 'eq2_review_unknown_or_unpublished_boss';
 END IF;

 IF p_award THEN
   IF p_template IS NULL OR p_instance IS NULL
      OR NOT EXISTS (
       SELECT 1 FROM eq2review_v7.authored_pool p
       WHERE p.dungeon_id=s.dungeon_id
         AND p.boss_id=s.boss_id AND p.template_id=p_template
      ) THEN
     RAISE EXCEPTION 'eq2_review_cross_boss_or_missing_mint';
   END IF;
 ELSE
   IF p_template IS NOT NULL OR p_instance IS NOT NULL THEN
     RAISE EXCEPTION 'eq2_review_miss_cannot_create_item';
   END IF;
 END IF;

 INSERT INTO eq2review_v7.frozen_decision (
  entitlement_id,original_run_id,original_account_id,original_character_id,
  original_dungeon_id,original_boss_id,policy_version,awarded,
  template_id,minted_instance_id
 ) VALUES (
  s.entitlement_id,s.run_id,s.account_id,s.character_id,
  s.dungeon_id,s.boss_id,p_policy_version,p_award,
  p_template,p_instance
 );
 IF p_award THEN
   INSERT INTO eq2review_v7.original_mint (
     instance_id,entitlement_id,original_run_id,original_dungeon_id,
     original_boss_id,original_owner_id,template_id,immutable_roll_snapshot
   ) VALUES (
     p_instance,s.entitlement_id,s.run_id,s.dungeon_id,
     s.boss_id,s.account_id,p_template,
     '{"rarity":"synthetic_rare","quality":50,"affixes":[]}'::jsonb
   );
   INSERT INTO eq2review_v7.current_custody(instance_id,owner_id,custody_state)
   VALUES(p_instance,s.account_id,'inventory');
 END IF;
 RETURN pg_catalog.jsonb_build_object(
   'replay',false,'awarded',p_award,'instance_id',p_instance,
   'template_id',p_template,'policy',p_policy_version,'authority',false);
END $$;

-- Listing checks REAL COPY lineage and custody; it DOES NOT offer any Gold
-- settlement. All Market functions remain review-only and ungranted.
CREATE FUNCTION eq2review_v7.simulate_list(
 p_instance uuid,p_seller uuid,p_offer uuid,p_price integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 c eq2review_v7.current_custody%ROWTYPE;
 m eq2review_v7.original_mint%ROWTYPE;
BEGIN
 IF p_instance IS NULL OR p_seller IS NULL OR p_offer IS NULL
    OR p_price IS NULL OR p_price<=0 THEN
   RAISE EXCEPTION 'eq2_review_bad_offer';
 END IF;
 SELECT * INTO STRICT c FROM eq2review_v7.current_custody
 WHERE instance_id=p_instance FOR UPDATE;
 SELECT * INTO STRICT m FROM eq2review_v7.original_mint
 WHERE instance_id=p_instance;
 IF c.owner_id<>p_seller OR c.custody_state<>'inventory'
    OR m.generation<>'equipment_2_0'
    OR m.original_mint_source<>'dungeon_boss_terminal_victory'
    OR NOT EXISTS (
      SELECT 1 FROM eq2review_v7.frozen_decision d
      JOIN eq2review_v7.synthetic_trusted_source s
        ON s.entitlement_id=d.entitlement_id
      JOIN eq2review_v7.authored_pool p ON
        p.dungeon_id=m.original_dungeon_id AND p.boss_id=m.original_boss_id
        AND p.template_id=m.template_id
      WHERE d.entitlement_id=m.entitlement_id
        AND d.minted_instance_id=m.instance_id
        AND d.template_id=m.template_id
        AND d.awarded
        AND d.original_account_id=m.original_owner_id
        AND s.signed_origin_verified
    ) THEN
   RAISE EXCEPTION 'eq2_review_unowned_or_unverified_listing';
 END IF;
 INSERT INTO eq2review_v7.simulated_offer(
   offer_id,instance_id,seller_id,price_gold,seller_custody_revision
 ) VALUES(p_offer,p_instance,p_seller,p_price,c.custody_revision);
 UPDATE eq2review_v7.current_custody SET
   custody_state='escrow',custody_revision=custody_revision+1
 WHERE instance_id=p_instance;
 RETURN pg_catalog.jsonb_build_object('preview_offer',p_offer,'authority',false);
END $$;

CREATE FUNCTION eq2review_v7.simulate_cancel(
 p_offer uuid,p_seller uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 o eq2review_v7.simulated_offer%ROWTYPE;
 c eq2review_v7.current_custody%ROWTYPE;
BEGIN
 SELECT * INTO STRICT o FROM eq2review_v7.simulated_offer
 WHERE offer_id=p_offer FOR UPDATE;
 IF o.seller_id<>p_seller THEN
   RAISE EXCEPTION 'eq2_review_not_offer_seller';
 END IF;
 IF o.status='cancelled' THEN
   RETURN pg_catalog.jsonb_build_object('replay',true,'cancelled',true,'authority',false);
 END IF;
 IF o.status<>'active' THEN
   RAISE EXCEPTION 'eq2_review_cannot_cancel_transferred_copy';
 END IF;
 SELECT * INTO STRICT c FROM eq2review_v7.current_custody
 WHERE instance_id=o.instance_id FOR UPDATE;
 IF c.owner_id<>o.seller_id OR c.custody_state<>'escrow'
    OR c.custody_revision<>o.seller_custody_revision+1 THEN
   RAISE EXCEPTION 'eq2_review_cancel_stale_custody';
 END IF;
 UPDATE eq2review_v7.simulated_offer SET status='cancelled'
 WHERE offer_id=o.offer_id;
 UPDATE eq2review_v7.current_custody
 SET custody_state='inventory',custody_revision=custody_revision+1
 WHERE instance_id=o.instance_id;
 RETURN pg_catalog.jsonb_build_object('replay',false,'cancelled',true,'authority',false);
END $$;

-- This simulates OWNERSHIP MOVEMENT only; NO GOLD, TAX OR PURCHASE happens.
-- Actual Market must atomically debit Gold, handle fees and final delivery
-- under the separately reviewed positive EQ2 Market 2.0 custody adapter.
CREATE FUNCTION eq2review_v7.simulate_transfer_without_gold(
 p_offer uuid,p_buyer uuid,p_request uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 o eq2review_v7.simulated_offer%ROWTYPE;
 c eq2review_v7.current_custody%ROWTYPE;
 m eq2review_v7.original_mint%ROWTYPE;
BEGIN
 IF p_offer IS NULL OR p_buyer IS NULL OR p_request IS NULL THEN
   RAISE EXCEPTION 'eq2_review_bad_transfer';
 END IF;
 SELECT * INTO STRICT o FROM eq2review_v7.simulated_offer
 WHERE offer_id=p_offer FOR UPDATE;
 IF o.status='simulated_transferred' THEN
   IF o.buyer_id<>p_buyer OR o.transfer_request_id<>p_request THEN
     RAISE EXCEPTION 'eq2_review_offer_already_transferred';
   END IF;
   RETURN pg_catalog.jsonb_build_object('replay',true,'transfer_only',true,'authority',false);
 END IF;
 IF o.status<>'active' OR o.seller_id=p_buyer THEN
   RAISE EXCEPTION 'eq2_review_not_active_or_self_buy';
 END IF;
 SELECT * INTO STRICT c FROM eq2review_v7.current_custody
 WHERE instance_id=o.instance_id FOR UPDATE;
 SELECT * INTO STRICT m FROM eq2review_v7.original_mint
 WHERE instance_id=o.instance_id;
 IF c.custody_state<>'escrow' OR c.owner_id<>o.seller_id
    OR c.custody_revision<>o.seller_custody_revision+1
    OR m.generation<>'equipment_2_0'
    OR m.original_mint_source<>'dungeon_boss_terminal_victory'
    OR NOT EXISTS (
       SELECT 1 FROM eq2review_v7.frozen_decision d
       WHERE d.entitlement_id=m.entitlement_id
         AND d.minted_instance_id=m.instance_id
         AND d.original_dungeon_id=m.original_dungeon_id
         AND d.original_boss_id=m.original_boss_id
         AND d.original_account_id=m.original_owner_id
         AND d.awarded
    ) THEN
    RAISE EXCEPTION 'eq2_review_stale_or_forged_custody';
 END IF;
 INSERT INTO eq2review_v7.synthetic_transfer_history(
   offer_id,instance_id,previous_owner_id,new_owner_id,request_id,
   from_revision,to_revision
 ) VALUES (
   o.offer_id,o.instance_id,o.seller_id,p_buyer,p_request,
   c.custody_revision,c.custody_revision+1
 );
 UPDATE eq2review_v7.current_custody
 SET owner_id=p_buyer,custody_state='inventory',custody_revision=custody_revision+1
 WHERE instance_id=o.instance_id;
 UPDATE eq2review_v7.simulated_offer
 SET status='simulated_transferred',buyer_id=p_buyer,transfer_request_id=p_request
 WHERE offer_id=o.offer_id;
 RETURN pg_catalog.jsonb_build_object('replay',false,'transfer_only',true,'authority',false);
END $$;

-- Prevent accidental API exposure; test harness calls as the privileged local
-- fixture owner only. Supabase roles are not present in disposable PostgreSQL.
REVOKE ALL ON ALL TABLES IN SCHEMA eq2review_v7 FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA eq2review_v7 FROM PUBLIC;
COMMENT ON SCHEMA eq2review_v7 IS
 'DISPOSABLE REVIEW-ONLY. Not a migration; no production item mint, Market price transfer, endpoint, entitlement or reward authorization.';
COMMIT;
