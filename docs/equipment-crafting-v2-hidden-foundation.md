# Veldryn Equipment 2.0 + Crafting 2.0 — hidden development

Status: **draft PR #1382, not merged, not released** (November 18, 2026).
This is a coordinated future update. Both Equipment 2.0 and Crafting 2.0 are held by one disabled mobile flag `EQUIPMENT_CRAFTING_V2_RELEASED=false`, with the independent disabled backend gate `EQUIPMENT_CRAFTING_V2_SERVER_RELEASED=false`.

## Implemented (hidden, source only)

### Item catalogue and economy
- 15 smaller sets, 42 set pieces, 24 standalone pieces, and 52 class-specific weapon/off-hand templates (118 item IDs in total).
- Every item has two material routes, 236 draft crafting recipes in total. Route variants cannot improve rarity, quality, Gold efficiency, XP or crafting speed for the same output; they exchange regional material quantities.
- Weapons are **craftable by any class**, with a class restriction for future equip rules. Two-hand and dual-wield armaments absorb the off-hand base-stat budget.
- Base attributes are one or two of ATK/DEF/HP; quality is Q0–Q100, rarity and random affixes have tier-specific draft rules.
- Chest Gold anchors T1 400 / T2 1,500 / T3 6,000 / T4 12,000; XP uses existing tier anchors with +5% for set-piece assembly. **These are unapproved proposed balance values, not production prices.**
- Existing component and tier-specific binder IDs are reused, with substantial regional gathering requirements.
- Client and server manifest parity tests check exact item IDs, tier, slot, stat profile, class restriction, weapon hands, resource inputs, Gold, XP, duration and level requirements.
- Existing V33 equipment, item IDs and the 10-piece set catalogue are untouched.

### Internal mobile UX
- Unmounted `EquipmentCraftingV2WorkshopPreview` composes a searchable, virtualized, role- and tier-filtered catalogue with an interactive recipe detail view.
- Recipe detail shows equipment base stats, profession, Gold, XP, crafting time, materials owned/missing, method variants, potential rarity results and set progress. Both materials and outcome tabs have accessible 44px targets.
- The view reads Inventory/Bank for **preview only** and has no craft, claim, trade, or purchase action.
- Market sourcing planner never fabricates market quotes and is disabled while Market/Equipment 2.0 remain unreleased.

### Server-authoritative foundation
- `equipment-crafting-v2-manifest.ts` and `equipment-crafting-v2-armament-manifest.ts`: pinned independent server catalogues for all 118 items and 236 recipe methods.
- `equipment-crafting-v2-rolls.ts`: backend-only cryptographic rarity/quality draws, unique affix types, role/slot weights and tier ranges.
- `equipment-crafting-v2-transaction.ts`: isolated pure start/claim transition model; validates canonical recipe, character/skill levels, currency/materials, active/ready capacity and 25-copy limit.
- Each character has a **separate Gold wallet, inventory, profession levels and level**, while the Bank and Forge queue are account-scoped. Claiming after a character switch keeps the finished item and XP with its original crafter.
- Start deducts Gold and materials once from that character's Inventory and the shared Bank; completed claim mints exactly one rolled instance and one XP award. Request ID replay returns the existing response even after version increments.
- Server gate remains disabled; no runtime API route, service account authorization endpoint or live Forge integration has been mounted.

### Staging-only persistence design (NOT deployed)
- `backend/sql/drafts/equipment_crafting_v2_shadow_store_staging_only.sql` defines isolated private snapshot and receipt tables, service-role-only SECURITY INVOKER RPCs, row-locked version compare-and-swap commits and exact request-id replay.
- `equipment-crafting-v2-shadow-store.ts` is a separate service-side RPC adapter for testing optimistic concurrency, duplicate retries and lost-response recovery.
- On November 18, SQL was executed only in a **ROLLBACK transaction** against the separate `Veldryn Staging 20260924` project. The checks passed for schema syntax, service-only function grants, replay, conflicting request IDs and stale-version rejection. A follow-up check confirmed no shadow tables or functions remained installed.
- This is a **QA shadow ledger**, not an alternative production Gold system. Production release must extend the existing authoritative online gameplay commit, not independently duplicate wallet or inventory balances.

