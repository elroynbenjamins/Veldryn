# VELDRYN 2.0 — Authenticated API boundary + Equipment affix contract (v1.0)

**Status: development-only / unmerged draft PR #1377. No production route or build mutator is enabled.**

## Implemented this pass

### Authenticated, hard-disabled transport
- `backend/online/combat-v2-build-auth-boundary.ts` is an **unmounted** parser and gateway for future Skills 2.0 build read/save/activate/delete.
- Account ID comes from an independently validated bearer token via a trusted auth service, never from client body, query, selected character identity, or JWT payload decoding.
- Strict allowlist for character ID, slot 0/1, CAS revision and ID-only build selection. Rejects injected level, attack stats, rarity, quality, extra fields and unsupported equipment slot names.
- Request content size limit; method and route validation; secure failure for invalid/missing token.
- Public handler **always returns 404** without invoking authentication or RPC. Internal dispatch requires an explicit server-enabled gate.
- Tests check spoofing, selected skill and talent validation, disabled transport, identity binding and dispatch behavior.
- Dedicated GitHub Actions online-TypeScript/test job; no live `edge.ts` wiring.

### Storage race safety
- The existing server-side build service re-checks the authoritative activity guard **immediately before** attempting CAS. New test simulates a character entering combat after the initial read.
- Existing DB CAS proposal validates account/character owner, current online-game revision, a character fingerprint and build revision; no DB migration is applied.
- Before enabling this, **activity safety must be rechecked inside a DB transaction** (solo, dungeon, world boss, party event, guild PvE and equipment transfer) or be enforced through a reliable source that changes the guarded revision on any new activity. The extra pre-commit check reduces risk but does **not** solve all time-of-check/time-of-use races.

### Equipment 2.0 affix contract
- `backend/src/server/combat/v2/equipment-affixes.ts`: typed definitions for 13 affix types with correct eligible item slots and distinction between relative percentages and percentage points.
- Requires final approved per-affix ranges, rarity/tier counts **and final Haste/Crit caps** from **server-owned policy**. Overcap values fail closed, rather than silently being nerfed. Stored values from actual item instances are validated; no RNG, new drop rates, rerolls or guessed rarity multipliers.
- Seven attributes are now expressed as a gated combat-stats calculation: attack, defense, max HP, haste, crit rate, crit damage, class healing. Source attribution is retained per gear instance; double application is prevented.
- Six effect families intentionally fail closed until supported in the combat engine: accuracy, evasion, penetration, ward, shield strength and hex potency.
- The calculation requires authoritative **base gear stats already resolved** (tier, rarity and quality). It does not add or fabricate those values, and is not called from the live combat engine.
- Regression tests reject unsupported affixes, invalid slots, duplicate items, out-of-range/unapproved rolls, unknown rarity counts and non-v2 actors.

## Staging checks (read-only)
- Staging project inspected: build table and CAS RPC **not yet present**. No migration applied.
- Security advisors consulted. Existing informational RLS-without-policy findings in other private tables should be reviewed separately and are not caused by this feature.
- Current GitHub Actions builds are queued; backend + online TypeScript, mobile preview, SQL static checks and regression tests have **not been confirmed green**.

## UI/UX release handoff
When server persistence is enabled in the coordinated major update:
1. Character → Builds & Skills, four sections Overview / Skills / Talents / Builds; no change to the existing global gathering/crafting Skills tab or legacy trained XP.
2. Preserve two player-selected presets, with save confirmations only after backend CAS returns the committed revision.
3. On item moved to bank, item sold, cross-character switch or combat start: return a concise blocking reason, keep the local draft intact and invite player to review/replace incompatible gear.
4. Equipment card shows distinct BASE stats, rolled affix value and accepted range, rarity and quality, plus set threshold. Do not show stale roll previews or imply 2.0 values are live.
5. World/Enemy Codex and boss fight screen expose archetype ability, cast telegraph and counterplay; never make manual interruption mandatory for idle play.

## Remaining required before any public release
- CI green and source-level test correction, plus staging migrations and authenticated read/write/security/rollback verification.
- Server **actual** equipment instance snapshot from bank, characters and inventories. Preserve protected/legacy gear and ownership through all activities.
- Reliable transaction-level busy-state guard, combined inventory+build atomicity and versioned live API routing.
- Approved base stat / rarity / quality rules, 6 remaining affix effect families, concrete full set-bonus calculations, complete Enemies/Bosses 2.0 counterplay.
- Localization, native UI integration and player-readable errors, full nine-class multi-tier deterministic combat simulations, rollback and one coordinated major 2.0 release.

No code in this PR should be merged before those gates.
