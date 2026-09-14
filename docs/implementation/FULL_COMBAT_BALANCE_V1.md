# VELDRYN Full Combat Balance Pass v1

**Balance authority version:** `2026-09-12.v1`

This pass expands the Combat Companion rebalance into a whole-game combat balance layer. It covers character progression, class-role budgets, ordinary enemies, elites, regional bosses, character squads/Trials, co-op Expeditions, Q-Mode/Live balance targets, Combat Companions, Companion Trials, PvP, guild bosses, raids, gear/stat pressure and combat-linked reward pacing.

The central rule is: **do not change healthy systems just because a new system was added.** A number of existing curves already sit inside their intended target bands. This pass retunes proven problems, locks healthy guardrails, and explicitly marks content that needs the complete current repository before numeric changes are safe.

## 1. What changed now

### Fully retuned / executable in the recovered source

- Combat Companion rarity budgeting and role anchors.
- Character-assist Companion contribution.
- Companion-only mitigation/heal/shield scaling.
- Companion Trial recommended power and enemy-stat scaling are now separate curves.
- Companion Trial 30-floor seeded outcome curve.
- Companion Trial repeat-reward economy.
- Sanctuary Assignment passive Essence/Gold economy.
- Bond XP cumulative threshold consistency.
- Oathglass Prestige special-boss calibration.
- Cross-system balance contracts/tests for every major combat family.

### Guardrails added, but existing values intentionally preserved

- Regional elite HP/damage multipliers.
- Regional boss exact stat progression and enrage windows.
- Region-to-region player/boss power ratio.
- Co-op sync/anti-carry targets.
- Expedition Tier I–V difficulty/clear-rate bands.
- Ranked PvP normalization.
- Guild-boss per-member contribution caps.
- Raid companion contribution and loot cadence.
- Direct gear-drop jackpot caps.

These systems were not changed because the available design simulation/evidence does not show a balance failure.

## 2. Character progression: resolve the stale target conflict

Two different pacing concepts were previously presented as if they were equivalent:

1. Old `Vertical_Slice_Balance` target: **18–30 active-equivalent hours to Level 25**.
2. Implemented/tested idle-combat progression: approximately **175–288 productive combat hours**, with player-profile models around **25–47 calendar days** depending play cadence and optimization.

These are not compatible definitions. The old 18–30h row must **not** be used to reduce character XP requirements by roughly an order of magnitude.

### Current authority

- Productive idle/combat-only Level 1→25 target: **175–288 hours**.
- Normal player calendar target: **35–55 days**.
- Active player calendar target: **24–38 days**.
- Optimizer target: **18–30 days**.
- Opening Level 1→5 onboarding should still feel quick: **20–60 minutes**.

The old 18–30 active-equivalent-hour value is retained in the database for historical context but is explicitly marked **SUPERSEDED**.

### Why no global XP reduction was applied

The new Companion system does not increase every class equally. Same-role restriction means:

- Tank/Support characters may use Damage Companions and gain a meaningful offensive catch-up.
- Damage characters cannot use a Damage Companion and instead gain Tank/Support value.

This naturally compresses solo combat-speed gaps instead of simply adding the same +X% DPS to everyone. A global XP or enemy-stat reaction would risk undoing that useful class balancing effect.

## 3. Class PvE output budgets — all nine classes

Pure DPS reference is 1.00 for Wayfinder-like sustained output. Utility/survival power sits outside these numbers.

