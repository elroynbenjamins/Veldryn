-- Party Events v2: DORMANT seven-day cooperative adventures and permanent supply sink.
-- Deliberately separate from the legacy v17 24–72-hour ranked LiveOps party events.
-- No player-facing grants, scheduled events, reward issuance or public navigation.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
-- Do not change existing private-schema grants: other hidden systems use it.
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.party_weekly_event_gate_v2 (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.party_weekly_event_gate_v2 (id, enabled)
VALUES (1, false) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS private.party_weekly_event_instances_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES public.parties(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  family text NOT NULL CHECK (family IN (
    'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary'
  )),
  variation text NOT NULL CHECK (length(variation) BETWEEN 3 AND 64),
  difficulty text NOT NULL CHECK (difficulty IN ('standard','veteran','heroic')),
  seed bigint NOT NULL CHECK (seed >= 0),
  member_count smallint NOT NULL CHECK (member_count BETWEEN 2 AND 4),
  stage smallint NOT NULL DEFAULT 1 CHECK (stage BETWEEN 1 AND 3),
  event_points integer NOT NULL DEFAULT 0 CHECK (event_points >= 0),
  target_points integer NOT NULL CHECK (target_points IN (100,135,170)),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','expired','cancelled')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_party_event_full_utc_week CHECK (
    ends_at = starts_at + interval '7 days'
    AND starts_at = (date_trunc('week', starts_at AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
  ),
  CONSTRAINT weekly_party_event_member_target CHECK (
    (member_count=2 AND target_points=100) OR
    (member_count=3 AND target_points=135) OR
    (member_count=4 AND target_points=170)
  ),
  UNIQUE (party_id, starts_at)
);
CREATE INDEX IF NOT EXISTS party_weekly_events_by_week_v2
  ON private.party_weekly_event_instances_v2(starts_at, status);

CREATE TABLE IF NOT EXISTS private.party_weekly_event_members_v2 (
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start timestamptz NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  activity_points smallint NOT NULL DEFAULT 0 CHECK (activity_points BETWEEN 0 AND 40),
  special_points smallint NOT NULL DEFAULT 0 CHECK (special_points BETWEEN 0 AND 20),
  verified_seconds_remainder numeric(12,3) NOT NULL DEFAULT 0
    CHECK (verified_seconds_remainder >= 0 AND verified_seconds_remainder < 900),
  PRIMARY KEY (event_id, account_id),
  -- One reward-eligible party binding per account and week, across characters.
  UNIQUE (account_id, week_start)
);
CREATE INDEX IF NOT EXISTS party_weekly_members_by_event_v2
  ON private.party_weekly_event_members_v2(event_id);

CREATE TABLE IF NOT EXISTS private.party_weekly_event_activity_receipts_v2 (
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_event_id text NOT NULL CHECK (length(source_event_id) BETWEEN 8 AND 160),
  credited_points smallint NOT NULL CHECK (credited_points BETWEEN 0 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id, account_id, source_event_id),
  FOREIGN KEY(event_id, account_id) REFERENCES private.party_weekly_event_members_v2(event_id, account_id)
);
CREATE INDEX IF NOT EXISTS party_weekly_activity_by_member_v2
  ON private.party_weekly_event_activity_receipts_v2(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS private.party_weekly_event_supply_orders_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE CASCADE,
  stage smallint NOT NULL CHECK (stage BETWEEN 1 AND 3),
  kind text NOT NULL CHECK (kind IN ('required','optional')),
  preparation text,
  item_id text NOT NULL CHECK(length(item_id) BETWEEN 2 AND 100),
  category text NOT NULL CHECK(category IN ('wood','ore','herb')),
  tier text NOT NULL CHECK(tier IN ('common','uncommon','advanced')),
  target_quantity integer NOT NULL CHECK(target_quantity BETWEEN 1 AND 1000000),
  donated_quantity integer NOT NULL DEFAULT 0 CHECK(donated_quantity >= 0),
  estimated_gather_seconds numeric(14,2) NOT NULL CHECK(estimated_gather_seconds > 0),
  CHECK (donated_quantity <= target_quantity),
  CHECK (
    (kind='required' AND preparation IS NULL)
    OR (kind='optional' AND preparation IN ('reinforced','provisions','specialist'))
  ),
  CONSTRAINT party_weekly_supply_order_unique_v2
    UNIQUE NULLS NOT DISTINCT (event_id, stage, kind, item_id, preparation)
);
CREATE INDEX IF NOT EXISTS party_weekly_supply_event_v2
  ON private.party_weekly_event_supply_orders_v2(event_id, stage, kind);

CREATE TABLE IF NOT EXISTS private.party_weekly_event_supply_receipts_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES private.party_weekly_event_supply_orders_v2(id),
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key text NOT NULL CHECK(request_key ~ '^[A-Za-z0-9_-]{8,96}$'),
  item_id text NOT NULL,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 20000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, request_key),
  FOREIGN KEY(event_id, account_id) REFERENCES private.party_weekly_event_members_v2(event_id, account_id)
);

