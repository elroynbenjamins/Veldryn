# Classes/Skills 2.0 × Enemy 2.0 — engine effect integration

18 November 2026 — experimental integration **into draft PR #1377**, not live main.

## What is now implemented

The Classes 2.0 draft combat engine already executes verified-skill resource meters, capstones, reactive passives, attribute/affix effects and deterministic events. The Enemies 2.0 draft implemented a separate shield/DoT/debuff handler in the same engine.ts locations. Combining those whole files would erase one side's behavior.

This integration applies the Enemies 2.0 status rules **within the existing Classes V2 effect handlers**, keeping all existing class resource generation, passive triggers, proc shield multipliers, hex DoT bonuses, cleansing, interrupts, threat and timing.

- A sourced poison/bleed DoT has up to three simultaneous stacks from the same enemy. New applications refresh the earliest expiry at the cap. Different enemy sources remain separate.
- Regeneration HoT has one simultaneous stack per source. Same-source/tag timed buff/debuff reapplication refreshes instead of infinitely multiplying.
- Experimental enemy shield amount is limited to the remaining capacity within 10% of enemy max HP; this is evaluated *after* any eligible Class 2.0 shielding bonus and does not change player shields.
- No legacy RNG generation, healing/potions, boss phase, damage coefficient, Equipment 2.0 stat contribution, or dungeon reward procedure was changed.

## Server ownership and deterministic replay

The engine's existing one-argument API is retained. A second optional parameter has a unique-symbol and private-WeakMap-backed authority type, issued only by the unmounted server module in v2/enemy-engine-authority.ts.

To issue it, the trusted server must pass a persisted solo encounter scope, a complete finalized CombatInput and a server-provided verification callback. The callback receives the **SHA-256 digest of the entire input** and must verify that digest plus scope against the stored signed/authoritative encounter. The digest is calculated with the same portable noble-hashes implementation used elsewhere by Veldryn combat (no Node-only crypto dependency in the shared engine).

The authority is bound to one seed, one player ID, 1–4 enemy IDs and the exact complete combat input. Changing equipment-inflated stats, abilities, skills, enemy stats, team membership, seed or even one authored effect after issuance makes execution fail. JSON or a user-supplied string switch cannot recreate the token. New Enemy 2.0 effects reject in-progress player HP/cooldown state, Q-Mode, legacy actors and bosses.

If the authority is absent, this new code takes the original branch's behavior, preserving existing Classes 2.0 and legacy run paths. There is **no CombatInput.experimentalRuleset field** and no API/Edge/mobile binding. A server adapter must not pass verification callbacks, tokens, trust flags or snapshots from an untrusted request.

## Validation

The dedicated test at backend/src/server/combat/v2/__tests__/enemy-engine-coexistence.ts exercises:
- Engine replay parity with no authority, deterministic runs with the same authority and untouched source definitions.
- Actual engine DoT stack and timed debuff refresh behavior, and the enemy shield cap versus uncapped baseline.
- All nine character resource types under enemy status effects.
- Forged/serialized tokens, missing verification, wrong scope, legacy and Q-Mode state, and mid-encounter stat/skill tampering.

The Combat 2.0 skills workflow now compiles the backend, runs this new test and forbids imports of the authority issuer from public Edge, online or mobile runtime code. **Workflow completion is not yet verified.** An integration PR may be merged into draft #1377 to unblock the full 2.0 merge; it must not be used to release 2.0.

## Still missing before main or production

- Real persisted snapshot issuance and signed/source-owned receipt verification, plus stale-token rotation and replay protection in the server transaction.
- Reconcile the rest of #1376: six trait archetypes, regional bosses, V2 encounter snapshot and effect/ability normalization (do not execute both compilers).
- Prove precise legacy dungeon Live/Q-mode saved cooldown and RNG event parity, with production-representative fixtures and Android staging.
- Nine-class balance, class skill and companion effect interactions, item/source mutation during combat, versioned old-client migration and rollback.
- Full green CI, reviewed staging Auth/SQL/Edge and explicit release approval.

This work does **not** enable any 2.0 gameplay or change a production route.
