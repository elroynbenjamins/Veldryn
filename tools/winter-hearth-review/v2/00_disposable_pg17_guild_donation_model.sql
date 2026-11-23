-- Frostfall Winter Hearth V2: DISPOSABLE PostgreSQL 17 donation SETTLEMENT MODEL.
-- Never a migration. Never run against any real Supabase / player database.
-- Mock inventory, membership and treasury are contained in this test schema.
DO $guard$
BEGIN
 IF current_database() <> 'winter_hearth_review_2026' THEN
   RAISE EXCEPTION 'WINTER_HEARTH_DISPOSABLE_DATABASE_ONLY';
 END IF;
END $guard$;

BEGIN;
CREATE SCHEMA winter_hearth_review;
REVOKE ALL ON SCHEMA winter_hearth_review FROM PUBLIC;

CREATE TABLE winter_hearth_review.review_flags (
 id text PRIMARY KEY CHECK (id='EVT_ANNUAL_012_2026'),
 event_enabled boolean NOT NULL DEFAULT false,
 guild_project_enabled boolean NOT NULL DEFAULT false
);
INSERT INTO winter_hearth_review.review_flags(id) VALUES ('EVT_ANNUAL_012_2026');

CREATE TABLE winter_hearth_review.guild_members (
 guild_id uuid NOT NULL,
 account_id uuid NOT NULL,
 PRIMARY KEY (guild_id,account_id)
);
CREATE TABLE winter_hearth_review.bank_stacks (
 stack_id uuid PRIMARY KEY,
 account_id uuid NOT NULL,
 item_id text NOT NULL,
 quantity integer NOT NULL CHECK (quantity > 0)
);
CREATE INDEX winter_hearth_review_bank_lookup ON
 winter_hearth_review.bank_stacks(account_id,item_id);

