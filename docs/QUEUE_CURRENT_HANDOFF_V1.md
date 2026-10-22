# Current Activity Handoff — 30-minute default (22 October 2026)

## What changed
The existing queue did not automatically take over from open-ended Woodcutting, Gathering or Combat. The waiting entries were legitimate, but no stop condition existed for the active job. Idle/offline settlement therefore continued that activity indefinitely (up to the account's AFK cap). The queue only advanced when a goal or compatible idle rule stopped it.

Home → Add to Queue and Skills → Activity Queue now present an explicit **Current Activity Handoff** choice when the current activity has no applicable automatic stop and the first queue entry is being added:

- **After 30 minutes** — default, recommended. Counted from successful command confirmation.
- **After 60 minutes** — alternative.
- **At next skill level** — available in Home when currently gathering and below skill level 100; validated strictly above current level.
- **Keep current activity running** — explicit informed opt-out. The queued job will **not** start automatically unless the player stops the current job or an applicable idle rule triggers.
- The handoff section is omitted when the active job already has an applicable stop (queue goal, Hunt Goal, eligible Idle Rule or naturally finite Alchemy/Faith work), no activity is running, or queued entries already exist.
- For activity types without a custom handoff option, the interface explains that the job must finish or be stopped manually.
- The waiting queue remains below the active activity and shows whether a handoff is armed or blocked.

## Atomic authoritative command
The existing trusted `queue_add` command accepts optional `handoffTargetId` plus `handoffGoal` or explicit `keepCurrentRunning:true`. There is **one** server/offline command, not two separate `queue_set_goal` and `queue_add` operations.

- A handoff goal must reference the exact current active activity ID; stale selections fail.
- The first queue slot must still be empty, and the active activity must need a new handoff. Pre-existing goals and in-progress queues are not overwritten.
- The goal is validated by `currentActivityHandoffGoalIssue`, including kind/target suitability, bounded duration, and strictly future level/resource goals.
- Invalid, locked or full queued entries fail before setting any handoff. Rejected commands do not commit intermediate state.
- The existing activity is **settled at the trusted command clock** before its new duration begins; earned work is retained instead of discarding elapsed XP/resources or counting old time toward the 30 minutes. Combat kills counters reset when a new combat goal begins.
- `queue_set_goal` now shares this goal validation, so manual active goal editing and atomic queue creation use consistent checks.
- Other existing queue-add clients can still submit queue entries without a handoff, for backward compatibility; Home and Skills are the guided paths.
- Cross-region paid handoff behavior remains gated by server-owned VIP/VIP+/Supporter entitlements and a separate opt-in Auto-travel toggle.

## Offline behavior
The queue does not need a running client timer. When the app next settles (locally or via the online gameplay endpoint), the engine simulates the source activity until the stop timestamp and then starts the next ready activity at that timestamp. The same offline cap covers the full chain. No auto-travel or safety checks are bypassed.

## Regression coverage
`apps/mobile/tests/queue-current-handoff.ts` covers:
1. a minute of activity already accrued when user schedules a 30-minute handoff;
2. state persistence and timing across offline return, first and second activity rewards and single-claim idempotence;
3. prevention of an early start at minute 29:59;
4. independent AFK cap across activity transitions;
5. stale active ID, absent activity, invalid targets, unsupported goal types, equal-level goals, full/changed queue and conflicting choices;
6. explicit continue-running behavior;
7. allowed next skill level;
8. trusted command validation and safe atomic rejection.

The queue-focused GitHub Actions workflow runs this alongside the existing premium travel and queue continuation regression suites, core TypeScript compilation and Home/Skills UI contracts.

## Deployment
Requires a new mobile build **and** updated online gameplay backend; verify the backend's active source commit. Android hands-on and online staging verification remain essential before release 1.0.