## Automated regression coverage (committed, not yet CI-verified)
- Mobile test: 118 unique draft item definitions, 236 dual-path recipes, class equip restrictions, stat-budget parity, server/client economy and affix parity, disabled release gates.
- Backend tests: Gold/material reservation, missing resources, wrong owner, stale version, early claim, cross-character claims, one-time XP and 25-copy protection.
- Shadow adapter tests: lost-response replay, two distinct simultaneous requests, simultaneous same-ID requests, stale compare-and-swap and unseeded-account errors.
- Native UX contract: no mutation APIs, role/tier search, 44px controls and clear material/Gold/XP/timing information.
- SQL static contract: private tables, RLS, server-only privileges and row lock/CAS.
- CI workflow jobs are currently queued; **do not describe these tests as passing until they complete**.

## Outstanding release blockers
1. Finish authenticated, transactional integration with the existing authoritative game state and character ledger; QA shadow persistence alone is insufficient.
2. Persist future V2 instances in production's existing exact-copy equipment ownership model, with gem/enhancement/set migration and item protection.
3. Implement Skills 2.0, Enemy/Boss 2.0 and nine-class combat simulations against the agreed **17/45/14/14/10** *illustrative target*, without hardcoding CP shares.
4. Finish native player UI, inventory compare/result reveal, translations, pixel assets, component processing, real market quotes and purchase escrow.
5. Validate complete Gold and XP economy using measured telemetry, tier resource acquisition and repeat crafting; test staging migrations, race conditions and rollback.
6. Obtain green CI and staging smoke runs before any feature gates are enabled.

**Release safety:** Do not merge this WIP draft into a live rollout, deploy shadow SQL, alter existing item records, charge player Gold or expose any V2 public controls during hidden implementation.


## Read-only crafting economy and UI refinement pass
- Added `equipment-crafting-v2-preparation.ts`: forecasts a complete prerequsite chain from the *actual live component and binder recipes*, including available Inventory/Bank materials, profession unlocks, production batches, sequential processing time, Gold paid and XP by profession.
- The planner uses a virtual material stock ledger so multiple components cannot double-count the same resource. It reports material shortages, locked steps and circular dependencies rather than treating missing resources as automatically owned. No Gold is spent, no materials are reserved and no Market listings are invented.
- Recipe variants now compare hypothetical external shortages, then known Gold and processing time; the user can still choose either route. The hidden detail screen shows assembly cost separately from planned processing, individual component steps, their XP and any still-unavailable materials.
- Locked component/binder requirements get a specific “unlock prerequisite” state, instead of a misleading “prepare components” prompt.
- The focused GitHub equipment workflow now triggers on `equipment-v2-*` content, React Native V2 components, backend server files, SQL draft, and V2 regression tests—not just core files.
- Added regressions for component batch aggregation, split raw-material reuse, locked recipes, cyclic production paths, batch-cost optimization, and an accurate blocked-state CTA.

**Known limitation**: This is a read-only estimate assuming the selected prerequisite recipes are performed. Source acquisition Gold is omitted until authenticated, quantity-aware market quotes exist. Profession multipliers, queue speedups, recipe knowledge, capacity and material locks must be accounted for by the final server-authoritative flow. Existing live Forge behavior is unchanged.


## Exact-copy server snapshots and legacy migration safety

