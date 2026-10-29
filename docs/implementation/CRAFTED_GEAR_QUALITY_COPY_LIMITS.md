# Unique forged gear, quality rolls and Keep Best 7

**Status:** the unique-instance foundation, six-rarity Forge outcomes, gentle high-quality weighting, and exact-copy rarity borders are **merged into `main` via PR #650** (2026-10-29). This is source integration only: no gameplay backend deployment, AAB, or existing-player migration is implied. Earlier work originated in closed PR #640.

## Player-facing contract

- Each new timed non-novice Forge equipment result is issued as **one physically tagged copy** with a unique `instanceId`, rarity and deterministic quality roll **0–100**. Forge rarity rolls now cover all six rarity tiers: Common 89.10%, Uncommon 7%, Rare 3%, Epic 0.60%, Legendary 0.20%, Mythic 0.10% for Common-base items. Existing Epic/Mythic chance bands retain their original sizes. Quality affects equipped stat calculations by **−25% to +25%** (Q0 = 75%, Q50 = 100%, Q100 = 125%); upgrades and two socket types remain separate.
- Each account can have up to **seven physical copies of each exact equipment item ID**, across five characters, equipped items, inventories, Bank and overflow. Conservative copy projections count untagged legacy equipment too. Old over-cap saves are not truncated.
- **Keep Best 7** opt-in toggle on the Forge screen, default **OFF**, persisted account-wide by a validated `gear_autosell` command.
- With OFF, an eighth finished Forge craft **stays ready** until the player makes room.
- With ON, if the existing seven copies are linked to their actual storage and server-verified, compare the incoming item by its combined rarity-and-quality stat multiplier. A weak or tied incoming roll sells itself; a stronger incoming roll sells the weakest **eligible** owned copy. Credits are routed to the actual holder or Bank.
- Auto-sale **never** disposes equipped, locked, favorited, enhanced, socketed, loadout-protected, unknown-location or legacy-ambiguous copies. A stronger new craft whose weaker existing copies cannot safely be replaced **stays pending** for manual review.
- The Forge result shows quality and whether the new or an older copy was automatically sold for vendor Gold.
- Inventory and Bank have per-copy management: inspect individual rarity/quality, **Equip, Transfer, Lock/Unlock, Sell or Salvage** the precise instance, with destructive confirmation. The Character screen routes unequipping uniquely tagged gear through an exact-copy command.
- Saving/applying a loadout preserves the selected instance ID. Applying a mixed legacy/unique loadout is all-or-nothing: missing, inaccessible or ambiguous required copies abort without committing a partial state.
- **Legacy item-type** sell/transfer/bulk/equip operations cannot silently consume or erase an individually tagged copy. Legacy copies without a tag still use existing functionality where safe.

## Existing player equipment: neutral Q50 compatibility

- **Existing Forge receipts without a saved quality roll display Q50/100 (Legacy baseline)**. This means **neutral/100% of their original base stats**, **not half their stats**. Q50 evaluates to exactly 1.0×, with Q0 at 0.75× and Q100 at 1.25×.
- **Q0 is a genuine possible roll**, not missing data. A saved `quality: 0` stays Q0 through normalization, UI and Keep Best 7; only absent/invalid historical rolls use the neutral legacy Q50 display baseline.
- Because quality now spans 75%–125% of base stats, a high-quality lower-rarity copy can beat a low-quality higher-rarity copy. Retention must use actual multiplied stat power instead of strict rarity-first ordering.
- This is a **read-only compatibility baseline**, not a randomized or fabricated historical Forge receipt. Existing `quality: undefined` remains absent in persistence. Preserved data include original rarity, `statRoll`, upgrade ranks, gems, locks, source receipts, saved loadouts and character ownership.
- Legacy receipt records remain ineligible for Keep Best 7 automatic disposal and ranking at the seven-copy limit. Do not silently promote them to normal rolled gear by persisting `quality: 50`. A player may manually review an item after safe identity reconciliation.
- Existing **untagged physical copies** may be forged, dropped or awarded. When no recorded Forge receipt can be linked safely, do **not** assign a unique copy ID, Forge rarity or Q50 roll based on item type alone. Their base stats and physical inventories remain untouched.
- Existing ownership reconciliation is still user-selected and guarded; no DB migration, backend deploy, minimum version change or AAB is performed by this compatibility adjustment.

## Smithing / Tailoring: collapsed Forge chances guide

