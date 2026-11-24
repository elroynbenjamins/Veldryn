# Equipment 2.0 — V6/V7 hand budget and premium effect reconciliation

**HIDDEN REVIEW ONLY. No player CP, real item, executable effect, custody, market or release authority.** EQ2-C12/C13 and the original Forge identity/version restrictions remain in effect. V4 overlapping tier ranges, original rarity probabilities, quality and aggregate caps are unchanged.

## V6: comparable hand budgets

The original two/dual-handed base-stat budget includes the offhand budget. The previous random-affix count was still based on one physical item, so nine-slot classes received fewer affixes. Compare four methods with **matched canonical slot draw schedules** across the same 45 class/tier template rosters, six rarities, three qualities, four focus modes: 3,240 cases per option, 12,960 total. These are deterministic gear-index comparisons, not random samples or fight results. This matched schedule differs from V5's positional selection schedule, explaining the slightly different baseline maximum (7.02% rather than 6.57%).

| Candidate | Worst absolute hand-group index gap | Mean absolute gap | Groups over 5% (of 360) |
|---|---:|---:|---:|
| Current one physical item = one roll allowance | 7.0203% | 2.5062% | 45 |
| Twice as many distinct stats on combined weapon | 3.5331% | 0.7839% | 0 |
| Double existing combined-weapon roll magnitudes | 2.6837% | 0.6774% | 0 |
| Two independent selection lanes, one combined weapon | 0.0102% | 0.0014% | 0 |

**Recommended candidate: two hand lanes.** One immutable two-handed or paired weapon, one custody identity, no phantom offhand, and unchanged base budget. Each lane uses the ordinary rarity-dependent roll count and the same V4 per-stat tier range. Selection is uniform without replacement *within each lane*; the same stat may occur once in each lane, just as a real weapon and offhand could both roll it. Aggregate all matching channels once before diminishing returns. Do not multiply an individual roll beyond its tier/rarity bounds. Under matched same-rarity fixtures the nine-slot and ten-slot classes both have 10/20/30 total roll opportunities when normal pieces have 1/2/3 rolls. T1/T2 Mythic has two per lane (four on combined weapon, 20 on full gear); T3–T5 Mythic has three per lane (six on combined weapon, 30 on full gear).

**Economy and mint gate remains OPEN.** Matched fixtures assign equal rarity and quality to every piece. They do not prove equal acquisition probabilities. If the entire two-lane weapon shared one Mythic draw, the chance of both lanes being Mythic would be 0.1%, whereas independent one-hand/offhand items each at 0.1% have joint probability 0.0001%. This is a 1,000-fold joint-event difference before accounting for recipes, claims or trading; it is NOT a proposed price multiplier. Benchmark separate lane grades versus one item rarity, quality correlation, material cost and Market supply before selecting a mint schema. Recommend independent lane quality/rarity budget research without granting a second physical item or permitting rerolls. A six-roll display is a design candidate, not an approved public layout. Original copies never gain new lanes.

## V7: premium innate and set-source reconciliation

Audited 185 exact source templates from T5, inherited rare sets, T4 replacements and regional dungeon candidates against corrected V2 catalogue identities. The source audit finds 99 premium entries with 99 authored innate lines, of which 71 match the exact canonical random channel and unit and 28 require semantic resolution or a separate channel. 27 entries have source-authored conditional signature traits. There are 34 exact set records with 68 authored bonus thresholds; the remaining 61 catalogue set records are outside this numerical-source tranche. This does not mean they have no design concepts. Keep all effects non-executable.

- Same-channel permanent random and innate bonuses add in original centipercent units before applying a single V4 cap. E.g. +40% raw random Defense plus +3% innate Defense gives +43% raw, +34% effective at the 25% knee and half-slope. Item rolls and innate values stay unchanged in storage; rarity and quality scale base stats, not innate percentages.
- Resolve `haste_pct` versus `haste_pp`, `crit_chance_pp` versus `crit_rate_pp`, `healing_power_pct` versus `forge_healing_power_pct` (class heals only), and separate Attack/Evasion channels. Never assume relative % equals percentage points or that a broader healing modifier is equivalent to class-heal-only.
- Preserve source bonus text, thresholds and original trigger/cooldown terms. Do not automatically parse prose into combat effects. Set/trait contribution depends on actual eligible trigger rate, effective healing/damage/shield, uptime, interaction with caps, anti-recursion and encounter reset. Unpriced is not zero power.
- Rare/boss source items retain their authored premium identities; whether every proposed fixed stat stacks with a full random budget still needs a single approved premium-budget contract. In particular, existing dungeon text refers to replacement-budget constraints; do not silently invent extra random slots for premium items.

## Remaining

D3 CP and D5 executable set mechanics still require approved engine semantics, weighted actual combat utility, lane economy/rarity policy, class/skill/companion/gem integration, legal loadout/custody and multiple counter-build encounter comparisons. A matched equipment-index gap near zero is not proof of equal DPS/survivability or approval of the complete CP formula.

No production changes, main merge, public catalogue, real equipment creation, UI or effect activation. All Equipment 2.0 remains hidden until coordinated 2.0.
