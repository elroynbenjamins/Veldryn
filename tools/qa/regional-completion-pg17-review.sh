#!/usr/bin/env bash
# Against a newly created disposable DB only.
set -euo pipefail
: "${PGDATABASE:?Set disposable PGDATABASE}"
[[ "$PGDATABASE" == regional_completion_review ]] || { echo "Unexpected DB name"; exit 1; }
p() { psql -X -v ON_ERROR_STOP=1 -At "$@"; }
service() { p -c "SET ROLE completion_review_service;" -c "$1" | tail -n 1; }
denied() {
 local msg="$1"; shift
 local out
 if out=$("$@" 2>&1); then echo "Unexpected success: $out"; exit 1; fi
 grep -F "$msg" <<< "$out"
}
eq() { [[ "$1" == "$2" ]] || { printf 'Expected %s, got %s\n' "$2" "$1"; exit 1; }; }
p -f tools/qa/regional-completion-pg17-review.sql
p <<'SQL'
INSERT INTO completion_review.owner_fixture VALUES ('A1','A'),('A2','A'),('B1','B');
INSERT INTO completion_review.terminal_fixture
(receipt_id,account_id,character_id,boss_id,level_at_start,input_digest,event_digest,kind,ruleset,reason,victory,enemy_hp,player_hp,completed_at_ms)
SELECT id,a,c,b,l,repeat('a',64),repeat('b',64),'regional_completion','completion-v2-review',r,ok,eh,ph,1000
FROM (VALUES ('K','A','A1','FALLEN_KNIGHT',25,'victory',true,0,20),
 ('S','A','A1','BOSS_002',50,'victory',true,0,20),('F','A','A1','BOSS_003',75,'victory',true,0,20),
 ('R','A','A1','FALLEN_KNIGHT',25,'victory',true,0,20),('W','A','A2','FALLEN_KNIGHT',25,'wipe',false,8,0),
 ('L','A','A2','FALLEN_KNIGHT',24,'victory',true,0,20)) v(id,a,c,b,l,r,ok,eh,ph);
SQL
denied 'completion_region_locked' service "SELECT * FROM completion_review.settle('A','A1','S')"
denied 'completion_character_not_owned' service "SELECT * FROM completion_review.settle('B','A1','K')"
denied 'invalid_completion_victory' service "SELECT * FROM completion_review.settle('A','A2','K')"
denied 'invalid_completion_victory' service "SELECT * FROM completion_review.settle('A','A2','W')"
denied 'invalid_completion_victory' service "SELECT * FROM completion_review.settle('A','A2','L')"
denied 'completion_receipt_not_found' service "SELECT * FROM completion_review.settle('A','A1','missing')"
eq "$(p -c 'SELECT count(*) FROM completion_review.ledger')" 0
denied 'permission denied' p -c "SET ROLE completion_review_client; SELECT * FROM completion_review.settle('A','A1','K')"
denied 'permission denied' service "UPDATE completion_review.terminal_fixture SET event_digest=repeat('c',64) WHERE receipt_id='K'"
denied 'permission denied' service "DELETE FROM completion_review.owner_fixture WHERE character_id='A1'"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
pids=()
for i in {1..8}; do
 service "SELECT * FROM completion_review.settle('A','A1','K')" > "$tmp/$i" &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
eq "$(grep -hxc 'f|1|t|f|f|f|f|f' "$tmp/"* | awk '{s+=$1} END{print s}')" 1
eq "$(grep -hxc 't|1|t|f|f|f|f|f' "$tmp/"* | awk '{s+=$1} END{print s}')" 7
eq "$(p -c 'SELECT count(*) FROM completion_review.claim')" 1
# Force an exception after claim insertion but before ledger revision update.
p <<'SQL'
CREATE FUNCTION completion_review.fail_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'forced_revision_failure'; END $$;
CREATE TRIGGER fail_update BEFORE UPDATE ON completion_review.ledger FOR EACH ROW EXECUTE FUNCTION completion_review.fail_update();
SQL
denied 'forced_revision_failure' service "SELECT * FROM completion_review.settle('A','A1','S')"
eq "$(p -c "SELECT count(*) FROM completion_review.claim WHERE receipt_id='S'")" 0
eq "$(p -c "SELECT revision FROM completion_review.ledger WHERE character_id='A1'")" 1
p -c "DROP TRIGGER fail_update ON completion_review.ledger; DROP FUNCTION completion_review.fail_update()"
eq "$(service "SELECT * FROM completion_review.settle('A','A1','S')")" 'f|2|t|t|f|f|f|f'
eq "$(service "SELECT * FROM completion_review.settle('A','A1','F')")" 'f|3|t|t|t|f|f|f'
eq "$(service "SELECT * FROM completion_review.settle('A','A1','R')")" 't|4|t|t|t|f|f|f'
eq "$(service "SELECT * FROM completion_review.settle('A','A1','R')")" 't|4|t|t|t|f|f|f'
eq "$(p -c 'SELECT count(*) FROM completion_review.claim')" 4
denied 'duplicate key' p -c "INSERT INTO completion_review.terminal_fixture SELECT receipt_id,'A','A2',boss_id,level_at_start,input_digest,event_digest,kind,ruleset,reason,victory,enemy_hp,player_hp,completed_at_ms FROM completion_review.terminal_fixture WHERE receipt_id='K'"
echo 'PG17 regional completion: 8 concurrent sessions, one first clear, 7 replays, rollback, access order, ownership, receipt uniqueness and restricted roles passed.'
