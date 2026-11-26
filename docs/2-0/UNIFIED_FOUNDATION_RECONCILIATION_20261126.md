# Unified foundation reconciliation — pass 7

Pinned combat head 77b7bf0910c9628122f659c34ee46c1ee32eefb4 (#1844); pinned Forge/socket head 95bfedbe77604f25100bec229aabfcb284e880ee (#1845). Common ancestor 8342be1cedcff2d735df9517e667bd2a78d30bd2. Compare: Combat 335 commits / 123 changed paths; Forge 527 commits / 280 changed paths; 12 overlapping changed paths. No blind union, no overwrite of competing authority or engine code.

## Proven shared corrections
- Port exact portable hash and Node parity test from #1844 (loadout source on Forge equals common ancestor). #1844 job 139866823274 mobile preview typecheck passed; job 139866823121 isolated Edge/legacy passed. Existing artifact 15109928369 from run 45807596471 includes reproducible generated bundles; byte parity against committed artifacts still fails.
- Both branches have same Skills preview screen blob. Hide both indicators as required by existing full core regression (job 139866821892). Scrolling remains enabled.
- Forge #1845 private expanded integration, GameState, conditional boundaries and isolated core passed. Server contract job 139867013745 stopped on old 13-affix assertion; now check exact 16 IDs and bounded new channels, with explicit missing/low cap negatives, no numeric balance changes.
- #1844 job 139866823133 confirms 15 pairs observed in original short matrix plus targeted Mystic Harmony and Sanctified Hunt. Twilight Accord remains the uncovered short-window link; separate pressure test needed on Combat lane.

## Shared paths requiring semantic reconciliation
- backend/src/server/combat/engine.ts
- backend/src/server/combat/types.ts
- backend/src/server/combat/v2/__tests__/equipment-trait-engine.ts
- backend/src/server/combat/v2/__tests__/equipment-trait-exact-copy-boss-matrix.ts
- backend/src/server/combat/v2/ability-counterplay-strategies.ts
- backend/src/server/combat/v2/equipment-frozen-forge-handoff-audit.ts
- backend/src/server/combat/v2/equipment-trait-engine-authority.ts
- backend/src/server/combat/v2/equipment-trait-engine-runtime.ts
- backend/src/server/combat/v2/equipment-trait-exact-copy-adapter.ts
- backend/src/server/combat/v2/unified-equipment-encounter.ts
- tools/combat-v2-live-edge-isolation.mjs
- tools/tests/combat-v2-edge-isolation.test.mjs

Integration order: types and source/trait receipt authority first; engine and per-encounter assembly second; tests and fail-closed Edge shims third. Require exact-head strict backend and mobile compile, original Forge/gem proof, all 18 synchronization links, matched combat and legacy isolation; full regenerated Edge parity. Until then keep both lanes separate. No main merge, production migration, deployment, CP approval or live activation.
