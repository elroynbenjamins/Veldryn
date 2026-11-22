# Equipment 2.0 — exact source gap audit for the 48 planned launch sets

**22 November 2026 · HIDDEN / SOURCE-ONLY · unapproved · no live changes**

## Why this pass exists

The expanded Equipment/Combat 2.0 target is **48 tiered T1–T4 sets** (12 families across four tiers), **204 distinct equipped set-piece slots** and **108 not-yet-implemented threshold bonus ideas**. The legacy Forge branch already has **169 hidden item templates** and **338 draft crafting routes**, but *none* of the 204 `EQ2_LAUNCH_...` IDs are issued items.

This pass checks the exact existing Forge objects against the intended member requirements without inventing aliases, migrating a single item, or authorizing an item claim. It is a **source-compatibility preview**, not a final conversion plan.

## Conservative source result

| Tier | Required set-member identities | Potential exact existing unassigned Forge pieces | Unmatched |
| --- | ---: | ---: | ---: |
| T1 | 51 | 18 | 33 |
| T2 | 51 | 21 | 30 |
| T3 | 51 | 20 | 31 |
| T4 | 51 | 15 | 36 |
| **Total** | **204** | **74** | **130** |

- Source inventory: **169** pinned original Forge templates.
- **42** original set-member templates are *protected*: no silent conversion of the old 15 set IDs.
- **52** class-restricted weapon-family templates are excluded from nonweapon set membership.
- **75** templates are currently unassigned, nonweapon and class-unrestricted; only **74** have an exact tier+role+slot set-member opportunity. One remains unpaired.
- **74/74** possible existing-template matches already have at least one draft crafting route. This does **not** approve their recipes, their new memberships, their materials or their in-game sale/obtainability.
- **130** intended member slots have no conservative source candidate. They require new authored item definitions or an individually reviewed reconciliation of other existing assets; do **not** assert that precisely 130 net-new items must be minted.

## Guardrail and test implementation

- `backend/src/server/combat/v2/equipment-expanded-member-source-audit.ts`: derives one-to-one, deterministic *unapproved* potential links from actual Forge and structural Combat sources.
- `backend/src/server/combat/v2/__tests__/equipment-expanded-member-source-audit.ts`: pins 74/130 and checks legacy set custody, no weapon or class restriction leakage, same tier/role/slot, duplicate rejection, ID collision and input-order invariance.
- Hidden Equipment/Combat integration CI compiles and executes the new review test and scans public entrypoints for review-only API import leaks.

The pairing result explicitly returns `mayMintItems=false`, `mayMutateSetIds=false`, `mayEnableCrafting=false`, `mayEnableCombatBonuses=false`. The API has **no** SQL, route, item grant, crafting mutation or combat authorizer.

## Next development order

1. Author the **33 T1 missing member identities** first, with distinct real server-owned IDs and tier/role/slot checks, before T2 (**30**), T3 (**31**) and T4 (**36**). Validate all 51 T1 intended members and all T1 threshold counts *before* applying numerical set bonuses.
2. For each member, choose explicit **new piece** versus **reviewed source reassignment**, never silent legacy set rewriting. Keep the original 169 template identities and actual earned copies intact; preserve 11 weapon-family eligibility and old 15-set history unless an individually approved plan specifies otherwise.
3. Bind crafted pieces to the agreed gathered/refined + combat-drop economy and meaningful rare components, keeping player-market scarcity. The Fishing/Dungeon catalysts and Sunstone/Glassbound identity conflicts need source-of-truth closure. Dungeon/Party/World-only equipment requires server-authenticated loot and duplicate-safe claims, not ordinary craft routes.
4. Add approved 2/3/4/6 threshold effects with *original event source* constraints, 17-channel affix policy, separate rare signature-trait drops (at most two active), and global reflect/haste/crit/shield caps.
5. Finish deterministic nine-class/18-specialization × tiers × quality/rarity × sets/affixes/traits/gems × regional boss, dungeon, world, party, guild battle checks. Balance enemies and bosses after real executable equipment sources are stable.
6. Owner must see and approve actual mobile UI/screens and themes **before** any user-facing design implementation. Strict CI, full staging receipt/replay, Android and owner signoff remain release blockers.

**Release state:** This does not make Equipment 2.0 playable or release-ready. No main merge, migration, feature flag, production deployment, player inventory mutation, UI implementation or public-facing changes.
