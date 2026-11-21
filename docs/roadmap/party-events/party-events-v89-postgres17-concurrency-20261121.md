# V89 — Party Event chest concurrency, retries and exact PostgreSQL 17.6 QA

**21 Nov 2026. Hidden only, review-only. No production/staging SQL installed or user data touched.**

## Why a V89 pass

V88's V87 canonical proof → V69 frozen roll → V70 one-session settlement → V86 real resources → V80 history is conceptually atomic, but a disposable **single-connection PGlite** test cannot prove two players/device requests do not race on PostgreSQL 17.6. V70 already owns an account-wide fence and uses SERIALIZABLE for Party sources. Competing calls may receive PostgreSQL **40001** serialization failures or **40P01** deadlocks even when one of them commits. An upper-layer bounded retry is required to transparently resume from the durable source receipt, not partially re-run one currency or item operation.

## V89 retry coordinator

`backend/src/server/party/weekly-party-event-claim-retry-v89.ts` implements an unmounted private wrapper around the **entire existing V69 opener**. It:

- Accepts only an authenticated Party Event chest source key, never a world boss or unrelated queue.
- Retries at most **three whole V69→V70 transactions**, using the **same immutable authenticated source key and private entropy**. Every retry acquires a fresh V70 DB connection and begins a new SQL transaction; it does not duplicate individual reward legs.
- Retries ONLY explicit trusted PostgreSQL SQLSTATE `40001` or `40P01`. Malformed source, disputed victory/tier, full Inventory/Bank, missing receipt, EQ2 blocked, SQL `23505`, lock timeouts, other errors and rollback failure fail immediately. A message containing the string "40001" is not sufficient.
- Preserves error identity at retry exhaustion. A committed lost-ACK replay follows V69's existing "read frozen source receipt first, never reroll" path.
- Is QA-only, unmounted and gated by `PARTY_EVENT_CLAIM_RETRY_V89_RELEASED=false` and a hard `NODE_ENV==='production'` rejection.

The strict TS regression `weekly-party-event-claim-retry-v89.ts` verifies three tries, exhausted error, no retry for policy/identity conditions, and no production path.

## PostgreSQL 17.6 two-session test

`backend/tests/party-event-postgres17-v89.mjs` is a **CI-only fixture**. The new separate `party-pg17-two-session-v89` Actions job boots an **ephemeral local PostgreSQL 17.6 container**, compiles the exact hidden TypeScript, and installs a pinned `pg` test driver **outside the project** in a disposable runner temp directory. The test rejects any PG URL except localhost port 54329/postgres and never reads credentials or connects to Supabase.

It exercises the real V70/V61/V65/V86/V87 review-only DDL and V69/V70/V88/V89 TypeScript adapters with independent `pg.Pool` sessions and the V80 history writer:

1. Two concurrent claims of the **same** Participation Chest; exactly one `replayed:false`, one `replayed:true`, one immutable V70 source receipt, one V61 receipt, four V86 resources, five V70 grant legs, one Inbox row, single +8 Sigil/+200 Gold/+2 Gem Dust/+4 Essence award.
2. Reopening the paid receipt after legitimate currency/material spending returns historical payout without additional reward.
3. Full Inventory and Bank reject a fresh Preparation Chest; V70/V61/V65/audit/Inbox and Gold all roll back.
4. Restoring capacity, then running simultaneous **different** Preparation and Finale chest claims for the same account; both settle exactly once, and final totals reflect 8+10+16 Sigils and corresponding four physical resource legs.
5. Every checked-out connection must release; the test asserts that at least two clients were active simultaneously.

**This is real multi-session PostgreSQL, but the source certificate producer remains mocked as synthetic fixture rows in the disposable DB**. The test does not certify a real boss victory, authorize the source certificate, validate a live Android inventory state or mint Equipment 2.0 gear.

## Status and remaining blockers

All V89 code/tests/CI are authored but **not verified passing** as of this commit. The hidden PR currently trails `main`; do not imply it is mergeable or release ready.

Before any activation: exact-head TypeScript and both PGlite/PG17 runs green; audited independent V87 victory and tier certificate production; deployable schema review and staging Inbox parity; real EQ2 custody/PE_ template issuance; multi-character save/load and policy testing; private role and account erasure; full Android device QA and user-approved UI/themes.

**Release: HOLD. No feature flags toggled, no route exposed, no main merge, no mobile UI, no production/staging DB migration or writes.**
