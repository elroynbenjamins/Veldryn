#!/usr/bin/env bash
# PRIVATE disposable PG17 QA ONLY. Never execute against staging/production.
set -euo pipefail
[[ "${COMBAT_V2_DISPOSABLE_DB:-}" == "YES_TEST_DATABASE" ]] ||
 { echo 'Disposable DB opt-in required' >&2; exit 1; }
[[ "${PGDATABASE:-}" == "combat_v2_test" ]] ||
 { echo 'Refusing non-disposable database' >&2; exit 1; }
cd "$(dirname "$0")/../.."
run(){ psql -X -v ON_ERROR_STOP=1 -qAt "$@"; }
run <<'SQL'
create schema if not exists private;
create table private.combat_v2_reward_qa_sources_v1(
 grant_source_id text primary key,
 account_id uuid not null,character_id uuid not null,
 kind text not null check(kind in ('gold','skill_xp','companion_essence','material')),
 resource_id text not null,amount bigint not null check(amount > 0)
);
create table private.combat_v2_reward_qa_balances_v1(
 account_id uuid not null,character_id uuid not null,
 kind text not null,resource_id text not null,
 balance bigint not null default 0 check(balance >= 0),
 primary key(account_id,character_id,kind,resource_id)
);
create table private.combat_v2_reward_qa_inbox_v1(
 source_key text primary key,account_id uuid not null,
 character_id uuid not null,receipt_digest text not null
);
alter table private.combat_v2_reward_qa_sources_v1 enable row level security;
alter table private.combat_v2_reward_qa_balances_v1 enable row level security;
alter table private.combat_v2_reward_qa_inbox_v1 enable row level security;
revoke all on private.combat_v2_reward_qa_sources_v1 from public,anon,authenticated;
revoke all on private.combat_v2_reward_qa_balances_v1 from public,anon,authenticated;
revoke all on private.combat_v2_reward_qa_inbox_v1 from public,anon,authenticated;
SQL
# Unique source-key insert + balance increment in one transaction. Same SQL
# semantics as the private QA transaction-local writer; safe synthetic values.
grant(){
 local source="$1" amount="$2"
 run <<SQL
begin;
with inserted as (
 insert into private.combat_v2_reward_qa_sources_v1(
 grant_source_id,account_id,character_id,kind,resource_id,amount)
 values ('$source',
 '00000000-0000-4000-a000-000000000011'::uuid,
 '00000000-0000-4000-a000-000000000022'::uuid,'gold','gold',$amount)
 on conflict (grant_source_id) do nothing
 returning account_id,character_id,kind,resource_id,amount
)
insert into private.combat_v2_reward_qa_balances_v1
 (account_id,character_id,kind,resource_id,balance)
 select account_id,character_id,kind,resource_id,amount from inserted
 on conflict(account_id,character_id,kind,resource_id)
 do update set balance=private.combat_v2_reward_qa_balances_v1.balance+excluded.balance;
commit;
SQL
}
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
pids=()
for i in $(seq 1 16); do
 (grant 'combat-v2:solo:QA_PG_LEDGER_1:0' 17 >"$tmpdir/$i.out" 2>"$tmpdir/$i.err") &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
[[ "$(run -c "select count(*) from private.combat_v2_reward_qa_sources_v1;")" == "1" ]]
[[ "$(run -c "select balance from private.combat_v2_reward_qa_balances_v1;")" == "17" ]]
# Retry keeps original ledger value and cannot issue extra credit.
grant 'combat-v2:solo:QA_PG_LEDGER_1:0' 17 >/dev/null
[[ "$(run -c "select balance from private.combat_v2_reward_qa_balances_v1;")" == "17" ]]
# A new source partially failing in the transaction must NOT leak a source row.
if run <<'SQL' >"$tmpdir/fail.out" 2>"$tmpdir/fail.err"
begin;
insert into private.combat_v2_reward_qa_sources_v1(
 grant_source_id,account_id,character_id,kind,resource_id,amount)
 values('combat-v2:solo:QA_PG_ROLLBACK:0',
 '00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022','gold','gold',88);
insert into private.combat_v2_reward_qa_balances_v1(
 account_id,character_id,kind,resource_id,balance)
 values('00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022','gold','gold',-5);
commit;
SQL
then echo 'Expected rollback did not fail' >&2; exit 1; fi
[[ "$(run -c "select count(*) from private.combat_v2_reward_qa_sources_v1 where grant_source_id='combat-v2:solo:QA_PG_ROLLBACK:0';")" == "0" ]]
[[ "$(run -c "select balance from private.combat_v2_reward_qa_balances_v1;")" == "17" ]]
# Inbox source replay: first insert, retry does not create duplicates.
run <<'SQL'
insert into private.combat_v2_reward_qa_inbox_v1
 (source_key,account_id,character_id,receipt_digest)
 values('combat-v2:solo:QA_PG_LEDGER_1',
 '00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022',repeat('a',64))
 on conflict(source_key) do nothing;
insert into private.combat_v2_reward_qa_inbox_v1
 (source_key,account_id,character_id,receipt_digest)
 values('combat-v2:solo:QA_PG_LEDGER_1',
 '00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022',repeat('a',64))
 on conflict(source_key) do nothing;
SQL
[[ "$(run -c "select count(*) from private.combat_v2_reward_qa_inbox_v1;")" == "1" ]]
acl="$(run -c "select
 has_table_privilege('anon','private.combat_v2_reward_qa_sources_v1','SELECT')::int,
 has_table_privilege('authenticated','private.combat_v2_reward_qa_balances_v1','UPDATE')::int,
 has_table_privilege('anon','private.combat_v2_reward_qa_inbox_v1','INSERT')::int;")"