- New hidden `equipment-crafting-v2-instances.ts` produces a **server-owned, per-instance stat snapshot** for every canonical piece. The snapshot freezes tier, slot, role, stat profile, material, set/class/hand restrictions, rarity, quality, effective ATK/DEF/HP, random affixes, zero enhancement and initially empty permanent gem sockets.
- Server stat projection matches the client design model's 1–2 base-stat budgets, Q0–100 multiplier, rarity multipliers and two-handed/dual weapon allowance. The mobile parity matrix checks all 118 templates, all six rarities and qualities Q0/Q50/Q100.
- `equipment-crafting-v2-transaction.ts` now pins each Forge job's manifest/rules version, canonical piece, assembly fee, profession, XP and duration **at start**. At claim the contract must match the active rules. A mismatch fails closed and retains the queued job for an explicit versioned migration instead of reinterpreting stats or silently minting a different item.
- A successful one-time claim now persists the exact projected gear in the account draft snapshot and returns that identical object in the claim receipt. Replays return the stored response without rolling again.
- `v2ServerEquipPreview` is a hidden validation prototype only: it checks canonical item integrity, class restriction, character level and explicit weapon/offhand replacements. It never automatically equips, moves or destroys a worn item. Crafting itself stays class-independent.
- Until a dedicated socket/upgrade transaction exists, all server item integrity checks reject injected gem sockets or enhancement ranks: no free socket/extraction or unapproved upgrade path.
- Hidden `equipment-crafting-v2-legacy-audit.ts` reads current V33 `craftedGearInstances`, per-character `equipmentInstanceIds`, Inventory, Bank, Overflow and equipment pouches. It reports missing instance references, duplicated custody, reserved EQ2 IDs, socketed/enhanced legacy gear and unverified legacy stacks. It never rewrites or converts old items. Non-equipment resource stacks are excluded from migration warnings.
- Backend instance tests cover 118 canonical templates, nine-class weapon identities, Q0 Mythic stats, two-hand conflicts and rejected forged stat, gem, quality and class fields. The existing transactional tests assert frozen contracts and exact-copy claim/receipt equivalence. Legacy read-only audit tests cover preservation and collision detection.
- The Equipment 2.0 exact stat snapshots are **not yet the live combat engine**. Final compatibility requires direct integration with the existing `backend/online/gameplay.ts` authoritative `executeGameCommand` and `commit_online_game_guild_pve_v1` transaction path, rather than a second Gold/gear ledger.

**Unresolved release work**: verified staging CI and end-to-end transaction tests; production-grade owner/custody checks and per-instance gems; automatic legacy-preservation tests on production-shaped fixtures; class/skill/enemy 2.0 combat evaluation and Gold/XP balancing. Do not enable the gates or release the PR.


## Authoritative gameplay boundary and Bank custody pass (18 November 2026)

- `equipment-crafting-v2-authoritative-readiness.ts` reads the *existing* online `GameState`, taking the authenticated account ID, active character ID, online commit version and current authoritative wallet Gold as explicit server inputs. Each of up to three account characters retains its own material inventory, level, profession levels and wallet; shared Bank resources remain shared.
- This is a **non-writing projection**. It rejects absent authoritative wallet data, mismatched active character IDs, duplicate character IDs, malformed material stacks, reserved EQ2 namespace entries, pending legacy Forge jobs and existing legacy equipment that lacks a verified coexistence/migration story. It does not claim that those players are ineligible for the eventual release; it prevents a dangerous *second ledger* now.
- Forge queue capacity was corrected to use the currently earned **3–7 slots + 5 waiting** with the existing 20 ready-job limit. Previously scheduled crafts in an expired entitlement slot are not deleted, while new crafts target only currently earned slots. Server regression tests cover base slots, seven-slot accounts, waiting caps and slot expiry.
- `equipment-crafting-v2-custody.ts` provides read-only per-copy preflight for Bank deposit/withdraw, equip and unequip. Any account character can withdraw gear from the shared Bank, but only an eligible class/level can wear class-specific armaments. Equipment must be deliberately unequipped before deposit or a conflicting equip; no hidden copy destruction, gem extraction or silent overwrite.
- Custody regressions cover cross-character Bank transfer, owner mismatch, class equip locks, weapon hand conflicts, exact-copy tampering, and duplicated physical instance references. **All actual Bank/Inventory moves remain blocked** until storage capacity, legacy gear coexistence and receipt persistence are atomically handled by the existing online gameplay commit.
- The draft branch was merged forward with `main` after a read-only overlap audit found a single workflow conflict. That conflict was resolved by preserving both the new feature-hub UI check and the hidden Crafting 2.0 UX check. Draft PR #1382 remains unmerged and its release gates remain disabled.

