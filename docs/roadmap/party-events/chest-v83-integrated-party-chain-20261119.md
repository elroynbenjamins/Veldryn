# Party Events V83 — integrated canonical chest-to-Inbox verification

**19 November 2026. Hidden QA only; not a live reward writer.**

The existing V77 (canonical weekly Party source), V69 (shared chest
settlement), V70 (single-connection PostgreSQL receipt/leg transaction),
and V80 (history-only Inbox) modules were previously validated mostly
in isolated unit tests. V83 adds one **disposable PGlite integration
fixture** in `backend/tests/chest-postgres-store-v70.mjs`.

It exercises the entire **V77 → V69 → V70 → V80** path for the canonical
Adventure Chest:
- DB-backed V11 party/roster rows and a V61 verified source proof;
- V51 original 12% equipment chance and four exact guaranteed rewards,
  with deterministic test entropy selecting a legitimate gear **miss**;
- the real V70 frozen receipt, four grant legs, Inbox leg and one physical
  legacy `private.reward_inbox_v1` row, all in the same SQL transaction;
- legacy Inbox safety: non-claimable history `gift` transport, no
  attachments and no routing to Party Contract claims;
- first claim and exact immutable replay under the V69 gateway;
- deletion of physical Inbox row causes replay to **fail closed** without
  another credit (receipt/guarantee ledger remains frozen).

**Not yet verified:** the guaranteed wallet/resource writers are
disposable `v70_test_guarantees` rows, **not** real Gold/Party Sigils/
Gem Dust/Companion Essence credits; no pending Inbox claims or actual
Equipment 2.0 item issuance. V61 canonical proof is assembled by the
test fixture, not fetched through a deployable private source loader.
No real PG16 two-client race, staging/production SQL, or mobile payout
activation occurred. Release remains **HOLD**.
