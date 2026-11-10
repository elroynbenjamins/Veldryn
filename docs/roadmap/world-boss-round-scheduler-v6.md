# World Bosses — Round Scheduler Prototype v6 (2026-11-10)

**Scope:** code-backed engineering prototype and regression tests. **NOT LIVE / NOT RELEASED.** This is intentionally isolated from production World, guilds, dungeons, event flags, Supabase, reward receipts and player actions.

## Code paths

- \`backend/src/server/combat/world-boss-round-prototype.ts\` — a **pure, deterministic** 14-round simulator that imports current \`CombatantDefinition\`, \`CombatRng\` and battle calculation primitives, but is never called by production services.
- \`apps/mobile/tests/world-boss-round-prototype.ts\` — 81 fixed-layout role/phase/class fixtures (nine initiating classes × three bosses × three global phases), same-seed replay, direct-event and role-ledger reconciliation, status/guard, invalid roster and selected stress/counterfactual checks.
- \`tools/mobile-core-tests.json\` — registers the test in mobile-core suite after prior Hollowroot v4 calibration.

This implementation implements **one combat action per player per round** using a round cooldown derived from existing time-based skill definitions. It does **not** yet reproduce the full timed PvE combat engine ability scheduling, casting duration, all gems/companion effects, combat targeting, travel/profession buffs, or class-level output parity. The current gear adapter and full role-weighted Impact scoring from earlier design remain unintegrated; test fixtures currently use \`launchPlayer\` kits rather than actual full production account snapshots. **Do not publish these outputs as damage/XP/reward balance.**

## Implemented in this disabled prototype

1. Three bosses × three fixed global phases × fourteen authored rounds = **126 scripted cue positions**; structural validator rejects specials without a previous-round telegraph.
2. Deterministic target commitments when a telegraph is issued, resolved in the next round. An interruptible channel (\`REGROWTH\`/\`AEGIS_REFRESH\`) can be cancelled by an **actual available player interrupt ability**, not by client button presses.
3. Scripted Hollowroot Root Slam, Vines, Sporeburst, Regrowth and Splinterstorm; Sunscar Sandbreaker, Heat Haze, Scorch Mark, Burning Tempest, Solar Collapse and Desert Fury; Frostmarch Ice Spear, freezing/frostbite, Icebound Aegis refresh, Whiteout and Glacial Reprisal.
4. **Real per-event HP, shield and local guard changes**; two actual fixed-percent DoT ticks, one-action freeze/root effects and actual cleanse removal when the character owns a cleanse skill. The current nine class kits are **not** secretly granted new skills to create counterplay.
5. Damage/mitigation calculates with existing PvE stat primitives; every real attack, guard soak, heal, shield consumption, damage prevention or status tick emits an ordered deterministic event.
6. Tank interception is explicitly a **10% ally-damage-prevention test hypothesis** credited only when it prevented real incoming harm; shield consumption credited to the original shield owner; effective healing excludes overheal. This hypothesis is not a global Tank class buff.
7. Two-round conditional weak-point exposure, separate finite boss local guard, and capped **8% local-only Regrowth/Aegis refresh**; boss local guard changes can never restore community HP.
8. Three proposed War Orders may be passed, but only Break Armor's local guard coefficient and Hold the Line's mitigated damage are modeled; Steady Assault has no synthetic passive multiplier.
9. Simulated \`bossHpDamage\` and \`proposedWorldDamage\` **do not debit any server-wide event**; no player attempts, Sigils, ownership, reward receipts or leaderboards are created.

## Engineering / fidelity blockers before any backend rollout

**Must fix before claiming production-ready combat:**
- The 14-round turn-based proxy must be reconciled with the live time-driven ability engine, particularly skill cooldown timing, cast interrupts, damage-type/resistance handling, class buffs/debuffs, companion/gem effects, multi-hit combat and exact stat conversion. The v4 time-driven tests must remain passing.
- Add a server-validated snapshot schema, compatible Echo matching and power brackets, versioned skill rules and deterministic round event signing. No client-submitted resolved stat payload.
- Implement a **database-backed** atomic event-HP transaction, per-account three-attempt constraint, one receipt per idempotency key, race-safe residual Echo marking, War Supply consumption and Sigil milestone granting. A pure numerical return value is not a secure settlement.
- Re-run meaningful role counterfactuals with actual game builds, representative mixed power Echoes, and **≥100 seeds** for the planned ≥32,400 matched fixtures. Current tests are correctness/smoke tests, not balance sampling.
- Verify the script, source paths, TypeScript compile and CI execution. No GitHub CI status should be claimed without observing an actual run.

## Testing status and release flag

The source is checked into GitHub; tests are **registered** in \`mobile-core-tests.json\`. Until a build/CI result is observed, label it **PENDING VERIFICATION**, not passed. The previous v4 812-run benchmark remains separate and was not replaced. **There is no activated World Boss feature flag, public route, scheduled event or deployed migration in this pass.**

## Next sequence

1. Run/inspect mobile core TypeScript and tests; fix any failing assertions.
2. Adapt scheduled player actions to the exact live PvE engine unit model and server-derived equipment snapshots; add official role-utility metrics to event logs.
3. Implement isolated idempotent server settlement with real DB transactions, gated **OFF**.
4. Run actual combat and community-population/War Camp/Sigil calibration; only then approve numerical combat/reward targets and plan three-boss art/UI.
