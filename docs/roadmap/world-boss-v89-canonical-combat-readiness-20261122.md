# World Boss V89 — canonical Combat 2.0 readiness and boss counterplay contract
**22 November 2026 · hidden technical pass only · NOT LIVE · no merge to main · no migrations/deploys/claims.**

## Why this pass exists
V88's SHA-256 compiled-combatant fingerprint and two independent verifier callbacks are useful **boundaries**, not a working integration. World Boss V25 still consumes **legacy V12** combatants and simulates 5-second authored rounds. Combat 2.0 PR #1559 has exact-copy trait custody, millisecond cooldowns and five executable effects, while the expanded Equipment 2.0 #1576 is a separate 48-set T1–T4 *proposed* launch registry. Neither branch has been authoritatively compiled into a World Boss account roster.

**V89 adds a pure, intentionally non-authorizing structural audit**:
- File backend/src/server/combat/world-boss-canonical-runtime-readiness-v89.ts lists 16 exact current channels: 13 original Combat/Equipment V2 affix channels plus 3 additional Basic/Ability/Reflect channels. The possible 17th (Tenacity) is not implemented and must not appear in a verified combat channel list.
- Requires 14 concrete integration signals, including damage type and Ward, accuracy/evasion/penetration, action haste/timing, shield absorption and healing, source-tagged original/secondary events, boss telegraphs, one shared retaliation budget and Guard-versus-world-HP separation. Signal strings alone do **not** prove any functionality.
- Requires all five *currently executable* signatures (Sword Dance, Echoing Strike, Thornbound Riposte, Mending Echo, Restorative Bloom); it does **not** pretend to implement the other proposed traits.
- Requires **four separate Restorative Bloom ticks at 1, 2, 3 and 4 seconds**, with event time resolution no worse than 1 second. A single next-round 5-second heal is **not equivalent**.
- Audits event/account/boss/phase/roster shape, one to five distinct owned actors, digest format, exact-copy non-reuse across the account, and at most two different active signature traits from worn copies. This only checks structure; no PostgreSQL, wallet, skill tree or item ownership query occurs.
- Fixes the existing worldwide phase transition contract to **70% and 30%** and rejects mismatched metadata. Phase is frozen per reserved fight, never calculated from an uncommitted client HP value.
- Returns releaseReady:false **even for structurally compatible metadata**. No caller can use this audit to authorize a real World Boss encounter.

The new isolated test file runs a **45-case shape matrix** (three bosses × three phases × five account sizes) and negative fixtures for incomplete channels, unsupported Tenacity, missing provenance, 5-second timing, malformed Bloom ticks, forged/duplicated actors, reused equipped instances and unauthorized trait selections. These are *structural scenarios*, not real Combat 2.0 simulations, drop or balance results.

## Gameplay invariants — no design changes
- **Cadence:** one global boss every 14 days; Monday–Friday five-day War Camp; **continuous 48-hour weekend fight**; following week for results/claims. A single realm boss rotates by canonical ID: hollowroot (Hollowroot), sunscar (Solbrand), frostmarch (Rimewarden).
- **Attempts:** exactly three account-wide attempts per event. Each attempt has **one frozen account raid of one to five owned characters**: no borrowed Echoes or NPC fillers; no mandatory role composition. The best character's credited damage must never fall simply because weaker owned characters join.
- **Community HP:** local Guard and other protection first; only effective HP damage passes the provisional V22 account weighting. Global HP settlement occurs exactly once; a defeated-boss Residual Echo credits **zero** additional global HP. Retain the provisional 100/12/7/5/4 percent sorted contribution weights for simulations only; they are not approved live balance.
- **Preparation:** global Fortifications / Field Provisions / Siegecraft; two optional account War Supplies donations. Profession-only specialists must be able to participate in the preparation economy without mandatory combat level progression (through eligible crafted/traded supplies), subject to final supply and anti-abuse design.
- **Tactics:** Steady Assault, Hold the Line, Break Armor. One chosen and frozen before combat. One server-owned party-wide buff tonic at most, debited atomically with the attempt. No food/healing potions. No mid-replay invented decision.
- **Presentation:** grand scripted set-piece replay based only on committed server events. No Skip, speed control, timer or displayed round counter; background pause and reduced-motion semantics persist. Any new V2 trait cues still require explicit mobile UI/theme approval.
- **Reward bounds:** existing design targets at most 100 World Sigils per account/event; two optional supply bundles worth 5 each; boss-themed cosmetic/pet shop. EQ2 equipment rewards, including the earlier 1% candidate drop, remain quarantined and require real custody and final tuning.

