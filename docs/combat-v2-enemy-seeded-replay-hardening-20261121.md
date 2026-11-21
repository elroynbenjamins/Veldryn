# Enemy / Boss 2.0: seeded kit replay hardening and CI recovery

Date: 21 November 2026. Scope: hidden Enemies/Bosses 2.0 child PR #1430 of canonical private Combat 2.0 PR #1377.
Status: **DRAFT / UNRELEASED / NO LIVE ROUTE / NO MIGRATION / DO NOT MERGE TO MAIN**.

## Authored encounter safety

- Correct the persisted-receipt check for Tier 1 normal/elite introductions: these remain eight deterministic authored teaching kits and must never enter the boss-only branch.
- For Tier 2–5 normal and elite encounters, independently regenerate the entire enemy definition using trusted base enemy, immutable server seed, encounter ID, region, tier and elite membership. Require byte-equivalent versioned digest rather than trusting a recomputed stored digest.
- Independently match seeded trait IDs and archetype preview; reject stats, extra abilities, changed trait powers, changed seed and fabricated effects. Even a normal enemy with no rolled trait must equal the original base + kit tag.
- As before, Boss 2.0 receipts independently regenerate all six handcrafted versioned boss kits. This is structural correctness only. The authenticated persistence owner must additionally validate account/character, encounter identity, revision, combat digest and canonical seed ownership.

## Regression / synthetic compilation follow-up

- Tests cover altered enemy attack, injected cast plus fake preview, changed server seed and fabricated stats for unrolled Tier 2 Asterfall normal. The original six bosses and eight Tier 1 archetypes are unchanged.
- Port narrow TS compilation fixes from newer canonical parent: fully shaped fake-ability fixture, explicit nullable QA writer guards, and explicit replay callback types.
- Synthetic balance diagnostics accept an **authored** T1 teaching kit, suppress the generic-bridge coverage warning only for authored T1 samples, and continue rejecting T2+ masquerading as T1 or vice versa.
- These tests are authored/committed, **not yet verified as passing in an exact-head CI run**. Prior child run 44502364684 failed compilation before reaching combat tests (TS fixture, T1 diagnostic type, callbacks and QA nullable guards).

## Outstanding gates

1. Reconcile the child with canonical Combat 2.0 foundation: at inspection, child had 16 missing parent commits and must not overwrite newer owned-gear changes.
2. Confirm exact final-SHA backend typecheck; 540 synthetic cases, 108 six-boss scenarios, 8 Tier 1 archetypes, persisted replay and tamper tests; PG17 reward races and Edge isolation.
3. Measure actual Tier 1–5 difficulty with finished Skills/Equipment 2.0, normal/elite kill throughput and elite rarity so crafting combat-drop scarcity can be tuned before enabling an economy.
4. Finish authenticated persistence and replay event delivery; mobile UI/theme approval, Android small-screen QA, localization, companion/gem/potion interactions, legacy in-flight run parity.
5. Coordinate 2.0 with Equipment/Skills, World Bosses, Party Events and economy. Never enable this draft, change legacy dungeons, run production migrations or change live 1.0.11 rewards.

No live player stats, combat rewards, inventory, dungeon rounds, builds, feature flags, production data or visuals changed in this pass.
