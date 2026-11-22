# Combat 2.0 — cleanse and regional counterplay pass (hidden review, 22 Nov 2026)

**Release status:** hidden draft only. Branch based on canonical hidden Combat/Skills 2.0 (#1377); not main. No live routes, UI/theme, player equipment, migration, deployment, XP/Gold or V1 combat change.

## Pass A — harmful-status counterplay

The current engine's `cleanse` effect removes periodic DoTs but, before this pass, did not remove negative **timed debuffs** such as a boss's `damage_done` reduction. That prevented an intended V2 cleanse response to Soul Curse and Deep Dissonance.

- For a source actor compiled into Combat 2.0 (`source.combatV2`), `cleanse` now removes active timed `kind:'debuff'` effects as well as DoTs.
- Each removed active debuff emits `status_remove` with `detail:'combat_v2_cleanse'`, its source ability and status tag.
- No shield, HoT, beneficial buff, gem state, boss phase or cooldown is erased.
- Legacy sources still remove **only DoTs**; no legacy script is changed.
- V2 reactive cleanse is fired **once** if either a DoT or debuff was removed. No reactive bonus can be earned from cleansing an empty target.

## Pass B — viable regional telegraphs

The following **new/hidden** authored boss casts become interruptible with actual cast windows; every one also preserves at least two non-interrupt responses (shield pressure, vulnerable-phase burst, or cleansing/sustain).

| Boss | Interrupt window | Other authored responses |
| --- | --- | --- |
| Asterfall Root | Living Bark — 1300 ms | Shield pressure; Heart Exposed vulnerability |
| Asterfall Bell | Soul Curse — 1400 ms, Veil Mirror — 1300 ms | Cleanse Soul Curse; shield pressure; Shattered Veil vulnerability |
| Buried Heliarch | Sunfall — 1800 ms (unchanged) | Fire DoT cleansing/sustain; shield pressure; Cracked Corona vulnerability |
| Veiled Sphinx | Mirage Veil — 1300 ms | Shield pressure; True Reflection vulnerability |
| Bellbeast | Glacial Shatter — 2000 ms (unchanged) | Survivability against execute; shield pressure; Shattered Horn vulnerability |
| Frozen Cantor | Deep Dissonance — 1500 ms (unchanged) | Cleanse weakening/DoT; Final Echo vulnerability |

The changes provide an **opportunity** to interrupt, not a mandatory interrupt mechanic. There is no invented boss invulnerability, hard class lock, new status type or damage multiplier.

## Verification

- Added deterministic real-engine V2-versus-legacy cleanse replay fixture, checking DoT+debuff removal, removal event provenance, beneficial buff retention and no source mutation.
- Added six-source boss metadata test: every boss has at least one interruptible cast of at least 1200 ms and at least three authored response categories. The test does not fake combat wins.
- Hooked tests into the dedicated private Combat 2.0 skills workflow.

**Not established by this pass:** optimized equal-CP counter-build win-rate advantage, mobile telegraph visibility/latency, a live persisted battle source, final damage coefficients, cross-party cure/interrupt races or player-controlled interrupt timing. These require later signed-equipment/Skills 2.0 cross-system fight samples, Android interaction tests and owner numerical/visual approval.

**Do not merge into main or activate 2.0.**


## Follow-on — equal-stat and four-player engine evidence

- Measured A/B fixtures: 3 deterministic seeds × 2 opponent mechanics = **6 pairs** (offense-vs-cleanse and offense-vs-interrupt). The paired QA players have equal authored stats/attack cadence; their tactical skill differs. This is **not** verified equal Combat Power because final signed equipment/CP custody is not supplied.
- Isolated four-player fixture: tank + two damage + support. A support cleanse is required to produce **four DoT and four hostile debuff removal events** for the four recipients, without repeated proc farming. A shield tactic executes as an alternative in a separate matchup. No signed party roster/persistence, trait shared budget, or real co-op route is authorized here.
- Generated gameplay and co-op Edge bundles were rebuilt and checked using the existing `liveEdgeCombatV2IsolationPlugin`, committed strictly to the private branch by the tightly scoped hidden counterplay sync workflow. These bytes are **not deployed**. New exact-head CI still must establish full validation.

Remaining release blockers: owner-reviewed visual themes, the pre-existing Skills preview scroll-indicator check, persisted 4-player group/trait authoritative source, signed CP-equivalent matchups across 9 classes/18 specs and six bosses, final numeric thresholds and accessible Android telegraphs.

**Do not treat any synthetic test as a final win-rate or live balance proof.**


## Follow-on: source-matched measured outcome audit (hidden)

The `counterplay-outcome-review.ts` diagnostic now accepts **only isolated, equipment-compiled one-player outcomes** after a 64-character exact-copy receipt digest equality check. Both encounters must have the same character/class/specialization/level/resource, identical effective player and boss stats, identical enemy mechanics, and identical item/set/affix compiler evidence. A mismatched copy digest, boss ID, or even a one-point stat difference fails closed.

The 108 class-specialization-boss variant pairs report **actual** per-boss survival HP, shields, outgoing and incoming damage, heals, interrupts and DoT/debuff removals, alongside separate counts for raw event differences. An event-label-only change is explicitly tested and **does not** register as a meaningful outcome difference. The existing 48 interrupt examples and six authored Support-vs-curse pairs also run through the source-matched report. No actual player balances, rewards, or rankings change.

**Precise interpretation:** The evidence comes from synthetic yet full-compilation QA equipment receipts, **not** actual authenticated database custody. These are equal-equipment comparisons within a class and specialization, **not** finalized equal-Combat-Power comparisons across classes. Numerical weights for final Combat Power are not approved. The recorded result is an audit and can reveal underperforming counter options, not proof that all counter-builds win.

**Outstanding gates:** GitHub exact-head compile/test success; generated gameplay/co-op Edge byte parity after latest shared-engine/skill edits; imported real authenticated gear custody and independent signed CP computation; persistent 4-player/dungeon authority; visual/theme review and Android telegraph accessibility; existing unapproved Skills V2 scroll-indicator failure. No merge to main or live rollout.


## Hidden pass G — four equipment-compiled allies and trustworthy boss signals

### Equipment + role composition (not production party authority)

`backend/src/server/combat/v2/__tests__/four-player-equipment-counterplay.ts` now executes the actual full private equipment-and-skills pipeline for **Ironwarden tank, Wayfinder damage, Hexweaver damage and Stonecaller support**. All four use separately owned test-copy item instances, individual validated class-only stat baselines, catalogued active skill IDs, level-gated variants, quality scaling, and source-owned equipment stats. The same party and gear are compared with:

1. **Generic:** no interrupt/cleanse; the boss completes its 1,400 ms, party-wide damage-over-time + weakening telegraph.
2. **Tank counter:** Ironwarden Rune Bash interrupts the actual cast before its party-wide effects.
3. **Support counter:** Stonecaller River Stone — Cleansing Stream allows the cast but removes the DoT and weakening effect from **one** afflicted ally only, not magically from all four.

The test demands deterministic replay, unchanged compiler evidence across tactics, no copied cross-character gear, no proc/event storms, no nonfinite outcomes, and the same enemy mechanic labels. This is **not** real signed party roster custody. The full-pipeline helper must still reject trait effect ports supplied to a 4-player match and reject legacy persistent dungeon HP/cooldown snapshots without the proper versioned adapter. We deliberately do **not** bypass either hard rejection.

### Boss cast/interrupt/cleanse projection (read-only, no UI yet)

`backend/src/server/combat/v2/boss-telegraph-projection.ts` derives an immutable view of authored **Boss 2.0** casts from the result of the real deterministic engine: ability name, actor/target, start time, authored duration/expected completion, completed/interrupted state, interruption actor, and genuine player-generated cleansing event IDs. It does not generate cast/interrupt events or modify fights.

The test proves one Rootbound Heart cast completes when ignored and is interrupted when countered; Bell Soul Curse debuff removal appears only if the actual player cleansed it. Spoofed ability IDs, fake post-completion interruptions, unversioned bosses and non-V2 actors must be rejected. Timing comes from the already compiled boss definition. Any future rendering in Android remains subject to the **owner's explicit actual-screen/theme approval**; nothing is connected to mobile today.

### Release gates preserved

- Authoritative signed 4-player roster membership and exact-copy item receipts, with service-readback and revocation.
- Immutable per-run versioned boss snapshot, real replay custody and verified team cooldown/HP CAS adapter; current party fixture uses a QA enemy bridge instead.
- Shared equipment trait budgets/policy for four allies, companions, interactions with status effects and boss phases.
- Real equivalent **Combat Power** source with user-approved weights and outcome tolerances, not synthetic gear parity.
- Verified exact-head GitHub TypeScript, deterministic combat tests and generated gameplay/co-op Edge byte parity; mobile scroll-indicator appearance is still unapproved.

**All pass G changes remain hidden and draft; no main merge, migration, production deployment, player effects, or mobile visual changes.**
