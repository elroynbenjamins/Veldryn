# Crafted equipment quality & per-item copy caps

Status: **foundation branch; not release-ready** (2026-10-23).

## Player contract

- Every successfully claimed non-novice forged gear item has a server-authoritative, deterministic **quality roll 1–100**, persisted on its unique instance.
- The existing forge rarity-upgrade chances are unchanged: Epic **0.60%** and Mythic **0.10%**, and authored base rarity is never downgraded.
- The intended quality influence is a restrained **0.95×–1.05×** scalar on the item's *base equipment stats*, applied only after the game equips and previews exact instance IDs. This is **not yet active**; do not misrepresent the new metadata as live combat power.
- Keep the current independent enhancement rank +0…+4 and Stat/Effect gem sockets. No random affixes, additional sockets, or per-stat database rows in this phase.
- Proposed default copy limit: **5 owned copies of the same exact base item ID per account**, counting equipped and unequipped copies across all characters plus Inventory and shared Bank. This is **not yet enforced**.
- Every copy must preserve its own quality, rarity, enhancement, gems, lock state and provenance. A crafted result or pending claim must never destroy an owned copy without an explicit, targeted player action.
- All items remain independently saveable, saleable or salvageable after per-copy actions ship, subject to locks, Favorites, equip/loadout protection and enhancement/gem safeguards. An equipped or locked copy cannot be silently scrapped.

## Foundation added on this branch

- Extend `CraftedGearInstance` with an optional `quality`; legacy saves without the field remain loadable and retain their old power.
- Forge claims derive quality deterministically from the trusted roll + unique Forge job ID, persist it with the receipt, and display it in the claim feedback.
- Provide a read-only account-wide `craftedGearCopyCapacity` projection with a five-copy target.
- Remove the previous `.slice(-500)` in normalization and instance minting. An over-cap saved roster remains intact; attempted new records at the global safety cap fail, without evicting existing gear.
- Extend the existing crafted-instance regression with roll stability, save retention, capacity projection and no silent eviction assertions.

## Required before enabling the five-copy rule

1. **Canonical ownership**: equipment slots, bank, inventory, loadouts, gear upgrades and crafting claims must reference `instanceId` rather than treating all physical copies of an `itemId` as interchangeable. Keep static item definitions in the content catalog. Migrate existing stack/rarity/enhancement saves without wiping equipment or spawning duplicates.
2. **Per-copy actions**: add inspect, compare, lock/unlock, equip, unequip, move, sell and salvage for an exact instance. An action must not consume a different copy from the one the player chose. Preserve all enhanced/gemmed and equipped-item disposal restrictions.
3. **Claim preflight**: include account-wide owned copies and already-reserved pending crafts for the same base item when showing available space. Do not accept a new forge job into a known-full category unless there is an explicit claim-time replacement workflow. If it becomes full during crafting, leave the completed job claimable after the player creates space. Never auto-replace the lowest roll or silently discard a claimed result.
4. **Server atomicity**: make the check, output grant, instance create, receipt and queue settlement a single idempotent server-owned write guarded against concurrent claims. Reject forgery of quality, target instance IDs and inventory location.
5. **Gameplay stats**: compute quality's bounded stat multiplier from the actual equipped instance only (not the best copy in a different character's Bank). Let loadout snapshot and co-op readiness use the same computed stats. Re-run progression, PvE and co-op balance tests with best/worst rolls.
6. **UI and inventory UX**: `Equipment X/5` in crafting and copy manager, an inventory copy chooser sorted by rarity/quality, compare-to-equipped, explicit lock/favorite actions, a clear full-cap message and navigation to `Manage Copies`. Highlight the reason for a failed claim; do not silently stall a ready job.
7. **Reconciliation and cleanup**: legacy stacks, bank sale, bulk sale, salvage, character deletion, overflow and account linking must maintain one-to-one copy identity. Audit for duplicate instance IDs, disappearing copies, cross-account disclosure and orphaned enhancements. No automatic normalization deletion.
8. **Validation**: fresh/legacy save migration, five-character account, multiple same-ID pieces in Inventory/Bank/equipped, concurrent claim and claim-all, no-space rollback, lock/favorite, offline replay, cross-device syncing and older-build compatibility.

## Storage approach

Store **one compact unique instance record per owned physical item** with base `itemId`, owner/account, rarity enum, quality integer, enhancement/gem slots and provenance. Compute combat stats using the catalog and instance modifiers; do not store every derived stat or create a distinct base-item row for every roll. A per-item five-copy cap bounds growth, but a global safety cap also needs explicit overflow and release management. The size of a compact item record is not likely to overload PostgreSQL; correctness of instance identity and server transactions is the real risk.

## Release gate

This branch **does not** turn on stat variance or enforce the five-copy gameplay limit. Neither should be activated until all above inventory/equipment mutations and authoritative online invariants are present and validated. No migrations, production data or deploys were changed by this foundation branch.
