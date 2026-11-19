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


## Hidden GameState integration rehearsal — November 18, 2026

- Added `backend/src/server/equipment/equipment-crafting-v2-game-state.ts`, an isolated, **unmounted** integration with the actual online `GameState`, rather than a second Gold or Inventory ledger.
- `simulateEquipmentV2InGameState` requires a server-loaded active character, the authoritative wallet Gold, authenticated account ID and online commit sequence. It consumes exactly the validated material quantities from the active character Inventory and shared Bank, and charges the same **existing** character wallet once. Character skill awards on claim follow the existing level-from-total-XP curve and always accrue to the original crafter, even after switching characters.
- Only V2 job metadata, immutable exact-result records and idempotency receipts are stored under an opaque `account.equipmentV2Hidden` field. No new live item IDs are inserted into Inventory, Bank or equipment slots until exact-copy custody, item-definition compatibility and overflow behavior have been approved. Legacy V33 Forge jobs and crafted-equipment records are never rewritten.
- The production-facing `runEquipmentV2InGameState` entry checks the disabled backend release gate **before** calling this simulator. Neither this entry nor the simulator is imported into the public gameplay handler.
- Safe, fully audited old equipment can coexist with the hidden rehearsal, including high-quality, socketed, enhanced and locked gear. The readiness adapter uses the **existing crafted-gear physical custody audit** to deny orphan records, duplicate markers, unverified copies and any overlapping legacy Forge jobs. Existing V33 items must not be sold or converted to participate in 2.0.
- Added focused server tests for one-account Gold/material conservation, shared Bank, character switching, replay protection, original-owner XP, deferred item delivery, intact V33 recipes/copies and release-gate refusal. Corrected duplicate ingredient handling before any debit.
- Expanded the common hidden-feature release fence to enforce **both** Equipment/Crafting 2.0 flags as `false`, forbid mounting the new bridge inside `backend/online/gameplay.ts`, and self-test both unsafe flag flips and accidental bridge imports. CI now reacts to these paths.
- Synchronized this draft branch to the newer `main` enemy/class combat work, market updates, World Boss changes and translations with no overlapping file conflict in the latest comparison.

**Critical open work:** This is a developer-only, in-memory **settlement rehearsal**, not the completed persistent production command. A real release still needs a single authenticated server routing/receipt contract inside `executeGameCommand` and `commit_online_game_guild_pve_v1`, verified storage capacity and physical exact-copy delivery, server-side crafting modifiers and mastery/affinity snapshots, item custody and permanent gem replacement, Skills/Enemies 2.0 combat integration, green CI, staging checks and rollout/rollback approval. Do not enable either flag, merge as release or apply shadow SQL.


## November 19 — two follow-up passes: no-loss physical custody boundary + ledger integrity

**Pass 1 — claim-to-custody preparation (hidden only)**
- A new backend-only `equipment-crafting-v2-delivery.ts` computes a deterministic read-only destination proposal for the ORIGINAL crafter's equipment pouch, falling back to that character's inventory. Capacity is checked on the correct character even after an account character switch.
- A full pouch and full inventory return `deferred/storage_full` rather than discarding a copy, forcing overflow with an unapproved expiry, or rolling again. There is intentionally no public EQ2 `ItemStack` insertion, no Bank mutation, no equipped-slot write, no auto-sale and no production API mounting.
- Exact copy IDs are checked against all existing V33 account records, active/alternate inventory and pouch stacks, all overflow stacks, Bank and equipped references. The proposed single-instance physical marker always has quantity 1.
- The proposal explicitly requires both **V2 item-catalog compatibility** and the **same existing authenticated account CAS transaction** as claim receipt, XP, and equipment ownership. It is NOT an authorization or a persistence implementation.

**Pass 2 — immutable receipt/replay hardening (hidden only)**
- The GameState rehearsal now audits its entire hidden job/item/XP/receipt graph **before** processing new commands and after non-replayed start/claim commands. It rejects duplicate job/copy/receipt/award IDs, orphan records, rewarded queued jobs, unbalanced one-time settlements, forged exact snapshots, wrong owner, missing claim receipts and mismatched roll/XP receipt payloads.
- Claim rehearsal returns a read-only `delivery` proposal alongside the original immutable receipt. Replayed commands remain state-identical and never create another proposal or copy.
- New backend regression tests cover the full/empty pouch, inventory fallback, deferred full-storage claim, original-crafter ownership across characters, V33 instance-ID collision, malformed frozen gear/receipts, duplicate claim IDs and legacy preservation. The focused Unique forged equipment workflow now executes the new test.

