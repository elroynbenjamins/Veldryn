# Player Market 2.0 / Equipment 2.0 generation cutover — V30 (22 Nov 2026)

**HIDDEN, REVIEW-ONLY, NOT RELEASED.** Worktree is a child of hidden Market PR #1055. Never deploy this SQL independently or flip trading flags. All visual UI/theme decisions remain behind owner approval.

## Approved invariant

Only **verified newly minted Equipment 2.0 exact copies** may enter Market 2.0. Any V33 / pre-2.0 equipment copy must remain owned and useable in existing gameplay where appropriate, but must never be listed, sold, bought, delivered by Market, or resold. The rule is about **original mint generation**, not the display name, item tier, skin, suffix, socket, client tag, or a later equipment conversion. A legacy copy cannot be relabeled as EQ2.

Resources have a separate approval and custody pathway. Future EQ2 crafting materials can be tradeable when independently sourced/registered, but equipment generation restrictions must not accidentally block existing resource flows.

## What this pass actually changes

- Adds private SQL migration `20261122230000_market_eq2_only_legacy_fence_private_v30.sql`, with a trigger denying old equipment custody-asset inserts/updates and old V8/V9/V22/V23 equipment escrow, offer, delivery, first-sale and resale mutations. The shared sale-offer trigger looks up the asset kind to leave resource listings alone.
- Adds rollback-only, synthetic PG17 assertions that a forged `EQ2_` item name and client-supplied `{"generation":"eq2"}` metadata cannot enter the old equipment escrow, and a forged resale cannot be inserted.
- Adds the V30 step to the **end** of the disposable Market PostgreSQL job. Earlier tests intentionally validate the historical V9/V23 engine and its optimistic concurrency under pre-cutover assumptions; after those tests, V30 is applied and the **final schema is now legacy-equipment-denying**.
- Does **not** alter the public game `GameState`, any equipped/locked/enhanced/saved legacy items, craft jobs, Bank, Gold, active production offers, Market Inbox, economy prices, resource trading code, item art, UI layouts or live flags.

This pass is a **negative safety fence**. It **does not make EQ2 items tradeable**; all existing Market equipment entrypoints are currently designed around V33 receipts. Passing V30 does not mean a complete EQ2 Market release is ready.

## Required positive EQ2 bridge (separate gated follow-up)

1. **Single versioned identity:** pin Equipment 2.0 to a dedicated authoritative catalogue and immutable per-copy instance ID. A V33 receipt, `acquireSource:'craft'`, or item ID prefix alone is insufficient. Resolve same-name/reissued/converted IDs by exact source-generation keys and receipt lineage.
2. **Original mint proof:** persist the actual server-issued EQ2 Forge/monster/boss mint receipt, immutable item snapshot/rules version, bound/trade policy and issuing account/character in the same trusted online-game commit. Never accept a client-submitted receipt or copy `generation` field as independent proof.
3. **Physical custody:** compare the authenticated physical exact-copy Inventory/Bank/pouch custody with the original mint record and current owner. Preserve one copy across reserve, cancel/expiry/return, first sale/claim, cross-character bank transfer, resale and further resales. Enforce account/instance uniqueness under row locks and serializable/idempotent settlement; do not list virtual/shadow or staging-delivery copies.
4. **Revalidate at every transition:** new EQ2-only server gates at listing, offer publishing, browsing, purchase, claim, bank transfer, cancellation, expiry, resale and seller payout. Re-check binding/source/tier/class/level in the same transaction as Gold and copy movement. No replay, alt-character hop, stale revision, or re-list through V33.
5. **Launch safety:** production SQL migration-history reconciliation, source registration, no legacy active escrow/pending delivery, proper EQ2 item serializer, Android QA, device-facing Market UI review, positive and negative PG17 race tests, explicit owner GO/NO-GO. Keep `PLAYER_MARKET_RELEASED` / `MARKET_AUTHENTICATED_SERVICE_READY` / `MARKET_EDGE_TRANSPORT_RELEASED` and database Market/equipment flags false until all pass.

A new private EQ2-specific escrow/settlement path should replace—not reinterpret—the old V8/V9 and V23 receipt model. The V30 fence must remain protective even after the new EQ2 trading path is introduced.

## Adversarial release matrix

| Attempt | Required result |
|---|---|
| Original V33/legacy crafted gear | Reject at reservation/listing |
| V33 socketed, enhanced, favorited, or locked gear | Reject regardless of condition |
| Old gear with an EQ2-looking item ID or metadata field | Reject |
| EQ2-looking equipment without committed server mint + physical custody | Reject |
| Legitimate EQ2 copy whose provenance is missing, duplicated, revoked or stale | Reject |
| EQ2 shadow/staging-only copy not delivered to actual inventory | Reject |
| Genuine EQ2 original craft/loot, unbound, authenticated and eligible | Candidate for future positive bridge (NOT enabled by V30) |
| Bound dungeon/boss EQ2 reward | Reject unless independently approved tradeable |
| Resale of genuinely EQ2-minted copy with valid chain | Candidate for future positive bridge (NOT enabled by V30) |
| Legacy copy bought before cutover / moved via Bank | Remains in history/owned state; no new listing or resale |
| Resource stacks | Separate Market policy; V30 must not reject solely for being a resource |

## CI and rollout caveat

The V30 schema forbids the old V33 equipment engine by design. Historical positive equipment lifecycle tests are kept **before** V30 in the disposable CI suite; they must not be mistaken for positive EQ2 acceptance. Migration is not applied to staging or production in this pass. Active/pending legacy market records require a separate reconciled return/claim plan before any real cutover; never strand or delete player assets.
