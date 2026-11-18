# Enemies & Bosses 2.0 — opt-in combat foundation (2026-11-18)

## What exists in the codebase

The authoritative `simulateCombat` engine already implements boss HP phases, telegraphed casts, statuses, shields, healing, damage events, seeded replay and readable PvE mechanics. Reuse these primitives; do **not** introduce another damage engine. The current PvE archetypes are `bruiser / assassin / caster / swarm / guardian / hexer / executioner / support`, and the Enemy 2.0 archetype labels map to these without changing their existing tags.

## Scope of this first implementation pass

- `backend/src/server/combat/enemy-v2-prototype.ts` adds the **complete 18-trait catalogue**, compatibility-constrained seed rolls, sanitized preview information and a pure, explicitly version-gated enemy transform.
- Nine traits have engine-backed effects: Savage, Swift, Keen, Stonehide, Fortified, Regenerating, Venomous, Rending and Hexing.
- Nine additional traits remain **non-rollable** until the engine safely supports their intended semantics: Piercing, Enraged, Vampiric, Warded, Elusive, Resolute, Chilling, Thorned and Sundering. In particular, Armor and magic defense are not separate in the current engine, and shield-reflection is not equivalent to unconditional retaliation.
- `boss-v2-asterfall-prototype.ts` prototypes new abilities and two HP-based phases for the actual live content IDs `BOSS_EXP_ROOT` (**Rootbound Heart**) and `BOSS_EXP_BELL` (**Bell-Warden**). Their existing names, base stats and signature ability IDs are preserved. The earlier design examples Ironwood Alpha and Thornheart Ancient were illustrative and **must not replace** the real bosses.
- Both modules are pure opt-in and are currently **not wired into a production route**. The legacy runtime, old dungeon snapshots, loot, Marks and existing fights are untouched.

## Safe application (future server adapter)

1. A server-side configuration selects `enemy-v2-prototype-1` for a **new** encounter. Never trust a client-supplied ruleset, tier, elite list or seed.
2. The server derives each enemy's canonical definition and equipment-progression tier and calls `prepareEnemyV2(definitions, serverOptions)`. T1 has no rolled traits, normal monsters have at most one, and T3+ elites at most two compatible traits.
3. For eligible Asterfall bosses only, call `prepareAsterfallBossV2(definition, ENEMY_V2_RULESET)`.
4. Persist the prepared enemy definition, rule version and RNG seed as part of the authoritative reservation **before** resolving combat; retries and reconnects read the same frozen snapshot, rather than rerolling.
5. Reuse `simulateCombat` and `pveBossTelegraph` on the prepared snapshot; surface only sanitized trait names and cast/phase metadata to clients. Do not expose the hidden seed or internal damage coefficients.
6. Gate rollout to development/staging until comparative simulations validate time-to-kill, healing/shield loops, survival, cast event ordering, reward invariants and cross-class viability.

## Important follow-up work

- Add status stacking caps, source refresh semantics, real per-hit internal cooldown procs, resistance/tenacity mapping, phase cast priority and shield expiry telemetry **before** enabling the remaining nine effects or shipping to production.
- Reconcile proposed Enemy 2.0 stat roll ranges against the accepted Equipment 2.0 schema; do not conflate percentage points with the engine's raw accuracy/evasion ratings.
- Expand authored boss kits for Sunscar and Frostmarch using real canonical content identifiers. Avoid replacing existing bosses with design placeholders.
- Prepare a controlled Asterfall server adapter, compare baseline and v2 battle simulations, and verify that legacy and in-progress receipts replay exactly.

## Verification

Run `pnpm --dir backend test:gems`. The opt-in Enemy 2.0 and Asterfall Boss 2.0 regression tests were added to this existing combat suite. CI executes it for PRs touching `backend/src/server/combat/**`.

No database migration or release toggle is necessary for the pure modules in this pass; introducing an authoritative persisted ruleset on live reservations will require a separate migration and explicit rollout review.

## Coordinated 2.0 release lock (approved 2026-11-18)

**Do not apply Enemy 2.0 to ANY current dungeon until the complete Equipment 2.0 + Classes & Skills 2.0 + Enemies & Bosses 2.0 update ships.** Development and prototype simulation are allowed on feature branches only; the installed live dungeon catalogue, difficulty tiers, boss selection and rewards remain as-is.

Enforced by:
- `tools/validate-enemy-v2-isolation.mjs` scans gameplay sources for imports or invocation of the 2.0 prototype and fails if found.
- `backend/src/server/combat/__tests__/enemy-v2-legacy-dungeons.ts` verifies current dungeon content factories remain unchanged with 2.0 disabled.
- The existing CI gem/dungeon workflow executes the isolation guard and the regression tests.

Release activation prerequisites:
1. Finish the shared Equipment/Skills/Enemy 2.0 combat contract and verify all active class/role loadouts.
2. Finalize real regional bosses and enemy families, with accepted balance and reward simulations.
3. Define a **versioned, server-owned** combat ruleset on new encounter reservations; freeze it on creation. Existing saved/in-flight runs must use their original ruleset forever, including on reconnect.
4. Deploy migrations, server, and mobile client with explicit minimum-version and rollback policy; never silently adopt 2.0 for old receipts.
5. Only then replace the isolation guard with tests that prove the version gate and legacy receipt replay. Enable the new ruleset deliberately, with an immediate rollback switch for **new** runs.

Current status: development-only, no gameplay route references, no migrations, no deployment.
