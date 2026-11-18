# Veldryn — Combat 2.0 stat-contract prototype (non-live)

**Status:** Design/isolated TypeScript reference. No existing combat engine imports this prototype.  
**Epic:** #1379  
**Earlier independent small release:** T2–T5 stat-roll PR #1374 (13 stats, existing combat), release gate #1367.

## Purpose

Replace the overly broad new **Power** affix concept with two meaningful *flat, underlying* strength budgets: **Weapon Power** and **Skill Power**. They are not Combat Power (CP), not random percent rolls in the small update, and not generic multipliers on all output.

| Stat | Unit | Intended eligibility |
|---|---|---|
| Weapon Power | nonnegative flat strength | Basic weapon attacks and weapon-tagged techniques |
| Skill Power | nonnegative flat strength | Class abilities, skill healing and skill shields |
| Ability Damage | decimal percentage | Damaging abilities and weapon techniques; never basic hits |
| Healing Power | decimal percentage | Eligible restorative skills, not automatically food/potions |
| Potency | decimal percentage | Authored support/utility tags; final mechanics to be defined |
| Combat Power (CP) | derived display rating | Readiness and comparison only, never directly multiplies damage |

Source tags prevent **a weapon technique that is also a class skill** from gaining both full Weapon Power and full Skill Power. Each authored ability gets one canonical power source; special hybrid effects need explicit bounded allocation and deterministic test fixtures.

## Design-first prototype

- `backend/src/server/combat/combat-stat-contract-v2.ts` defines types, validation, mutually exclusive scaling tags, a *pre-mitigation reference projection*, and whole-build power share reporting.
- `backend/src/server/combat/__tests__/combat-stat-contract-v2.ts` tests weapon-vs-skill separation, bonus eligibility, support behavior, bad data, and accepted budget shares.
- This does **not** change `backend/src/server/combat/engine.ts`, `apps/mobile/src/core/game.ts`, dungeon server snapshots, any SQL schema or the current app build. There is no implicit on-disk save migration.
- The validation is a sanity gate only. Production combat must independently verify equipped instance, class skill levels, role, content/catalog version and companion ownership; client-submitted stats cannot be trusted.

## Accepted equipment/build contract

The relative power-budget target for complete builds is:

| Category | Target share |
|---|---:|
| Class and level | 17% |
| Equipment base attributes | 45% |
| Rarity and quality | 14% |
| Affixes, upgrades, gems, sets | 14% |
| Companions and other | 10% |

These are **measured contribution targets** in the calibration harness, not arithmetic multipliers or guaranteed per-item percentages. Build coverage includes all nine classes, T1–T5, 1–2 base attributes per item, rarity and Q0–100, role class weapon restrictions, mixed 2/3/4-piece sets, and copy-stable bonus rolls.

## Follow-on implementation order

1. Define all 2.0 primary and secondary stat units, source tags, caps, fallbacks, and versioned server-owned snapshot contract.
2. Author actual weapon/skill baseline, coefficient formulas, all nine class specializations and skill variants. Check weapon technique, class skill, skill healing, skill shield, enemy damage, DoT/HoT and companion source attribution.
3. Calibrate T1–T5 equipment families, base stats, rarity, quality, slot/specific-class budgets and set combinations under the shared stat model.
4. Implement enemies' physical/skill defense, resistances, vulnerabilities, ability timelines, interrupts, boss phases and role counters.
5. Connect server-authoritative combat for solo/offline hunting, story bosses, dungeons, Guild PvE, World Bosses and party events. Do not let visual-only client code decide an action outcome.
6. Test historical save continuity, legacy Power sets/gems, exact-craft-copy transfer, gem replacement, Marketplace escrow and rollback, deterministic replay, and nine-class cross-tier simulation.
7. Stage the complete release and validate Android and backend parity. Ship **one coordinated 2.0 gameplay update** only after the comprehensive gates pass.

**No release action** is authorized merely by accepting this design. All production content, enemy balance and mandatory-version flags remain on their current algorithms until the migration passes validation.
