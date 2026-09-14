# VELDRYN Combat Companions — Balance Pass v1

## Scope

This pass balances the expanded active Combat Companion ecosystem after the Level/Ascension/Bond, monthly Trial, Sanctuary Assignment, Technique, Proving Grounds, Codex and Prestige systems were added.

Passive collectible Pets, Pet Essence and Pet Bond remain separate and are not changed by this pass.

The goals are:

- keep player-character power dominant in character-assist combat;
- preserve the intended full-investment rarity bands without stacking rarity twice;
- give Standard/Rare Companions lasting PvE relevance without making Prestige mandatory;
- make the 30-floor monthly Trial a real progression curve rather than a hard wall;
- keep Bondstones and Companion Essence meaningful long-term resources;
- make Sanctuary Assignments useful but slower than active play;
- make special guaranteed Prestige unlock bosses difficult but realistically beatable;
- keep all key values data/config driven so live telemetry can tune them later.

## 1. Rarity budget

Agreed approximate TOTAL full-investment power targets remain:

| Rarity | Target vs Standard |
|---|---:|
| Standard | 100% |
| Rare | 108–110% |
| Elite | 111–113% |
| Prestige | 114–117% |

The old Combat Unit content already correlated raw stats with rarity. Applying the new rarity progression multiplier directly on top of those stats produced a second rarity bonus and inflated some role comparisons far beyond the target.

### New rule

Raw definition stats are compressed around role anchors while preserving a narrow identity range. The systematic rarity advantage is then delivered mainly through:

- higher level ceilings;
- level/investment scaling;
- active ability budget;
- Technique/Bond Trait access;
- Ascension/progression endpoint.

Team Power does **not** apply another full rarity multiplier after those effects.

### Resulting max-investment individual Team Power guidance

| Role | Standard | Rare | Elite | Prestige |
|---|---:|---:|---:|---:|
| Damage | 1,313 | 1,441 avg | 1,486 avg | 1,536 |
| Tank | 1,307 | 1,431 | 1,480 avg | 1,533 |
| Support | 1,307 | 1,431 | 1,481 avg | 1,533 |

Approximate endpoint ratios remain inside the intended bands rather than escalating into 30–90% rarity gaps.

## 2. Standalone Companion combat calibration

The inherited Combat Unit coefficients were originally owner-assist oriented. In companion-only combat, Tank/Support heals and shields could resolve to less than one hit point and defense was nearly irrelevant under the normal player-character mitigation constant.

For Companion-only contexts:

- role-based balanced base-stat anchors are used;
- Tank/Support `healingPower` is derived from Companion max HP so old percentage-like heal/shield coefficients remain meaningful;
- Interrupt abilities gain a modest standalone damage component so they remain useful against enemies without a cast bar;
- mitigation effects map to the combat engine's functional `damage_taken` modifier;
- Support utility actives can resolve as modest standalone healing;
- Companion-only combat uses mitigation constant **100** rather than the player-character default **1200**.

Character-assist mode keeps the lower assist-oriented support scale.

## 3. Monthly Trial curve

### Recommended Team Power is guidance, not enemy stat scale

The v6 implementation used the UI `Recommended Companion Power` number directly to derive enemy stats. This mixed two unrelated units and produced misleading recommendations plus an excessively steep enemy curve.

The two curves are now separate.

### Recommended Team Power

- Floor 1: **2,750**
- Floor 5: **2,925**
- Floor 10: **3,159**
- Floor 15: **3,412**
- Floor 20: **3,686**
- Floor 25: **3,981**
- Floor 30: **4,300**

The recommendation curve uses logarithmic interpolation from Floor 1 to Floor 30.

### Enemy growth

Enemy combat stats use a separate configurable curve:

`enemyScale = 1.020 ^ (floor - 1)`

Boss structure and monthly modifiers remain separate layers.

Changing the 1.020 growth value should require another seeded balance study.

## 4. Seeded Trial combat study

The supplied VELDRYN backend combat engine was used for actual combat resolution, not a success-probability shortcut. Each listed floor/team combination used **300 deterministic seeds**.

| Team | Team Power | F5 | F10 | F15 | F20 | F25 | F30 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Starter investment | 3,263 | 100% | 100% | 0% | 0% | 0% | 0% |
| Max Standard trio | 3,927 | 100% | 100% | 100% | 100% | 61.0% | 0% |
| Max Asterfall Rare trio | 4,304 | 100% | 100% | 100% | 100% | 100% | 0% |
| Max Sunscar team | 4,453 | 100% | 100% | 100% | 100% | 100% | 79.7% |
| Max Frostmarch team | 4,496 | 100% | 100% | 100% | 100% | 100% | 84.7% |
| Max Ashlands team | 4,502 | 100% | 100% | 100% | 100% | 100% | 84.7% |
| Optimized top mix | 4,602 | 100% | 100% | 100% | 100% | 100% | 99.7% |

