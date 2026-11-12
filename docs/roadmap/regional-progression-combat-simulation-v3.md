# Veldryn — 25-level regions: verified combat and crafting baseline V3

**2026-11-12 · READ-ONLY VALIDATION, NOT A LIVE REBALANCE.** Follows [V2 actual mobile Combat Power calibration](./regional-progression-combat-power-calibration-v2.md). The design question remains: 25 character levels per region, two equipment tiers per region, the second tier becoming meaningfully useful around the midpoint.

**Passed verification:** [GitHub Actions regional-combat-simulation run 43207286973](https://github.com/elroynbenjamins/Veldryn/actions/runs/43207286973) (with per-class boss fairness); prior successful full simulation [run 43206965830](https://github.com/elroynbenjamins/Veldryn/actions/runs/43206965830). The test-only harness is `tools/regional-combat-sim-entry.ts`, built/executed by `tools/regional-combat-sim.mjs`; CI workflow is `.github/workflows/regional-combat-simulation.yml`.

Run it without installing new tooling, after mobile/backend dependencies are installed:

```sh
node tools/regional-combat-sim.mjs > regional-combat-simulation.json
```

**Exact coverage:** 810 synthetic real-mobile ordinary-hunt `combatSustainProjection` calls (9 classes × 2 equipment paths × 9 enemy checkpoints × 5 gear-investment scenarios), **2,160** deterministic `previewFallenKnightBattle` attempts (9 classes × 2 paths × 5 scenarios × 2 consumable modes × 12 seeds), plus 108 V33 full-set crafting recipe/path audit records (9 classes × 2 paths × 6 tiers). The CI reruns the earlier 1,080-build Combat Power benchmark and confirms its output is unchanged. Includes **current** enemy/XP/monster tiers and no proposed region/monster changes. The full JSON output is attached to GitHub Actions for 14 days; rerun for indefinite reproducibility. No database reads or writes are performed by the simulator itself.

## 1. Proposed chapters — not live

| Chapter | Character levels (proposal) | First gear | Second gear | Difficulty transition |
|---|---|---|---|---|
| Asterfall | 1–25 | T1 1–12 | T2 13–25 | gradually expect T2 from ~Lv17 |
| Sunscar | 26–50 | T3 26–37 | T4 38–50 | gradually expect T4 from ~Lv42 |
| Frostmarch | 51–75 | T5 51–62 | T6 63–75 | gradually expect T6 from ~Lv67 |

**Important:** The actual Fallen Knight gate remains character Lv20 after XP rebasing, even though the authored boss is Lv25. T6 is not released. Current World travel and crafting/equip/Market level requirements have not been changed.

## 2. Ordinary hunts — actual current combat engine, representative loadouts

Each row averages 18 legal class × Foundation/Alternate builds. Representative = **full Common Q50 current-tier set, four +2 enchantments, four Grade-2 stat gems, appropriately trained role-compatible companion**. Food is the current region's authored local sustain food. Output estimates assume continuously hunting the named current-region mob and are **not** observed playtime, an entire chapter average, or a final future enemy difficulty value.

| Region & proposed character checkpoint | Current enemy used | Kills/h | Food/h | Combat XP/h | Hours to next character level |
|---|---|---:|---:|---:|---:|
| Asterfall T2, Lv25 | Oathglass Revenant, King's Road | 95.09 | 8.88 | 17,972 | 9.14 |
| Sunscar T3, Lv26 | Sunscar Scorpion | 95.50 | 11.62 | 20,055 | 8.65 |
| Sunscar T3, Lv37 | Glass Dune Strider | 74.50 | 15.54 | 21,187 | 14.73 |
| Sunscar T4, Lv38 | Mirage Shade | 87.82 | 13.14 | 27,452 | 11.73 |
| Sunscar T4, Lv50 | Royal Sandguard | 63.97 | 16.44 | 27,058 | 19.13 |
| Frostmarch T5, Lv51 | Frostwolf | 33.26 | 11.87 | 14,170 | 34.78 |
| Frostmarch T5, Lv62 | Rime Stalker | 22.00 | 13.16 | 13,133 | 51.89 |
| Frostmarch T6, Lv63 | Choir Hunter | 20.08 | 13.30 | 14,215 | 49.38 |
| Frostmarch T6, Lv75 | Wyrmspine Guardian | 20.79 | 13.18 | 16,345 | 57.06 |

Machine-readable checkpoint summary: [regional-combat-simulation-v3.csv](./spreadsheets/regional-combat-simulation-v3.csv).

**An indicative continuous-farming time estimate** was calculated with the current character XP curve and linear interpolation between these checkpoints (not a pathing/loot/quest simulation): **~296 combat hours for Sunscar Lv26→50** and **~1,131 hours for Frostmarch Lv51→75**. At perfect 24h/day uptime, that corresponds to **~12.3 days vs ~47.1 days of uninterrupted farming**. Other quest/boss/dungeon XP can change real player pacing considerably, and AFK/offline caps make calendar time different. This is a red flag for Frostmarch, not proof that a specific XP multiplier should be deployed.

**Suggested pacing design target for discussion, not approved:** Keep Sunscar's effort meaningful rather than indiscriminately increasing XP; aim to reduce Frostmarch's *pure-hunting baseline* toward roughly **600–840 continuous hours (25–35 days at perfect uptime)**. Achieving that with combat XP alone would imply around **1.35–1.89×** the current Frostmarch XP/hour, but consider enemy cadence, quests, boss first-clear XP and equipment-level availability before selecting actual numbers. Avoid globally changing the character XP curve just to fix one region.

**Gear value / monster timing:** At the current Sunscar Royal Sandguard, seven-piece mixed/Common Q40 vs well-prepared Rare Q70 yields about **56.16 → 85.57 kills/hour (+52%)**. At the Frostmarch Wyrmspine Guardian, it yields only **19.27 → 22.37 kills/hour (+16%)**. The current combat cycle/expected-power clamps and authored monster timers reduce visible reward from higher investment in late Frostmarch. The chapter redesign should make T6 meaningfully helpful against future Frostmarch enemies, while preserving the normal no-encounter/search cooldown as a farming ceiling.

**Sustain caution:** The current general Sunscar authored prepared-food range is 5.9–12.9 items/hour, while the late Royal Sandguard representative reaches ~16.4. This may be deliberate hard-area pressure, but validate whether the new Lv44–50 Sunscar zone target should explicitly use a separate late-area food budget rather than applying the early region average indiscriminately.

**Authoring gap:** Sunscar's expected tier currently switches to T4 only at authored enemy Lv40, and Frostmarch only switches to T6 at authored enemy Lv70. The currently tested Wyrmspine Guardian is authored Lv69. **Simply giving players T6 without changing these thresholds would not make T6 necessary for that encounter.** Update monster-level mapping and the *average 10-slot expected-tier* rule in one reviewed pass; do not hard-require a particular rarity or a full Mythic set.

## 3. Fallen Knight Chapter I — measured current snapshot battle

Test level is **character Lv25**, unlike the current Lv20 entry requirement. Each listed potion mode includes 216 deterministic battle attempts = 9 classes × 2 gear paths × 12 seeds. All loadouts have one role-compatible trained companion. "Plain Common" means no gems/enchantments, not no companion.

| T2 loadout | Win rate, no healing potions | Win rate, 5 Riverheart Draughts | Avg draughts used when stocked |
|---|---:|---:|---:|
| Seven-piece T2 / three T1, Q40 | 0% | 54.17% | 4.97 |
| Full Common Q50, plain | 0% | 98.61% | 4.41 |
| Full Common Q50, 4× +2, 4 G2 gems | 0% | 100% | 4.13 |
| Full Uncommon Q60, 6× +2, 6 G2 gems | 0.46% | 100% | 3.09 |
| Full Rare Q70, 10× +2, 8 G3 gems | 31.48% | 100% | 1.81 |

**Class/path fairness check:** For full plain Common T2 with five healing potions, all 18 class/path profiles achieved at least **83.33%** wins across their 12 deterministic seeds. For representative Common T2, all 18 profiles won **12/12**. The seven-piece mixed-kit scenario has substantial class disparities and some profiles with 0/12 wins, as expected for a preparation check; do not expand requirements based only on the average.

**Implication:** A complete attainable T2 kit plus consumables is already highly reliable for the current chapter boss at character Lv25. It may not need a substantial buff. But the battle is **very consumable-dependent**: even full representative T2 fails every potionless test. This should be an explicit design choice. Don't automatically nerf the boss, and don't conflate the chapter boss's 5 permitted healing draughts with the separate one-tonic-per-run dungeon/boss consumable system.

## 4. Recipe and regional material audit

Across all nine classes and both set paths, each full ten-piece kit has the following *final-assembly* requirements. This excludes producing precursors, gathering materials, upgrading gear and enchanting cost.

| Tier | Current equipped character level | Craft profession min level | Total 10-piece base craft Gold | Current V33 catalog region |
|---|---:|---:|---:|---|
| T1 | 2–4 | 1–2 | 3,914 | Asterfall |
| T2 | 10 | 9 | 13,688 | Asterfall |
| T3 | 20 | 23 | 58,644 | **Asterfall metadata; Sunscar actual materials** |
| T4 | 30 | 37 | 117,288 | **Asterfall metadata; Sunscar actual materials** |
| T5 | 40 | 52 | 114,030 | **Sunscar metadata and materials** |
| T6 | 50 | 67 | 325,800 | **Sunscar metadata and materials; tier UNRELEASED** |

**Findings:**
- Full **T5 base Gold cost is lower than T4**, even though T5 is the next tier. Review tier scaling instead of carrying this discontinuity into the new Frostmarch economy.
- T5 Smithing recipes consume Sunstone Ingots and Amberglass; T5 Tailoring recipes consume Sunscale and Amberglass. T6 similarly depends on Sunscar materials. A 51–75 Frostmarch T5/T6 plan requires a fully reviewed material-source migration with substitutions available early enough in the region.
- The proposed midpoint T6 access near character Lv63 coexists with **profession level 67** for T6 final assembly. These are independent XP tracks, so profession attainment must be tested rather than assumed from character level.
- Exact V33 set/item IDs, instance rarity/quality/enchants/sockets and existing owned gear must remain stable. T6 artwork/release flags must remain blocked until complete.
- Approved **hidden Player Market** purchase floors T1/T2/T3/T4 = **6/18/30/52** and rarity premiums +0/+0/+2/+4/+6/+8 are **unchanged**. The Market is still hidden. A future item equip/recipe-level update must not silently overwrite these separate purchase gates.

## 5. Release-safe implementation sequence — not started

1. **Lock desired time-to-progress targets** first. Run a targeted quest/contract/dungeon XP contribution audit and measure expected real player play/idle cadence. Do not select a regional XP multiplier from this report alone.
2. Define a single future **region/area/gear-tier schedule** (Asterfall 1–25, Sunscar 26–50, Frostmarch 51–75) used by UI/world travel, ordinary hunts and class gear readiness. Set halfway second-tier pressure gradually, not abruptly; retain mixed-set viability.
3. Build and test **proposed monster profiles** in a dry-run staging fixture: real HP, attack, defense, XP, accuracy/crit/haste, time-to-kill and food. Keep first-entry Common viable, later-area enhanced Common/Uncommon comfortable, and Rare advantageous but optional. Preserve applied 1.07× general and 1.20× advanced-region multipliers without accidental double-application.
4. **Coordinate recipes and resources** with the above: catalog region labels, material sourcing, alchemy infusion chains, Smithing/Tailoring skill floors, craft XP and gold, dungeon rewards/drop rates, 10-slot set bonuses and item level requirements. T6 should not release until art and complete QA are separately approved.
5. Test **actual Sunscar and Frostmarch chapter bosses/dungeon scenarios** with appropriate 1 Tank / 2 Damage / 1 Support groups, realistic consumables and multi-seed clear rates, using authoritative server snapshots. Sunscar regional story boss is not presently equivalent to the standalone Fallen Knight simulator; don't claim a final boss win rate from character-sheet CP.
6. Only then implement guarded server/client updates, run full staging regression with existing item/crafting save data, respect rollback, review hidden Market purchase policy separately, and authorize release. **Do not deploy this design from the calibration workflow.**

## 6. Evidence status

- **Verified:** GitHub Actions passed, 810 mobile ordinary-hunt projections, 2,160 multi-seed boss simulations, 108 complete recipe audits, current XP curve, current gear tier and material references.
- **Not available:** Observed high-level production CP cohort (latest production snapshot contained no characters at XP-derived level 38+). Production sample 214 characters; use the corrected distribution 205 at 1–12, 8 at 13–25, 1 at 26–37, none at 38+. No production CP telemetry was found. Current authored monster levels remain different from rebased travel/character levels.
- **Not tested yet:** Proposed future monster HP/Attack/Defense/XP curves, actual future chapter-boss win rates, long-term loot supplies or a live player sample in Frostmarch/T6.
- **Gameplay changes made in V3:** **None.** Added only read-only tests and documentation.
