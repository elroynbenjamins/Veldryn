# World Boss V25 — Authored 14-round encounters for full-account raids

**Decision/date:** 15 November 2026. **Status:** hidden prototype, unmounted and NOT released. Built on V22's **five-day Monday–Friday preparation, continuous 48-hour Saturday/Sunday combat, three account-wide attempts and 14-day cadence**, V23's draft private settlement and V24's 1–5-character fairness audit. No migrations or gameplay flags are activated.

## Authored battles: three different bosses, three global phases

This pass **reuses the existing V6/V13 authored 14-round scheduler**, rather than inventing a fourth set of temporary generic attacks. The older V6 four-role Echo interface remains strict for backward compatibility. A separate, explicitly hidden V25 entry point accepts 1–5 server-verified owned characters, any mix of Tank / Damage / Support and no external Echoes or NPC fillers.

| World Boss | Distinct mechanics | Counters and evidence |
| --- | --- | --- |
| **Hollowroot Colossus** | Root Slam telegraph, vines/root control, spore damage-over-time, interruptible Regrowth, Splinterstorm, conditional heart exposure | Tank protection, effective healing, cleanse, interrupt, local Guard break |
| **Sunscar Devourer** | Sandbreaker marked cleaves, Scorch Mark heat damage, Heat Haze, Burning Tempest, Solar Collapse, Desert Fury, brief Solar Plate exposure | Real shield use, burn and survival mitigation, breakable local armor |
| **Frostmarch Warden** | Ice Spear, Icebound Aegis, freeze chains, frostbite ticks, interruptible Aegis refresh, Shard Volley, Whiteout, Glacial Reprisal | Cleanses and protection, barrier/Guard break, recoverable control |

Every phase has **14 authored cue positions**, totalling **126 script positions** across the three bosses. Specials carry a genuine one-round telegraph; targets are fixed when the telegraph is emitted. Events are deterministic and numeric: damaging hits, shield consumption, real healing, guard depletion, tank mitigation and cancelled channels come from the round engine. A global boss phase is **frozen at reservation**; it never swaps halfway through a player's replay.

## What V25 now implements

- `simulateWorldBossAccountRoundsV25` calls the existing engine in account-raid mode and preserves the legacy V6 role-composition check. One to five fighters, repeated classes/roles allowed.
- `simulateWorldBossAuthoredAccountEncounterV25` takes a V12/V22 owned roster and verifies its snapshot digest, distinct character IDs, actual combat stats, event ID, selected boss/phase, frozen V13 profile and V11 War Camp digest. A deterministic engine seed includes event + account + private RNG. **A hash check is not Auth**: callers must still be the trusted account state/settlement service.
- A new **separate versioned replay schema** records exact scripted events and per-character `bossHpDamage`, `localGuardDamage`, `effectiveHealing`, `shieldConsumed`, `tankProtection`, `cleansePrevented`, `interrupts` and survival. All guard is local: **it never deducts shared world HP**. Existing 100/12/7/5/4% rank weights are applied **only to actual boss HP damage**, not shield/Guard damage, yielding a *provisional preview*.
- No role is required. Tank/Support benefit is visible only if actual HP prevention, consumed shielding, effective healing, cleanse or interrupt occurred. A hit that did no damage or an unused shield earns no fabricated credit.
- Synthetic regression coverage: **90** real GameState-derived account raids spanning T2/T4, all nine class identities, three bosses, three global phases and 1–5 character sizes, plus **36** extra War Order variations. An additional **nine** controlled full-length encounters assert each boss's own cast/telegraph and actual status application, and a high-Guard proof confirms that breaking local Guard alone grants **zero world HP contribution**. Tests also check anti-tamper, duplicate rosters, deterministic replay and the legacy four-role contract. The suite reports authored one-character-versus-five-character output without approving a damage coefficient.

## Not yet connected or production ready

**V23's settlement worker still intentionally runs the original V22 time-driven generic boss engine.** It must NOT be re-labeled as V25. This new V25 authored-result schema is **not accepted by V23 reservation SQL, worker or reward ledger**. The next integration pass must version the V25 frozen packet, reserve with the same event row/three-attempt lock, reverify the authored packet at checkout, persist exact replay and atomically settle **only approved, role-normalized boss HP impact**; test parallel workers and weekend lease recovery before migration.

The legacy V6 scripted combat is a **turn-based engineering proxy**, not a fully faithful drop-in for the timed PvE engine: cooldowns, equipment gem triggers, attack timings, class effects and companion abilities still need reconciliation. V13 boss Attack/Defense/local Guard hypotheses remain synthetic. A realistic population-level damage and survival audit must follow before changing world HP, world impact, the 100 World Sigil theoretical account cap or the three attempts/account.

Further blockers: real production Auth and account state readers; server-side Week 1 War Camp transactional donations and Saturday lock; safe weekend end clock/attempt recoveries; 14-round authored balance and replay UI; damage-to-utility fairness; guild/population scenarios; Sigil awarding and account wallet; battle results screen; mobile accessibility, localization, staging security and explicit release gate. **Keep hidden and out of Android 1.0.10.**

## Code and validation

- `backend/src/server/combat/world-boss-round-prototype.ts` — existing V6 engine, plus isolated 1–5-member V25 adapter; V6 input contract unchanged.
- `backend/src/server/combat/world-boss-account-encounter-v25.ts` — verified roster, phase, profile, seeded authored event log and local-Guard-safe account preview.
- `apps/mobile/tests/world-boss-authored-account-encounters-v25.ts` — 90+36 synthetic battle cases and integrity checks, runnable in isolated GitHub workflow.
- `.github/workflows/world-boss-v12-validation.yml` — dedicated V10–V25 validation; must pass before any review/merge.

**Validation is only claimed after actual CI success.** No user accounts, currencies, inventories, events or database rows are touched by this pass.