- Both skills use `SmithingCollection` and show the same collapsed **Rarity & quality** disclosure at the bottom of the **Equipment** tab, after the Forge queue; Materials and Tools do not show unrelated Forge odds. It does not obstruct recipe actions.
- On the Equipment tab, odds apply to the currently selected crafted item and are computed from the same authoritative six-tier Forge roll table, base rarity and stat multiplier rules as Forge claims.
- For Common-base gear, actual results are **89.10% Common / 7% Uncommon / 3% Rare / 0.60% Epic / 0.20% Legendary / 0.10% Mythic**, at rarity multipliers **1.00× / 1.12× / 1.28× / 1.50× / 1.80× / 2.00×** before quality. This uses the game's full rarity palette, not a truncated three-rarity Forge.
- High-base-rarity recipes correctly combine non-upgrade proc probability into their guaranteed original tier (e.g. base Mythic remains **100% Mythic**; no separate downgrade chance).
- The quality section shows **Q0 −25%, Q25 −12.5%, Q50 normal, Q75 +12.5%, Q100 +25%** and explains that Attack, Defense and HP are modified on top of rarity/upgrades. No probabilities or gameplay rules are duplicated in UI state.
- New equipment quality remains a separate deterministic Q0–Q100 roll but is now **gently weighted toward lower grades** with `floor(101 × U^1.25)`. Approximate outcomes: **Q75+ 21.2%** (previously 25.7%), **Q90+ 8.8%** (previously 10.9%), **Q100 0.8%** (previously 1.0%). Rarity chance bands are unchanged. Quality stat effects remain −25% to +25%; older already-rolled items and missing-quality legacy items never reroll. The collapsed guide displays a single approximate Q90+ chance line.
- The guide is deliberately hidden on Materials and Tools; selecting Equipment shows the odds for the chosen piece.
- Rarity rows use each rarity's official theme-aware name color and matching marker (Common grey, Uncommon green, Rare light blue (`#62B8FF`), Epic purple, Legendary orange, Mythic pink), with **Chance** and **Stats** columns; rarity strength displays simple **×** multipliers (Mythic 2× for Common-base gear). On narrow screens or large text settings they stack into two compact lines instead of clipping.
- Three uncluttered quality examples explain Q0 −25% (red), Q50 normal (neutral), and Q100 +25% (green). Intermediate values scale between them. The disclosure is closed by default, with concise wording and no additional navigation or modal.
- For simple feedback, Uncommon and Rare upgrades produce the ordinary transient Forge banner; only Epic, Legendary or Mythic upgrades open the full rarity reveal. Messages use **rarity upgrade** rather than the misleading **quality proc** label.
- Regression checks cover all six roll bands, each boundary, displayed chances and multipliers, authored-gear rarity floors (including Epic and Mythic), and ensure final probabilities sum to 100%.

**Mythic balance:** Mythic's shared rarity stat multiplier is now **2.00×** rather than 2.20×. This affects Mythic rarity calculations wherever the shared rarity metadata is used; it does not reroll existing items, alter unique IDs, gems, locks or quality. Validate downstream combat/balance implications before release.

## Exact-copy colored rarity borders (merged PR #650)

- Inventory and Bank use the **exact physical `instanceId`** to resolve rarity. Two copies of the same item can have distinct border colors and widths. The selected tile retains its rarity border while using selection background/marker separately.
- The Character equipment grid resolves the actual equipped `equipmentInstanceIds[slot]` and never borrows the rarity of a better copy in the Bank. Enhancement/gear comparison rarity matches the equipped receipt.
- Legacy untagged equipment retains its original authored rarity until safely reconciled, rather than guessing which Forge record belongs to it.
- Equipment artwork accepts an explicit rarity for displays with a known instance; Forge reveal cards use the actual rolled rarity.
- The shared Forge odds guide uses all six official rarity name colors with final odds per authored recipe, quality −25% to +25%, and labels translated in English, German, Spanish, Dutch, Italian, and French.
- Added regressions for matching inventory and equipped exact-copy rarities and comparisons, in addition to no-loss settlement and Gold replay tests. Do not treat a green focused suite as a substitute for full mobile typecheck and Android release gates.

## Implementation

