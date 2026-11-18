# VELDRYN Combat 2.0 — Hidden persistence, equipment and enemies pass (v0.9)

**Status: DRAFT / NOT LIVE.** No production database modifications, no migrations applied to staging or production, no active route/feature flag, no item conversion, no character progression changes, no gameplay deployment.

## 1. Authenticated character-specific build persistence
- `build-server-service.ts`: service-authoritative account ID and character ID only. Current class/level and equipment owner instance IDs are loaded from the server's trusted snapshot; no client-supplied combat values or account ownership are accepted.
- `supabase-build-repository.ts`: restricted server RPC adapter for **read** and **compare-and-swap** writes, with source projection checks and explicit schema version. This code is never imported into mobile.
- `build-mutations.ts`: immutable Save/Activate/Delete proposals for **two** character-specific presets; stale revision, invalid class, level, banked item and inventory ownership protections. Switching requires a trusted server activity guard, which must report no active combat/dungeon/world boss/party event/guild PvE/equipment transfer.
- Added required `EquipmentInstanceV2.requiredLevel` validation for all active new and legacy gear.
- `20261118124500_combat_v2_build_persistence_hidden_v1.sql`: private table with RLS enabled and no public/authenticated direct table grant. Two service-role-only RPC functions validate ownership and perform atomic build revision + online game revision + relational character fingerprint checks. The migration is **committed to the branch but not applied**. No runtime routes call the RPCs yet.
- Before staging: review the SQL with Supabase migration tooling, inspect security advisors, test character deletion/account switching, and confirm authoritative activity state and inventory consistency across every equip/bank/market operation.

## 2. Equipment 2.0 bridge
- `equipment-compatibility.ts` supports v23 and v33 legacy item IDs with **original class locks and equip levels intact**, including older item tiers. It never changes rarity, quality, gems, affixes, upgrades, item records or drop pools.
- New role-based gear must explicitly name a server-authorized `eq2_t1..t5` set ID, compatible armor slot and equip level. A tier mismatch, unsuitable class, unknown item, or weapon counted toward a set fails closed.
- **Numerical Equipment 2.0 affix/stat-roll calculations remain future work.** No approved rarity/quality/roll ranges are overwritten or guessed at.

## 3. Enemies 2.0 bridge
- `enemy-bridge.ts` adds opt-in ability definitions for eight archetypes: Bruiser, Assassin, Caster, Swarm, Guardian, Hexer, Executioner and Support. Bosses receive a visible once-per-phase pressure transition. Existing encounters are unchanged when disabled.
- `unified-encounter.ts` composes those enemies with `simulateCombatWithSkillsV2` on the existing deterministic authoritative timeline. It returns the original untouched legacy simulation when the server gate is false.
- **All new enemy coefficients and boss-phase details are provisional.** Existing dungeons and live bosses are untouched, and exact mechanics have not yet been balanced alongside the completed Equipment 2.0 system.

## 4. Advanced Skills 2.0 behavior
- Hexweaver's Black Thread **Rupture** now checks for a surviving, self-applied DoT and removes it in exchange for bounded damage from its remaining authored ticks.
- Dreadguard's Blood Rend and Hexweaver's Soul Rend now perform capped **actual HP damage-based lifesteal**, not an unconditional flat self-heal. Absorbed shields and overkill cannot create extra healing.
- Special effect fields are ignored outside server-compiled Combat 2.0 actors. The legacy damage and overkill calculation is intentionally preserved.
- Other bespoke skill semantics—damage redirection, full threat steering, separate totem entities and final boss-counter logic—are still pending before release.

## Verification scope
`.github/workflows/combat-v2-skills-validation.yml` has added build server service tests (account ownership, banked instances, class/level equip, activity locks, stale revision), cross-system gear/enemy tests, v2 skill-effects tests, and a static SQL permissions test. **Authored tests are not proof of passing CI.**

### Release blockers
1. Backend TypeScript compilation and complete v2 plus legacy regression suites green.
2. Staging-only SQL deployment and read/write/rollback verification; Supabase security advisors, no public grants and no path to cross-account data.
3. Actual authenticated gameplay API, server-derived equipment registry and verified activity/encounter guard; no client-sourced character/account ID.
4. Equipment 2.0 rarity, quality, affix and set bonus combat calculations, followed by Enemies/Bosses 2.0 counterplay validation.
5. Mobile Skills UI localization, loading/errors, respec confirmation, no in-combat switch and correct legacy gear display.
6. Deterministic multi-class/tier/composition balance, migration/rollback, full coordinated public release only.

**PR:** https://github.com/elroynbenjamins/Veldryn/pull/1377
