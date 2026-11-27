# Party Events V96–V97: deterministic replays and nonpaying review receipts
22 November 2026. **STRICTLY HIDDEN. DO NOT MERGE TO MAIN, STAGING/PRODUCTION, OR ENABLE REWARDS.** Child of V94/V95 #1636, which is itself stacked on V93 #1593. This is not a real Auth-backed, locked-source Postgres writer.

## V95 follow-up
The V95 audit literal type was initially widened to `string` and failed strict backend TypeScript. Fixed on #1636 at `5ce1ff9`. Exact-head parent hidden trait engine and economy workflows passed; mobile and generated Edge workflow still failed, independently blocking a release.

## V96 — double replay, no victory certificates
New `weekly-party-event-replay-v96.ts` runs the exact frozen V92 engine twice, each with mandatory QA-only persisted verifier callback, ties both outputs to V95 review digests, verifies frozen source remained unchanged, rejects any differing replay, and returns a deliberately nonpaying evidence envelope. Explicit fields: `independentlyCertified=false`, `claimable=false`, `rewardGranted=false`. It is NOT a V87 certificate; no real Supabase join, signed receipt, DB replay or item custody. A callback supplied by a test is not an independent authority.

## V97 — nonpaying transaction contract and idempotence
New `weekly-party-event-review-ledger-v97.ts` defines an **injected** transaction-port contract for a review-only evidence receipt, indexed by a canonical encounter ID digest. Original and repeated same-source reviews must match. Reusing an encounter with different event ID or altered audit digest is rejected. A read-after-write check rejects wrong/missing receipt. Strict nonpaying boolean flags and private test mode remain enforced.

The **fake transaction adapter in regression tests** serializes review-key callbacks and simulates insert failures, rollback, simultaneous repeated requests, lost acknowledgment/retry, tampered audit digest, cross-event encounter reuse and blocked release mode. There is no SQL DDL, real PostgreSQL row lock, Auth, actual V69/V70 reward grant, or staging/production migration. Passing these tests cannot certify real concurrency, persistence, account erasure or paid delivery.

## Build/test scope
- `backend/src/server/party/weekly-party-event-replay-v96.ts`
- `backend/src/server/party/weekly-party-event-review-ledger-v97.ts`
- V92 battle regression reused: `backend/src/server/party/__tests__/weekly-party-event-eq2-traits-v92.ts`
- Hidden V2 trait engine workflow includes both paths and release fences.
- Exact-head V96/V97 CI not yet known at authoring. Check before treating this pass as validated.
- No Boss HP, tier, preparation, equipment stat, companion, trait, economic amount or app screen change.

## Next steps (V98+; no blind rollout)
1. Reconcile updated canonical Party #1416 with the hidden latest Combat/Equipment/Skills 2.0 branch. Preserve frozen party membership and at-most-two-signature-equipment rules.
2. Replace mock source and transaction callbacks with one audited private PG17 reader and one serializable, account-bound, exactly-once persisted V87 victory/tier certificate issuer. Draw canonical account identity, character-owned gear, week, preparations and existing V11/V18/V23 sources from DB, not HTTP.
3. End-to-end two-session PG17 tests on a **disposable** fixture: collision, rollback, lost COMMIT acknowledgement, erasure cascade, wallet/inventory custody, and physical V69/V70/V86 delivery with real reward ports. The V95–V97 read-only reviews must never be accepted as payable proofs.
4. Analyze Party class/spec balance with real tier-legal item/profession progression and valid companion/gem loadouts at fixed family/tier/difficulty/party-size buckets. Optimize four bosses for multiple viable counters; do not force Tank/Support.
5. Seek owner approval on actual compact Party Events UI and all themes before mobile layout changes. Eight locales and Android accessibility/device validation are separate release gates.

**RELEASE HOLD. FLAGS OFF. NO MAIN MERGE.**
