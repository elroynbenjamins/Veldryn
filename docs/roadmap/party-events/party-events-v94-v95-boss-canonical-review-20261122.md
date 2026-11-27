# Party Events 2.0 V94–V95 — strict authored boss + nonpaying combat audit
**22 Nov 2026 — PRIVATE DRAFT / RELEASE HOLD.** Child of hidden Party V93 #1593, **not main**. No live routes, Android UI, migrations, economy changes, world-boss code, payout, feature flag activation or merges.

## V94 — canonical four-family boss verification
Previous V92 validation required correct family, two IDs, phase thresholds and safe upper bounds, but accepted **some altered values inside those bounds**, such as an extra tag, easier cast cooldown, changed accuracy or an underpowered shield. For independently replayed reward battles, a substituted boss must be rejected even if the change helps players.

V94 reconstructs the complete authoritative existing V4 numeric boss + existing V90 family kit using the frozen server witness and the existing V90 authoring function, then compares the strict, key-order-independent full object digest. Full stats, phase effects, ability effects/cast timings/targets, tags and unexpected extra fields must match. The previous safe-budget gate remains as a first fence. Four adversarial tests verify previously accepted within-bounds mutations now fail. **No actual HP/attack/defense/ability numbers were tuned.**

## V95 — read-only, deliberately nonclaimable encounter audit
A new server-private `reviewPartyEventCombatResultV95` creates a stable QA envelope binding frozen event/account/character/item-revision witness, encounter input, complete event timeline (in bounded hash chunks), final outcome, individual damage/heal/shield-created/taken/interrupt metrics and a canonical audit digest.

It rejects wrong roster source, mismatched character receipts, false winner flag, invalid duration and malformed contribution metrics. Repeat simulation yields the same digest; tampered contribution values change it. Audit explicitly says `independentlyCertified=false`, `claimable=false`, `rewardGranted=false`. This **does not issue V87 certificates** and must never be consumed by V69/V70 payouts. Tests cover deterministic replay, account spoofing and tampering.

## Source/testing
- V94 check: `backend/src/server/party/weekly-party-event-eq2-traits-v92.ts`.
- V95 review-only module: `backend/src/server/party/weekly-party-event-result-audit-v95.ts`.
- Shared adversarial regression in `backend/src/server/party/__tests__/weekly-party-event-eq2-traits-v92.ts`.
- Existing hidden Combat/Equipment trait-engine workflow includes V94 and V95 release-off guards.
- Exact new PR-head CI is **not yet independently verified**. Existing V93 #1593 private engine passed, while broader parent Edge/mobile/Combat checks were failing. Do not transfer prior green status to this branch.

## Next recommended engineering steps
1. Replace the simulated bool persistence callback with an actual server-owned one-transaction PostgreSQL 17.6 loader/validator for V11/V18/V23/V87, roster/receipts, chosen two signature traits, canonical equipment and stage-3 preparation. No client proof.
2. Run an **independent** Day 8 replay of the sealed battle and grant a separately persisted V87 outcome with exactly-once semantics; keep V95 as QA-only.
3. Reconcile and test the full V87→V69→V70→V86 Gold, Sigil, XP, physical Equipment 2.0 item, Inbox and erasure flow in two PostgreSQL sessions. A crash/retry may not reroll or duplicate rewards.
4. Expand tier/difficulty/size-controlled balance, counterplay, seven-day adventure participation and offline/autosave/disconnect cases. No blind boss nerfs from pooled synthetic win rates.
5. Present compact mobile Party Events screen and eight localized/theme previews for explicit owner design approval **before UI implementation**. Release only alongside coordinated 2.0.

**HOLD:** no production/staging SQL, real rewards, app version or feature activation.
