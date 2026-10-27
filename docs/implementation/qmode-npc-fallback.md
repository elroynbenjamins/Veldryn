# Q-Mode NPC fallback and My Echo sharing

## Why
At the time of investigation, production had 0 opt-in Echo profiles and 0 persisted co-op loadouts. Real Echoes are voluntary, require a ready level-15+ kit, and expire after 24 hours. Empty populations must not strand players in Q-Mode.

## How it works
- The authenticated co-op server derives the controller's gear and requested tier, validates the player's normal readiness and level, and fetches genuine eligible donor Echoes.
- Existing real Echo eligibility rules (24-hour freshness, opt-in, account/character uniqueness, block lists, matching content revision, and unique Damage class) are preserved.
- For each missing seat, Q-Mode selects a server-defined NPC with bounded role-reference stats, real class abilities, and the same normalization/readiness pipeline.
- The roster stays 1 Tank / 2 Damage (different classes) / 1 Support. NPCs use stable `npc:qmode:<CLASS>` identifiers only in the private combat state. No auth user or player character is created.
- The SQL start RPC persists only the controller and any genuine Echo donors to `expedition_run_members`. NPC kits are in the private run and a redacted NPC public projection. They cannot receive player rewards or donor assistance currency.
- The existing human and real Echo entitlement settlement paths remain unchanged; the controller still earns their normal Q-Mode rewards.
- Q-Mode run projections expose `kind: 'npc'` distinct from `kind: 'echo'`. New mobile builds render an NPC pill.
- Live matchmaking and the four-human ready-check roster are untouched.

## Existing Echo sharing (not a separate equipment editor)
Dungeons → My Echo · Current equipment → Share my current Echo.

The server snapshots the currently worn equipment/class/abilities with the live game-state revision. It requires character level 15+, legal gear and a ready co-op role. Players can update by publishing their changed current kit, or stop sharing. This is **not** a persistent secondary loadout/editor; adding independently equipped Echo slots requires a separate design and server-backed inventory validation.

## Deployment order
1. Merge the tested code after backend online compilation and SQL regression checks. Do not auto-deploy a mismatched Edge Function.
2. Apply `20261104000000_qmode_npc_fallback.sql` to staging and run Q-Mode/claim checks; then production after approval. It preserves the previous RPC signature.
3. Regenerate bundled `backend/supabase/functions/coop/index.ts` from `pnpm --dir backend build:online`. Deploy the generated `coop` Edge Function; verify empty-pool, partial real-Echo, full real-Echo, replay, node completion, and rewards.
4. Existing 1.0.1 clients may accept the new projection as a normal companion; shipping the visible NPC tags and improved sharing screen requires a later Android release.
5. Never lower the production required app version as a workaround.

## Regression checks
- `pnpm --dir backend test:coop-composition`
- `pnpm --dir backend typecheck:online`
- `pnpm --dir backend test:online`
- `pnpm --dir apps/mobile typecheck` (main currently has unrelated starter-companion type errors)
- SQL function declaration can be checked using a transaction on staging followed by ROLLBACK.
- Repeat with genuine Echo donors to verify opt-in, blocked donors, expired loadouts, unique classes and assistance entitlements.

## Rollback
Redeploy the prior version of the co-op Edge Function first, then restore the preceding definition of `start_online_qmode_server_v1` if necessary. NPC-only Q-Mode private snapshots must remain readable for existing in-progress runs until concluded.
