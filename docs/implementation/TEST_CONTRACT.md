# Offline MVP Test Contract

Core regression tests must cover:
1. Save creation, serialization, loading and migration.
2. Rejecting unsupported future save versions.
3. Offline elapsed-time cap uses the save's effective AFK Reserve from `apps/mobile/src/core/game.ts` (currently 8h base / 24h free progression / 30h total maximum). Test over-cap catch-up, repeated claims at the same timestamp, and a later claim earning only newly elapsed time; discarded excess must not become a claimable backlog.
4. XP/level boundaries including level 25.
5. Deterministic combat rewards for a fixed seed/time interval.
6. Inventory stacking/capacity behavior.
7. Equip/unequip and derived combat power.
8. Sell/salvage preserving item quantities and currencies.
9. Gathering offline claims.
10. Crafting ingredient/gold consumption and output.
11. Quest unlock/progress/claim idempotency.
12. Fallen Knight eligibility and first-defeat state.
13. Settings defaults including chat auto-open=false when chat is introduced.
