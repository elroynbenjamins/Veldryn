# Crafted equipment quality, seven-copy retention and opt-in auto-sell

Status: **draft foundation — not release-ready** (23 October 2026).

## Agreed player experience

- An account may keep **seven copies of each exact base equipment item ID** in total. Count all five characters, equipped and unequipped items, their Inventories and the shared Bank. Different equipment item IDs receive separate seven-copy pools.
- Each crafted non-novice gear instance has a deterministic, persisted, server-owned quality **1–100** and one of the existing rarity tiers. The 0.60% Epic and 0.10% Mythic upgrade-proc rates stay unchanged; misses retain authored base rarity.
- Target quality effect is **±5% item base stats**, secondary to rarity and the current +0…+4 enhancement and two sockets. **Not active until exact per-instance equipment and combat stats are complete.**
- Add an account-level **Keep Best 7** toggle, **off by default**. When off, a full set requires the player to manage copies before claiming an eighth. When on, mass crafting can continue and finished items may be automatically sold, subject to the safeguards below.
- At the seventh-copy boundary, compare the *newly rolled* copy with the seven owned copies by **rarity tier then quality** (effectively their stat strength; the quality spread is less than the gap between adjacent rarities).
  - A weaker or tied fresh roll is automatically sold (the older copy wins ties) and the player gets its ordinary vendor Gold.
  - A strictly better fresh roll replaces **the weakest verified eligible existing copy**, with Gold paid for the disposed copy.
  - Never automatically sell an equipped copy, upgraded item, socketed gem, manually locked copy, favorite, a saved-loadout reference, or a copy with unknown/legacy location or quality.
  - If a safe existing victim is unavailable for a stronger roll, **keep the completed Forge job pending for manual review**; do not sacrifice the stronger roll, exceed the cap silently or destroy a protected item.
  - No auto-salvage or conversion to materials in the first release; the auto-action is ordinary vendor selling only.
- Show the retained rarity + quality and Gold outcome for each claimed craft, a concise batch summary (kept / new copies sold / old copies replaced / blocked), and a direct Manage Copies action. Preserve fully traceable receipts.
- Auto-sell must never turn on by itself during migration or after purchase of VIP/Supporter.

## Implemented in this draft branch

1. `CraftedGearInstance.quality?: number`, computed deterministically from the trusted Forge roll + job receipt, persisted with each unique item and displayed on the Forge claim result.
2. `TARGET_CRAFTED_GEAR_COPIES_PER_ITEM=7` with account-wide read-only `craftedGearCopyCapacity`.
3. `CraftedGearAutoSellMode = 'off' | 'keep_best_seven'`, optional account preference persisted by normalizing saved state, **defaulting to off**. This option is **not exposed as an enabled player-facing toggle yet**.
4. Pure retention planning in `apps/mobile/src/core/crafted-gear-retention.ts`, returning keep / sell incoming / sell eligible existing / manual-review without modifying data. It requires server-confirmed exact-instance locations for existing-copy disposal.
5. Regression coverage added to `apps/mobile/tests/equipment-crafted-instance-results.ts` for quality persistence, seven-copy decision logic, disabled default, tie retention, fail-closed ownership/protection verification, locked/marked/enhanced/socketed/equipped/loadout safeguards, legacy unknown quality, and oversized save protection.
6. Old crafted-instance records are never silently truncated during save normalization. The old global 500-instance safety boundary still refuses new instance creation without evicting any already owned gear.
7. `craftedGearLegacyOwnershipAudit` counts existing physical gear in active and alternate characters' Inventories, Bank, overflow and equipped slots to highlight discrepancies **without guessing which instance lives where**. Balanced counts never imply auto-sell readiness.
8. Claim All now leaves a blocked Forge receipt ready on an expected storage-cap error and checks subsequent completed jobs; player-facing command messages include the number blocked, rather than silently dropping results.
9. `craftedGearCanAutoSell` fails closed: only candidates with server-confirmed ownership + protection snapshot and explicit `locked=false`, `favorite=false`, `savedLoadout=false` are eligible. Existing legacy call paths never provide that authoritative evidence, so the actual auto-sale stays disabled.
10. `proposeCraftedGearSettlement` provides a deterministic, **non-mutating** exact-instance replacement plan with receipt replay checks and a Gold-credit destination matching the **verified current holder**, not the original crafter. Any missing holder, incomplete protection verification, unknown quality or duplicate Forge receipt prevents a sale. It does not mutate player possessions or perform server database writes.
11. The seven-copy projection now conservatively counts `max(physical owned equipment, recorded crafted instances)` so previously acquired non-Forge equipment cannot be overlooked. This projected count is explicitly marked **unverified** until item-ID stacks are migrated to exact ownership.
12. Partial Claim All skips predictable full-storage failures, preserves blocked receipts, reports pending jobs and still attempts other ready Forge/Gem claims. Unknown errors are still thrown instead of swallowed.

