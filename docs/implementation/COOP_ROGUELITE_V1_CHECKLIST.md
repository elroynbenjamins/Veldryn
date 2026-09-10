# Co-op Roguelite V1 Implementation Checklist

Feature flag: `coopRogueliteV1` (server default off until release gates pass).

## Existing integration points

- Shared contracts: `backend/src/shared/expedition-types.ts`
- Run creation and routes: `backend/src/server/expeditions/create-run.ts`, `route-generation.ts`, `full-run.ts`
- Deterministic combat: `backend/src/server/combat/engine.ts`, `snapshot-adapter.ts`, `expedition-combat-service.ts`
- Matchmaking, parties and Echoes: `backend/src/server/matchmaking/matchmaker.ts`, `social/party.ts`, `social/echo.ts`
- Chat and rewards: `backend/src/server/chat/send-message.ts`, `expeditions/rewards.ts`
- Persistence: `backend/supabase/migrations/20260831_001` through `_012`
- Mobile entry: current five-tab app under `apps/mobile`; co-op belongs under World.

## Superseded for this feature only

- Flexible one-to-four party starts: co-op requires exactly four distinct accounts/characters.
- Role penalties: co-op uses a hard 1 Tank / 2 Damage / 1 Support invariant.
- Linear 8–13-node routes: co-op visits 4–7 non-boss choices, then one boss.
- Two-card forks and Q-Mode preference voting: every pre-boss choice has at least three real options; the Q-Mode controller chooses.
- Client-supplied stat snapshots and reward parameters: co-op rebuilds snapshots and rewards from authoritative repositories.
- Hybrid fill and a 35% observed-damage cap: neither belongs to this feature.

The separate three-character Squad Arena/Triad Trials modules and their migrations remain unchanged.