**Refinement / polish constraints:** this is intentionally *not* physically delivered equipment. The V33 item catalog cannot yet safely resolve EQ2 templates. The actual production `executeGameCommand` → `commit_online_game_guild_pve_v1` adapter, permanent-gem replacement, storage overflow expiry policy, loadout protection, queue/Forge mastery integration and source-owned Combat 2.0 bonus effects are still required. Both 2.0 release flags remain disabled, the draft PR stays unmerged, and this work does not touch player balances or make new inventory items usable. Exact-head TypeScript, CI, staging, race/rollback and Android smoke checks remain pending until observed passing.


## November 19 — two more hidden passes: no-overbooking reservations and permanent Stat Gem replay

**Pass 1 — exact-copy storage reservation ledger**
- Introduced `equipment-crafting-v2-storage-reservations.ts`, an account-scoped `storageReservations` sidecar in the *existing* hidden Forge metadata. One successful claim writes one stable reservation, with immutable `instanceId`, original crafter, item ID and proposed destination. This does not transfer any physical EQ2 stack into V33 storage.
- Capacity now includes the other EQ2 claims already reserved for that character. The canonical Equipment Pouch capacity (including the base 30 when not yet saved) is used for both active and alternative characters. Multiple completed claims cannot all promise the same last available storage slot.
- Order: original crafter's Equipment Pouch, then their Inventory, then **deferred** with item safely retained in its immutable hidden claim ledger. Bank/Overflow are deliberately NOT automatic fallback destinations because of custody and expiry semantics.
- A reservation is only a capacity plan; physical space may change between claim and future release. **Release must revalidate every destination inside an authenticated, single-account CAS with the finalized EQ2 item catalog, copy ownership, protection flags and actual storage writes.** Existing unreserved hidden v1 claims require explicit reconciliation.

**Pass 2 — irreversible Stat Gem socket and replacement shadow transaction**
- Introduced `equipment-crafting-v2-gem-sidecar.ts` as an isolated, unmounted same-GameState settlement rehearsal. The Forge exact copy remains immutable; installed sockets and their one-time idempotent receipts live in a separate versioned account sidecar.
- The authenticated active original owner may shadow-socket a confirmed EQ2 claim using **one real stat gem** from shared Gem Pouch, active Inventory or shared Bank, in that priority order, without fabricating a gem identity or touching another character's Inventory. Proposed server-generated roll is 80–120% in 5% steps.
- Same-gem repeat socketing follows the existing grindstone rule: it consumes a second owned gem but retains the higher roll and rejects already-perfect 120% sockets. Replacing with a different Stat Gem burns the previous installed gem without refund or extraction. Equipped V33 copies, quality/rarity, immutable minted affixes and enhancement state are untouched.
- Strictly reject forged account/owner, missing custody reservation, stale game version, consumed/unowned or protected gem, invalid roll, duplicate cross-command request ID and malformed receipt history. Receipt replay **must** return the original result without a second debit or reroll.
- **Effect Gem replacement is intentionally blocked** pending authoritative 2.0 per-loadout resonance caps, class/skill proc resolution and Combat 2.0 effect ownership. The release gate refuses all public runtime access to this code. The hidden simulator changes only a returned, not-persisted GameState copy.

**Refinement and polish**
- Rebuild the current socket sidecar by replaying the immutable historical receipts, rejecting orphan slot changes and weaker same-gem rerolls.
- Preserve socket history when later hidden Forge commands start or claim; prohibit reusing one request ID between Forge and gem commands.
- Focused regressions cover three consecutive claims competing for one pouch and one Inventory slot, deferred claims, snapshot immutability, stat gem consumption, replacement, grindstone monotonic rolls, idempotent replay, state tampering, shared Bank fallback and effect gem rejection.
- CI now has the dedicated Stat Gem test and new release-fence checks for accidental gem/storage imports into live gameplay.

**Still not release ready:** No production `executeGameCommand` route, `commit_online_game_guild_pve_v1` integration, physically materialized EQ2 copy, applied database migration or attached public UI. Exact-head CI, staging concurrency/rollback, Combat 2.0 effect caps and Android device QA have **not been verified**. Keep both Equipment/Crafting 2.0 flags false, PR #1382 in draft, and do not merge as a release.


## November 19 — two further hidden passes: virtual custody CAS and equipped Effect Gems

