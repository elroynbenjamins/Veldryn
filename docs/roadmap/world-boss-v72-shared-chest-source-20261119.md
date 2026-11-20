# World Boss V72–V73 — private milestone and PostgreSQL source for shared chest settlement

**19 November 2026. Hidden integration draft only. No event activation, actual payout, SQL deployment, main merge, or Android release.**

## Fixed blocker: no-gear chests

V69's original custody check required an up-front trusted source to have `equipmentDeliveryMode=null` whenever the random roll missed equipment. But World Boss sources must declare prospective account-bound delivery **before** V69 rolls, so the normal **99% no-gear case** rejected an otherwise earned chest, paying none of its fixed rewards. Party Event gear misses had the same problem.

V69 now validates the pre-roll source policy and freezes a **null equipment destination in the immutable receipt on a miss**. It still enforces account-unclaimed World Boss custody for a gear hit, validates character ownership for Party gear hits, and never creates phantom gear on a miss. The guarantee/Inbox paths, exactly-once receipt-first ordering, physical readback, account-row serialization, and release flags are preserved. The V73 follow-up uses READ COMMITTED only for World Boss sources to support the V57 erasure guard; other chest sources retain SERIALIZABLE; it is **not a production approval**. Regression coverage uses the real V68 legacy odds/table contract, not a fabricated 100% hit.

## V72 proof adapter

`backend/src/server/loot/world-boss-chest-source-v72.ts` maps a canonical V59 read from V18/V27/V28 to V69's trusted source:
- Auth-derived lowercase account identity and exact `world-boss:event:account:kind` key; malformed or foreign requests fail **before** a private read.
- Reconstruct the boss from a locked authoritative event row, not from client JSON; require V59's **committed donations**, **three replay-verified attempts**, or **70% realm HP plus a proven personal attack** as appropriate.
- Preserve the **three earned chests max**, independent **1% gear roll per chest**, ten boss-specific gathering pieces, and original fixed Gold/Essence/Dust amounts. No World Sigils are minted by a chest.
- Prospective equipment delivery is `account_unclaimed` with no character redirect. The shared V69/V70 layer freezes null custody if the gear roll misses.
- Run only as an injected **same-connection** source reader under V70's account inventory lock. It is not a route, a DB reader implementation, or an independently trusted proof.
- Guard all calls against production use; V72 is disabled even if its QA opt-in is supplied while `NODE_ENV=production`.

`backend/src/server/loot/__tests__/world-boss-chest-source-v72.ts` exercises all three milestone kinds, resource and one-percent parity, cross-account and malformed selections, unearned sources, missing proven attacks, 70%-threshold edge and the production-disabled path.

## V73: pinned SQL, lock ordering and privacy compatibility

**Verified source code, not yet verified by exact-head CI or a real two-session PostgreSQL 16 run.**

- `backend/src/server/loot/world-boss-chest-pg-source-v73.ts` now supplies the **actual parameterized V17/V27/V28 SQL reader** on the pinned V70 transaction. It selects the authoritative event/boss/current HP, shared War Camp tiers and personal committed donations, and separately matches V28 replay digests to committed V17 attempts by **event + owner + request + digest**.
- `world-boss-chest-source-v72.ts` now explicitly passes a V70 SQL transaction client into the read port; a different pool/network connection cannot satisfy its signature.
- The V70 store must **lock the event first, then invoke V57's erasure-fence guard, then lock the shared account chest inventory row** before reading existing receipts or calculating new drops. World Boss sources without this preflight are explicitly rejected before connecting.
- **Isolation mismatch resolved in the hidden proposal:** V57's existing function rejects `SERIALIZABLE` because a stale snapshot could evade an erasure fence. V70 now uses `BEGIN ISOLATION LEVEL READ COMMITTED` **only for World Boss sources**; Party Event and future generic chests retain SERIALIZABLE, preserving one pinned connection, the source event lock, V57 advisory account lock, V70 account row lock, unique immutable receipts and physical readbacks. All other currency/inventory writers must adopt the same account lock or the release remains blocked.
- The dedicated hidden workflow compiles/tests V73 and runs a **disposable PGlite** exercise with real parameterized V73 SQL: 99% no-gear outcome, four resource guarantees + one Inbox, receipt replay, mismatched immutable digest, 69.9% community damage, absent privacy preflight, and erasure-fenced replay denial. This uses **synthetic proof tables and a test-only V57 lookalike**, not a live game battle or the production migration.
- V73 is deliberately unmounted and production-denied. V70 has no actual grant deployment or approved physical inventory writer; a 1% gear hit still rolls back entirely until EQ2 custody is integrated.

**Caution:** The existing `private.world_boss_v57_assert_write_open` is a private SQL draft; nothing here installs it in staging or production. Full V57 schema grant, retention, cross-process lock sequencing and account deletion must be audited before launch.

## Remaining mandatory gates

1. Validate the new V73 **same-transaction PostgreSQL source adapter and V57 event-first guard** against the complete canonical SQL drafts on two independent real PostgreSQL 16 sessions; audit permissions, lock order, rollback, private status and account deletion races.
2. Unify V61 chest receipts with V70 identity and account-erasure/retention policy (#1348); avoid a double-claim path. Choose one canonical grant writer.
3. Implement actual Gold/Gem Dust/Tempering Dust/Companion Essence ledger credits and a durable account Inbox; V70's physical ports are still unimplemented.
4. Connect World Boss `PE_`-independent gathering gear to real Equipment 2.0 item instances and exact canonical T1–T9 stats/rolls and account-bound storage. **V70 still refuses gear hits until verified.**
5. Run full CI on exact head; real two-connection PG16 concurrency/rollback/fault tests, Android small-screen/TalkBack/background QA and privacy/security review.
6. Integrate trusted Auth/action transport, Monday global schedule, five-day War Camp, continuous Saturday–Sunday UTC window, three account-wide attempts, operator pause and first-live hotfix controls before approval.

**This draft intentionally does not run a staged boss battle rehearsal, create a live event, or change release flags.**