**Still required before release:** one atomic, authenticated `commit_online_game_guild_pve_v1` integration; exact physical copy storage including existing equipped, locked and gemmed gear; completed permanent socket-replacement operations; nine-class combat economy simulation; green CI and controlled staging rollout. Do not use the preview projection or shadow ledger as a production write source.


## 18 November — single-commit integration rehearsal and conservation contract

- Hidden server module `equipment-crafting-v2-commit-plan.ts` derives a read-only settlement plan from the V2 start/claim resolver using the same conceptual preconditions as the **existing** online gameplay commit: authenticated account/character, authoritative online version, authoritative active wallet and an idempotent request ID.
- A start plan specifies the exact owner Gold debit, inventory and shared Bank ingredient debits, new queued job, expected and next versions and persisted receipt. Claim plans show the single newly minted exact-copy item and one original-crafter profession XP award; no further resource or Gold debit occurs.
- The verifier rejects unrelated character modifications, unexpected Bank stock increases, misplaced item/XP awards, extra/missing jobs and mismatches between reservation and actual material consumption. Replays are read-only, preserving prior exact receipts.
- A production adapter is **not** implemented. `needsLegacyCoexistenceAdapter: true` is a permanent draft marker preventing this plan from being mistaken for a live commit. In particular, do **not** post its deltas independently of the existing `commit_online_game_guild_pve_v1` transaction.
- Added `equipment-crafting-v2-commit-plan.test.ts` to the focused backend CI: cross-character claim, exact debits, duplicate command replay, wallet shortage and version conflict checks.
- Hardened `equipment-crafting-v2-transaction.ts` so a future invalid canonical recipe with duplicate ingredient IDs or overflowing totals cannot double-debit a shared stack.

**Next engineering step:** implement a single server-authoritative gameplay command executor that carries this validated settlement into the *existing* account state, maintaining the original V33 Forge and legacy ownership, then persist by the existing account CAS commit. This must remain gated behind paired Equipment/Skills/Enemies 2.0 staging tests, receipt replay and rollback coverage.


## Combat 2.0 exact-copy interoperability — consolidation follow-up

A new `main` Combat 2.0 evidence adapter exposed three integration differences. They have been resolved in this hidden branch:
1. **Stonecaller is Support**, consistently in the class equipment manifest and Combat 2.0 role taxonomy.
2. **Off-hand items are not weapons**: weapon-hand metadata is present only on actual weapon templates, and omitted from off-hand receipts. Two-handed/off-hand clashes still fail closed.
3. Armor roles describe **recommended builds**, not hard class equip restrictions. Combat 2.0 now checks role alignment for class-specific weapons/off-hands while allowing general armor with different role recommendations; explicit `classRestriction` remains authoritative.

The hidden branch was synced with the new Combat 2.0 exact-copy interoperability and hidden-feature activation fence commits from `main` without changing their release settings. The new integration test `equipment-crafting-v2-real-manifest-interop.test.mjs` compiles the actual server manifest/rolls/exact-item model and verifies nine class weapons, four off-hand combinations, general cross-role armor, immutable frozen base stats, rarity/quality pre-scaling, invalid custody and tamper rejection. It is registered in the Unique forged equipment CI workflow.

The evidence projection remains `combatReady:false`: it is **not live combat**, does not apply affixes/sets/gems, does not produce damage outcomes and must not treat a base stat contribution as a complete combat score. End-to-end Skills/Enemies/Equipment 2.0 integration is still a launch blocker.
