#!/usr/bin/env bash
# Veldryn Winter Hearth 2026: DISPOSABLE PG17 two-session race tests.
# DO NOT run against staging or production. Zero real inventory/Gold.
set -euo pipefail
[[ "$(psql -X -v ON_ERROR_STOP=1 -Atc 'select current_database()')" == 'winter_hearth_review_2026' ]] || exit 9
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO winter_hearth_review.guild_members(guild_id,account_id)
VALUES
 ('33333333-3333-4333-8333-333333333333','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
 ('44444444-4444-4444-8444-444444444444','ffffffff-ffff-4fff-8fff-ffffffffffff'),
 ('44444444-4444-4444-8444-444444444444','99999999-9999-4999-8999-999999999999');
INSERT INTO winter_hearth_review.bank_stacks(stack_id,account_id,item_id,quantity)
VALUES
 ('30000000-0000-4000-8000-000000000101','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','GREENWOOD_LOG',4500),
 ('30000000-0000-4000-8000-000000000102','ffffffff-ffff-4fff-8fff-ffffffffffff','IRONWOOD_LOG',250),
 ('30000000-0000-4000-8000-000000000103','99999999-9999-4999-8999-999999999999','FROSTFALL_CHRISTMAS_LIGHTS_2026',5);
INSERT INTO winter_hearth_review.guild_market(guild_id,logs,lights)
VALUES
 ('33333333-3333-4333-8333-333333333333',0,0),
 ('44444444-4444-4444-8444-444444444444',6000,620);
SQL

# First client locks account then donates 2k logs. Second tries another 2k.
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    BEGIN;
    SELECT pg_advisory_xact_lock(
      hashtextextended('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',2026));
    SELECT pg_sleep(1);
    SELECT winter_hearth_review.simulate_donation(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '33333333-3333-4333-8333-333333333333',
      'raced-logs-a','GREENWOOD_LOG',2000,
      '2026-12-08T12:00:00Z');
    COMMIT;
  " >"$tmp/account_a.log" 2>&1
) &
a=$!
sleep 0.2
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    SELECT winter_hearth_review.simulate_donation(
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '33333333-3333-4333-8333-333333333333',
      'raced-logs-b','GREENWOOD_LOG',2000,
      '2026-12-08T12:00:00Z');
  " >"$tmp/account_b.log" 2>&1
) &
b=$!
wait "$a"
if wait "$b"; then
  echo 'FAIL: two concurrent requests bypassed account-week cap' >&2; exit 1
fi
grep -q 'winter_hearth_account_log_week_cap' "$tmp/account_b.log" || {
  cat "$tmp/account_b.log" >&2; exit 1; }

account_count="$(psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT count(*) FROM winter_hearth_review.donation_receipts
 WHERE account_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';")"
donated="$(psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT donated_logs FROM winter_hearth_review.account_week_cap
 WHERE account_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
 AND week_start_utc='2026-12-07';")"
if [[ "$account_count" != '1' || "$donated" != '2000' ]]; then
  echo 'FAIL: concurrent account-week donation double-spent' >&2; exit 1
fi

# Two OTHER accounts complete independent tracks of a partially finished
# milestone in concurrent sessions; guild progress row serializes payouts.
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    BEGIN;
    SELECT 1 FROM winter_hearth_review.guild_market
     WHERE guild_id='44444444-4444-4444-8444-444444444444' FOR UPDATE;
    SELECT pg_sleep(1);
    SELECT winter_hearth_review.simulate_donation(
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      '44444444-4444-4444-8444-444444444444',
      'threshold-log-a','IRONWOOD_LOG',250,
      '2026-12-08T12:00:00Z');
    COMMIT;
  " >"$tmp/guild_a.log" 2>&1
) &
c=$!
sleep 0.2
(
  psql -X -v ON_ERROR_STOP=1 -Atc "
    SELECT winter_hearth_review.simulate_donation(
      '99999999-9999-4999-8999-999999999999',
      '44444444-4444-4444-8444-444444444444',
      'threshold-light','FROSTFALL_CHRISTMAS_LIGHTS_2026',5,
      '2026-12-08T12:00:00Z');
  " >"$tmp/guild_b.log" 2>&1
) &
d=$!
wait "$c"
wait "$d"
stage_count="$(psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT COUNT(*) FROM winter_hearth_review.milestone_receipts
 WHERE guild_id='44444444-4444-4444-8444-444444444444' AND threshold_percent=25;")"
progress="$(psql -X -v ON_ERROR_STOP=1 -Atc "
 SELECT logs||':'||lights||':'||treasury_gold
 FROM winter_hearth_review.guild_market
 WHERE guild_id='44444444-4444-4444-8444-444444444444';")"
if [[ "$stage_count" != '1' || "$progress" != '6250:625:10000' ]]; then
  echo "FAIL: parallel donations applied milestone or Guild Gold incorrectly: $stage_count, $progress" >&2
  exit 1
fi
echo 'PASS Winter Hearth PG17 concurrency: same-account weekly cap serialised, two-member final joint milestone rewarded 10k once, zero production Gold/items.'
