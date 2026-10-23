# Unique forged gear, quality rolls and Keep Best 7

**Status:** implemented on draft PR #601, **not merged or deployed** (2026-10-23). This document describes draft behavior, not a production release.

## Player-facing contract

- Each new timed non-novice Forge equipment result is issued as **one physically tagged copy** with a unique `instanceId`, rarity and deterministic quality roll **1–100**. Tier procs are unchanged (0.60% Epic; 0.10% Mythic). Quality affects equipped stat calculations by a bounded **±5%**; upgrades and two socket types remain separate.
- Each account can have up to **seven physical copies of each exact equipment item ID**, across five characters, equipped items, inventories, Bank and overflow. Conservative copy projections count untagged legacy equipment too. Old over-cap saves are not truncated.
- **Keep Best 7** opt-in toggle on the Forge screen, default **OFF**, persisted account-wide by a validated `gear_autosell` command.
- With OFF, an eighth finished Forge craft **stays ready** until the player makes room.
- With ON, if the existing seven copies are linked to their actual storage and server-verified, compare the incoming item with their rarity × quality. A weak or tied incoming roll sells itself; a stronger incoming roll sells the weakest **eligible** owned copy. Credits are routed to the actual holder or Bank.
- Auto-sale **never** disposes equipped, locked, favorited, enhanced, socketed, loadout-protected, unknown-location or legacy-ambiguous copies. A stronger new craft whose weaker existing copies cannot safely be replaced **stays pending** for manual review.
- The Forge result shows quality and whether the new or an older copy was automatically sold for vendor Gold.
- Inventory and Bank have per-copy management: inspect individual rarity/quality, **Equip, Transfer, Lock/Unlock, Sell or Salvage** the precise instance, with destructive confirmation. The Character screen routes unequipping uniquely tagged gear through an exact-copy command.
- Saving/applying a loadout preserves the selected instance ID. Applying a mixed legacy/unique loadout is all-or-nothing: missing, inaccessible or ambiguous required copies abort without committing a partial state.
- **Legacy item-type** sell/transfer/bulk/equip operations cannot silently consume or erase an individually tagged copy. Legacy copies without a tag still use existing functionality where safe.

## Implementation

- `apps/mobile/src/core/crafted-gear-instances.ts`: deterministic 1–100 rolls, optional quality/lock for older saves, seven-copy projection, globally bounded instance creation with **no silent eviction**.
- `apps/mobile/src/core/crafted-gear-ownership.ts`: cross-character physical ownership audit, precise Inventory ↔ Bank moves, per-copy lock, equip/unequip, manual sell/salvage with exact physical removal and one vendor Gold credit. Unknown/duplicate instance markers fail closed.
- `apps/mobile/src/core/crafted-gear-retention.ts` and `crafted-gear-settlement.ts`: eligibility filtering, protected-item checks, deterministic rarity/quality comparison and settlement proposals with receipt replay protection.
- `apps/mobile/src/core/equipment-crafting-queue.ts`: Forge claim issues physical instance markers; enforces the 7-copy limit; performs optional exact-copy replacement and reward grant together in the immutable game command state; blocked claims remain ready; Claim All continues other eligible jobs.
- `apps/mobile/src/core/game-commands.ts`: validated `gear_equip`, `gear_unequip`, `gear_move`, `gear_lock`, `gear_sell`, `gear_salvage`, `gear_autosell` command types. Commands execute on trusted state through the established server command pipeline; clients cannot specify Forge RNG or modify state directly in server mode.
- `apps/mobile/src/core/equipment-enhancement.ts`: enhancement rank, sockets, rarity and quality use the **actually equipped instance** where the equipped slot has a physical ID. Legacy untagged equipment retains the old compatibility path.
- `apps/mobile/src/core/character-loadouts.ts`: save/normalize exact instance IDs, validated atomic loadout application. Legacy loadouts unrelated to tagged gear continue to function.
- `apps/mobile/src/core/game.ts` and `inventory-bulk.ts`: marker-safe stacking, overflow, generic-item-consumption and type-based bulk action protections.
- `InventoryScreen`, `EquipmentCraftQueuePanel`, `SkillsScreen` and `App.tsx`: functional per-copy actions and the optional auto-sale switch.
- `apps/mobile/tests/equipment-crafted-instance-results.ts`: tagged claims, account-wide count, seven-copy overflow, weak incoming vendor sale, stronger exact-copy replacement, locked items, no double Gold on replay, exact equip/unequip/transfer/sell/lock/salvage, saved loadout references, legacy fallback and no-loss state normalization.

## Known release blockers before merge

1. **Legacy migration and review workflow.** Existing crafted records in old saves may be unlocated because their physical Inventory/Bank stacks had only `itemId`. The implementation never guesses which roll belongs to which untagged physical copy. Such accounts can remain blocked from Keep Best 7 until an explicit, auditable ownership reconciliation tool is implemented and tested. Legacy type-based enhancements and unbound saved loadouts also remain protected.
2. **Server concurrency.** The code updates the command's immutable GameState in one operation, but an actual two-device concurrency and replay test against the production-style server persistence transaction has **not** been performed. Validate account revision fencing, duplicate command delivery, claim-vs-equip-vs-sale, overlapping claim-all, cash balance integrity and rollback.
3. **Old clients / online deployment.** Older mobile clients know only `itemId` and might mishandle new instance-tagged gear. Ensure backend minimum-version gating and compatible migration before serving tagged Forge rewards to users on old builds.
4. **UI and migration QA.** Exercise mixed legacy/unique inventories, all five characters, saved loadouts, Bank and Overflow, storage cap, socketed/locked/favorite equipment, exact-copy sorting/selection and screen-reader labels on Android devices.
5. **Global storage cap.** The existing 500 unique-instance safety ceiling still applies; it must show a comprehensible management path without evicting gear and allow existing over-cap legacy saves to load.
6. **CI and baseline.** The latest completed TypeScript, Forge regression, and SQL jobs passed on inspected commits. The overall Mobile UX suite still fails on the unrelated Home navigation contract and Mobile core's Expo patch expectation (~57.0.31 vs installed 57.0.29). A fully green final SHA and Android build are required.
7. **Economy/balance.** Revalidate ±5% quality across upgrades, gems, equipment tiers, combat and dungeon snapshot calculation. Audit sold-item Gold destination and absence of duplicate rewards in a database-backed transaction.

**Release policy:** Keep PR #601 **draft and unmerged**. Do not deploy until blockers, particularly legacy reconciliation, old-client compatibility and concurrent server settlement, are independently verified.
