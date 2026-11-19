-- Veldryn Broken Forge V11: ISOLATED CI POSTGRES TEST SCHEMA ONLY.
-- NEVER run on staging/production; NOT a Supabase migration.
-- Runs only on ephemeral postgres:17 service in GitHub Actions.
-- No login, player data, real combat engine, grant, inventory or payout.
-- The private test function takes trusted synthetic damage and a supplied clock,
-- so it is UNSAFE for any publicly accessible API.
BEGIN;
CREATE SCHEMA guild_exp_v11_qa;
REVOKE ALL ON SCHEMA guild_exp_v11_qa FROM PUBLIC;

CREATE TABLE guild_exp_v11_qa.runs(
 cycle_id text NOT NULL,
 guild_id text NOT NULL,
 start_at timestamptz NOT NULL,
 end_at timestamptz NOT NULL,
 difficulty text NOT NULL CHECK(difficulty IN ('Scout','Veteran','Mythic')),
 pressure integer NOT NULL DEFAULT 0 CHECK(pressure BETWEEN 0 AND 100),
 revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 PRIMARY KEY(cycle_id,guild_id),
 CHECK(end_at=start_at+interval '14 days')
);
CREATE TABLE guild_exp_v11_qa.nodes(
 cycle_id text NOT NULL,
 guild_id text NOT NULL,
 node_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('start','combat','guardian','final','explore','dual','supplies','vote','elite')),
 required boolean NOT NULL DEFAULT false,
 dep_all text[] NOT NULL DEFAULT '{}',
 dep_any text[] NOT NULL DEFAULT '{}',
 hp numeric(18,2) NOT NULL DEFAULT 0 CHECK(hp>=0),
 max_hp numeric(18,2) NOT NULL DEFAULT 0 CHECK(max_hp>=0 AND hp<=max_hp),
 phase_index smallint NOT NULL DEFAULT 0 CHECK(phase_index BETWEEN 0 AND 3),
 phase_log jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(phase_log)='array'),
 cleared boolean NOT NULL DEFAULT false,
 PRIMARY KEY(cycle_id,guild_id,node_id),
 FOREIGN KEY(cycle_id,guild_id) REFERENCES guild_exp_v11_qa.runs(cycle_id,guild_id) ON DELETE RESTRICT,
 CHECK(NOT cleared OR hp=0)
);
CREATE TABLE guild_exp_v11_qa.roster(
 cycle_id text NOT NULL,
 guild_id text NOT NULL,
 account_id text NOT NULL,
 seals_spent integer NOT NULL DEFAULT 0 CHECK(seals_spent BETWEEN 0 AND 8),
 orders_spent integer NOT NULL DEFAULT 0 CHECK(orders_spent BETWEEN 0 AND 6),
 PRIMARY KEY(cycle_id,guild_id,account_id),
 FOREIGN KEY(cycle_id,guild_id) REFERENCES guild_exp_v11_qa.runs(cycle_id,guild_id) ON DELETE RESTRICT
);
CREATE TABLE guild_exp_v11_qa.cycle_bindings(
 cycle_id text NOT NULL,
 account_id text NOT NULL,
 guild_id text NOT NULL,
 first_action_at timestamptz NOT NULL,
 PRIMARY KEY(cycle_id,account_id),
 FOREIGN KEY(cycle_id,guild_id,account_id)
 REFERENCES guild_exp_v11_qa.roster(cycle_id,guild_id,account_id) ON DELETE RESTRICT
);
CREATE TABLE guild_exp_v11_qa.receipts(
 cycle_id text NOT NULL,
 account_id text NOT NULL,
 request_id text NOT NULL,
 guild_id text NOT NULL,
 node_id text NOT NULL,
 fingerprint text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('battle','exploration')),
 status text NOT NULL CHECK(status IN ('committed','stale')),
 cost_seals smallint NOT NULL CHECK(cost_seals IN (0,1)),
 cost_orders smallint NOT NULL CHECK(cost_orders IN (0,1)),
 credited_hp numeric(18,2) NOT NULL DEFAULT 0 CHECK(credited_hp>=0),
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(cycle_id,account_id,request_id),
 FOREIGN KEY(cycle_id,guild_id,account_id)
 REFERENCES guild_exp_v11_qa.roster(cycle_id,guild_id,account_id) ON DELETE RESTRICT,
 FOREIGN KEY(cycle_id,guild_id,node_id)
 REFERENCES guild_exp_v11_qa.nodes(cycle_id,guild_id,node_id) ON DELETE RESTRICT,
 CHECK(status<>'stale' OR(cost_seals=0 AND cost_orders=0 AND credited_hp=0)),
 CHECK((kind='battle' AND cost_orders=0) OR(kind='exploration' AND cost_seals=0))
);
CREATE INDEX ON guild_exp_v11_qa.receipts(cycle_id,guild_id,created_at);