- `apps/mobile/src/core/crafted-gear-instances.ts`: deterministic, gently weighted 0–100 quality rolls with a single shared approximate probability helper; optional quality/lock for older saves; seven-copy projection; globally bounded instance creation with **no silent eviction**.
- `apps/mobile/src/core/crafted-gear-ownership.ts`: cross-character physical ownership audit, precise Inventory ↔ Bank moves, per-copy lock, equip/unequip, manual sell/salvage with exact physical removal and one vendor Gold credit. Unknown/duplicate instance markers fail closed.
- `apps/mobile/src/core/crafted-gear-retention.ts` and `crafted-gear-settlement.ts`: eligibility filtering, protected-item checks, deterministic rarity/quality comparison and settlement proposals with receipt replay protection.
- `apps/mobile/src/core/equipment-crafting-queue.ts`: Forge claim issues physical instance markers; enforces the 7-copy limit; performs optional exact-copy replacement and reward grant together in the immutable game command state; blocked claims remain ready; Claim All continues other eligible jobs.
- `apps/mobile/src/core/game-commands.ts`: validated `gear_equip`, `gear_unequip`, `gear_move`, `gear_lock`, `gear_sell`, `gear_salvage`, `gear_autosell` command types. Commands execute on trusted state through the established server command pipeline; clients cannot specify Forge RNG or modify state directly in server mode.
- `apps/mobile/src/core/equipment-enhancement.ts`: enhancement rank, sockets, rarity and quality use the **actually equipped instance** where the equipped slot has a physical ID. Legacy untagged equipment retains the old compatibility path.
- `apps/mobile/src/core/character-loadouts.ts`: save/normalize exact instance IDs, validated atomic loadout application. Legacy loadouts unrelated to tagged gear continue to function.
- `apps/mobile/src/core/game.ts` and `inventory-bulk.ts`: marker-safe stacking, overflow, generic-item-consumption and type-based bulk action protections.
- `InventoryScreen`, `EquipmentCraftQueuePanel`, `SkillsScreen` and `App.tsx`: functional per-copy actions and the optional auto-sale switch.
- `apps/mobile/tests/equipment-crafted-instance-results.ts`: tagged claims, account-wide count, seven-copy overflow, weak incoming vendor sale, stronger exact-copy replacement, locked items, no double Gold on replay, exact equip/unequip/transfer/sell/lock/salvage, saved loadout references, legacy fallback and no-loss state normalization.

## Known release blockers before deploying to players

1. **Legacy migration and review workflow.** Existing crafted records in old saves may be unlocated because their physical Inventory/Bank stacks had only `itemId`. The implementation never guesses which roll belongs to which untagged physical copy. Such accounts can remain blocked from Keep Best 7 until an explicit, auditable ownership reconciliation tool is implemented and tested. Legacy type-based enhancements and unbound saved loadouts also remain protected.
2. **Server concurrency.** The code updates the command's immutable GameState in one operation, but an actual two-device concurrency and replay test against the production-style server persistence transaction has **not** been performed. Validate account revision fencing, duplicate command delivery, claim-vs-equip-vs-sale, overlapping claim-all, cash balance integrity and rollback.
3. **Old clients / online deployment.** Older mobile clients know only `itemId` and might mishandle new instance-tagged gear. Ensure backend minimum-version gating and compatible migration before serving tagged Forge rewards to users on old builds.
4. **UI and migration QA.** Exercise mixed legacy/unique inventories, all five characters, saved loadouts, Bank and Overflow, storage cap, socketed/locked/favorite equipment, exact-copy sorting/selection and screen-reader labels on Android devices.
5. **Global storage cap.** The existing 500 unique-instance safety ceiling still applies; it must show a comprehensible management path without evicting gear and allow existing over-cap legacy saves to load.
6. **CI and baseline.** The focused unique Forge equipment regression and backend/SQL integrity checks passed on the quality-weighting commit. The broader mobile TypeScript and core/UX suites remain red with existing companion, dungeon, chat, localization and starter-companion issues also present on consolidated `main`. Do not label the merged source release-ready until full TypeScript, core validation and a production Android build pass on a release candidate.
7. **Economy/balance.** Revalidate ±25% quality across upgrades, gems, equipment tiers, combat and dungeon snapshot calculation. Audit sold-item Gold destination and absence of duplicate rewards in a database-backed transaction.

**Release policy:** PR #650 was merged as code consolidation; do not deploy the gameplay backend or release an AAB with the unique Forge rollout until blockers, particularly legacy reconciliation, old-client compatibility and concurrent server settlement, are independently verified.
