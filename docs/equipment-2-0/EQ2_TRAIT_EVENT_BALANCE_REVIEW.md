# Equipment 2.0 — Trait and combat event envelope, private review

**21 November 2026 · NOT LIVE · NOT APPROVED · NO UI OR THEME IMPLEMENTATION**

This is the first executable *synthetic* balance/integrity pass after the 17-affix/28-trait design in draft #1555. It is intentionally separate from real combat. Nothing here is imported by a live dungeon, monster, boss, character, inventory, Forge or Edge handler.

## What is actually executed

- Pure, source-tagged damage math for **Basic Attack Damage%** versus **direct Class Ability Damage%**. Neither applies to DoTs, pets/companions, reflected damage, gem proc damage or trait-generated damage; this is after basic Attack Power and approved hit/defense stages.
- Pure incoming **Reflection%** using only original enemy direct-hit **actual HP lost after defense, Ward and shields**. Full shield absorption, defeated defender, self damage, boss-phase/telegraph damage, DoTs, retaliation and secondary damage produce zero return.
- **Thornbound Riposte** uses the SAME outgoing damage budget as ordinary Reflection affixes, never a separate bypass. Hard review budgets: 1.5% of defender Max HP per source hit, 0.2% of enemy Max HP across the preceding **rolling** five seconds, tightened to 0.1% for regional bosses. A sliding window avoids sharp reset abuse at clock boundary 5.0 seconds. Riposte has its own cooldown.
- Explicit hooks for three representative trait interactions: **Sword Dance** only counts three consecutive successful original basic hits on one target; **Echoing Strike** triggers from eligible direct class abilities, caps at 20% own Attack Power and cannot chain; **Mending Echo + Restorative Bloom** consume only original effective direct ally healing, never secondary healing/HoT ticks. These are offline reference functions and are NOT complete trait implementations.
- Sample source checks enforce unique item copies, eligible equipment slots, valid server-authored sample roll magnitudes, at most two active combat trait source instances per character and no double activation of a signature trait.
- Deterministic **10,368 scenario fixture grid**: 9 class IDs × 2 hypothetical specialization profiles × T1–T4 × 8 canonical PvE archetype tags × normal/elite/boss × 20s/60s × 3 role-appropriate profiles.
  - Tank: neutral / Reflect-only / Reflect + Riposte.
  - Damage: neutral / Basic Attack + Sword Dance / Ability Damage + Echoing Strike.
  - Support: neutral / Mending Echo / Mending Echo + Restorative Bloom.
- A narrow Node 22 CI job validates and reports the full fixture grid. Results are aggregate **simulated damage, healing, reflection output and number of triggered secondary events**, not production DPS, actual win rate, dungeon run duration, inventory outcomes or class tuning.

## Required quality conclusions to evaluate

| Review question | Safety property |
| --- | --- |
| Does Basic Attack% improve class abilities, DoTs or trait hits? | No; original basic-hit tag only |
| Does Ability Damage% improve all player output? | No; direct class ability tag only |
| Can Reflection benefit from fully absorbed hits, boss-cast phases or DoTs? | No |
| Does Reflect + Riposte exceed the shared per-hit or rolling boss cap? | No |
| Can a reflect or trait-generated hit cause another effect to proc? | No event output is reentered into direct-hit hooks |
| Can a third active trait be enabled by switching characters or item copies? | Sample validation rejects it; **real item custody still requires server integration** |
| Can invalid forged stat percentages be accepted? | Sample validation rejects item slot/range mismatches; full persistent receipt verification remains a separate gate |
| Are nine classes, their real specializations and six bosses balanced? | **Not assessed**; hypothetical fixtures cannot establish live balance |
| Are all 28 signatures fully simulated? | **No**; only representative trait pairings and core event hazards. Other 24+ effects require per-event authoring |

## Things deliberately not modeled

This small deterministic reference is **not** Combat 2.0's canonical simulation engine. It does not execute the real 54 skills, 18 specializations, enemy phase progression, prepared enemy kits, proc RNG, true monster HP/Defense, companion power, skill resource meters, real support missing-HP distribution, class rotations, old dungeon receipts, complete sets/gem sidecars, or production-owned account/Guild/World boss reward custody. Simulated 20s/60s exposure is not a server run timer or a dungeon timeout change.

Therefore success means **mechanical source isolation and deterministic arithmetic** for chosen examples, **not release readiness, not final stat ranges, not a decision that Reflect% is properly tuned**.

## Highest-priority follow-up based on the model

1. **Embed a new-run-only, versioned event tag contract** in the hidden actual Combat 2.0 compiler: direct basic; direct class skill; original enemy HP-damaging hit; shield absorption; DoT; class healing; trait secondary; gem secondary; companion; unavoidable scripted boss phase.
2. Add typed, authenticated server adapter for frozen Equipment 2.0 item exact-copy rolls. Preserve versioned percentage/percentage-point conversion; do not convert ambiguous legacy Potency or double-scale rarity/quality.
3. Refactor reflected damage and Thornbound Riposte to one rolling output ledger keyed by encounter, defender, original attacker, target and combat time. Decide whether shared cap applies to every target simultaneously, summons included; persisted deterministic snapshots and replay are required.
4. Author remaining 28 traits individually in Combat/Skills 2.0 against real event types, then compare nine classes/two real specs/4 gear tiers/eight enemy families and the six actual regional bosses under server-owned seeds.
5. Check whether two available trait slots provide reasonable role parity, actual special gear drop rarity, and Player Market demand without making top-tier Mythic + rare-blueprint combinations compulsory. Clarify future T5+ and cross-class traits.
6. Run **actual** Combat 2.0 duration, healing/mitigation/reflect, after-death, boss cast, source ledger, economy and 2.0 replay tests at staging. UI must undergo separate design/theme approval before coding visible screens.
7. Keep 2.0 gates off, do not merge to main or modify legacy dungeon combat until the coordinated Equipment + Classes/Skills + Enemies/Bosses major release.

**Read-only test entry points:** \`node tools/validate-eq2-affix-traits-review.mjs\`; \`node --test tools/tests/eq2-trait-event-envelope.test.mjs\`; \`node tools/eq2-trait-balance-matrix.mjs\`.

**Release holds:** no writes to player resources or item recipes, no new drops/shops/market ability, no migrations, no new rewards, no live routes and no user-facing UI.