CREATE TABLE IF NOT EXISTS private.party_weekly_event_votes_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE CASCADE,
  stage smallint NOT NULL CHECK(stage IN (2,3)),
  options jsonb NOT NULL CHECK(jsonb_typeof(options)='array'),
  default_choice text NOT NULL,
  resolved_choice text,
  closes_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
  UNIQUE(event_id, stage)
);
CREATE TABLE IF NOT EXISTS private.party_weekly_event_ballots_v2 (
  vote_id uuid NOT NULL REFERENCES private.party_weekly_event_votes_v2(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  choice text NOT NULL,
  cast_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(vote_id, account_id)
);

CREATE TABLE IF NOT EXISTS private.party_weekly_event_finale_receipts_v2 (
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_event_id text NOT NULL,
  action_type text NOT NULL CHECK(action_type IN ('assault','defend','support','skilling')),
  verified_result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(event_id, account_id, source_event_id)
);
CREATE TABLE IF NOT EXISTS private.party_weekly_event_reward_entitlements_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES private.party_weekly_event_instances_v2(id),
  account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start timestamptz NOT NULL,
  choice text CHECK(choice IN ('warrior','artisan','companion')),
  renown smallint NOT NULL CHECK(renown IN (10,12,14)),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','granted')),
  granted_at timestamptz,
  UNIQUE(account_id, week_start),
  UNIQUE(event_id, account_id)
);

-- Validate member binding at enrollment, not only in application code.
CREATE OR REPLACE FUNCTION private.party_weekly_event_member_guard_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $guard$
DECLARE v_party uuid; v_starts timestamptz;
BEGIN
  SELECT party_id,starts_at INTO v_party,v_starts
  FROM private.party_weekly_event_instances_v2 WHERE id=NEW.event_id FOR SHARE;
  IF NOT FOUND OR NEW.week_start IS DISTINCT FROM v_starts THEN
    RAISE EXCEPTION 'PARTY_EVENT_INVALID_WEEK_BINDING';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.party_members
    WHERE party_id=v_party AND account_id=NEW.account_id AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'PARTY_EVENT_MEMBER_NOT_IN_PARTY';
  END IF;
  RETURN NEW;
END $guard$;
CREATE TRIGGER party_weekly_event_member_guard_v2
BEFORE INSERT OR UPDATE OF week_start,event_id,account_id
ON private.party_weekly_event_members_v2
FOR EACH ROW EXECUTE FUNCTION private.party_weekly_event_member_guard_v2();
REVOKE ALL ON FUNCTION private.party_weekly_event_member_guard_v2()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_member_guard_v2()
  TO service_role;

