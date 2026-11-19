# World Boss V72 — private milestone source for shared chest settlement

**19 November 2026. Hidden integration draft only. No event activation, actual payout, SQL deployment, main merge, or Android release.**

## Fixed blocker: no-gear chests

V69's original custody check required an up-front trusted source to have `equipmentDeliveryMode=null` whenever the random roll missed equipment. But World Boss sources must declare prospective account-bound delivery **before** V69 rolls, so the normal **99% no-gear case** rejected an otherwise earned chest, paying none of its fixed rewards. Party Event gear misses had the same problem.

V69 now validates the pre-roll source policy and freezes a **null equipment destination in the immutable receipt on a miss**. It still enforces account-unclaimed World Boss custody for a gear hit, validates character ownership for Party gear hits, and never creates phantom gear on a miss. The guarantee/Inbox paths, exactly-once receipt-first ordering, physical readback, serializable transaction and release flags are preserved. Regression coverage uses the real V68 legacy odds/table contract, not a fabricated 100% hit.

## V72 proof adapter

`backend/src/server/loot/world-boss-chest-source-v72.ts` maps a canonical V59 read from V18/V27/V28 to V69's trusted source:
- Auth-derived lowercase account identity and exact `world-boss:event:account:kind` key; malformed or foreign requests fail **before** a private read.
- Reconstruct the boss from a locked authoritative event row, not from client JSON; require V59's **committed donations**, **three replay-verified attempts**, or **70% realm HP plus a proven personal attack** as appropriate.
- Preserve the **three earned chests max**, independent **1% gear roll per chest**, ten boss-specific gathering pieces, and original fixed Gold/Essence/Dust amounts. No World Sigils are minted by a chest.
- Prospective equipment delivery is `account_unclaimed` with no character redirect. The shared V69/V70 layer freezes null custody if the gear roll misses.
- Run only as an injected **same-connection** source reader under V70's account inventory lock. It is not a route, a DB reader implementation, or an independently trusted proof.
- Guard all calls against production use; V72 is disabled even if its QA opt-in is supplied while `NODE_ENV=production`.

`backend/src/server/loot/__tests__/world-boss-chest-source-v72.ts` exercises all three milestone kinds, resource and one-percent parity, cross-account and malformed selections, unearned sources, missing proven attacks, 70%-threshold edge and the production-disabled path.

## Remaining mandatory gates

1. Build and audit the actual V70 **same-transaction private PostgreSQL source adapter**, including V57 erasure fence, event status, and V18/V27/V28 committed proof and locks; V72's injected read is not implemented by itself.
2. Unify V61 chest receipts with V70 identity and account-erasure/retention policy (#1348); avoid a double-claim path. Choose one canonical grant writer.
3. Implement actual Gold/Gem Dust/Tempering Dust/Companion Essence ledger credits and a durable account Inbox; V70's physical ports are still unimplemented.
4. Connect World Boss `PE_`-independent gathering gear to real Equipment 2.0 item instances and exact canonical T1–T9 stats/rolls and account-bound storage. **V70 still refuses gear hits until verified.**
5. Run full CI on exact head; real two-connection PG16 concurrency/rollback/fault tests, Android small-screen/TalkBack/background QA and privacy/security review.
6. Integrate trusted Auth/action transport, Monday global schedule, five-day War Camp, continuous Saturday–Sunday UTC window, three account-wide attempts, operator pause and first-live hotfix controls before approval.

**This draft intentionally does not run a staged boss battle rehearsal, create a live event, or change release flags.**
