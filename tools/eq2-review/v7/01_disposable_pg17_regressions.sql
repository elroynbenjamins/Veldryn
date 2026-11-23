-- Disposable PG17 regressions for Veldryn EQ2 source-only mint/custody model.
-- Never run in production/staging. No real Gold or real player resources.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database()<>'eq2_review_v7' THEN RAISE EXCEPTION 'NEVER_RUN_OUTSIDE_DISPOSABLE_DB'; END IF;
END $$;

CREATE FUNCTION eq2review_v7.assert_refused(p_label text,p_statement text,p_expected text)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE message text;
BEGIN
  BEGIN
    EXECUTE p_statement;
    RAISE EXCEPTION 'V7_TEST_UNEXPECTED_SUCCESS_%',p_label;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS message = MESSAGE_TEXT;
    IF pg_catalog.strpos(message,'V7_TEST_UNEXPECTED_SUCCESS_')>0
       OR pg_catalog.strpos(message,p_expected)=0 THEN
      RAISE EXCEPTION 'V7_TEST_INCORRECT_ERROR_%_received_%_expected_%',
        p_label,message,p_expected;
    END IF;
  END;
END $$;

INSERT INTO eq2review_v7.authored_pool(dungeon_id,boss_id,template_id)
VALUES
 ('EXP_001','BOSS_EXP_ROOT','EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET'),
 ('EXP_001','BOSS_EXP_BELL','EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_CHEST'),
 ('EXP_003','BOSS_EXP_SOLAR','EQ2_DUNGEON_OBSERVATORY_T4_HELIOGUARD_HELMET'),
 ('EXP_003','BOSS_EXP_SPHINX','EQ2_DUNGEON_OBSERVATORY_T4_HELIOGUARD_CHEST');

INSERT INTO eq2review_v7.synthetic_trusted_source(
 entitlement_id,run_id,account_id,character_id,dungeon_id,boss_id,
 reward_kind,reward_stage,completed_boss,enhanced_reward,signed_origin_verified,
 claimed_at,boss_result_at
) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_001','BOSS_EXP_ROOT','participant','final',true,true,true,
  '2026-11-23T18:05:00Z','2026-11-23T18:04:59Z'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_001','BOSS_EXP_ROOT','participant','final',true,true,true,
  '2026-11-23T18:15:00Z','2026-11-23T18:14:59Z'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_001','BOSS_EXP_ROOT','participant','final',true,false,true,
  '2026-11-23T18:25:00Z','2026-11-23T18:24:59Z'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_001','BOSS_EXP_ROOT','echo_assistance','final',true,true,true,
  '2026-11-23T18:35:00Z','2026-11-23T18:34:59Z'),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_001','BOSS_EXP_ROOT','participant','final',false,true,true,
  '2026-11-23T18:45:00Z','2026-11-23T18:44:59Z'),
 ('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000006',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_001','BOSS_EXP_BELL','participant','final',true,true,true,
  '2026-11-23T18:55:00Z','2026-11-23T18:54:59Z'),
 ('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000007',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_005','BOSS_EXP_BELLBEAST','participant','final',true,true,true,
  '2026-11-23T19:05:00Z','2026-11-23T19:04:59Z'),
 ('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000008',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
  'EXP_003','BOSS_EXP_SOLAR','participant','final',true,true,true,
  '2026-11-23T19:15:00Z','2026-11-23T19:14:59Z');

-- Accepted exact copy, but still not real item mint authority.
SELECT eq2review_v7.simulate_record_reward(
 '20000000-0000-4000-8000-000000000001',true,
 'EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET',
 '40000000-0000-4000-8000-000000000001','synthetic_v7') AS first_synthetic_decision;
-- Idempotent retry with a different requested result / policy must return original.
SELECT eq2review_v7.simulate_record_reward(
 '20000000-0000-4000-8000-000000000001',false,NULL,NULL,'future_policy') AS first_replay;

SELECT eq2review_v7.simulate_record_reward(
 '20000000-0000-4000-8000-000000000002',false,NULL,NULL,'synthetic_v7') AS missed_drop;
-- Misses are final: replay cannot turn a miss into an award later.
SELECT eq2review_v7.simulate_record_reward(
 '20000000-0000-4000-8000-000000000002',true,
 'EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET',
 '40000000-0000-4000-8000-000000000099','future_policy') AS missed_drop_replay;

SELECT eq2review_v7.assert_refused('uncharged',
 $$SELECT eq2review_v7.simulate_record_reward('20000000-0000-4000-8000-000000000003',true,'EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET','40000000-0000-4000-8000-000000000003','synthetic_v7')$$,
 'eq2_review_unverified_boss_enhanced_source');