## Boss-specific counterplay test plan — not yet balanced
| Boss / region | Existing authored tells | Intended distinct build choices; no single required class |
| --- | --- | --- |
| **Hollowroot / Asterfall** | Root Slam, Sporeburst, Splinterstorm | Sustained root/poison control, cleanse or prevention, interruption or Guard-break pressure, consistent healer/tank responses |
| **Solbrand / Sunscar** | Sandbreaker, Burning Tempest, Solar Collapse | Heat burst management, typed magical mitigation and Ward, shields/mitigation, break-armor windows, accurate burst timing |
| **Rimewarden / Frostmarch** | Ice Spear, Freezing Chains, Whiteout | Chill/freeze counterplay, debuff removal, defensive uptime and survival, non-mandatory support or equipment-counter builds |

Each boss needs three measured **Armored / Exposed / Enraged** difficulty profiles. Use a full matrix with **nine classes × eighteen specializations × realistic T1–T4 equipment × 1–5 owned characters × three orders**, and compare equal-CP generalist versus at least two different viable counters. Record effective HP dealt, local Guard depleted, prevented damage, actual ally healing, shield consumption, interrupts/cleanses, wipes and contribution curves. Do not claim that a structurally green V89 matrix is balanced. Avoid making high CP the only answer: effective counters must matter, but no mandatory class/companion/set.

## Next exact integration passes
1. **V90 — canonical compiler ownership adapter:** reconcile #1559's compileEquippedActor and exact-copy source with #1576's expanded issuance catalog; expose a *trusted* server-only multi-actor compiler that returns compiled Combat 2.0 actors and per-instance provenance. Hold on legacy V12 actors. At reservation, atomically prove account ownership, unique item instances, selected skills, gems, companion and valid set membership across all five characters.
2. **V91 — canonical World Boss combat event timeline:** have the one shared Combat 2.0 event executor produce boss-specific V25 telegraphs/Guard and millisecond skills, haste, accuracy/evasion, penetration, Ward, shield multipliers, Hex ticks and four true Bloom ticks. Retire duplicated V87 effect formulas instead of promoting them into a second engine. Preserve V58 unskippable deterministic playback with exactly-once event presentation.
3. **V92 — simulation and settlement validation:** baseline and counter-build simulations by boss/phase/roster/War Order; calibrate Tank/Support value and account diminishing returns; exercise global HP race, role-normalized Impact, residual Echo, tonic reservation, equipment/chest custody, crash/retry recovery and PG17.6 two-session authenticated/erasure checks. Only then examine real rollout and UI approval.

## Safety and validation
- Branch: feature/world-boss-v89-canonical-runtime-readiness-hidden-20261122, stacked on V88; no code is imported by a public gameplay route.
- Hidden World Boss CI contains the new pure structural test. **Actual run results must be confirmed on the exact commit**; creating a test does not mean it passed.
- No database migrations executed, no Supabase schema or player rows updated, no market/equipment items created, no World Sigils granted, no event scheduled, no mobile screen/theme merged.
- **Release HOLD.** Full Combat 2.0 integration, source-authenticated storage/transaction proof, PostgreSQL concurrency, real-equipped-build simulations, UI review, cross-platform QA and owner approval remain mandatory.
