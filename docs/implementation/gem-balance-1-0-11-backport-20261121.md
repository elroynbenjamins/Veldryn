# Veldryn 1.0.11 — Gem balance integration (2026-11-21)

## Scope
- Apply the approved 12-family G1–G5 Stat Gem balance from the future combat proposal to 1.0.11.
- Might is **Attack**, not directly Power: G1–G5 1%, 1.5%, 2%, 2.75%, 3.5% base; saved rolls remain 80–120%.
- Other gem family values match `MOBILE_GEM_FAMILIES_V1` and `STAT_GEMS_V1` (12 families, 60 grade values).
- Existing IDs, grade numbers, roll percentages and socket records are **not rewritten**, therefore existing equipped canonical gems use new values.
- The old 1.0.x `EMBER_SHARD` and `EMBERHEART_GEM` Attack identities retain their original +2%/+5% bonus when already socketed. The legacy on-save conversion is unchanged.
- No new gem item IDs, inventory definitions or 2.0 restoration-only assets are included in this backport.
- Source changes and the two precompiled shared Edge bundles must remain in sync, verified by `node tools/verify-gameplay-edge.mjs`.

## QA and rollout
- Typecheck mobile, online backend and server via CI.
- Validate `test:gems`, the full mobile core suite, gem-dungeon runtime, multiplayer dungeon snapshots and the generated edge parity gate.
- Confirm old 1.0.10 saves/loadouts and new 1.0.11 saves both load without an inventory migration.
- Stronger gem stats will alter combat difficulty and CP; do not assume preexisting 1.0.11 tier/dungeon balance is numerically unchanged. Run release combat checks before shipping.
- The 2.0 restoration migration, receipts and feature gate remain **staging only and disabled**. They are expressly excluded from this backport.
- This PR targets `main` only after green CI. No live Supabase deployment or remote-config minimum version change is part of this PR.