Representative Floor 30 successful-run durations were roughly 48–56 seconds in the seeded study.

### Intended interpretation

- early Companion investment handles the opening monthly Tower;
- maxed Standard Companions remain relevant well into late floors;
- Asterfall Rare investment can reach the late checkpoints but does not automatically clear the finale;
- later-region optimized teams are realistic Floor 30 clear candidates;
- a highly optimized endgame trio becomes reliable rather than merely lottery-based;
- Team Power remains guidance: composition, Techniques, roles and modifiers still matter.

## 5. Trial reward economy

Monthly first-clear rewards remain the meaningful progression payout.

Full monthly Floor 1–30 first-clear + completion total:

- **3,570 Companion Essence**
- **73,050 Gold**
- **12 Bondstones**

Repeat clears now intentionally avoid becoming an infinite companion-resource farm.

Full Floor 1–30 repeat total:

- **0 Companion Essence**
- **1,995 Gold**
- **0 Bondstones**

Repeat combat can still provide legitimate use/Bond/combat progression through the normal systems, but the repeat chest itself is no longer a major economic faucet.

## 6. Sanctuary Assignment economy

Sanctuary Assignments are a passive supplement and collection-value system, not the fastest way to level or fund Companions.

At base C grade with three Expedition Pens running continuously, launch-config Essence throughput is approximately:

| Mission | Essence/day | Net base Gold/day |
|---|---:|---:|
| 2h Asterfall patrol | 108 | -720 |
| 4h Sunscar guard | 126 | -900 |
| 8h Asterfall shrine | 126 | -1,350 |
| 8h Frostmarch route | 135 | -1,350 |
| 12h Ashlands watch | 132 | -1,500 |

Higher grades and bonus conditions improve rewards, but base use is intentionally a recurring Gold/material sink.

Expedition Bond progression remains at **25%** of the configured active-equivalent Bond reward, inside the intended 20–30% passive target.

## 7. Bond XP consistency

Server Bond thresholds are cumulative:

- Bond 2: 90 total XP
- Bond 3: 210 total XP
- ...
- Bond 10: 2,520 total XP

The mobile model previously interpreted the same table as per-level costs, which could make Bond 10 require roughly 9,300 accumulated XP. Mobile and server now both use the cumulative interpretation.

Backward compatibility detects older residual-within-level local values and promotes them to the corresponding cumulative total rather than deleting earned Bond progress.

## 8. Special Prestige boss calibration

The first functional Prestige unlock fight, **Oathglass Reflection Trial**, was initially on a player-character stat scale and produced **0/300** clears for a fully invested eligible Asterfall trio.

The boss has been rebased to the Companion-only combat scale while remaining harder than ordinary prerequisite progression.

Final seeded result with a max eligible Asterfall trio:

- samples: **300**
- victories: **254**
- clear rate: **84.7%**
- average duration: **~49 seconds**

The unlock remains guaranteed after satisfying the requirements and winning; no rare RNG companion drop was introduced.

## 9. Long-term resource pacing

The existing full-roster progression costs remain intentionally large. The balance pass reduces repeat/passive faucets rather than making all progression cheaper.

Bondstones remain primarily gated by:

- monthly Companion Trials;
- weekly Proving Grounds;
- difficult bosses/content;
- limited high-tier Assignment/event sources.

This preserves predictable long-term acquisition without allowing passive Assignments to become the dominant Bondstone source.

## 10. Configuration / monitoring guardrails

The following should be treated as live-balance knobs rather than scattered constants:

- Trial recommended power start/end;
- Trial enemy growth;
- Companion-only mitigation constant;
- per-floor first/repeat rewards;
- monthly completion package;
- Assignment costs/rewards/recommended power;
- rarity endpoint targets;
- Bond thresholds and source XP;
- special boss stat profiles.

Recommended post-integration telemetry:

- clear/fail rate per Trial floor and Companion trio;
- first-attempt vs repeat clear rates;
- median Team Power at each checkpoint;
- Floor 30 clear rate by account progression region;
- Trial reward claims/account/month;
- Companion Essence earned/spent by source/sink;
- Bondstones earned/spent by source/sink;
- Assignment starts, grade distribution and claim cadence;
- Technique selection split per Companion;
- special boss attempt/clear rates;
- lower-rarity Companion usage in unrestricted and restricted content.

Do not automatically buff/nerf solely from Team Power. Real combat outcomes and economy throughput remain the authoritative balance signals.

## Verification boundary

Focused Companion typechecks/tests and seeded backend combat simulations pass in the recovered source. Full Expo/Android, complete server integration, real Supabase migration-chain validation and production telemetry remain real-repository checks.