| Class | Role | Pure-DPS target | Combat identity | Runtime status |
|---|---|---:|---|---|
| Ironwarden | Tank | 55–65% | balanced mitigation / threat | design-calibrated |
| Bastion | Tank | 50–60% | maximum barrier/party protection | full-repo sim required |
| Dreadguard | Tank | 60–70% | control + self-sustain / aggressive tank | full-repo sim required |
| Dawnkeeper | Support | 35–45% | primary restoration / cleanse | design-calibrated |
| Wayfinder | Damage | 99–101% | reliable ranged reference | design-calibrated |
| Ravager | Damage | 98–103% | burst + armor break | design-calibrated |
| Hexweaver | Damage | 97–102% | setup / DoT / debuff utility | design-calibrated |
| Knife Dancer | Damage | 99–104% | high execution / mobility | design-calibrated |
| Stonecaller | Support | 45–55% | mitigation / resource utility | design-calibrated |

### Important reference-code warning

The supplied `veldryn_backend_v2.1` `launch-combat.ts` is an older combat reference and its training-dummy outputs do **not** match the newer class-budget database. It must not be used to overwrite the current nine-class repository. The recovered cumulative source does not contain the unchanged current class-combat definitions, so final nine-class DPS/HPS/mitigation simulations belong in the real repository.

## 4. Ordinary enemy balance

No blind global enemy buff was applied for Companions.

Asterfall already contains fixed progression compensation for additional collection/Faith power:

- base monster stat scale: 1.07;
- Level 10+ HP/defense/attack increase;
- Level 20+ additional HP/time/attack/defense increase;
- ordinary combat cycle pacing is then modified by character power, class style, preparation and Companion contribution.

The new Damage Companion contribution is capped and role-restricted. Adding another global monster multiplier now would risk making Damage classes slower while Tank/Support classes merely return to the old baseline.

### Runtime telemetry gate

After real integration, tune ordinary enemies only if equal-level telemetry shows one of these consistently:

- prepared win/uptime becomes trivial across all classes;
- kill-time spread between classes remains too wide after Companion choice;
- incoming damage becomes irrelevant for non-tanks;
- players stop needing expected region gear before bosses.

## 5. Regional power curve

Keep the existing player/boss indexed curve:

| Region | Player index | Boss attack index | Ratio |
|---|---:|---:|---:|
| Asterfall | 1.000 | 1.000 | 1.000 |
| Sunscar | 1.888 | 1.912 | 0.987 |
| Frostmarch | 3.355 | 3.309 | 1.014 |
| Ashlands | 5.940 | 5.735 | 1.036 |

All regions stay within roughly **±4% of stat parity**. Difficulty should therefore come from mechanics, gearing decisions, preparation and execution rather than arbitrary stat walls.

## 6. Regional bosses

Exact baselines remain:

| Boss | Level | HP | Attack | Interval | Accuracy | Enrage |
|---|---:|---:|---:|---:|---:|---:|
| Fallen Knight | 25 | 180,000 | 68 | 2.5s | 420 | 360s |
| Sand Tyrant | 45 | 520,000 | 130 | 2.4s | 760 | 360s |
| Frost Wyrm | 70 | 1,450,000 | 225 | 2.3s | 1,350 | 390s |
| Cinder Regent | 100 | 4,100,000 | 390 | 2.2s | 2,400 | 420s |

Outcome targets:

- prepared first-clear win rate: **60–80%**;
- serious first-clear attempts: **2–6**;
- intended clear: **45–75 seconds before enrage**;
- tank survives at least **6 unmitigated basic attacks** at the intended gearing point;
- no single gear profile becomes a hard requirement.

Companions should assist these fights but should not solve interrupt/cleanse/positioning mechanics automatically.

## 7. Elites

Current regional elite multipliers remain healthy:

| Region | HP mult | Damage mult |
|---|---:|---:|
| Asterfall | 1.80× | 1.45× |
| Sunscar | 2.00× | 1.50× |
| Frostmarch | 2.10× | 1.55× |
| Ashlands | 2.20× | 1.60× |

The design intentionally grows elite durability faster than burst lethality. This creates longer mechanic checks instead of unavoidable spike damage.

Rare-drop chance/pity remains **2.5% / 25** for the authored elite reward table.

## 8. Co-op composition and anti-carry

Normal 4-player co-op remains exactly:

