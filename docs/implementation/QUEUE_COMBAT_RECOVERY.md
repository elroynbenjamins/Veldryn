# Combat Queue Recovery

Implemented in the shared game engine on 2026-09-27. Not yet deployed to the hosted gameplay function or a distributed client build.

- Injury or a configured food safety stop ends that combat segment without completing its goal.
- The next available queued gathering activity in the current region starts at the actual stop boundary. Unavailable gathering is not started and the queue never travels automatically.
- Blocked combat entries stay queued. A safe gathering entry can run past them without removing them.
- Gathering ignores combat food-reserve rules, but storage safety still stops work.
- When gathering finishes and combat is still blocked, gathering continues instead of leaving the player idle. The summary does not claim all goals were completed.
- Recovery requirements survive save/load. Healing and the configured equipped-food reserve are required before combat resumes; the engine also checks that the next encounter is survivable.
- After returning, the player can heal/restock, then choose **Resume queued combat** in the Skills queue popup. This settles gathering first and starts combat at the current time, never retroactively.
- All segments share the original offline cap. Repeated claims cannot collect capped or already-settled time again.
- A manual stop still stops work. With no valid gathering queued, a combat safety stop leaves the queue paused.

Verification:

```powershell
node tools/run-mobile-tests.mjs queue-combat-recovery queue-continuation activity-queue queue-planner-ui-contract offline-smoke player-badges vip-supporter-entitlements
node apps/mobile/node_modules/typescript/lib/tsc.js -p apps/mobile/tsconfig.json --noEmit
```

The isolated preview at `http://localhost:8098/` has a **Show combat recovery** fixture. It uses sample state only and does not alter accounts or make online gameplay calls.

Badge database rollout is separate and complete on staging/production; see `apps/mobile/assets/player-badges-v1/README.md` for verification and migration-history status. Billing prices and the first billing-enabled AAB remain a separate release step.
