# VELDRYN queue reliability and usability audit — 22 Oct 2026

Scope: Action Queue and Home Command Deck queue composer. Core code is shared by the native mobile client and the online gameplay backend; deploying the backend is necessary before the online server uses the changed validation rules.

## Confirmed issues corrected

1. **Already-reached goals.** Previously a queue entry could be created at/below the current skill level or total stored quantity. Added shared `activityQueueGoalIssue` / `activityQueueGoalCurrentValue` and integrated them into `enqueueActivity`, `queuedActivityReadiness` and `queue_set_goal`. Applies to requests from both Skills and Home, including untrusted command input. Current storage is Inventory + Bank + Overflow, matching the existing idle stop-rule evaluator.
2. **Legacy zero-time completion.** Saved old queue entries may already have their target. Preflight now keeps them blocked instead of starting and instantly consuming a queue slot. The player must remove the entry and recreate it at a higher target or use a duration goal.
3. **Invalid Skills planner save.** The Skills queue sheet displayed a reached-goal warning but still allowed submission; this now disables Save. It proposes a goal above current stored quantity by default when opened.
4. **Home queue preset semantics.** `+100 in storage` and `+250 in storage` calculate absolute storage totals from the current number owned. It shows both current and final targets; the safer default remains a duration goal.
5. **Ambiguous stopped activity.** A completed goal, low food/health, or storage rule should not all display `Combat stopped`. The global status now differentiates planned completion, combat recovery, storage attention and unexpected stops. Tapping a stopped global activity goes to Home to collect results; the Food shortcut remains accessible.
6. **Queue paused but unclear remedy.** The Home queue panel offers relevant shortcuts to World (travel), Inventory (food and recovery) or Skills (Alchemy materials), explains stale targets and shows a retryable state when readiness has recovered. Adding more entries no longer silently wipes an existing paused reason.

## Intentional queue rules
- Combat: session defeats or duration; built-in Hunt Goals still supported.
- Gathering & Herbalism: duration, total resource quantity **strictly greater than currently stored**, or skill level **strictly greater than current level**. At maximum level, use duration or storage instead.
- Alchemy: plan at unlocked recipe level, but execution requires Gold and recipe ingredients. Finished reservation can hand off automatically.
- Faith and Exploration: supported by the existing Skills queue planner and core service.
- Forge/Cooking: not supported by Action Queue; remain separate crafting flows.
- The queue does not auto-travel, bypass unlocks, equip food or override storage safeguards.
- **Location:** new combat, gathering and exploration queue entries can only be created while standing in their authored region. Both the Home and Skills planners show only current-region activities; shared online/offline commands enforce the same rule. Faith and Alchemy are region-independent.
- When manual travel makes an existing saved queue activity wrong-region, the queue keeps the activity and shows the destination rather than removing, auto-starting or auto-travelling. Returning to the required region clears obsolete location warnings.
- Regression coverage includes blocked cross-region scheduling (direct/online commands), invalid targets, legacy pending work, safe manual travel away and return.
- Activities queued without a stop condition on the currently running activity **wait** rather than interrupt it.
- Start next remains a deliberate action when no activity is running.
- Pending rewards / skill gains can change the stored baseline after planning. If an older or newly surpassed goal becomes complete before execution, the entry pauses and explains the issue instead of silently transitioning.

## Regression tests added / amended
- Inventory + Bank + Overflow totals, equal/below/current+1 storage goals.
- Current-level, past-level and next-level goals.
- Enforcement in both direct enqueue and trusted `queue_add` / `queue_set_goal`.
- Legacy queued entries at already reached goals block on start.
- Stop cause classification: goal, injury, missing food, storage and unknown cause.
- Existing queue continuation and combat recovery tests retained.

## Test and release checkpoints
- GitHub Action `Mobile queue regression validation` runs mobile typecheck and compiled queue tests independent of the Expo Doctor gate.
- The broader `Mobile core validation` workflow currently stops at Expo Doctor because expo 57.0.29 is below its expected ~57.0.31; this is unrelated to queue behavior and remains to be reconciled with the lockfile.
- Confirm main's latest focused workflow passes, then test on Android (small and large devices), online-staging API, offline cap, bank/inventory transfers while jobs wait, injury recovery and multi-step handoffs.
- Only newer Android builds containing these commits show the new UX; an old AAB does not automatically gain the changes.