- 1 Tank
- 2 Damage
- 1 Support

Existing sync targets remain:

| Content | Target power | Soft cap | Overcap stat retention |
|---|---:|---:|---:|
| Asterfall T1 | 500 | 575 | 35% |
| Asterfall T2 | 760 | 875 | 35% |
| Asterfall T3 | 1,040 | 1,195 | 35% |
| Sunscar T1 | 1,450 | 1,665 | 35% |

This is important after Companions: a highly progressed Companion must not reintroduce solo-carry behavior around a character-sync system.

## 9. Roguelite Expedition / Q-Mode / Live tier balance

The existing simulation summary broadly matches the intended clear bands, so tier indices should **not** be changed in this pass.

| Tier | Difficulty index | Target clear band | Midpoint |
|---|---:|---:|---:|
| I | 1.00 | 90–97% | 95% |
| II | 1.06 | 82–92% | 87% |
| III | 1.11 | 70–85% | 77.5% |
| IV | 1.19 | 55–70% | 62.5% |
| V | 1.29 | 35–55% | 45% |

The design simulation already shows expected composition pressure: all-DPS and weak compositions fall away faster as tiers rise while balanced profiles stay close to the target bands.

### Full-repository validation required

The recovered source contains the newer Phase-12/16 tests but not every unchanged dependency (`normalization`, route-generation helpers, snapshot modules, etc.). Reconstructing those modules from the older backend would create false compile conflicts. Therefore the existing tier numbers are protected as data-backed values; the final 1,000-seed Phase-12 run must happen in the current repository.

## 10. Character Triad Trials

Keep:

- 30 floors;
- boss every 5;
- 3-character roster rules;
- combat synergy hard cap **1.08×**;
- current recommendation base/growth as a UI guide until full current-repo combat simulation is available.

Do not reuse Companion Trial enemy scaling or Companion Team Power here. Character and Companion Trials are separate combat ecosystems.

## 11. Combat Companions and Companion Trials

See `COMBAT_COMPANION_BALANCE_V1.md` for the seeded details. Core locked targets:

- character-assist typical contribution: **6–10%**, hard cap **12%**;
- raid contribution: **2–5% per player**;
- total rarity endpoint budgets: Standard 100%, Rare 109%, Elite 112%, Prestige 115.5%;
- Companion Trial recommendation: **2,750 → 4,300**;
- separate enemy growth: **1.020^(floor-1)**;
- endgame-appropriate Floor 30 clear target: roughly **75–95%** for a well-built region-appropriate trio, while optimized top teams can become more reliable.

## 12. Ranked PvP

Ranked PvP remains a normalization mode, not a PvE-progression check.

- gear normalized: yes;
- Combat Companion raw rarity power normalized: yes;
- achievement power bonus: **0**;
- target balanced-match win rate: **48–52%**;
- target match duration: **90–150 seconds**;
- squad synergy cap: **1.08×**.

Prestige Companion identity may remain through ability/Technique/Bond-Trait behavior where the PvP rules explicitly permit it, but raw PvE rarity advantage must not decide ranked matches by itself.

## 13. Guild bosses

Keep the current target-power progression and decreasing member carry cap:

| Boss tier | Sync power | Per-member cap |
|---|---:|---:|
| Asterfall T1 | 650 | 8% |
| Asterfall T2 | 950 | 7% |
| Sunscar T3 | 1,550 | 6% |
| Frostmarch T4 | 2,400 | 5% |

This prevents one overgeared account plus a strong Companion from solving asynchronous guild content for everyone.

## 14. Raids

Current raid balance contracts remain:

- 8 players;
- Level 100;
- boss enrages generally **7–10 minutes**;
- Combat Companion contribution **2–5% per player**;
- one normal personal loot roll per boss/week;
- 40 eligible-kill pity;
- targeted craft fallback in **6–10 weeks**;
- Challenge modes offer prestige/cosmetic improvement, not exclusive mandatory combat power.

