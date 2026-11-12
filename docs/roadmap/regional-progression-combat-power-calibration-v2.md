# Veldryn regional progression — V2 verified runtime Combat Power study

**2026-11-12 | DESIGN/BENCHMARK ONLY | NO LIVE BALANCE OR RELEASE CHANGES**

**Status:** Test runner implemented, GitHub Actions **PASS**: [Regional gear Combat Power benchmark, run 43202573610](https://github.com/elroynbenjamins/Veldryn/actions/runs/43202573610). The full 60-row cohort output was uploaded as the `regional-gear-cp-benchmark` Actions artifact (14-day retention). Re-run the source-controlled harness at any time to regenerate it:

```sh
node tools/regional-gear-cp-benchmark.mjs > regional-gear-cp-results.csv
```

Sources: `tools/regional-gear-cp-benchmark-entry.ts`, `apps/mobile/src/core/combat-power.ts`, actual `effectiveStats`, Forge instances, V33 sets and bonuses, player XP rebase, gems, enchantments, class conversions, and legal-role companions. The compiled runner executed **1,080 calls** to `combatPowerRating`: 9 classes × 2 paths × 10 tier/level checkpoints × 6 investment scenarios. All rating row/split assertions passed. The 2026-11-12 initial V1 *hand-derived proxy* is superseded by these results.

**What this proves:** Current mobile build's character-sheet CP for precisely specified synthetic loadouts. **What it does not prove:** Real players' mean or median CP, item attainability at target levels, authoritative server-side dungeon snapshot power, clear rates, survival, or XP/hour. The 6 loadouts reflect scenario design, not a surveyed player distribution.

## 1. Corrected production sample — anonymous, read-only SQL

Read from Veldryn **production** `public.online_game_states` as of 2026-11-12, selecting the latest snapshot per character. There are **214 characters**. Because **25 stored `character.level` fields diverge from actual XP-derived level**, all progression cohorts below use current `characterLevelFromXp` equivalent thresholds calculated from `character.xp`, *not* raw stored `level`.

| XP-derived level | Characters | Snapshot updated within 7 days |
|---|---:|---:|
| 1–12 | 205 | 92 |
| 13–25 | 8 | 7 |
| 26–37 | 1 | 1 |
| 38+ | 0 | 0 |

Among the original saved-level cohorts, no character had eight or more equipped V33 pieces, and none had a full V33 ten-piece set. **Do not present the synthetic V33 full-set CP numbers as the actual average of these production players.** No direct production character-sheet CP telemetry was found in `ops_metric_buckets`.

Data are aggregate only; no individual player ID, name or snapshot is included in this document. No database write was made.

## 2. Full synthetic loadouts — scenario definitions

- **7-piece transition:** seven pieces of current tier Common Q40, no gems/enchantments, with three prior-tier Common Q40 pieces (T1 leaves those slots empty). Tests realistic incomplete upgrades.
- **Plain full set:** ten pieces of current tier Common Q50, no gems/enchantments.
- **Representative:** ten pieces Common Q50, four items enhanced to +2, four 100%-rolled canonical Grade-2 Stat Gems, one legal companion trained at the stage's companion level.
- **Invested Uncommon:** ten pieces Uncommon Q60, six items +2, six Grade-2 gems.
- **Well prepared Rare:** ten pieces Rare Q70, all ten +2, eight Grade-3 gems.
- **Aspirational Epic:** ten pieces Epic Q85, all ten +3, ten Grade-4 gems. This is a *stress ceiling*, not an average; Epic Forge odds are low.
- Each build uses its actual class's legal Foundation or Alternate set, piece-specific stats, catalog 2/4/8/10 static bonuses, rarity and quality, class conversions, canonical stat socket values, XP/level scoring and a class-compatible Standard/Rare companion. Six-piece triggered actions and Effect Gem combat value are not represented in **sheet CP**; combat simulation must exercise them separately. No extra Faith/skill/permanent boosts or duplicate-free mythic gear assumed.
- Companion rating is split into personal/companion at **18% max companion attribution** without changing total rating. Benchmarks respect actual legal companion roles and tested growth.

### Representative loadouts (current mobile rating)

| Region | Gear | Character Lv | Mean CP | 10th–90th percentile across 18 class/path builds | Mean companion CP |
|---|---|---:|---:|---:|---:|
| Asterfall | T1 | 12 | 3,051 | 2,946–3,164 | 549 |
| Asterfall | T2 | 25 | 4,732 | 4,603–4,919 | 851 |
| Sunscar | T3 | 26 | 6,084 | 5,889–6,338 | 1,074 |
| Sunscar | T3 | 37 | 6,459 | 6,266–6,718 | 1,097 |
| Sunscar | T4 | 38 | 7,773 | 7,501–8,106 | 1,239 |
| Sunscar | T4 | 50 | 8,199 | 7,926–8,542 | 1,263 |
| Frostmarch | T5 | 51 | 9,726 | 9,488–9,975 | 1,594 |
| Frostmarch | T5 | 62 | 10,106 | 9,865–10,351 | 1,630 |
| Frostmarch | T6 | 63 | 11,588 | 11,324–11,891 | 1,912 |
| Frostmarch | T6 | 75 | 11,876 | 11,609–12,176 | 1,946 |

T6 is **UNRELEASED**. These are reproducible build calibration observations, not live player totals.

### At chapter finales: range of gear investment

| Finale | Seven-piece/mixed CP | Plain Common CP | Representative CP | Invested Uncommon CP | Well-prepared Rare CP | Aspirational Epic CP |
|---|---:|---:|---:|---:|---:|---:|
| Asterfall T2, Lv25 | 4,253 | 4,650 | 4,732 | 5,129 | 5,783 | 6,813 |
| Sunscar T4, Lv50 | 7,518 | 8,036 | 8,199 | 9,002 | 10,123 | 12,144 |
| Frostmarch T6, Lv75 (unreleased) | 10,995 | 11,632 | 11,876 | 13,096 | 14,800 | 17,469 |

Implication: A single fixed CP gate *cannot* stand in for real gear tier readiness or encounter success. An exceptionally prepared lower-tier player can beat a plain higher-tier player in CP, and the ordinary hunt runtime already has a separate **average equipped tier gap** to preserve regional preparation identity.

### Existing Sunscar dungeon entry gates against the measurements

- Tier 1 requires **6,000 CP**: comparable to a **T3 Common Q50 representative at Lv26 (~6,084)**.
- Tier 2 requires **7,250 CP**: below a **T4 Common Q50 representative at Lv38 (~7,773)**, but whether parties win is still unverified.
- Tier 3 requires **8,500 CP**: **above** a **T4 Common Q50 representative at Lv50 (~8,199)** but below **T4 invested Uncommon (~9,002)**. This establishes Tier 3 as an investment challenge, *not* confirmation that the current server win rate is right.
- The current **minimum Lv25 / boss clear** gate belongs to the **old chapter scale**; do not silently relabel it 26/30 or change CP thresholds until encounter win-rate simulation and chapter gates are coordinated.

Frostmarch has no approved regular-play dungeon CP tier thresholds. We should **not invent them** from CP ratings alone.

## 3. Proposed region ladder (unchanged from V1; still not live)

| Region | Levels | First-half equipment | Second-half equipment | Transitional pressure begins |
|---|---|---|---|---|
| Asterfall | **1–25** | T1 1–12 | T2 13–25 | ~17 |
| Sunscar | **26–50** | T3 26–37 | T4 38–50 | ~42 |
| Frostmarch | **51–75** | T5 51–62 | T6 63–75 | ~67 |
| Ashlands (future) | **76–100** | T7 76–87 | T8 88–100 | TBD |

Fallen Knight's **author-defined** level remains 25, but the **current active character gate is level 20 after XP rebasing**. Do not claim a level-25 chapter finale is already live. T9 needs a separate endgame plan within the actual level-100 cap.

Suggested area bands:
- Sunscar Saffron Gate 26–31; Scorchwind Flats 32–37; Mirage Basin 38–43; Tyrant's Crown 44–50.
- Frostmarch Thawgate 51–56; Whitepine Reach 57–62; Shiverlake 63–68; Wyrmspine 69–75.

## 4. MAJOR BLOCKER: V33 catalog region assignments are one chapter behind

The **actual 1,620-piece, 162-set V33 catalog** (`apps/mobile/src/content/equipment_catalog_t1_t9_v33.json`) currently assigns:

| Tier | Current catalog Region | Proposed gameplay Region | Status |
|---|---|---|---|
| T1/T2 | Asterfall | Asterfall | preserve |
| T3/T4 | **Asterfall** | **Sunscar** | adjust set metadata, verify existing references |
| T5/T6 | **Sunscar** | **Frostmarch** | adjust set metadata **AND recipes/materials** |
| T7/T8 | **Frostmarch** | Ashlands (future) | no live changes; future expansion |
| T9 | Frostmarch | endgame undecided | needs separate capped endgame role |

The existing `equipment-recipes-v33.ts` already draws **T3/T4** components from Sunscar (Dunewood, Sunstone, Sunsscale, Amberglass, Astral Script), even though their set metadata says Asterfall. But **T5/T6** currently consume Sunscar resources, not Frostmarch: Smithing uses Sunstone Ingots and Amberglass, Tailoring uses Sunscale and Amberglass. **T7/T8** currently use Frostiron/Rimeglass/Choir Bloom and Frostbloom. To implement two gear tiers per new region, the resource source ladder must be reassigned carefully.

Other blockers:
- `MAX_RELEASED_EQUIPMENT_TIER=5`; **T6 cannot be put into Frostmarch until art, crafting, release flags, drops, equipment preview and anti-trade gates are actually ready**. T7–T9 remain locked.
- Existing authored enemy levels / unlock levels mix raw legacy values with rebased world-zone access levels, and ordinary hunts use monster-level thresholds for missing-tier penalties. Update **all** of those together to prevent undergeared soft locks or duplicate stat scaling.
- Keep existing V33 set IDs and equipment item IDs stable; preserve crafted instances, rarity/quality/enchants/socket ownership and rollback compatibility.
- Existing Market design T1/T2/T3/T4 **6/18/30/52** and rarity +0/0/2/4/6/8 remain owner-approved for **market-only buying**; T5 60 is **not approved**, and T6+ remain blocked. The market restrictions will be reviewed *after* region-gear leveling is locked, not silently rewritten by this study.
- Source content for any future tier should be obtainable **before** players are expected to complete a full set. Explicitly test the skill and source chains, drop rates, alternative class crafting recipes and edge cases in each region.

## 5. Next validation phase (required before gameplay migration)

1. Use the actual **combat simulation**, not CP alone, for normal hunts, champion/elite fights, story bosses, dungeon rooms and final bosses at each chapter's first/second-half checkpoints. Compare 7-piece Common, full Common, representative, Uncommon, Rare and aspirational Epic; include role and mixed-gear survivability.
2. Establish measured target intervals: ordinary kills should improve steadily with power, with meaningful food/stamina costs; elites should reward preparing the current regional tier; boss clears for prepared parties should be reliable without requiring Rare/Epic rarity. Run each scenario with deterministic multiple seeds and capture success rate, food use, time-to-kill, damage received, and rewards/hour.
3. Confirm current **XP per hour** for the 25-level chapter progression and the actual crafting/refining/Enchanting skill levels needed to make T2/T3/T4/T5/T6 at the proposed breakpoints.
4. Draft a separately reviewed **data-only** region/catalog/recipe migration, keeping old saves stable and legacy run difficulty frozen. Gate T6 release behind complete QA and artwork approval.
5. Then tune CP targets and level gates, run full staging regression, and approve server/client changes in a subsequent pass. **No live implementation of the progression redesign occurs from this benchmark alone.**

## Reproducibility and tests

- Command: `node tools/regional-gear-cp-benchmark.mjs`
- CI workflow: `.github/workflows/regional-gear-cp-benchmark.yml`
- First successful run: https://github.com/elroynbenjamins/Veldryn/actions/runs/43202573610
- 60 scenario summary rows, 1080 real mobile runtime rating calls.
- GitHub roadmap spreadsheet index: `docs/roadmap/spreadsheets/README.md`.
