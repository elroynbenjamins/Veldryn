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

## Development Pass 4: isolated regional boss prototypes

Four more **canonical** regional bosses now have opt-in skill/phase prototypes in `boss-v2-regional-prototype.ts`:
- Sunscar: **The Buried Heliarch** (`BOSS_EXP_SOLAR`), **The Veiled Sphinx** (`BOSS_EXP_SPHINX`).
- Frostmarch: **The Bellbeast of Shiverlake** (`BOSS_EXP_BELLBEAST`), **The Frozen Cantor** (`BOSS_EXP_CANTOR`).

A separate test verifies canonical IDs/names/levels/stats/legacy skills, 70%/35% phase thresholds, deterministic replay and legacy no-op behavior. All six regional boss 2.0 prototypes are authored *beside* live dungeons, not imported by their content factories.

The release lock remains in force: **no changes to existing dungeon boss rotations, loot, difficulty tiers, combat or rewards until the coordinated 2.0 launch**. The prototypes are not yet balanced for production and are not integrated into an encounter-reservation path.

## Development Pass 5: experimental effect constraints and balance audit

**Status effects (new 2.0 simulations only).** A new optional `CombatInput.experimentalRuleset` field activates the bounded effect rules; the omitted/legacy path keeps its previous semantics. Enemy-applied Bleed and Poison are capped at **3 active instances per source and effect family**; subsequent applications refresh the earliest-expiring instance, without changing the timer or effect of another source. Enemy Regeneration refreshes at one active instance per source. Same-source, same-tag enemy buffs/debuffs refresh instead of stacking without limit. Enemy shields are capped at **10% of the target's max HP** while 2.0 is active. Current-player statuses and shields are not changed by this Enemy 2.0-only pass.

**Explicit safety:** This preliminary engine opt-in MUST be set by a trusted server-side ruleset chosen on new-run creation. The isolation guard rejects attempts to set `experimentalRuleset` in existing gameplay runtime objects. It does not rely on the client to preserve the rule. Legacy fights do not supply the option.

**Balance audit.** `pnpm --dir backend test:enemy-v2-balance` runs the six canonical bosses against three synthetic party/build profiles (balanced, offensive, defensive) and two independent seeds, comparing legacy and 2.0 combat under identical seed/player inputs. It records victory, duration, damage taken, healing, remaining players and triggered boss phases; reports duration/damage ratios when meaningful. This is **observational only**, not accepted numerical balance, because Equipment 2.0 and Skills 2.0 attributes are not finalized.

Do not ship 2.0 mechanics on a passing simulation alone. Require: cross-class viability, no new unwinnable combinations, bounded shield/heal/DoT loops, controlled farming time-to-kill, preserved server-led rewards, and real-player build regression tests.

## Refinement and polish rounds

**Refinement 1 — Combat readability and safety.** Later-region boss kits were trimmed to a maximum of four actions, preserving the original abilities and adding no more than one signature 2.0 action per boss. Sunfall now applies a brief Burn rather than duplicating an existing high-damage burst. Glacial Shatter adds an execute-style risk against wounded targets. Shared status caps prevent endlessly compounded enemy-only effects.

**Refinement 2 — Mobile preview contract.** `enemy-v2-presentation.ts` produces a read-only, compact server projection: enemy name, archetype, up to two trait labels with icon/description, and boss phases/cast names. It deliberately excludes private RNG seeds, raw roll values, internal combat stats, attack coefficients, raw effect parameters and cooldown priority. Legacy bosses show no experimental preview. The existing dungeon UI is not modified.

Tests: `enemy-v2-effect-safety`, `enemy-v2-balance-matrix`, `enemy-v2-presentation` plus all previously registered baseline/legacy/trait/boss tests. The PR validation workflow runs the legacy isolation guard, canonical gem/dungeon suite, and comparative balance audit.

## Outstanding release blockers

1. Verify current PR CI completion; avoid reporting green until checks finish.
2. Finalize the actual Equipment & Skills 2.0 stat/effect contract and recalibrate 2.0 attack, armor, shields, resistances and cooldown budgets.
3. Implement proper versioned server-side encounter reservations with persisted prepared enemy definitions and a release/rollback flag. This development branch intentionally does not alter live reservations.
4. Build/translate the compact 2.0 UI and preserve the current dungeon theater until the integrated release.
5. Run full regression for each of the nine classes, companion variations, all three dungeon difficulties, world/party/guild combat, status stacking, and already-saved dungeon receipts.