Exact raid stat blocks and a full raid simulator are not present in the recovered source, so this pass does **not** invent them. Those encounters remain a real-repository/content-completion validation item.

## 15. Gear and boss stat pressure

Existing gear philosophy remains correct:

- bosses can strongly prefer certain profiles;
- alternate profiles remain viable with better play/team support;
- no boss requires one exact set;
- accuracy/haste/mitigation checks should be party-solvable where appropriate;
- +10 late-Asterfall gear Gold farm should stay around **6–14h**, with **20h absolute fail ceiling**.

The Companion system should complement, not replace, these gearing decisions.

## 16. Combat reward/drop guardrails

Direct equipment remains a jackpot path; crafting remains deterministic progression.

Normal-enemy direct gear caps:

- Common: 2.5%
- Uncommon: 1.25%
- Rare: 0.25%
- Epic: 0.05%
- Legendary: 0.01%
- Mythic: 0.002%

Boss direct-drop caps may be at most **2×** those normal caps for the same rarity.

Co-op enhanced rewards remain bounded at:

- 3/day;
- 12/week;
- 3 boss bonuses/week/region.

Ranked PvP enhanced reward caps remain:

- 5/day;
- 25/week.

## 17. New source-of-truth file

`backend/src/server/balance/combat-balance.ts` now carries the cross-system numeric contracts and verification status. The accompanying test prevents accidental drift in:

- nine-class role budgets;
- progression-time authority;
- regional power ratios;
- boss progression;
- elite scaling;
- co-op role/sync rules;
- Expedition clear bands;
- Companion contribution/rarity targets;
- ranked PvP normalization;
- guild carry caps;
- raid guardrails;
- direct gear-drop ordering and recurring reward caps.

## 18. What still needs the complete current repository

These are **not** claimed as runtime-verified by this reduced handoff:

1. full nine-class DPS/HPS/mitigation simulation, especially Bastion/Dreadguard;
2. later-region ordinary monster combat simulation (Sunscar/Frostmarch/Ashlands);
3. character Triad Trial Floor 1–30 clear-rate simulation;
4. full current Q-Mode/Live 1,000-seed balance study with all unchanged dependencies restored;
5. Arena 48–52% matrix across all nine classes and valid Companion sidegrades;
6. guild-boss snapshot/contribution simulation;
7. exact raid boss stat blocks and raid-party simulation.

Codex should run these against the current repository and adjust the **specific failing surface only**. Do not globally multiply player or enemy power to compensate for one bad mode.

## 19. Telemetry to collect after integration

### Solo / regions
- kill time by class, level, region and equipped Companion role;
- damage taken per ordinary/Elite kill;
- potion/preparation consumption;
- first regional boss attempts and clear rate;
- time spent at boss progression gates.

### Classes
- sustained DPS/HPS/mitigation by content band;
- class clear-time spread;
- Companion-role selection by character class;
- wipe contribution by role/mechanic.

### Co-op / Expeditions
- clear rate by tier and party profile;
- deaths/run;
- duration/run;
- highest DPS share;
- failed mechanics vs raw-stat failures;
- Q-Mode vs Live differences.

### Companions
- assist contribution%;
- Trial floor/team clear rate;
- rarity/origin usage;
- Technique split;
- lower-rarity use in unrestricted content;
- Essence/Bondstone sources and sinks.

### PvP / raids / guild
- balanced-match class win matrix;
- match duration;
- Companion pick rate after normalization;
- guild contribution concentration;
- raid mechanic failure vs enrage failure;
- raid Companion contribution share.

## Final principle

A new combat system should be balanced **inside its own budget first**. Do not compensate for a strong Companion, class, gear profile or dungeon modifier by globally increasing enemy stats. Global changes are justified only when broad telemetry shows the whole combat ecosystem has moved.
