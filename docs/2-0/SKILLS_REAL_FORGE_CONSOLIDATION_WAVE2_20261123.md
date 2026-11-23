# Veldryn 2.0 — Skills × real Forge consolidation, Wave 2 (23 Nov 2026)

**PRIVATE / HIDDEN / REVIEW ONLY.** This branch stacks on Wave 1 PR #1673, which is itself a child of real Forge ↔ Combat PR #1665. Do not merge into main or deploy. No mobile UI, authored skill effects, live combat coefficients, production item authority, Gold/rewards, migration or flag changes.

## Problem established on the Wave 1 exact head

The combined Equipment + Combat hidden workflow stopped at strict TypeScript compilation for `equipment-counterplay-v1-isolation.ts`: a checked Stonecaller spec and River Stone skill were closed over by a locally nested builder and TypeScript no longer treated them as narrowed. Two separate isolated Equipment workflows passed on that head; the combined bridge did **not**, and inherited mobile, economy and Edge parity workflows also failed. No release readiness inferred.

## Source consolidation completed in this wave

1. Preserve the original runtime throw for missing authored Stonecaller source. Capture both present, type-narrowed consts before entering the nested test helper; no V1 or V2 gameplay behavior changes.
2. Port the independently authored **read-only, test-only** `reviewObservedCounterOpportunityV2` and its strict five-category, tampering and stable-order regression from Skills QA PR #1666. This module cannot authorize a combat hit, an equipment copy, a reward, market listing or a release.
3. Apply the review to real Equipment 2.0 Forge → Combat source fixtures in the existing hidden test: four individually generated Forge 2.0 physical copies, complete start/claim/XP and virtual equip custody history, original rolled stats/affixes, and one unchanged boss, seed and team. Compare Stonecaller real Cleansing Stream against the original authored sustain loadout, verify exact equipment evidence parity and classify **observed engine events**, not selected skill labels or invented set stats.
4. Continue to validate original authored Bell boss cast projection separately. No claim that synthetic ten-slot #1666 items are persisted Forge copies. The strict-real-Forge QA scenario is **four actual-source single-item copies**; it is not an approved ten-slot production balance or final Combat Power proof.
5. Include the new classifier test in `backend/tsconfig.equipment-combat-v2-launch.json` and the existing private `equipment-combat-v2-expanded-sets-integration.yml` strict TypeScript / node workflow. No public/Edge runtime import allowed.
6. Preserve truthful instant-ability diagnostics: the existing engine emits `cast_complete` for timed casts but not for instant casts. A verified, source-attributed instant cleanse can therefore have **zero explicit cast-complete events and positive effect events**; classify it as observed counterplay without inventing a cast, changing the engine, or granting combat authority. Added the negative/instant regression to the pure analyzer test.

## Release blockers still open

- Source-authoritative Forge equipment **all ten slots** and all real set effects, including unapproved 15 pinned + 48 expanded set-family design: do not fill gaps with synthetic set bonuses.
- Real authenticated account/database ownership, multi-character Bank custody, serializable claim and market settlement. Current QA verifier is synthetic only.
- Properly resolve original Forge Potency and final 13+ affix units, caps, weapons, gems, innate % bonus, tool XP stacking and damage-type policy.
- Port the rest of #1666's 18-spec x 6 boss x 3 tactics *as genuine Forge source-issued full-loadout tests* only after the ten-slot real source authorizer exists; never import QA fake gear as runtime authority.
- Final Combat Power, actual counter-build balance, classes, boss resistance and equal-CP comparison; 1.x regressions, native UX/theme owner approval, live migration rollback and coordinated release.

## Validation policy

The only pass/fail authority is CI at this wave's **exact head**. Even if the hidden strict compiler and event analyzer pass, this wave remains an isolated dev integration without production settlement.
