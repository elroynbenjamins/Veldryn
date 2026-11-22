# Hidden Combat 2.0 — Exact gameplay/co-op Edge bundle parity repair

**22 Nov 2026.** This documents source parity only; NO production deploy, main merge, SQL or feature activation.

## Root cause verified in GitHub Actions
Before this patch, the authoritative \`tools/build-online.mjs\` regenerated **both** Edge entrypoints with \`liveEdgeCombatV2IsolationPlugin()\` and \`assertLegacyEdgeIsolation\`, as required to avoid shipping experimental Combat 2.0 code into the 1.0.x game. However, \`tools/verify-gameplay-edge.mjs\` rebuilt them **without** the isolation plugin and metadata check. The mismatched compilers necessarily produced different output; for example, its gameplay bundle difference began at byte offset 5080, and the co-op version at 4009. Re-running the generator without correcting the verifier could never make both checks pass.

## Corrected source and evidence
- Both verifier builds now use the **same** legacy V2 isolation plugin, \`metafile:true\`, the existing banner/targets, and \`assertLegacyEdgeIsolation\` before comparing byte-exact outputs.
- The guarded hidden-branch workflow \`.github/workflows/hidden-combat-v2-edge-parity-rebuild.yml\` uses frozen backend/mobile dependencies, the unchanged canonical \`pnpm --dir backend build:online\` source generator, and the corrected verifier. It refuses tracked changes outside \`backend/supabase/functions/{gameplay,coop}/index.ts\`.
- Successful source workflow run **45015607565**, isolated job **137187134564**: generated gameplay 2,895,152 output bytes and co-op 2,303,498 bytes. Both verifier comparisons printed **PASS**; a GitHub Actions bot committed only these two files to the isolated branch, with 2,774 additions/1,824 deletions and no changed gameplay source.
- Branch/PR: \`integration/combat-v2-edge-parity-rebuild-20261122\` / **#1606**, parent **#1377 hidden Combat 2.0 foundation**, NOT \`main\`. These are generated artifacts in version control for a private development branch, **not deployed Edge functions**.
- The post-bot-commit PR status may require a newly authenticated synchronizing commit to rerun requested checks; do not confuse the successful isolated rebuild workflow with an all-green release suite.

## Next gates
1. Exact-head full Skills/Classes, mobile, gem/dungeon and Edge parity after this document-triggered CI.
2. The separate source-owned Equipment trait #1608 branch still needs its legacy Edge shim integration and all 108 class/spec/boss replay checks; adding new engine imports can require a **new** generated bundle revision.
3. Preserve **zero** real V2 API mounts/flags; reconcile imported partner modules and review original-crafter receipts, gem/proc and boss counterplay.
4. Mainline rebase/current 1.0.x feature coexistence, Android, staging transactions, migrations and user-approved UI/theme review before 2.0 launch.