-- Private, server-owned tables are inaccessible to the app and do not advertise
-- an unfinished feature. Future authenticated endpoints require separate review.
DO $security$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'party_weekly_event_gate_v2','party_weekly_event_instances_v2',
    'party_weekly_event_members_v2','party_weekly_event_activity_receipts_v2',
    'party_weekly_event_supply_orders_v2','party_weekly_event_supply_receipts_v2',
    'party_weekly_event_votes_v2','party_weekly_event_ballots_v2',
    'party_weekly_event_finale_receipts_v2','party_weekly_event_reward_entitlements_v2'
  ] LOOP
    EXECUTE format('ALTER TABLE private.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE private.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE format('GRANT ALL ON TABLE private.%I TO service_role',t);
  END LOOP;
END $security$;

-- Dormant, atomic resource sink. Only trusted service code can invoke this
-- private RPC; feature gate must explicitly be enabled in a future release.
CREATE OR REPLACE FUNCTION private.party_weekly_event_supply_donate_v2(
  p_account_id uuid, p_order_id uuid, p_quantity integer, p_request_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $donate$
DECLARE
  v_order private.party_weekly_event_supply_orders_v2%ROWTYPE;
  v_event private.party_weekly_event_instances_v2%ROWTYPE;
  v_receipt private.party_weekly_event_supply_receipts_v2%ROWTYPE;
  v_game public.online_game_states%ROWTYPE;
  v_stacks jsonb;
  v_new jsonb := '[]'::jsonb;
  v_stack jsonb;
  v_locked jsonb;
  v_left integer;
  v_have integer;
  v_take integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled) THEN
    RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED';
  END IF;
  IF p_account_id IS NULL OR p_order_id IS NULL OR p_quantity IS NULL
    OR p_quantity < 1 OR p_quantity > 20000 OR p_request_key IS NULL
    OR p_request_key !~ '^[A-Za-z0-9_-]{8,96}$' THEN
    RAISE EXCEPTION 'INVALID_PARTY_EVENT_DONATION';
  END IF;

  -- Account-serialized writes prevent spending the same inventory twice.
  PERFORM pg_advisory_xact_lock(hashtextextended('party-weekly-supply:'||p_account_id::text, 0));
  SELECT * INTO v_receipt FROM private.party_weekly_event_supply_receipts_v2
    WHERE account_id=p_account_id AND request_key=p_request_key;
  IF FOUND THEN
    IF v_receipt.order_id<>p_order_id OR v_receipt.quantity<>p_quantity THEN
      RAISE EXCEPTION 'PARTY_EVENT_DONATION_REQUEST_CONFLICT';
    END IF;
    RETURN jsonb_build_object('alreadyProcessed',true,'orderId',p_order_id,'quantity',p_quantity);
  END IF;

  SELECT * INTO v_order FROM private.party_weekly_event_supply_orders_v2
    WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARTY_EVENT_SUPPLY_NOT_FOUND'; END IF;

  SELECT * INTO v_event FROM private.party_weekly_event_instances_v2
    WHERE id=v_order.event_id FOR UPDATE;
  IF NOT FOUND OR v_event.status<>'active' OR now()<v_event.starts_at OR now()>=v_event.ends_at THEN
    RAISE EXCEPTION 'PARTY_EVENT_SUPPLY_CLOSED';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_members_v2
    WHERE event_id=v_event.id AND account_id=p_account_id AND week_start=v_event.starts_at
  ) OR NOT EXISTS(
    SELECT 1 FROM public.party_members
    WHERE party_id=v_event.party_id AND account_id=p_account_id AND left_at IS NULL
  ) THEN
    RAISE EXCEPTION 'PARTY_EVENT_MEMBERSHIP_REQUIRED';
  END IF;
  IF v_order.donated_quantity + p_quantity > v_order.target_quantity THEN
    RAISE EXCEPTION 'PARTY_EVENT_SUPPLY_TARGET_EXCEEDED';
  END IF;

  SELECT * INTO v_game FROM public.online_game_states
    WHERE account_id=p_account_id FOR UPDATE;
  IF NOT FOUND OR v_game.character_id IS NULL THEN RAISE EXCEPTION 'PARTY_EVENT_CHARACTER_REQUIRED'; END IF;

  v_stacks:=coalesce(v_game.state#>'{inventory,stacks}','[]'::jsonb);
  v_locked:=coalesce(v_game.state#>'{settings,lockedItemIds}','[]'::jsonb);
  IF jsonb_typeof(v_stacks)<>'array' OR jsonb_typeof(v_locked)<>'array' THEN
    RAISE EXCEPTION 'PARTY_EVENT_INVALID_INVENTORY';
  END IF;
  IF v_locked ? v_order.item_id THEN RAISE EXCEPTION 'PARTY_EVENT_ITEM_LOCKED'; END IF;
  v_left:=p_quantity;
  FOR v_stack IN SELECT value FROM jsonb_array_elements(v_stacks) LOOP
    IF v_stack->>'itemId'=v_order.item_id AND v_left>0
      AND coalesce((v_stack->>'locked')::boolean,false)=false THEN
      v_have:=greatest(0,coalesce((v_stack->>'quantity')::integer,0));
      v_take:=least(v_have,v_left);
      v_left:=v_left-v_take;
      IF v_have>v_take THEN
        v_new:=v_new||jsonb_build_array(
          jsonb_set(v_stack,'{quantity}',to_jsonb(v_have-v_take))
        );
      END IF;
    ELSE
      v_new:=v_new||jsonb_build_array(v_stack);
    END IF;
  END LOOP;
  IF v_left>0 THEN RAISE EXCEPTION 'PARTY_EVENT_INSUFFICIENT_ITEMS'; END IF;

  UPDATE public.online_game_states
    SET revision=revision+1,updated_at=now(),
        state=jsonb_set(state,'{inventory,stacks}',v_new)
    WHERE account_id=p_account_id;

  INSERT INTO private.party_weekly_event_supply_receipts_v2
    (event_id,order_id,account_id,request_key,item_id,quantity)
  VALUES(v_event.id,p_order_id,p_account_id,p_request_key,v_order.item_id,p_quantity);
  UPDATE private.party_weekly_event_supply_orders_v2
    SET donated_quantity=donated_quantity+p_quantity WHERE id=p_order_id;
  RETURN jsonb_build_object(
    'alreadyProcessed',false,'orderId',p_order_id,'itemId',v_order.item_id,
    'quantity',p_quantity,'remaining',v_order.target_quantity-v_order.donated_quantity-p_quantity
  );
END $donate$;

REVOKE ALL ON FUNCTION private.party_weekly_event_supply_donate_v2(uuid,uuid,integer,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_weekly_event_supply_donate_v2(uuid,uuid,integer,text)
  TO service_role;

COMMENT ON TABLE private.party_weekly_event_gate_v2 IS
  'Hidden, disabled by default. Do not enable before end-to-end gameplay, inbox reward, authorization and anti-exploit verification.';
COMMIT;
