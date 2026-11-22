# World Boss V86 — canonical Gold/wallet parity (22 Nov 2026)

**Hidden development only. No main merge, staging/production migration, public endpoint, event activation, live payout or feature-flag change.**

## Finding

The unreleased V83 guaranteed-reward port locked `public.character_wallets` and `public.online_game_states` on the same V70 transaction. Its Gold credit always updated both to the wallet-derived new total, even if the saved active-character Gold was already stale or corrupted. A paid reward could thereby conceal a pre-existing wallet/state desynchronization.

## Change

- In the Gold guarantee leg, require `game.character.gold` to equal the locked canonical wallet balance **before** applying the reward. Check both as finite, non-negative safe integers.
- On mismatch, raise `world_boss_v83_wallet_state_mismatch` and abort the entire shared V70 transaction. Do not silently reconcile, issue an Inbox history row, write a reward audit or alter the wallet/state.
- Add a synthetic PGlite regression that diverges the saved Gold from the wallet by one Gold, attempts the second chest, checks the mismatch error and confirms no receipt or grant-audit entries, Gold mutation or state reconciliation.
- Restore the fixture before the existing full-storage atomic-rollback, legitimate spending/character-switch, and immutable replay tests.
- Preserve the V85 same-transaction active-character ownership check and three-account-attempt/economy mechanics.

## Required validation before integrating this stacked draft

1. Compile `backend/tsconfig.event-chests.json` and run `backend/tests/world-boss-real-reward-ports-v83.mjs`, V70 settlement and exact-head hidden chest workflow.
2. Reconcile against the newest #1416 consolidated head (parent V85 currently diverged); do not infer that passing against the old base is merge readiness.
3. Review the actual live character Gold sync semantics and account / state ownership schema; test with two independent PostgreSQL 17.6 sessions under real row/advisory locking.
4. Finish trusted Auth transport, V57 privacy/erasure, EQ2 wearable issuance, and full Android QA before any reward unlock.

**Release status: HOLD.**