ALTER TABLE guild_exp_v11_qa.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_exp_v11_qa.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_exp_v11_qa.roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_exp_v11_qa.cycle_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_exp_v11_qa.receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA guild_exp_v11_qa FROM PUBLIC;

CREATE FUNCTION guild_exp_v11_qa.qa_commit_action(
 p_cycle text,p_guild text,p_account text,p_request text,p_fingerprint text,
 p_node text,p_kind text,p_stance text,p_trusted_damage numeric,
 p_now timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,guild_exp_v11_qa
AS $function$
DECLARE
 v_prior guild_exp_v11_qa.receipts%ROWTYPE;
 v_run guild_exp_v11_qa.runs%ROWTYPE;
 v_roster guild_exp_v11_qa.roster%ROWTYPE;
 v_node guild_exp_v11_qa.nodes%ROWTYPE;
 v_binding text;
 v_seals integer;
 v_orders integer;
 v_before_hp numeric(18,2);
 v_after_hp numeric(18,2);
 v_before_pressure integer;
 v_delta integer;
 v_transitions jsonb:='[]'::jsonb;
 v_next_phase integer;
 v_i integer;
 v_receipt jsonb;
 v_status text;
 v_cost_seals integer:=0;
 v_cost_orders integer:=0;
 v_credited numeric(18,2):=0;
 v_blocked bigint;
BEGIN
 -- Strictly fixture-only: p_account, p_now and damage are trusted by a
 -- PRIVATE TEST CALLER. Never expose this function through the Data API.
 IF p_cycle IS NULL OR p_account IS NULL OR p_guild IS NULL OR
  length(p_cycle) NOT BETWEEN 2 AND 100 OR
  length(p_account) NOT BETWEEN 2 AND 100 OR
  length(p_guild) NOT BETWEEN 2 AND 100 OR
  p_request IS NULL OR length(p_request) NOT BETWEEN 2 AND 100 OR
  p_fingerprint IS NULL OR length(p_fingerprint)<>64 OR
  p_node IS NULL OR p_kind IS NULL OR p_now IS NULL OR
  p_kind NOT IN ('battle','exploration') OR
  p_trusted_damage IS NULL OR p_trusted_damage<0 OR p_trusted_damage>1e8
 THEN
  RAISE EXCEPTION 'gx11_invalid_action' USING ERRCODE='22023';
 END IF;
 IF(p_kind='battle' AND (p_stance IS NULL OR
   p_stance NOT IN('Assault','Guard','Rally'))) OR
   (p_kind='exploration' AND (p_stance IS NOT NULL OR p_trusted_damage<>0))
 THEN
  RAISE EXCEPTION 'gx11_invalid_stance' USING ERRCODE='22023';
 END IF;

 -- Unique lock key for an account in a global cycle. Conservatively a hash:
 -- collisions serialize otherwise distinct accounts rather than weaken safety.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_cycle||':'||p_account,0));
 SELECT * INTO v_prior FROM guild_exp_v11_qa.receipts
 WHERE cycle_id=p_cycle AND account_id=p_account AND request_id=p_request;
 IF FOUND THEN
  IF v_prior.fingerprint<>p_fingerprint
   THEN RAISE EXCEPTION 'gx11_nonce_conflict' USING ERRCODE='23505';
  END IF;
  RETURN v_prior.result;
 END IF;

 SELECT * INTO v_run FROM guild_exp_v11_qa.runs
 WHERE cycle_id=p_cycle AND guild_id=p_guild FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'gx11_run_missing' USING ERRCODE='22023';END IF;
 SELECT * INTO v_roster FROM guild_exp_v11_qa.roster
 WHERE cycle_id=p_cycle AND guild_id=p_guild AND account_id=p_account FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'gx11_not_frozen_member' USING ERRCODE='42501';END IF;

 SELECT guild_id INTO v_binding FROM guild_exp_v11_qa.cycle_bindings
 WHERE cycle_id=p_cycle AND account_id=p_account;
 IF FOUND AND v_binding<>p_guild
 THEN RAISE EXCEPTION 'gx11_bound_other_guild' USING ERRCODE='23505';END IF;

 IF p_now<v_run.start_at OR p_now>=v_run.end_at
 THEN RAISE EXCEPTION 'gx11_not_active' USING ERRCODE='22023';END IF;
 SELECT * INTO v_node FROM guild_exp_v11_qa.nodes
 WHERE cycle_id=p_cycle AND guild_id=p_guild AND node_id=p_node FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'gx11_node_missing' USING ERRCODE='22023';END IF;

 IF(p_kind='battle' AND v_node.kind NOT IN('combat','guardian','final')) OR
   (p_kind='exploration' AND v_node.kind NOT IN('explore','dual'))
 THEN RAISE EXCEPTION 'gx11_wrong_action_kind' USING ERRCODE='22023';END IF;
 v_before_hp:=v_node.hp;
 v_after_hp:=v_node.hp;
 v_before_pressure:=v_run.pressure;

 IF v_node.cleared THEN
  v_status:='stale';
 ELSE
  SELECT count(*) INTO v_blocked FROM unnest(v_node.dep_all) dep
  WHERE NOT EXISTS (
   SELECT 1 FROM guild_exp_v11_qa.nodes n
   WHERE n.cycle_id=p_cycle AND n.guild_id=p_guild
    AND n.node_id=dep AND n.cleared
  );
  IF v_blocked>0 THEN RAISE EXCEPTION 'gx11_locked_prerequisite' USING ERRCODE='22023';END IF;
  IF cardinality(v_node.dep_any)>0 AND NOT EXISTS (
   SELECT 1 FROM guild_exp_v11_qa.nodes n
   WHERE n.cycle_id=p_cycle AND n.guild_id=p_guild
    AND n.node_id=ANY(v_node.dep_any) AND n.cleared
  ) THEN RAISE EXCEPTION 'gx11_locked_any' USING ERRCODE='22023'; END IF;

  v_seals:=CASE WHEN p_now>=v_run.start_at+interval '7 days' THEN 8 ELSE 4 END;
  v_orders:=CASE WHEN p_now>=v_run.start_at+interval '7 days' THEN 6 ELSE 3 END;
  IF p_kind='battle' AND v_roster.seals_spent>=v_seals
  THEN RAISE EXCEPTION 'gx11_seals_exhausted' USING ERRCODE='22023';END IF;
  IF p_kind='exploration' AND v_roster.orders_spent>=v_orders
  THEN RAISE EXCEPTION 'gx11_orders_exhausted' USING ERRCODE='22023';END IF;

  v_status:='committed';
  IF p_kind='battle' THEN
   v_credited:=least(v_node.hp,round(p_trusted_damage,2));
   v_after_hp:=v_node.hp-v_credited;
   v_cost_seals:=1;
   v_delta:=CASE p_stance WHEN 'Assault' THEN 11 WHEN 'Guard' THEN -16 ELSE -12 END;
   IF p_node='C3-06' AND p_stance='Assault' AND EXISTS(
    SELECT 1 FROM guild_exp_v11_qa.nodes
    WHERE cycle_id=p_cycle AND guild_id=p_guild
     AND node_id='C3-02' AND cleared
   ) THEN v_delta:=v_delta-3;END IF;

   IF v_node.kind IN ('guardian','final') THEN
    v_next_phase:=CASE
     WHEN p_node='C1-06' AND v_node.max_hp>0 THEN
      CASE WHEN v_after_hp/v_node.max_hp>0.6 THEN 1
           WHEN v_after_hp/v_node.max_hp>0.2 THEN 2 ELSE 3 END
     WHEN p_node='C2-06' AND v_node.max_hp>0 THEN
      CASE WHEN v_after_hp/v_node.max_hp>0.65 THEN 1
           WHEN v_after_hp/v_node.max_hp>0.3 THEN 2 ELSE 3 END
     WHEN p_node='C3-06' AND v_node.max_hp>0 THEN
      CASE WHEN v_after_hp/v_node.max_hp>0.7 THEN 1
           WHEN v_after_hp/v_node.max_hp>0.3 THEN 2 ELSE 3 END
     ELSE v_node.phase_index END;
    FOR v_i IN (v_node.phase_index+1)..v_next_phase LOOP
     v_transitions:=v_transitions||to_jsonb('phase_'||v_i::text);
    END LOOP;
    v_node.phase_index:=v_next_phase;
    v_node.phase_log:=v_node.phase_log||v_transitions;
   END IF;

   UPDATE guild_exp_v11_qa.nodes SET hp=v_after_hp,phase_index=v_node.phase_index,
    phase_log=v_node.phase_log,cleared=(v_after_hp=0)
   WHERE cycle_id=p_cycle AND guild_id=p_guild AND node_id=p_node;
   UPDATE guild_exp_v11_qa.roster SET seals_spent=seals_spent+1
   WHERE cycle_id=p_cycle AND guild_id=p_guild AND account_id=p_account;
   UPDATE guild_exp_v11_qa.runs
   SET pressure=least(100,greatest(0,pressure+v_delta)),revision=revision+1
   WHERE cycle_id=p_cycle AND guild_id=p_guild;
  ELSE
   v_cost_orders:=1;
   UPDATE guild_exp_v11_qa.nodes SET cleared=true
   WHERE cycle_id=p_cycle AND guild_id=p_guild AND node_id=p_node;
   UPDATE guild_exp_v11_qa.roster SET orders_spent=orders_spent+1
   WHERE cycle_id=p_cycle AND guild_id=p_guild AND account_id=p_account;
   UPDATE guild_exp_v11_qa.runs SET revision=revision+1
   WHERE cycle_id=p_cycle AND guild_id=p_guild;
  END IF;

  INSERT INTO guild_exp_v11_qa.cycle_bindings(cycle_id,account_id,guild_id,first_action_at)
   VALUES(p_cycle,p_account,p_guild,p_now)
   ON CONFLICT(cycle_id,account_id) DO NOTHING;
  SELECT guild_id INTO v_binding FROM guild_exp_v11_qa.cycle_bindings
   WHERE cycle_id=p_cycle AND account_id=p_account;
  IF v_binding<>p_guild
  THEN RAISE EXCEPTION 'gx11_bound_other_guild' USING ERRCODE='23505';END IF;
 END IF;

 SELECT pressure,revision INTO v_run.pressure,v_run.revision
 FROM guild_exp_v11_qa.runs WHERE cycle_id=p_cycle AND guild_id=p_guild;
 v_receipt:=jsonb_build_object(
  'cycle',p_cycle,'guild',p_guild,'account',p_account,'nonce',p_request,
  'node',p_node,'status',v_status,'costSeals',v_cost_seals,
  'costOrders',v_cost_orders,'creditedHp',v_credited,
  'beforeHp',v_before_hp,'afterHp',v_after_hp,
  'beforePressure',v_before_pressure,'afterPressure',v_run.pressure,
  'phases',v_transitions,'revision',v_run.revision,
  'rewardGranted',false,'inventorySpent',false
 );
 INSERT INTO guild_exp_v11_qa.receipts(
  cycle_id,account_id,request_id,guild_id,node_id,fingerprint,kind,status,
  cost_seals,cost_orders,credited_hp,result)
 VALUES(p_cycle,p_account,p_request,p_guild,p_node,p_fingerprint,p_kind,v_status,
  v_cost_seals,v_cost_orders,v_credited,v_receipt);
 RETURN v_receipt;
END
$function$;

REVOKE ALL ON FUNCTION guild_exp_v11_qa.qa_commit_action(
 text,text,text,text,text,text,text,text,numeric,timestamptz) FROM PUBLIC;
COMMIT;