SELECT eq2review_v7.assert_refused('npc_echo',
 $$SELECT eq2review_v7.simulate_record_reward('20000000-0000-4000-8000-000000000004',true,'EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET','40000000-0000-4000-8000-000000000004','synthetic_v7')$$,
 'eq2_review_unverified_boss_enhanced_source');
SELECT eq2review_v7.assert_refused('failed_boss',
 $$SELECT eq2review_v7.simulate_record_reward('20000000-0000-4000-8000-000000000005',true,'EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET','40000000-0000-4000-8000-000000000005','synthetic_v7')$$,
 'eq2_review_unverified_boss_enhanced_source');
SELECT eq2review_v7.assert_refused('cross_boss_item',
 $$SELECT eq2review_v7.simulate_record_reward('20000000-0000-4000-8000-000000000006',true,'EQ2_DUNGEON_ROOTBOUND_T2_HEARTWARD_HELMET','40000000-0000-4000-8000-000000000006','synthetic_v7')$$,
 'eq2_review_cross_boss_or_missing_mint');
SELECT eq2review_v7.assert_refused('future_unpublished_boss',
 $$SELECT eq2review_v7.simulate_record_reward('20000000-0000-4000-8000-000000000007',true,'EQ2_DUNGEON_SHIVERLAKE_T5_RIMEVANGUARD_HELMET','40000000-0000-4000-8000-000000000007','synthetic_v7')$$,
 'eq2_review_unknown_or_unpublished_boss');
SELECT eq2review_v7.assert_refused('miss_with_extra_item',
 $$SELECT eq2review_v7.simulate_record_reward('20000000-0000-4000-8000-000000000008',false,'EQ2_DUNGEON_OBSERVATORY_T4_HELIOGUARD_HELMET','40000000-0000-4000-8000-000000000008','synthetic_v7')$$,
 'eq2_review_miss_cannot_create_item');

SELECT eq2review_v7.simulate_record_reward(
 '20000000-0000-4000-8000-000000000008',true,
 'EQ2_DUNGEON_OBSERVATORY_T4_HELIOGUARD_HELMET',
 '40000000-0000-4000-8000-000000000008','synthetic_v7') AS independent_sunscar_copy;

DO $$
DECLARE n integer;
BEGIN
 SELECT COUNT(*) INTO n FROM eq2review_v7.frozen_decision;
 IF n<>3 THEN RAISE EXCEPTION 'V7_EXPECTED_3_FROZEN_OUTCOMES_NOT_%',n; END IF;
 SELECT COUNT(*) INTO n FROM eq2review_v7.original_mint;
 IF n<>2 THEN RAISE EXCEPTION 'V7_EXPECTED_2_EXACT_COPIES_NOT_%',n; END IF;
 SELECT COUNT(*) INTO n FROM eq2review_v7.current_custody;
 IF n<>2 THEN RAISE EXCEPTION 'V7_EXPECTED_2_CUSTODIES_NOT_%',n; END IF;
END $$;

-- Source and rolled stats are truly immutable, including AFTER resale.
SELECT eq2review_v7.assert_refused('mutate_mint',
 $$UPDATE eq2review_v7.original_mint SET original_boss_id='BOSS_EXP_BELL' WHERE instance_id='40000000-0000-4000-8000-000000000001'$$,
 'eq2_original_provenance_immutable');
SELECT eq2review_v7.assert_refused('mutate_mint_generation',
 $$UPDATE eq2review_v7.original_mint SET generation='legacy' WHERE instance_id='40000000-0000-4000-8000-000000000001'$$,
 'eq2_original_provenance_immutable');
SELECT eq2review_v7.assert_refused('delete_original_mint',
 $$DELETE FROM eq2review_v7.original_mint WHERE instance_id='40000000-0000-4000-8000-000000000001'$$,
 'eq2_original_provenance_immutable');
SELECT eq2review_v7.assert_refused('reset_original_decision',
 $$DELETE FROM eq2review_v7.frozen_decision WHERE entitlement_id='20000000-0000-4000-8000-000000000001'$$,
 'eq2_original_provenance_immutable');

-- First original-owner listing; no actual Gold or Market state changes.
SELECT eq2review_v7.simulate_list(
 '40000000-0000-4000-8000-000000000001',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '50000000-0000-4000-8000-000000000001',5600);
SELECT eq2review_v7.assert_refused('other_seller_cannot_list',
 $$SELECT eq2review_v7.simulate_list('40000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','50000000-0000-4000-8000-000000000099',7000)$$,
 'eq2_review_unowned_or_unverified_listing');
SELECT eq2review_v7.assert_refused('duplicate_inventory_listing',
 $$SELECT eq2review_v7.simulate_list('40000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','50000000-0000-4000-8000-000000000098',7000)$$,
 'eq2_review_unowned_or_unverified_listing');
