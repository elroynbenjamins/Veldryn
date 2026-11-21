# Party Events V86 — hidden real guaranteed-reward transaction draft

**21 November 2026 — DESIGN / QA ONLY. No production or staging writes. No user-visible activation.**

## Decision: one settled chest transaction

Party chests use the shared V69 HMAC/receipt and V70 **one pinned SERIALIZABLE transaction**, not a new independently paying endpoint. V86 is an injected, server-only `ChestPhysicalPortsV70` implementation for the four existing V51 Party Event chest guarantees.

The same locked account/source transaction now models the full **no-equipment-roll** chain:

1. Revalidate a settled, account-matched V11 roster/week and the frozen V69 Party chest version/odds/guarantees.
2. Insert the exact immutable **V61** Party Event receipt **in this V70 transaction** (not a second claim). A preexisting V61 receipt fails closed, preventing accidental payment from both V63/V60 and V70.
3. Use the existing **V65 Party Sigils wallet and source ledger** for +8/+10/+16 Sigils. There is no replacement or parallel currency. A V65 ledger row must match the V61 receipt.
4. Credit Gold in existing `public.character_wallets` with same-session CAS; synchronize the current server-owned online character Gold mirror.
5. Credit Gem Dust into existing Inventory or Bank stacks, and Companion Essence into `state.account.companionEssence`, through the locked `public.online_game_states` row. Full Inventory + Bank blocks and rolls back the *entire* chest, not just the material.
6. Write four ordinal-bound physical audits in review-only `private.party_event_chest_resource_grants_v86` and an already-claimed, zero-attachment legacy Inbox history via existing V80; V70 records the matching four guarantee legs and Inbox leg.
7. Independently verify V61, V65, all four audit legs, actual fresh game wallet/Inventory/Essence values and the historical Inbox. On replay, verify frozen receipts and immutable audit rather than mutable balances (which may have been spent).

**Character Gold decision for this draft:** Gold is paid to the account's server-owned **active character** at successful claim time, while Party Sigils/Essence/resources retain their appropriate shared-state custody. This is distinct from frozen *equipment* character custody (which has its own V77/V71 requirements); the finalized character-switching/claim UX still needs acceptance and multi-character device QA.

## Isolation and release gates

- `PARTY_EVENT_REAL_REWARDS_V86_RELEASED=false`, QA-only constructor, and `NODE_ENV=production` hard refusal.
- New SQL is only in `docs/roadmap/party-events/hidden-migrations/*REVIEW_ONLY.sql`; **not** deployable migration directory.
- No standalone public RPC, Supabase action, job or HTTP payout call is attached. `anon`, `authenticated` and `service_role` have no write access to V86 audit.
- V86 requires V61 + V65 + V70 + V80 exactly in one SQL session. **V63 and V70 must never be independently mounted as competing award gateways.**
- A true equipment win still fails closed through V70 and rolls all prior grants back until EQ2 has an audited Party Item mint/custody implementation. This means the current system cannot safely issue *all* earned chests and must not be enabled.
- The V77 canonical source in the isolated test is a fixture; an approved **real same-connection V61 settled proof loader** from V11/V14/V49/V50 is still missing.
- Staging PostgreSQL 17.6 currently lacks the legacy `private.reward_inbox_v1` present in production; neither environment has the hidden Party settlement tables. **Do not apply this SQL** without reviewing parity, permissions, erasure, rollback and deployment order.
- Two-independent-PG17.6-connection concurrency, cancellation, lock-timeout, receipt replay with external gameplay writers, Gold/Inventory reconciliation, schema rollback, mobile compatibility and UI review remain hard launch blockers.

## Disposable regression

`backend/tests/party-event-real-rewards-v86.mjs` exercises V69/V70 with review-only V61/V65/V86 SQL and simulated V11/inbox/legacy wallets in PGlite:

- Original V51 HMAC equipment **miss**, successful +8 Sigils/+200 Gold/+2 Gem Dust/+4 Essence, all physical receipts and paid Inbox
- One frozen result on replay, including after valid later spending of Gold, Essence and material
- Full Inventory and Bank -> resource failure rolls back V61, V65, V70, all audits, Gold and Inbox; later safe retry
- Original HMAC **hit** -> EQ2 issuance blocked and whole attempted chest transaction rolled back
- Cross-account source refusal and hidden release flags

Included in hidden chest strict TypeScript compilation and workflow. **Tests are authored but an exact-head green CI run is not yet confirmed.** No claim of staging concurrency or Android QA.

## Next work

1. Confirm exact-head chest TypeScript/PGlite workflow; repair defects found by actual compilation and runtime before release planning.
2. Implement audited SQL-only canonical V61 proof loader against the real hidden Party Event source tables, not request JSON.
3. Reconcile V63/V70 source namespace and legacy data with a single cutover and backout policy.
4. Add two independent PG17.6 session race/failure tests with correct source locks, real account erasure and entitlement recovery.
5. Complete EQ2 Party Event equipment issuance / custody, end-user Inbox source category, and multi-character acceptance. Only then propose a staged rollout.
