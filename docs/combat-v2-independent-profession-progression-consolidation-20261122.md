# Veldryn 2.0 — Independent Classes, Professions & Progression (22 November 2026)

**Status:** HIDDEN DESIGN/ENGINE CONTRACT; REVIEW ONLY. This document and pure server-side policy are on an isolated child of Skills/Classes PR #1551, targeting canonical Combat 2.0 PR #1377. Do not merge to main, connect live routes, apply database migrations, turn on feature flags, change an existing player's XP/equipment, deploy, or ship an unapproved UI/theme.

## Direction already approved by the game owner

A player may become a **T9 master gatherer or crafter without leveling combat**, and no profession forces players to level a different profession. Some rare, combat-sourced materials should remain meaningful parts of crafted equipment, but they **must be tradeable, obtainable through player commissions, or both**. Equipping high-tier combat gear may still require combat progression. The Player Market must support specialist-only characters, and finished gear/rare recipes must remain meaningfully difficult even though everyday training loops are smoother.

### Two separate and non-substitutable progress tracks

- **Character Lv = verified combat level only.** The existing combat XP curve controls abilities, combat talents, class specializations, equip requirements, dungeon/raid participation, and combat CP. It is not calculated from total profession levels, maximum profession level, account-wide mastery, trades, crafting output, or character wealth. A combat Lv1 Smithing Lv90 is **Character Lv1**, not 90 or 91.
- **Profession Lv = per-character, per-skill XP track, 0–100.** A profession's own level alone grants its training-tier license. All other profession levels may remain 0; combat can remain Lv1. New trainable professions must be added through a server-controlled catalogue, not client JSON.
- **Profession Mastery Total** is an optional profile and leaderboard **display-only sum** of trained profession levels; it must never be passed as the combat level or used for talent, class, equip, crafting, travel, shop, raid, or character-slot eligibility. Existing account-wide character slot unlock policy remains unchanged until a separately reviewed migration.
- Character-specific class combat talent points still follow the canonical combat levels 10/15/20/25/30/35/40/45/50. Profession milestones never grant combat talent points.
- Legacy character and profession XP are not silently rewritten by this draft.

## Initial T1–T9 profession license curve — provisional; verify pacing

| Tier | Own skill level | Example |
|:--|--:|:--|
| T1 | 1 | Smithing 1 crafts its T1 recipes |
| T2 | 10 | Smithing 10; no Mining requirement |
| T3 | 22 | Keeps the existing T3 level-22 design anchor |
| T4 | 35 | Own skill only |
| T5 | 45 | Own skill only |
| T6 | 55 | Own skill only |
| T7 | 65 | Own skill only |
| T8 | 75 | Own skill only |
| T9 | 90 | Works at combat Lv1 when obtained inputs/blueprints exist |

Tiered gathering: Mining, Woodcutting, Fishing, Herbalism. Tiered production: Smithing, Cooking, Alchemy, Tailoring, Enchanting. Exploration, Faith, and Forge remain independent trainable utility/mastery tracks; **they are not second hidden required gates** for T1–T9 recipes. Distinguish recipe *license* from recipe execution: blueprint ownership, genuine item/currency quantities, server timing and market/commission receipts still apply.

All 9 tier thresholds and the numerical bonuses below are **proposals, not live balance decisions**. They must be checked against 2.0 resource drops, action duration, skill XP, recipes, economy and active equipment tiers before approval.

### Progression and benefit milestones — profession-local

| Own skill Lv | Proposed benefit | Guardrail |
|--:|---|---|
| 10 | +1% XP for that profession | No combat XP |
| 25 | Unlock **optional primary profession focus** | No other profession necessary; no forced choice |
| 40 | +1% profession action speed | Included in the shared speed cap |
| 50 | +1 commission listing slot for the trained profession | Must use future verified commission storage |
| 75 | Additional +1% profession action speed | Existing Forge and other bonuses share the same 10% speed ceiling |
| 90 | T9 training/recipe license on this profession | Not a gear-wearing license |
| 100 | Master profession title / visible mastery achievement | No combat power |

**Focused profession bonus path**, only when the chosen focus itself has reached the threshold:

| Focused skill Lv | Proposed focus bonus |
|--:|---|
| 25 | +2% focused profession XP |
| 50 | +1% focused action speed (same combined 10% cap) |
| 75 | +0.5 percentage point precision / consistent quality chance, exact rarity implementation pending |
| 100 | +1 focused commission slot and a specialist profile display |

Exactly one *primary focus* can be selected per character; all other professions continue gaining XP at normal rates and still reach T9 without focus. A future focus switch should be transactional, explicitly explained, and prevent rapid exploit switching; the actual respec cost/cooldown is **not approved** and is intentionally not in code. Avoid large rare drop or extra-output multipliers that would erase Player Market demand.

