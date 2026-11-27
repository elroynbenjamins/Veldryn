-- Shared disposable registration fixture. Caller controls transaction.
DO $$ BEGIN
 IF current_database()<>'eq2_market_review' OR current_user<>'eq2_market_review'
 OR current_setting('server_version_num')::int / 10000 <> 17
 OR current_setting('market_review.disposable',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'disposable_only'; END IF;
END $$;
CREATE TABLE market_review.original_forge_claim(
 receipt text PRIMARY KEY, job text UNIQUE NOT NULL, instance text UNIQUE NOT NULL,
 owner text NOT NULL, character_id text NOT NULL,
 generation text NOT NULL CHECK(generation='equipment-2.0'),
 digest text NOT NULL CHECK(digest ~ '^[0-9a-f]{64}$'),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 FOREIGN KEY(character_id,owner) REFERENCES market_review.character(id,owner)
);
CREATE TRIGGER original_forge_claim_immutable BEFORE UPDATE OR DELETE
 ON market_review.original_forge_claim FOR EACH ROW EXECUTE FUNCTION market_review.immutable();
CREATE FUNCTION market_review.register_original_forge(
 p_receipt text,p_instance text,p_owner text,p_character text,p_digest text,p_abort boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s market_review.original_forge_claim%ROWTYPE;
 m market_review.mint%ROWTYPE; cap int; used int;
BEGIN
 -- No caller-supplied snapshot or generation. Read the independent claim.
 SELECT * INTO s FROM market_review.original_forge_claim WHERE receipt=p_receipt FOR UPDATE;
 IF NOT FOUND OR s.instance IS DISTINCT FROM p_instance OR s.owner IS DISTINCT FROM p_owner
  OR s.character_id IS DISTINCT FROM p_character OR s.digest IS DISTINCT FROM p_digest
 THEN RAISE EXCEPTION 'original_claim_mismatch'; END IF;
 SELECT inventory_cap INTO STRICT cap FROM market_review.wallet WHERE id=s.owner FOR UPDATE;
 -- A replay is about original mint identity, not current mutable custody.
 SELECT * INTO m FROM market_review.mint WHERE id=s.instance;
 IF FOUND THEN
  IF m.receipt IS DISTINCT FROM s.receipt OR m.original_owner IS DISTINCT FROM s.owner
    OR m.generation IS DISTINCT FROM s.generation OR m.snapshot IS DISTINCT FROM s.snapshot
    OR NOT EXISTS(SELECT 1 FROM market_review.custody WHERE id=s.instance)
    OR NOT EXISTS(SELECT 1 FROM market_review.policy WHERE id=s.instance)
  THEN RAISE EXCEPTION 'original_registration_conflict'; END IF;
 ELSE
  SELECT count(*) INTO used FROM market_review.custody WHERE owner=s.owner AND state='inventory';
  IF used>=cap THEN RAISE EXCEPTION 'original_inventory_full'; END IF;
  INSERT INTO market_review.mint VALUES(s.instance,s.owner,s.receipt,s.generation,s.snapshot);
  -- Registration is never approval. Even successful new copies remain untradeable.
  INSERT INTO market_review.policy VALUES(s.instance,false);
  IF p_abort THEN RAISE EXCEPTION 'injected_after_mint_registration'; END IF;
  INSERT INTO market_review.custody(id,owner,state,holder) VALUES(s.instance,s.owner,'inventory',s.character_id);
 END IF;
 RETURN jsonb_build_object('instance',s.instance,'receipt',s.receipt,'marketAuthorized',false);
END $$;
REVOKE ALL ON market_review.original_forge_claim FROM PUBLIC;
REVOKE ALL ON FUNCTION market_review.register_original_forge(text,text,text,text,text,boolean) FROM PUBLIC;