**Nothing in this branch executes an auto-sale, activates seven-copy enforcement, changes combat stats, or publishes a setting toggle.** A decision planner cannot safely transfer ownership or remove a copy from the current item-ID-based Inventory/Bank system.

## Prerequisites for safe activation

1. **Canonical unique ownership.** Change equipment slots, Inventory, Bank, loadouts, related transfers, saved stats, enhancements, gem sockets, item inspection, manual sell and salvage to distinguish `instanceId` from static `itemId`. All copy-sensitive actions must select an exact owned instance. Include offline and online migrations for legacy stacks, five-character accounts and existing enhanced items; preserve provenance and quantities. No implicit selection of the strongest copy across a shared Bank.
2. **Protected-copy eligibility.** Server-confirm location, **current holder character**, locks, Favorites, enhanced rank, gems, equipped status and all saved-loadout references. Explicitly include other characters. Unknown provenance/location/quality always means manual review, not automatic deletion.
3. **Opt-in UI.** Add an accessible toggle in the equipment Forge screen: `Auto-sell lowest when 7/7`, default off. Explain that higher rarity outweighs quality, never sold protections, and the expected Gold destination. Display counts and claim status; allow reverting it at any time. Persist preference account-wide with a server command. Do not enable it if server feature support is absent.
4. **Authoritative atomic replacement.** At Forge claim time, roll server-side and compare current values, validate owner and exact victim, debit/credit physical inventory and vendor Gold, append a retention receipt, mark Forge job claimed and create/retain the surviving instance **in one fenced, idempotent transaction**. No optimistic local disposal. Always rerun validation under locks; race with equipping, moving, selling or opening a different client must not cause data loss. On failure, leave pending job and possessions unchanged.
5. **Mass claim logic.** Process each completed job deterministically in order, updating simulated capacity after each committed claim; support incoming auto-sale without first reserving an eighth permanent instance. If seven are full and auto-sell off, stop claiming that item only and communicate exactly why. If the best new roll is blocked by protected copies, keep that job claimable for review, not silently sell it. Do not break unrelated Gem claims.
6. **Stats + display.** Calculate quality/rarity from the *selected equipped instance* only; migrate current base-item-ID/best-copy compatibility behavior before applying any quality multiplier. Verify PvE and co-op snapshot normalization, regional progression, level requirements, sockets, saved loadouts and mobile stat comparison.
7. **Economy + audit.** Credit existing vendor sell value only after an actual, audited auto-sale. Don't award a second crafted-item sale via a repeated receipt, and don't auto-return socketed gems. No fake row deletion to bypass the 500-instance account safety cap. A per-item seven-copy limit does not necessarily remove the need for a separate overall account storage budget.
8. **QA gate.** Run mobile typecheck, crafted-instance and Forge tests, save migration checks, a fresh Supabase migration/SQL suite, concurrent claim-vs-equip and double-claim tests, claim-all under fullness, cross-device/offline regression, zero-loss rollback, Android UI tests and combat balance matrix. Reconcile with current main before merging.

## Storage and performance

Keep one compact row per physical equipment instance (base item catalog ID, unique instance ID, quality integer, rarity enum, enhancement, socket state, ownership, location and protection flags). All derived stats come from definitions plus instance modifiers. No new base item definition, stat-history rows or continuous Realtime subscription is required for each roll. The largest engineering risk is incorrect identity and transaction handling—not database storage.

## Release gate

The draft branch adds safe policy preparation only. **Do not expose the auto-sell toggle or execute actual disposals until every copy-sensitive path is authoritative, server-atomic and validated.** No production migration, data, or deployment is changed by this draft.