**Draft profession XP to next level:** \`ceil((120 + 28·(L−1) + 0.85·(L−1)²)/10)·10\`, levels 1–99, rounded up to ten. At 100, there is no next-level XP. This is a **target curve**, not a migration or command to rewrite live XP. Validate actual actions per level and total hours to T9 with real gathering, refining and crafting data first.

### Skill flows that do not force another skill or combat

1. Smithing-only character trains Smithing on accessible training recipes, buys Ore/Ingots and rare monster drops from Market/commission orders, crafts T9 when Smithing 90 and a genuine T9 blueprint and materials are owned; character can remain combat Lv1.
2. Mining-only character reaches Mining 90 and supplies high-grade ore through trade; does not require Smithing 90 to mine or sell.
3. Combat-only character is free to buy high-tier finished goods but must meet their **combat equip requirement**, not the maker's profession level.
4. Finished equipment remains difficult: meaningful refined material quantities, low-drop combat materials, recipe/blueprint rarity and timed crafts. Low-cost training recipes are kept separate from full gear recipes so skilling is convenient without flooding the Market.
5. Routes or zones required for gathering T9 must have profession-accessible alternatives (profession paths, contracts or trade); a mandatory PvE kill in the resource loop would violate the intended independence.
6. No automatic stat bonuses from professional titles or profession score. Combat 2.0 actor compilation continues to derive all combat damage/talents from validated class level, owned equipment, effects and buffs.

### Technical boundaries

- Code: \`backend/src/server/combat/v2/profession-progression.ts\` has deterministic fail-closed checks for server-sourced levels, optional focus, per-skill tier licenses, separate combat equipment eligibility, milestone projections, provisional XP curve and cumulative 10% speed cap.
- Tests: \`backend/src/server/combat/v2/__tests__/profession-progression.ts\` checks every tier across all nine tiered skills at combat Lv1, prohibits cross-skill leakage, rejects unknown injected skill IDs, ensures crafting T9 cannot unlock combat equipment, tests focused milestones and XP monotonicity.
- This is **not** an authenticated XP awarder, crafting/market issuer, profile migration, client route, DB write, or live access gate. Production must eventually read verified per-character profession levels in a service-role transaction and authorize recipes/commissions with genuine source receipts.
- Preserve independent account-wide currency/character-slot rules and keep the current \`characterLevel\` trusted-build field sourced exclusively from *combat level*, not aggregate skills. Never treat the preview catalogue as an authorization source.
- UI review gate: the hidden native \`SkillsV2PreviewScreen.tsx\` already includes Overview, Skills, Talents, Builds. The merged 1.0.11 Skills Navigator is separate. Review actual redesigned Combat Builds, Profession Progress and Focus screens—including themes and 360/390px layouts—before attaching any to live navigation.

## Pass 1 — consolidation audit of hidden class/combat branches (22 Nov)

- **#1377**: canonical Skills/Classes 2.0 foundation; draft, NOT in \`main\`, ~760 main commits of divergence at audit time. Already contains 9 classes/18 styles, 54 active abilities/162 variants, 81 passive paths and 2 guarded build presets.
- **#1551**: child ability refinement (Iron Riposte, persistent Thunder Totem, status refresh); draft, 25 commits ahead and 0 behind parent at audit time. Its exact-head dedicated Skills CI run \`44927121605\` **FAILED** at the Thunder Totem assertion (expected ticks 2000/4000/6000ms, got 2000/4000ms). Separate mobile core, Edge parity and gem/dungeon jobs also failed. Do not call this line green or merge until reverified.
- **#1558 → #1559**: sibling equipment-trait / exact-copy boss integration, overlapping \`engine.ts\` and \`types.ts\` with #1551. Requires reviewed source-by-source reconciliation, not a blind sibling merge.
- **#1569**, **#1430**, **#1593**: further hidden dungeon/boss/party pilots. Keep independent until one canonical shared stat/ability/item authority is proven.
- **This branch**: chooses #1551 as its parent; introduces only a new isolated progression contract, tests, CI gate and this audit. No mainline merge. The shared-equipment sibling needs a later conflict-resolved integration with complete regenerated replay baselines.

### Recommended next engineering sequence

1. Verify the actual #1551 Thunder Totem refresh timing vs the fixture and fix the specific failing assertion/engine issue; rerun exact-head Skills, mobile core, Edge and gem/dungeon jobs.
2. Check this independent progression contract against 2.0 economy and real skill-rate observations; then move to authenticated class/combat vs profession XP source separation and player-market/commission authorizations.
3. Reconcile latest #1559 equipment actor source with these class abilities and #1430 authored enemy kits, use one compiler, and test all 18 specs, T1–T9 gear, solo/dungeon/boss/Party scenarios and legacy persisted replays.
4. Design the final compact Character Builds, Talents, Professions and Focus UI; obtain explicit user approval of layouts and themes before any real app UI implementation.
5. Only after exact-head CI, staging receipts/PG17 concurrency, locale, native, migrations and rollback gates: propose one coordinated 2.0 launch. Flags remain OFF until that separate release authorization.
