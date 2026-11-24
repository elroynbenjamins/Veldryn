# Enemies / Bosses 2.0: Tier 1 & counterplay continuation

Date: 2026-11-19
Status: **PRIVATE DRAFT, UNMERGED, UNTESTED ON STAGING, NOT ENABLED**
Parent: feature/combat-v2-foundation-contract-20261118 (PR #1377)
Child: integration/combat-v2-enemy-t1-counterplay-20261119
Do not merge to main or activate any Combat 2.0 flags in this pass.

## Pass 1: Tier 1 authored introductions

Problem: existing 540-fixture synthetic matrix marked 108 Tier 1 cases as generic and never issued a persisted Enemy 2.0 kit. Tier 2–5 already used authored seeded traits and boss profiles.

Implemented:
- New hidden Tier 1 kit builder for all eight known PVE archetypes: guardian, bruiser, executioner, assassin, swarm, caster, hexer, support.
- One low-impact, readable ability per archetype. Tier 1 normal and elite foes get **zero random traits**, no additional stat multipliers, and no hidden skill/reward changes.
- Tier 1 kits are produced only by the existing authoritative new-solo-encounter kit composer, then frozen in the same versioned server-owned persistence path as higher tiers. Replays validate that the exact authored kit matches the stored digest.
- Unknown Tier 1 archetypes reject rather than accepting unapproved content. Existing kit compilations cannot be composed again.
- Full synthetic class/spec/gear matrix now requests a frozen 2.0 kit for Tier 1 and records 108 T1 cases / 540 total cases; all results remain synthetic—not approved difficulty, economy or balance targets.
- Per-enemy count limits, original ability and phase preservation, receipt revision checks, and the existing 10%-HP enemy-shield cap remain enforced by the private engine authority contract.

## Pass 2: Boss counterplay & small-phone legibility

- Added a **structural** persisted-kit-verified safe preview contract for the six authored regional boss profiles: Rootbound Heart, Bell-Warden, Buried Heliarch, Veiled Sphinx, Bellbeast of Shiverlake, Frozen Cantor.
- Maps all 7 authored V2 casts to a player-facing tell, what to do, and a class-neutral fallback. Three long casts are interruptible (Sunfall, Glacial Shatter, Deep Dissonance); shield and curse mechanics have alternatives requiring no specific specialization or rare item.
- The 12 authored boss phases have named 70% and 35% transitions. Original legacy boss phases are preserved exactly in newly compiled snapshots.
- Extended four hidden casts (Living Bark, Soul Curse, Veil Mirror, Mirage Veil) from 600–750 ms to 1150–1350 ms so small-screen players can read their tells before completion. No live boss data changed.
- The projector never returns server seed, RNG rolls, item stats, hidden damage coefficients or damage caps. It refuses mismatched cast attributes, missing guides and phase thresholds.
- The preview projector is **not** an authorization boundary. The future live service must first authenticate the persisted encounter owner/revision/receipt, and validate the combat token. It remains unmounted.

## Refinement / polish

- Hardened the already-existing persisted Enemy 2.0 kit check: preview ability/phase labels must match the actual stored, digest-pinned compiled definitions; a forged title cannot pass even if the enemy digest is unchanged.
- Deterministic Tier 1 replay, 8 archetypes × 2 elite modes, source non-mutation, Tier 1 forged abilities and preview labels, all six boss contracts, cast/phase tampering, and unmodified legacy one-argument combat are covered in focused tests.
- Private Combat 2.0 CI workflow now compiles and executes the new tests. PR CI and exact-head status must be checked before any claim of passing.

## Still blocking release

1. Exact-head CI with all server/mobile/online/Edge/PG17 suites; staging migrations and multi-transaction proof.
2. Measured 9-class/18-spec/5-tier encounters with approved real Enemy 2.0 stats, full boss survivability, boss telegraph and status UI on Android small screens, accessibility/localization.
3. Equipment 2.0 exact-copy scaling parity (do not apply quality/rarity twice), Skills 2.0 cooldowns/passives, damage/mitigation and companion matrices, legacy completed/draft/reconnected dungeon replay checks.
4. Server-owned live connection from encounter snapshot to actual 2.0 gameplay only on a coordinated release gate; explicit rollout/rollback and security review.
5. Regression and tuning for current dungeon/Live/Q-Mode, World Boss, loot, marks, potions and reward paths. **No edits to these paths are included here.**

No staging/production SQL was applied. No live game code, rewards or player data were changed.
