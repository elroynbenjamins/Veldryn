-- Disposable Winter Hearth V2 PostgreSQL 17 regression suite.
-- The only releases toggled here are synthetic flags inside ephemeral test DB.
\set ON_ERROR_STOP on

DO $$
BEGIN
 IF current_database()<>'winter_hearth_review_2026' THEN
  RAISE EXCEPTION 'WINTER_HEARTH_DO_NOT_RUN_ON_REAL_DB';
 END IF;
END $$;

CREATE FUNCTION winter_hearth_review.assert_reject(
 p_label text,p_sql text,p_expected text
) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_error text;
BEGIN
 BEGIN
  EXECUTE p_sql;
  RAISE EXCEPTION 'UNEXPECTED_REVIEW_DONATION_SUCCESS_%',p_label;
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_error=MESSAGE_TEXT;
  IF pg_catalog.strpos(v_error,'UNEXPECTED_REVIEW_DONATION_SUCCESS_')>0
    OR pg_catalog.strpos(v_error,p_expected)=0 THEN
   RAISE EXCEPTION 'REVIEW_WRONG_FAILURE_%_%_expected_%',p_label,v_error,p_expected;
  END IF;
 END;
END $$;

-- Synthetic guilds and accounts; not real user UUIDs.
INSERT INTO winter_hearth_review.guild_members(guild_id,account_id)
VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
 ('11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
 ('11111111-1111-4111-8111-111111111111','dddddddd-dddd-4ddd-8ddd-dddddddddddd');
-- A is a member of another guild too. This must NOT give a second cap.
INSERT INTO winter_hearth_review.guild_members(guild_id,account_id)
VALUES ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

INSERT INTO winter_hearth_review.bank_stacks(stack_id,account_id,item_id,quantity)
VALUES
 ('30000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','GREENWOOD_LOG',5000),
 ('30000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','GREENWOOD_LOG',5000),
 ('30000000-0000-4000-8000-000000000003','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','FROSTFALL_CHRISTMAS_LIGHTS_2026',1000),
 ('30000000-0000-4000-8000-000000000004','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','GREENWOOD_LOG',7500),
 ('30000000-0000-4000-8000-000000000005','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','FROSTFALL_CHRISTMAS_LIGHTS_2026',750),
 ('30000000-0000-4000-8000-000000000006','cccccccc-cccc-4ccc-8ccc-cccccccccccc','GREENWOOD_LOG',7500),
 ('30000000-0000-4000-8000-000000000007','cccccccc-cccc-4ccc-8ccc-cccccccccccc','FROSTFALL_CHRISTMAS_LIGHTS_2026',750),
 ('30000000-0000-4000-8000-000000000008','dddddddd-dddd-4ddd-8ddd-dddddddddddd','IRONWOOD_LOG',50);

-- Disabled by default, including during the proposed Dec 3 event window.
SELECT winter_hearth_review.assert_reject('disabled_by_default',
 $q$SELECT winter_hearth_review.simulate_donation(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'wood-1-1','GREENWOOD_LOG',2500,'2026-12-03T12:00:00Z')$q$,
 'winter_hearth_released_flags_disabled');
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM winter_hearth_review.donation_receipts)<>0
  THEN RAISE EXCEPTION 'WINTER_HEARTH_DISABLED_MUST_NOT_SPEND'; END IF;
END $$;

-- Enable ONLY isolated mock flags; NEVER event/calendar/production flags.
UPDATE winter_hearth_review.review_flags
SET event_enabled=true,guild_project_enabled=true
WHERE id='EVT_ANNUAL_012_2026';

SELECT winter_hearth_review.assert_reject('before_start',
 $q$SELECT winter_hearth_review.simulate_donation(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'wood-before','GREENWOOD_LOG',1,'2026-12-02T23:59:59Z')$q$,
 'winter_hearth_donation_window_closed');
SELECT winter_hearth_review.assert_reject('not_member',
 $q$SELECT winter_hearth_review.simulate_donation(
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 '22222222-2222-4222-8222-222222222222',
 'not-a-member','GREENWOOD_LOG',1,'2026-12-03T12:00:00Z')$q$,
 'winter_hearth_not_current_guild_member');
SELECT winter_hearth_review.assert_reject('forged_log',
 $q$SELECT winter_hearth_review.simulate_donation(
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 '11111111-1111-4111-8111-111111111111',
 'forged-resource','FAKE_LOG',1,'2026-12-03T12:00:00Z')$q$,
 'winter_hearth_item_not_source_approved');
