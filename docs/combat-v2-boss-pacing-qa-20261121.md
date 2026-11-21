# Enemy / Boss 2.0 — phase exposure and encounter pacing audit

Date: 21 November 2026. Scope: hidden PR #1430 (child of canonical Combat 2.0 #1377).
**DRAFT ONLY.** No balance, reward, UI, runtime flag, production migration or existing encounter was changed.

## Why this pass exists

The six handcrafted 2.0 regional bosses have seven readable new cast tells and two HP phases each (70% and 35%). Previous tests verified seeded replay and counterplay contract but not whether a player actually sees the mechanics in a fight. The 20-second synthetic, baseline-only 18-spec x 6-boss coverage was particularly easy to misread: a passing simulation is not proof of good fight pacing.

## New diagnostics (read-only)

Module: `backend/src/server/combat/v2/boss-pacing-diagnostics.ts`.

Each verified simulated combat can be reduced into:
- Encounter duration, outcome (victory/wipe/timeout) and remaining player/boss HP percentage.
- First authored cast start, started/completed/interrupted/pending casts and actual completed windup duration.
- Timestamp of authored 70% and 35% HP phases, including same-tick crossings.
- Review-only warnings when no cast is seen, no 70% phase is reached, no cast completed, or a winning player ends combat before the boss can show its tell.
- Per-boss P50/P90 duration, P50 first cast time, class/spec count, cast/interrupt counts, phase coverage and warning totals.

The validator **rejects** impossible or forged synthetic replays: non-monotone timestamps, completion before an authored windup, duplicate/overlapping casts, uninterruptible threats being interrupted, phase 35 before phase 70, duplicate phases, unexpected V2 cast/phase IDs, invalid end reasons or duplicate terminal events. It intentionally accepts a boss cast pending when the entire encounter ends, and a boss dying before a phase can trigger; both are legitimate event sequences and become warnings, not player-affecting errors.

Pure 13-negative-case / legitimate-interruption / early-kill / same-tick-crossing tests are wired to private Combat 2.0 CI. The existing real-engine 108 boss scenarios produce the audit output and verify order independence. No damage formula, stat or boss definition changed.

## Verified first 20-second baseline report (commit 4f30ca4)

The private `Server skills, variants and legacy combat parity` GitHub job
[136892725965](https://github.com/elroynbenjamins/Veldryn/actions/runs/44919661660/job/136892725965)
completed successfully after fixing strict TypeScript optional-event guards. It includes 13 deliberately invalid timeline cases, authored phase/cast ordering, and 108 actual engine replays. The completed `Synthetic 9-class 18-spec T1–T5 and Enemy V2 matchup matrix` and `Live Edge isolation` jobs passed on the same SHA.

The **20-second synthetic baseline** found:

| Boss | 70% phase seen / 18 | 35% phase seen / 18 | Wins / 18 | Timeouts / 18 | First authored cast P50 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rootbound Heart | 0 | 0 | 0 | 12 | 2.4 seconds |
| Bell-Warden | 0 | 0 | 0 | 12 | 1.6 seconds |
| Buried Heliarch | 8 | 0 | 0 | 18 | 0 seconds |
| Veiled Sphinx | 8 | 0 | 0 | 18 | 0 seconds |
| Bellbeast of Shiverlake | 10 | 6 | 0 | 18 | 0 seconds |
| Frozen Cantor | 12 | 8 | 1 | 17 | 0 seconds |

This reveals a **coverage gap for Asterfall boss phases**, but does not establish that boss HP is wrong: the baseline actors lack complete 2.0 equipment/ability scaling and the window is only 20 seconds. A cast starting at 0s still has a multi-second authored windup, and is **not** an instant hit. The additional read-only median boss/player HP and pre-tell defeat/clear counters distinguish future possible HP walls from counterplay exposure issues; their exact-head CI is pending, so no claim of final passing or final tuning is made.

## What this does NOT establish

- The existing 108 scenarios use **legacy launch-class baseline profiles with V2 class-resource identity**, not final 2.0 gear, gems, affixes, class variants or companion builds; all boss numbers and the 20-second window are synthetic.
- Bosses are assessed separately from dungeon-run endurance, Party Events and World Bosses. The current live boss-fight failure/timeout bug remains a separate 1.x regression workstream.
- A mechanically valid fight may still be too fast, too long, too hard, repetitive or unfair. A replay passing the analyzer must not be used to approve tuning or activation.
- The 540-case cross-tier baseline has two simplified gear profiles, three selected regional boss IDs, and a short window. It is complementary, not a six-boss production balance test.

## Next tuning gate / proposal for review

1. Replace synthetic skill/gear assumptions with verified V2 base stats and owned equipment roll ceilings; cover nine classes, both specs, all six bosses, T1–T5 overlap, gem/companion/tonic boundary cases and two gear percentiles.
2. Simulate at least several immutable server seeds per matchup, including bosses killed before first tell and runs terminated during a cast. Do not run a generic auto-attack 20-second fixture and infer human counterplay.
3. Measure P10/P50/P90 fight duration, percentage seeing each phase, percentage seeing a first cast, avoidable damage, HP at win, soft-lock/timeout frequency, and severe role imbalance. Agree acceptable ranges **before** changing HP, defense, damage or cast cadence.
4. Ensure visual counterplay still works on small screens; any proposed layout/theme change must receive separate explicit UI approval. The existing prototype preview remains unmounted.
5. Preserve server-persisted kit, replay, authored checksum and v1.x dungeon isolation. Never change player reward drop rates or the T1–T4 scarcity model using synthetic kill speed alone.

## Release hold

All enemy/boss draft code remains disabled and in a private PR targeting the unmerged Combat 2.0 foundation. No merge to main, migration, staging/production deployment, or player-visible change is authorized. Exact-head CI and separate release-wide Expo/Edge-bundle issues must be reported accurately.