[[ "$acl" == "0|0|0" ]] || { echo "Unexpected QA grant exposure $acl" >&2; exit 1; }
echo 'PASS: disposable PG17 16-way source concurrency, exact balance once, rollback, Inbox source uniqueness, RLS'

# FULL atomic QA chain: the prior disposable migration script prepared
# QA_RACE. This is NOT a real player reward or production settlement.
run <<'SQL'
create table private.combat_v2_solo_reward_receipts_v1(
 encounter_id text primary key
   references private.combat_v2_solo_snapshots_v1(encounter_id),
 account_id uuid not null,character_id uuid not null,
 source_key text not null unique,snapshot_digest text not null,
 outcome_digest text not null,grant_digest text not null,
 receipt_digest text not null,policy_id text not null,
 receipt jsonb not null
);
alter table private.combat_v2_solo_reward_receipts_v1 enable row level security;
revoke all on private.combat_v2_solo_reward_receipts_v1 from public,anon,authenticated;
SQL
full_claim(){
 run <<'SQL'
begin;
-- All concurrent callers lock exactly the same immutable snapshot first.
select encounter_id from private.combat_v2_solo_snapshots_v1
 where encounter_id='QA_RACE' for update;
with inserted as (
 insert into private.combat_v2_reward_qa_sources_v1(
 grant_source_id,account_id,character_id,kind,resource_id,amount)
 values('combat-v2:solo:QA_RACE:0',
 '00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022','gold','gold',31)
 on conflict (grant_source_id) do nothing
 returning account_id,character_id,kind,resource_id,amount
)
insert into private.combat_v2_reward_qa_balances_v1
 (account_id,character_id,kind,resource_id,balance)
 select account_id,character_id,kind,resource_id,amount from inserted
 on conflict(account_id,character_id,kind,resource_id)
 do update set balance=private.combat_v2_reward_qa_balances_v1.balance+excluded.balance;
insert into private.combat_v2_reward_qa_inbox_v1(
 source_key,account_id,character_id,receipt_digest)
 values('combat-v2:solo:QA_RACE',
 '00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022',repeat('d',64))
 on conflict(source_key) do nothing;
insert into private.combat_v2_solo_reward_receipts_v1(
 encounter_id,account_id,character_id,source_key,snapshot_digest,
 outcome_digest,grant_digest,receipt_digest,policy_id,receipt)
 select 'QA_RACE',s.account_id,s.character_id,
 'combat-v2:solo:QA_RACE',s.snapshot_digest,
 repeat('b',64),repeat('c',64),repeat('d',64),'qa-atomic-receipt-v1',
 jsonb_build_object('encounterId','QA_RACE','sourceKey','combat-v2:solo:QA_RACE')
 from private.combat_v2_solo_snapshots_v1 s where s.encounter_id='QA_RACE'
 on conflict(encounter_id) do nothing;
commit;
SQL
}
pids=()
for i in $(seq 1 16); do
 (full_claim >"$tmpdir/claim-$i.out" 2>"$tmpdir/claim-$i.err") &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
[[ "$(run -c "select balance from private.combat_v2_reward_qa_balances_v1 where kind='gold';")" == "48" ]]
[[ "$(run -c "select count(*) from private.combat_v2_reward_qa_sources_v1 where grant_source_id='combat-v2:solo:QA_RACE:0';")" == "1" ]]
[[ "$(run -c "select count(*) from private.combat_v2_solo_reward_receipts_v1 where encounter_id='QA_RACE';")" == "1" ]]
[[ "$(run -c "select count(*) from private.combat_v2_reward_qa_inbox_v1 where source_key='combat-v2:solo:QA_RACE';")" == "1" ]]
# A failure at Inbox after applying a valid balance update rolls back
# BOTH the source and credit.
if run <<'SQL' >"$tmpdir/inbox-fail.out" 2>"$tmpdir/inbox-fail.err"
begin;
insert into private.combat_v2_reward_qa_sources_v1(
 grant_source_id,account_id,character_id,kind,resource_id,amount)
 values('combat-v2:solo:QA_FAIL_INBOX:0',
 '00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022','gold','gold',9);
update private.combat_v2_reward_qa_balances_v1 set balance=balance+9
 where kind='gold' and resource_id='gold';
insert into private.combat_v2_reward_qa_inbox_v1(
 source_key,account_id,character_id,receipt_digest)
 values('combat-v2:solo:QA_FAIL_INBOX',
 '00000000-0000-4000-a000-000000000011',
 '00000000-0000-4000-a000-000000000022',null);
commit;
SQL
then echo 'Inbox failure did not trigger transaction rollback' >&2; exit 1; fi
[[ "$(run -c "select count(*) from private.combat_v2_reward_qa_sources_v1 where grant_source_id='combat-v2:solo:QA_FAIL_INBOX:0';")" == "0" ]]
[[ "$(run -c "select balance from private.combat_v2_reward_qa_balances_v1 where kind='gold';")" == "48" ]]
[[ "$(run -c "select count(*) from private.combat_v2_solo_reward_receipts_v1;")" == "1" ]]
acl_receipt="$(run -c "select has_table_privilege('authenticated','private.combat_v2_solo_reward_receipts_v1','SELECT')::int;")"
[[ "$acl_receipt" == "0" ]]
echo 'PASS: PG17 16 concurrent end-to-end snapshot/credit/Inbox/receipt claims and rollback after Inbox failure'