SELECT winter_hearth_review.assert_reject('over_account_cap',
 $q$SELECT winter_hearth_review.simulate_donation(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '11111111-1111-4111-8111-111111111111',
 'over-account-cap','GREENWOOD_LOG',2501,'2026-12-03T12:00:00Z')$q$,
 'winter_hearth_account_log_week_cap');
SELECT winter_hearth_review.assert_reject('full_stock_required',
 $q$SELECT winter_hearth_review.simulate_donation(
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 '11111111-1111-4111-8111-111111111111',
 'not-enough-stock','IRONWOOD_LOG',100,'2026-12-03T12:00:00Z')$q$,
 'winter_hearth_insufficient_owned_stock');

-- Four weekly reset periods, three genuinely participating accounts.
-- Week 1,2,3 each member donates 2500 logs + 250 lights; Week 4 one
-- account finishes remaining 2500 logs + 250 lights.
DO $$
DECLARE
 v_week timestamptz;
 v_account uuid;
 v_w integer;
 v_i integer;
 v_n integer;
 v_expected_logs integer;
 v_expected_lights integer;
 v_expected_gold bigint;
 v_expected_percent integer;
 v_members uuid[]:=ARRAY[
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid
 ];
 v_weeks timestamptz[]:=ARRAY[
   '2026-12-03T12:00:00Z'::timestamptz,
   '2026-12-08T12:00:00Z'::timestamptz,
   '2026-12-15T12:00:00Z'::timestamptz,
   '2026-12-22T12:00:00Z'::timestamptz
 ];
 v_response jsonb;
BEGIN
 FOR v_w IN 1..4 LOOP
  v_week:=v_weeks[v_w];
  FOR v_i IN 1..CASE WHEN v_w=4 THEN 1 ELSE 3 END LOOP
   v_account:=v_members[v_i];
   v_response:=winter_hearth_review.simulate_donation(
     v_account,'11111111-1111-4111-8111-111111111111'::uuid,
     pg_catalog.format('wood-%s-%s',v_w,v_i),'GREENWOOD_LOG',2500,v_week
   );
   IF (v_response->>'authority')::boolean<>false
      OR (v_response->>'milestone_gold_new')::integer<>0 THEN
     RAISE EXCEPTION 'WINTER_HEARTH_LOG_DONATION_PAID_UNBALANCED_MILESTONE';
   END IF;
   v_response:=winter_hearth_review.simulate_donation(
     v_account,'11111111-1111-4111-8111-111111111111'::uuid,
     pg_catalog.format('light-%s-%s',v_w,v_i),
     'FROSTFALL_CHRISTMAS_LIGHTS_2026',250,v_week
   );
   IF (v_response->>'authority')::boolean<>false THEN
     RAISE EXCEPTION 'WINTER_HEARTH_NO_PREVIEW_AUTHORITY';
   END IF;
  END LOOP;
  v_expected_logs:=CASE v_w WHEN 1 THEN 7500 WHEN 2 THEN 15000
                                WHEN 3 THEN 22500 ELSE 25000 END;
  v_expected_lights:=v_expected_logs/10;
  v_expected_gold:=CASE v_w WHEN 1 THEN 10000 WHEN 2 THEN 30000
                                 WHEN 3 THEN 60000 ELSE 110000 END;
  v_expected_percent:=v_w*25;
  IF NOT EXISTS(
    SELECT 1 FROM winter_hearth_review.guild_market
    WHERE guild_id='11111111-1111-4111-8111-111111111111'
      AND logs=v_expected_logs AND lights=v_expected_lights
      AND treasury_gold=v_expected_gold
  ) THEN
   RAISE EXCEPTION 'WINTER_HEARTH_WRONG_PROGRESS_OR_GOLD_AT_WEEK_%',v_w;
  END IF;
  SELECT COUNT(*) INTO v_n FROM winter_hearth_review.milestone_receipts
  WHERE guild_id='11111111-1111-4111-8111-111111111111';
  IF v_n<>v_w THEN
    RAISE EXCEPTION 'WINTER_HEARTH_NOT_EXACTLY_%_MILESTONES',v_w;
  END IF;

  IF v_w=1 THEN
   -- Account A has already used their full weekly log allowance in guild A.
   -- The same account cannot immediately refill its cap in guild B.
   PERFORM winter_hearth_review.assert_reject('guild_switch_cap',
     $q$SELECT winter_hearth_review.simulate_donation(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       '22222222-2222-4222-8222-222222222222',
       'guild-switch-cap','GREENWOOD_LOG',1,'2026-12-03T18:00:00Z')$q$,
     'winter_hearth_account_log_week_cap');

   -- Return the EXACT original response without consuming inventory twice.
   v_response:=winter_hearth_review.simulate_donation(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'wood-1-1','GREENWOOD_LOG',2500,v_week
   );
   IF v_response->>'idempotent_replay'<>'true' THEN
     RAISE EXCEPTION 'WINTER_HEARTH_RETRY_MUST_REPLAY_ORIGINAL';
   END IF;
   PERFORM winter_hearth_review.assert_reject('same_nonce_other_item',
     $q$SELECT winter_hearth_review.simulate_donation(
       'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
       '11111111-1111-4111-8111-111111111111',
       'wood-1-1','IRONWOOD_LOG',1,'2026-12-03T18:00:00Z')$q$,
     'winter_hearth_idempotency_payload_mismatch');
  END IF;
 END LOOP;
 IF (SELECT COUNT(*) FROM winter_hearth_review.guild_cosmetic_unlocks
     WHERE guild_id='11111111-1111-4111-8111-111111111111'
       AND color_id='name_frostfall_aurora_2026')<>1 THEN
    RAISE EXCEPTION 'WINTER_HEARTH_PERMANENT_COLOR_MISSING';
 END IF;
 SELECT COUNT(*) INTO v_n FROM winter_hearth_review.donation_receipts
 WHERE guild_id='11111111-1111-4111-8111-111111111111';
 IF v_n<>20 THEN RAISE EXCEPTION 'WINTER_HEARTH_EXPECTED_20_DONATION_RECEIPTS_GOT_%',v_n; END IF;