### Pass 1 — an account-atomic exact-copy custody boundary (source only)
- Added `equipment-crafting-v2-virtual-custody.ts`: validates a server-loaded account/active character, authoritative wallet Gold and online version before interpreting an exact-copy move. Supported **virtual** transitions are deferred→storage, pouch/Inventory→shared Bank, Bank→any eligible account character's storage, storage→equipped and equipped→storage. Every change has one immutable, replayable, global request ID and expected online CAS version.
- The initial source of each virtual copy is its original Forge claim reservation. Move receipts reconstruct the current holder, location and exact equipment slot; duplicate, orphan, reordered, forged and conflicting histories fail closed. Bank withdrawal changes the *holder*, not the original crafter on the immutable item or its quality/rarity/affixes.
- Real V33 storage capacity is considered alongside all reserved shadow copies. A full Bank or Pouch refuses the move; a V33 equipped slot or unverified legacy offhand/weapon interaction blocks a new V2 equip. The existing V2 class/level/hands preflight is reused.
- **No physical delivery or actual production bank/equip transaction is claimed.** The virtual custody plan only modifies opaque hidden account metadata in a returned in-memory `GameState`. It never writes a public EQ2 `ItemStack`, changes V33 equipped item IDs or calls a database RPC. Production integration still must use the existing authenticated `load_online_game_server_v1` + `read_online_game_receipt_server_v1` + `commit_online_game_guild_pve_v1` account CAS and verified physical item registry, not a second ledger.

### Pass 2 — equipped-only Effect Gem family and resonance safeguards
- Added `equipment-crafting-v2-effect-gem-policy.ts`: checks the server-owned virtual equipped slots for the active account character, authentic canonical V1 effect families/grades and the catalog's **maximum three simultaneously equipped copies per effect family**. A same-family replacement excludes the current copy from its count. Preview-only resonance tiers 1/2/3 and base scalar are descriptive, never combat damage or an active proc.
- The existing hidden gem sidecar can now rehearse an Effect Gem consume/replace **only** for a currently virtual-equipped exact copy with fully verified custody and no mixed V33 equipped gear. Unverified mixed V33/2.0 builds, unrecognized legacy effect gems, missing ownership, over-cap families and unequipped/deferred/banked targets remain blocked.
- After a legitimate account Bank withdrawal, socket authority follows the actual authenticated holder rather than assuming the original crafter still possesses the copy. Original craft XP ownership and item identity remain immutable. Socket receipts retain irreversible burn/replacement and replay semantics; Effect Gem combat activation remains explicitly disabled.

### Refinement, safety and validation
- Added a shared `equipment-crafting-v2-receipt-coherence.ts` validator: Forge, Gem and virtual-custody receipt IDs must be unique across the entire account. New Forge starts retain previously installed Gem sockets and historical Bank/equip movement receipts.
- Tightened custody-history parsing, account ownership, V33 slot conflict handling and fail-closed behavior for malformed receipts; expanded the hidden release fence to detect accidental public imports of these modules.
- New focused tests cover lost-response replay, version conflicts, Bank-full denial, cross-character withdrawal and socketing, existing V33 gear preservation, equipment class/slot eligibility, effect family cap/replacement/resonance and mixed-legacy denial. The Unique forged equipment workflow includes them.
- **Verification pending:** The current draft PR is not merged or released. These tests are committed but latest-head GitHub Actions results and staging/Android checks are not confirmed. This is NOT the actual authenticated production commit; no database migrations or live backend routes have been applied. Require full CI, source-authority review, mixed-gear compatibility, proper per-copy protection and an end-to-end single-CAS retry/race test before any integration or feature-flag activation.


### Follow-up consistency fix: current custody versus original reservation
A claimed copy's immutable initial reservation is an audit trail, **not** proof it still occupies the original pouch or inventory slot. New Forge claims now use validated, replayed virtual custody to count currently occupied per-character locations. Once a copy is virtually moved to Bank or equipped, the former slot is reusable. A regression specifically checks that moving an item to Bank frees a previously full shadow pouch reservation without ever writing public V33 storage. The resulting release plan still requires a physical-storage CAS and snapshot recheck.

### Exact rollout checks still required
1. Confirm the authenticated online command and persistence are on the *existing* `commit_online_game_guild_pve_v1` path with one request receipt, account version compare-and-swap and same-transaction item, gem and storage changes; this draft does not provide that production adapter.
2. Reconcile virtual positions and outstanding deferred items against actual V33 item definitions, equipment pouches, Bank capacities, saved loadouts, enhancements, gem custody, Market escrow and all characters without losing any copy.
3. Compile one Combat 2.0 equipped snapshot containing **both** legacy and EQ2 items; until then, the new Effect Gem shadow policy rejects mixed live equipment and produces no active combat effects.
4. Obtain green exact-head test jobs, SQL/race/rollback staging evidence, release-fence self-test, signed Android device QA, final 2.0 balance approval and coordinated rollback. Both release flags remain false.
