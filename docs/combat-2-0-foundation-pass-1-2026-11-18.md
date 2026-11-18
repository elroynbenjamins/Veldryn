# VELDRYN Combat & Equipment 2.0 — Foundation pass 1

**Status:** isolated development contract. **Not enabled in production.**

## New code
- backend/src/server/combat/v2/build-contract.ts — nine-class role mapping, ten gear slots, server-verified loadout, specialization, variants, talents, capstones and set thresholds.
- backend/src/server/combat/v2/__tests__/build-contract.ts — regression coverage for ownership, legacy class locks, cross-role restrictions, set combinations, skills and talent points.

## Trust model
validateBuildV2 requires an authenticated server snapshot of character class, level and owned item instance IDs. An authoritative server catalog defines eligibility and membership. Client inputs select IDs only and cannot supply actual affix roll values, derived effects or class levels.

Existing class-locked equipment stays class-locked. Role-shared gear must explicitly declare eligible roles. If both restrictions exist, both must pass. Set pieces exclude weapon and offhand, avoiding mandatory ten-piece gear.

## No production changes
This branch does not import the new contract in any running combat route. There is no database migration, no item reroll, no converted items, no changed XP, no numerical effects, no Skills UI, no deployment, and no enabled feature flag. Existing gems and inventory are untouched.

The explicit server-controlled kill switch is named buildMayAffectCombatV2. It can return true only when the caller supplies a server-enabled flag and validation passed. There is currently no runtime caller.

## Next phases
1. Convert the accepted T1–T5 equipment and skills catalogues to authoritative definitions, preserving the previously approved affix counts and roll ranges.
2. Implement authenticated character / inventory snapshot adapters, including character-bank ownership rules, and atomic save / switch.
3. Implement deterministic skill, equipment and enemy effects with the same authoritative combat timeline for solo and multiplayer.
4. Build hidden mobile Skills, Talents and Loadouts UI; preserve existing item instances and old gear preview semantics.
5. Validate the integrated Equipment + Classes + Enemies 2.0 update and only then perform full numerical balance.

## Verification
Run the normal backend TypeScript build with project dependencies installed, then execute:

    node dist/server/combat/v2/__tests__/build-contract.js

Until the full project CI passes, this work should remain a draft PR and not be merged.