END $$;

-- After a donor leaves the guild, guild progress and the permanent reward
-- remain unchanged. XP and active buffs must separately check live membership.
DELETE FROM winter_hearth_review.guild_members
WHERE guild_id='11111111-1111-4111-8111-111111111111'
  AND account_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $$
BEGIN
 IF (SELECT treasury_gold FROM winter_hearth_review.guild_market
     WHERE guild_id='11111111-1111-4111-8111-111111111111')<>110000
 OR (SELECT COUNT(*) FROM winter_hearth_review.guild_cosmetic_unlocks
     WHERE guild_id='11111111-1111-4111-8111-111111111111')<>1 THEN
  RAISE EXCEPTION 'WINTER_HEARTH_LEFT_GUILD_SHOULD_NOT_REVOKE_REWARD';
 END IF;
END $$;

-- Post-Christmas Dec 27 claim-only period never accepts a donation.
SELECT winter_hearth_review.assert_reject('season_ended',
 $q$SELECT winter_hearth_review.simulate_donation(
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 '11111111-1111-4111-8111-111111111111',
 'after-event-end','IRONWOOD_LOG',1,'2026-12-27T00:00:00Z')$q$,
 'winter_hearth_donation_window_closed');
SELECT winter_hearth_review.assert_reject('guild_target_full',
 $q$SELECT winter_hearth_review.simulate_donation(
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 '11111111-1111-4111-8111-111111111111',
 'already-donated-full','IRONWOOD_LOG',1,'2026-12-22T14:00:00Z')$q$,
 'winter_hearth_guild_track_full');
SELECT winter_hearth_review.assert_reject('immutable_color',
 $q$DELETE FROM winter_hearth_review.guild_cosmetic_unlocks
 WHERE guild_id='11111111-1111-4111-8111-111111111111'$q$,
 'WINTER_HEARTH_IMMUTABLE_REWARD_RECEIPT');
SELECT winter_hearth_review.assert_reject('immutable_milestone',
 $q$UPDATE winter_hearth_review.milestone_receipts SET awarded_gold=1
 WHERE guild_id='11111111-1111-4111-8111-111111111111'$q$,
 'WINTER_HEARTH_IMMUTABLE_REWARD_RECEIPT');
SELECT winter_hearth_review.assert_reject('immutable_donation',
 $q$DELETE FROM winter_hearth_review.donation_receipts
 WHERE guild_id='11111111-1111-4111-8111-111111111111'$q$,
 'WINTER_HEARTH_IMMUTABLE_REWARD_RECEIPT');

SELECT 'PASS disposable PG17 Winter Hearth: 20 authentic donations, four UTC weeks, both-track goals, 110k Guild Gold once, guild-switched account caps, permanent guild color, invalid/cancelled/fake/no-member denied, no production writes' AS result;