SELECT eq2review_v7.assert_refused('cancel_other_seller',
 $$SELECT eq2review_v7.simulate_cancel('50000000-0000-4000-8000-000000000001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
 'eq2_review_not_offer_seller');
SELECT eq2review_v7.simulate_cancel(
 '50000000-0000-4000-8000-000000000001',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT eq2review_v7.simulate_cancel(
 '50000000-0000-4000-8000-000000000001',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Fresh relist, then transfer ownership (no Gold simulation).
SELECT eq2review_v7.simulate_list(
 '40000000-0000-4000-8000-000000000001',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '50000000-0000-4000-8000-000000000002',7600);
SELECT eq2review_v7.assert_refused('self_buy',
 $$SELECT eq2review_v7.simulate_transfer_without_gold('50000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','60000000-0000-4000-8000-000000000001')$$,
 'eq2_review_not_active_or_self_buy');
SELECT eq2review_v7.simulate_transfer_without_gold(
 '50000000-0000-4000-8000-000000000002',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 '60000000-0000-4000-8000-000000000001');
SELECT eq2review_v7.simulate_transfer_without_gold(
 '50000000-0000-4000-8000-000000000002',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 '60000000-0000-4000-8000-000000000001');
SELECT eq2review_v7.assert_refused('racing_second_buyer',
 $$SELECT eq2review_v7.simulate_transfer_without_gold('50000000-0000-4000-8000-000000000002','cccccccc-cccc-4ccc-8ccc-cccccccccccc','60000000-0000-4000-8000-000000000002')$$,
 'eq2_review_offer_already_transferred');
SELECT eq2review_v7.assert_refused('cannot_cancel_after_sale',
 $$SELECT eq2review_v7.simulate_cancel('50000000-0000-4000-8000-000000000002','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
 'eq2_review_cannot_cancel_transferred_copy');
SELECT eq2review_v7.assert_refused('previous_owner_no_longer_owns',
 $$SELECT eq2review_v7.simulate_list('40000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','50000000-0000-4000-8000-000000000097',8200)$$,
 'eq2_review_unowned_or_unverified_listing');

-- Second resale to a third player; original mint and all rolls unchanged.
SELECT eq2review_v7.simulate_list(
 '40000000-0000-4000-8000-000000000001',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 '50000000-0000-4000-8000-000000000003',8800);
SELECT eq2review_v7.simulate_transfer_without_gold(
 '50000000-0000-4000-8000-000000000003',
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 '60000000-0000-4000-8000-000000000003');
DO $$
DECLARE n integer;
DECLARE owner_id uuid;
DECLARE original_owner uuid;
DECLARE original_boss text;
DECLARE snapshot jsonb;
BEGIN
 SELECT owner_id,custody_revision INTO owner_id,n
 FROM eq2review_v7.current_custody
 WHERE instance_id='40000000-0000-4000-8000-000000000001';
 IF owner_id<>'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid OR n<>7 THEN
   RAISE EXCEPTION 'V7_TRANSFER_CUSTODY_EXPECTED_CHARLIE_REV7_GOT_%_%',owner_id,n;
 END IF;
 SELECT original_owner_id,original_boss_id,immutable_roll_snapshot
 INTO original_owner,original_boss,snapshot
 FROM eq2review_v7.original_mint
 WHERE instance_id='40000000-0000-4000-8000-000000000001';
 IF original_owner<>'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    OR original_boss<>'BOSS_EXP_ROOT'
    OR snapshot->>'rarity'<>'synthetic_rare' THEN
   RAISE EXCEPTION 'V7_ORIGINAL_BOSS_AND_STATS_CHANGED_DURING_RESALE';
 END IF;
 SELECT COUNT(*) INTO n FROM eq2review_v7.synthetic_transfer_history
 WHERE instance_id='40000000-0000-4000-8000-000000000001';
 IF n<>2 THEN RAISE EXCEPTION 'V7_EXPECTED_TWO_AUTHORED_TRANSFERS'; END IF;
END $$;

-- Exactly one decision for one participant, even after an unrelated policy
-- version or source name change. No RNG/claim reroll, no duplicate item.
DO $$
DECLARE n integer;
BEGIN
 SELECT COUNT(*) INTO n FROM eq2review_v7.frozen_decision
 WHERE entitlement_id='20000000-0000-4000-8000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'V7_REPLAY_DUPLICATED_DECISION'; END IF;
 SELECT COUNT(*) INTO n FROM eq2review_v7.original_mint
 WHERE entitlement_id='20000000-0000-4000-8000-000000000001';
 IF n<>1 THEN RAISE EXCEPTION 'V7_REPLAY_DUPLICATED_ITEM'; END IF;
END $$;
SELECT 'PASS PG17 disposable EQ2 v7: exactly-once win/miss, cross-boss/failed/echo/uncharged denial, immutable origin, cancel/relist, two legitimate resales, zero Gold' AS v7_outcome;
