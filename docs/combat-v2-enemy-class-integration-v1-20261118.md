# VELDRYN 2.0 — Classes/Skills ↔ Enemies/Bosses integration contract
18 November 2026 — hidden pre-release consolidation

## Why this integration is needed
PR #1377 (Classes/Skills/Combat 2.0) and PR #1376 (Enemies/Bosses 2.0) both alter backend/src/server/combat/engine.ts and types.ts. Combining them blindly would change live legacy combat, alter status stacking, and risk duplicate enemy abilities. Their compiled enemy models also use different archetype taxonomies.

**This pass does not merge the overlapping live engine edits.** It lands only an isolated, dependency-free, non-runnable preparation contract under backend/src/server/combat/v2-integration. The work in #1377 and #1376 remains draft.

## Eight legacy archetypes → six V2 trait archetypes

| Authored PVE archetype | Canonical Enemy 2.0 trait archetype |
|---|---|
| guardian | bulwark |
| bruiser, executioner | berserker |
| assassin, swarm | predator |
| caster | spellcaster |
| hexer | hexer |
| support | mender |

Only implemented traits are eligible: stonehide, fortified, savage, rending, swift, keen, hexing, venomous and regenerating. Unsupported traits such as warded, vampiric, resolute, piercing, tenacity-style status resistance and other proposed mechanics cannot be activated by merely appearing in a trait array.

**Important:** Both branch compilers currently add abilities to enemy definitions. The approved future engine must use exactly one authority to compose a particular enemy kit, not run both full kit compilers in sequence. Already-compiled enemy tags are rejected.

## Snapshot and legacy safety
- Requires a verified, persisted server-owned V2 encounter snapshot, unique revision, server seed and a trusted authenticated-store verification callback. These requirements are not client options; the callback must never be accepted from request JSON.
- Allows one newly created solo player actor and 1–4 normal/elite enemies. World Bosses, Guild PvE, Party Events, current dungeons, Q-Mode, bosses and prior replay/HP/cooldown saves are explicitly not convertible through this boundary.
- Validates nine canonical class/role pairs, pinned class/skill versions and the exact frozen Equipment 2.0 evidence schema merged in PR #1390. Rarity and quality remain pre-applied to the frozen physical copy.
- T1 Enemy 2.0 trait rolls are ineligible. The hidden prototype only allows T2–T5. Normal enemies may have at most one trait; elites may use two at T3+ if authored group constraints allow it.
- Fails on duplicate enemies, unsupported archetypes/traits, two major offensive/defensive traits, and enemy kits tagged as compiled by another V2 system.
- Returns frozen, sanitised preview evidence with no random seed, raw rolls, underlying damage coefficients or privileged actor stats. It returns runnable:false. It does not construct a CombatInput or execute, settle or persist a battle.

## Experimental status semantics
- Per enemy source: poison/bleed DoTs cap at 3; regeneration HoTs cap at 1. Reapplying after the cap refreshes the earliest-expiring effect in its original array position.
- A same-source, same-tag timed modifier refreshes rather than multiplying indefinitely; other sources remain independent.
- Expired effects drop from the *new projection* without mutating previous snapshots; malformed and nested payloads fail closed.
- Enemy shielding is capped at 10% of maximum HP. The cap does not apply to the legacy engine or to player shields.

## Merge strategy for the real engine
1. Resolve the shared engine.ts and types.ts changes on a dedicated integration branch without replacing the current legacy code path. Make an explicit, trusted server-owned V2 feature selection; never infer it from client input or merely seeing a V2 tag.
2. Persist versioned actor, equipment, skill, enemy and RNG snapshots once and replay from that exact identity. Keep the frozen copy source and class-only stat baseline isolated from current equipment-inflated launch actors.
3. Reconcile Classes V2 resource/passive/capstone handlers with Enemy V2 DoT/HoT, buffs, shields, casts, phases, interrupts and clean resistance rules. Every status effect must have server-verified source attribution.
4. Verify old dungeon/coop Live/Q-mode encounter RNG event transcripts, healing/potions, Expedition Marks, boss mechanics and persistence remain unchanged, including in-flight sessions.
5. Verify all nine classes, all 18 specializations, six archetypes, tier/rarity/quality, pets/companions and boss counterplay with deterministic simulation. Require staging, full CI, Android UX and rollback before enabling 2.0.

## Verification
Run Node 22:

    node backend/src/server/combat/v2-integration/__tests__/enemy-class-encounter-plan-v1.test.mjs

The dedicated CI workflow runs the pure contract tests and ensures production routes/mobile/engine do not import the new module. The tests cover 8 legacy archetype mappings, all 9 classes, 35 negative encounter cases, tier/trait limits, status refresh/replay and shield caps.

**Release status: OFF.** No live endpoint, migration, combat timer, damage/loot computation, reward claim, or user-visible mode is introduced here.