CREATE TABLE winter_hearth_review.guild_market (
 guild_id uuid PRIMARY KEY,
 logs integer NOT NULL DEFAULT 0 CHECK (logs BETWEEN 0 AND 25000),
 lights integer NOT NULL DEFAULT 0 CHECK (lights BETWEEN 0 AND 2500),
 treasury_gold bigint NOT NULL DEFAULT 0 CHECK (treasury_gold >= 0)
);
CREATE TABLE winter_hearth_review.account_week_cap (
 account_id uuid NOT NULL,
 week_start_utc date NOT NULL,
 donated_logs integer NOT NULL DEFAULT 0 CHECK (donated_logs BETWEEN 0 AND 2500),
 donated_lights integer NOT NULL DEFAULT 0 CHECK (donated_lights BETWEEN 0 AND 250),
 PRIMARY KEY (account_id,week_start_utc)
);
CREATE TABLE winter_hearth_review.donation_receipts (
 account_id uuid NOT NULL,
 request_key text NOT NULL CHECK (char_length(request_key) BETWEEN 8 AND 128),
 guild_id uuid NOT NULL,
 item_id text NOT NULL,
 quantity integer NOT NULL CHECK (quantity > 0),
 track text NOT NULL CHECK (track IN ('logs','lights')),
 week_start_utc date NOT NULL,
 result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (account_id,request_key)
);
CREATE TABLE winter_hearth_review.milestone_receipts (
 guild_id uuid NOT NULL,
 threshold_percent integer NOT NULL CHECK (threshold_percent IN (25,50,75,100)),
 awarded_gold integer NOT NULL CHECK (awarded_gold IN (10000,20000,30000,50000)),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (guild_id,threshold_percent)
);
CREATE TABLE winter_hearth_review.guild_cosmetic_unlocks (
 guild_id uuid NOT NULL,
 color_id text NOT NULL CHECK (color_id='name_frostfall_aurora_2026'),
 source text NOT NULL DEFAULT '2026_winter_hearth_guild'
   CHECK (source='2026_winter_hearth_guild'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (guild_id,color_id)
);

CREATE FUNCTION winter_hearth_review.deny_immutable_receipt_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
 RAISE EXCEPTION 'WINTER_HEARTH_IMMUTABLE_REWARD_RECEIPT';
END $$;
CREATE TRIGGER immutable_donation_receipt
 BEFORE UPDATE OR DELETE ON winter_hearth_review.donation_receipts
 FOR EACH ROW EXECUTE FUNCTION winter_hearth_review.deny_immutable_receipt_changes();
CREATE TRIGGER immutable_milestone_receipt
 BEFORE UPDATE OR DELETE ON winter_hearth_review.milestone_receipts
 FOR EACH ROW EXECUTE FUNCTION winter_hearth_review.deny_immutable_receipt_changes();
CREATE TRIGGER immutable_color_unlock
 BEFORE UPDATE OR DELETE ON winter_hearth_review.guild_cosmetic_unlocks
 FOR EACH ROW EXECUTE FUNCTION winter_hearth_review.deny_immutable_receipt_changes();

-- SYNTHETIC CHECK ONLY. This fixture accepts caller-supplied account, guild,
-- quantity and clock because no authenticated game API can import this file.
-- A real production RPC must derive account and time on the server, verify
-- current guild membership from public.guild_members, debit owned inventory
-- and bank atomically, and use a default-off project release flag.
CREATE FUNCTION winter_hearth_review.simulate_donation(
 p_account uuid,p_guild uuid,p_request text,p_item text,p_quantity integer,
 p_now timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_flags winter_hearth_review.review_flags%ROWTYPE;
 v_old winter_hearth_review.donation_receipts%ROWTYPE;
 v_guild winter_hearth_review.guild_market%ROWTYPE;
 v_cap winter_hearth_review.account_week_cap%ROWTYPE;
 v_stock record;
 v_track text;
 v_week date;
 v_used integer;
 v_goal integer;
 v_remaining integer;
 v_stock_total integer:=0;
 v_to_take integer;
 v_take integer;
 v_before_stage integer;
 v_after_stage integer;
 v_stage integer;
 v_gold integer;
 v_credited_gold integer:=0;
 v_result jsonb;
BEGIN
 IF p_account IS NULL OR p_guild IS NULL OR p_request IS NULL
    OR char_length(p_request) NOT BETWEEN 8 AND 128 THEN
  RAISE EXCEPTION 'winter_hearth_invalid_identity_or_request';
 END IF;
 IF p_quantity IS NULL OR p_quantity<=0 OR p_item IS NULL THEN
  RAISE EXCEPTION 'winter_hearth_invalid_item_or_quantity';
 END IF;

 -- Lock account across all guilds and all characters before any quote.
 -- The account request key is global, independent of guild or character.
 PERFORM pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(p_account::text,2026)
 );
 SELECT * INTO v_old FROM winter_hearth_review.donation_receipts
 WHERE account_id=p_account AND request_key=p_request;
 IF FOUND THEN
  IF v_old.guild_id<>p_guild OR v_old.item_id<>p_item
     OR v_old.quantity<>p_quantity THEN
   RAISE EXCEPTION 'winter_hearth_idempotency_payload_mismatch';
  END IF;
  RETURN v_old.result || '{"idempotent_replay":true,"authority":false}'::jsonb;
 END IF;

 SELECT * INTO STRICT v_flags FROM winter_hearth_review.review_flags
 WHERE id='EVT_ANNUAL_012_2026';
 IF NOT v_flags.event_enabled OR NOT v_flags.guild_project_enabled THEN
  RAISE EXCEPTION 'winter_hearth_released_flags_disabled';
 END IF;
 IF p_now IS NULL OR p_now < '2026-12-03 00:00:00+00'::timestamptz
    OR p_now >= '2026-12-27 00:00:00+00'::timestamptz THEN
  RAISE EXCEPTION 'winter_hearth_donation_window_closed';
 END IF;
 IF p_item IN ('GREENWOOD_LOG','IRONWOOD_LOG','CROWNWOOD_LOG',
              'DUNEWOOD','WHITEPINE_LOG','CINDERWOOD_LOG') THEN
  v_track:='logs'; v_goal:=25000;
 ELSIF p_item='FROSTFALL_CHRISTMAS_LIGHTS_2026' THEN
  v_track:='lights'; v_goal:=2500;
 ELSE
  RAISE EXCEPTION 'winter_hearth_item_not_source_approved';
 END IF;
 -- Keep membership row locked to prevent a concurrent member removal.
 PERFORM 1 FROM winter_hearth_review.guild_members
 WHERE guild_id=p_guild AND account_id=p_account FOR SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'winter_hearth_not_current_guild_member';
 END IF;

 v_week:=(pg_catalog.date_trunc('week',p_now AT TIME ZONE 'UTC'))::date;
 INSERT INTO winter_hearth_review.account_week_cap(account_id,week_start_utc)
 VALUES(p_account,v_week) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT v_cap FROM winter_hearth_review.account_week_cap
 WHERE account_id=p_account AND week_start_utc=v_week FOR UPDATE;
 INSERT INTO winter_hearth_review.guild_market(guild_id)
 VALUES(p_guild) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT v_guild FROM winter_hearth_review.guild_market
 WHERE guild_id=p_guild FOR UPDATE;

 IF v_track='logs' THEN
  v_used:=v_cap.donated_logs;
  v_remaining:=v_goal-v_guild.logs;
  IF v_used + p_quantity > 2500 THEN
   RAISE EXCEPTION 'winter_hearth_account_log_week_cap';
  END IF;
 ELSE
  v_used:=v_cap.donated_lights;
  v_remaining:=v_goal-v_guild.lights;
  IF v_used + p_quantity > 250 THEN
   RAISE EXCEPTION 'winter_hearth_account_light_week_cap';
  END IF;
 END IF;
 IF p_quantity>v_remaining THEN
  RAISE EXCEPTION 'winter_hearth_guild_track_full';
 END IF;

 -- Multiple genuine account-owned bank stacks are locked in stable order.
 -- This is the disposable mock for public.account_bank_items; no app bank is
 -- read or written here. The test never fabricates live supply.
 FOR v_stock IN SELECT stack_id,quantity
   FROM winter_hearth_review.bank_stacks
   WHERE account_id=p_account AND item_id=p_item
   ORDER BY stack_id FOR UPDATE LOOP
   v_stock_total:=v_stock_total+v_stock.quantity;
 END LOOP;
 IF v_stock_total<p_quantity THEN
  RAISE EXCEPTION 'winter_hearth_insufficient_owned_stock';
 END IF;
 v_to_take:=p_quantity;
 FOR v_stock IN SELECT stack_id,quantity
   FROM winter_hearth_review.bank_stacks
   WHERE account_id=p_account AND item_id=p_item
   ORDER BY stack_id FOR UPDATE LOOP
   EXIT WHEN v_to_take=0;
   v_take:=pg_catalog.least(v_to_take,v_stock.quantity);
   IF v_take=v_stock.quantity THEN
    DELETE FROM winter_hearth_review.bank_stacks WHERE stack_id=v_stock.stack_id;
   ELSE
    UPDATE winter_hearth_review.bank_stacks
    SET quantity=quantity-v_take WHERE stack_id=v_stock.stack_id;
   END IF;
   v_to_take:=v_to_take-v_take;
 END LOOP;
 IF v_to_take<>0 THEN RAISE EXCEPTION 'winter_hearth_stock_consume_failure'; END IF;

 v_before_stage:=0; v_after_stage:=0;
 FOR v_stage IN SELECT value FROM (VALUES(25),(50),(75),(100)) AS x(value) LOOP
  IF v_guild.logs >= v_stage * 250 AND v_guild.lights >= v_stage * 25 THEN
    v_before_stage:=v_stage;
  END IF;
  IF (v_guild.logs + CASE WHEN v_track='logs' THEN p_quantity ELSE 0 END)
     >= v_stage * 250
     AND
     (v_guild.lights + CASE WHEN v_track='lights' THEN p_quantity ELSE 0 END)
     >= v_stage * 25 THEN
     v_after_stage:=v_stage;
  END IF;
 END LOOP;
 IF v_track='logs' THEN
  UPDATE winter_hearth_review.account_week_cap SET donated_logs=donated_logs+p_quantity
   WHERE account_id=p_account AND week_start_utc=v_week;
  UPDATE winter_hearth_review.guild_market SET logs=logs+p_quantity WHERE guild_id=p_guild;
 ELSE
  UPDATE winter_hearth_review.account_week_cap SET donated_lights=donated_lights+p_quantity
   WHERE account_id=p_account AND week_start_utc=v_week;
  UPDATE winter_hearth_review.guild_market SET lights=lights+p_quantity WHERE guild_id=p_guild;
 END IF;

 FOR v_stage IN SELECT value FROM (VALUES(25),(50),(75),(100)) AS x(value) LOOP
  IF v_stage > v_before_stage AND v_stage <= v_after_stage THEN
   v_gold:=CASE v_stage WHEN 25 THEN 10000
                         WHEN 50 THEN 20000
                         WHEN 75 THEN 30000
                         WHEN 100 THEN 50000 END;
   INSERT INTO winter_hearth_review.milestone_receipts
    (guild_id,threshold_percent,awarded_gold)
   VALUES (p_guild,v_stage,v_gold)
   ON CONFLICT DO NOTHING;
   IF FOUND THEN
    v_credited_gold:=v_credited_gold+v_gold;
   END IF;
  END IF;
 END LOOP;
 IF v_credited_gold>0 THEN
  UPDATE winter_hearth_review.guild_market
   SET treasury_gold=treasury_gold+v_credited_gold WHERE guild_id=p_guild;
 END IF;
 IF v_after_stage=100 THEN
  INSERT INTO winter_hearth_review.guild_cosmetic_unlocks(guild_id,color_id)
  VALUES (p_guild,'name_frostfall_aurora_2026')
  ON CONFLICT DO NOTHING;
 END IF;
 v_result:=pg_catalog.jsonb_build_object(
  'guild_id',p_guild,'item_id',p_item,'quantity',p_quantity,
  'track',v_track,'week_start_utc',v_week,'reached_percent',v_after_stage,
  'milestone_gold_new',v_credited_gold,'permanent_color',v_after_stage=100,
  'authority',false,'idempotent_replay',false
 );
 INSERT INTO winter_hearth_review.donation_receipts
 (account_id,request_key,guild_id,item_id,quantity,track,week_start_utc,result)
 VALUES(p_account,p_request,p_guild,p_item,p_quantity,v_track,v_week,v_result);
 RETURN v_result;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA winter_hearth_review FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA winter_hearth_review FROM PUBLIC;
COMMENT ON SCHEMA winter_hearth_review IS
 'Frostfall Winter Hearth 2026 DISPOSABLE SQL review only; no production/staging migration, flags or payout.';
COMMIT;
