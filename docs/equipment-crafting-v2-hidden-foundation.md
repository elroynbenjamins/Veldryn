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
