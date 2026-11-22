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
