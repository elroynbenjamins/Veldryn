# v20 Settlement / Integration Wiring

## Live Dungeon queue

The authenticated API validates ownership of the chosen character/loadout, then server-calculates:

- role eligibility
- Tank/Support role score
- level
- power index
- content access

Only then is a queue ticket created. Never accept role, power index or Tank/Support role score as authoritative mobile values.

## Match reservation

The matchmaking worker queries a bounded candidate window partitioned by content and role, applies `selectLiveDungeonMatch`, then atomically reserves current live-dungeon account slots and match rows before creating the ready check/run. The authoritative worker must renew the account-slot lease while the account remains queued, in ready-check, or in an active/recovering run.

## Ready check

Client response -> authenticated API -> `commit_live_dungeon_ready_response_server`. All four clients may submit against the same ready-check `state_version`; individual Ready clicks do **not** advance that generation. Only server state transitions/replacement cycles advance the match version. Duplicate retries of the same response are idempotent. Timeout resolution is worker/server-driven. A failed ready check returns accepted members to queue priority and replaces/removes only the decline/timeout member. Replacement matching must use the actual party/reference combat level.

## Combat/run events

Existing combat remains authoritative. v20 adds a run event stream with idempotency keys for route/node/mechanic state. Do not make the mobile client the source of truth for damage, deaths, participation or boss state.

## Route vote

Client -> API validates run membership -> `current live-dungeon vote window API/RPC`. The server resolves unanimous/majority/tie rules and appends a run event plus a checkpoint when the next node is committed.

## Reconnect

Reconnect uses authenticated account identity plus the current active run membership. Do not trust a raw run ID as authorization. Load the latest checkpoint/event sequence and return only the account's allowed run view.

## Checkpoint

Call `current live-dungeon recovery/checkpoint transaction` only after the node transition transaction/domain settlement is committed. Checksum should be generated from a canonical server serialization.

## Reward completion

Final completion should:

1. atomically mark run completed if not already terminal;
2. calculate eligibility from server telemetry;
3. create idempotent reward receipt(s);
4. call the existing economy/reward-bundle grant service;
5. record success/failure without issuing a second reward on retry.

## Sunscar content

Register `sunscar-region-v20.ts` and `sunscar-dungeons-v20.ts` through the versioned region-content registry. If your current local project has newer content IDs, map rather than overwrite. The bundle includes Echo-condition, relic-source and Pet/Companion unlock hooks in addition to zones/enemies/bosses/resources/quests/dungeons.

Do not import existing draft Sunscar gear rows from the design workbook as final equipment. Their reward references should map to materials/relics/cosmetics/generic gear hooks until the equipment rework.
