# VELDRYN — paid cross-region Action Queue v1

Implemented October 22, 2026 in mobile shared gameplay code.

## Player benefit
- VIP, VIP+ and Supporter each independently unlock planning Action Queue work in other **previously unlocked** regions.
- Free: current-region queue only, no automated cross-region handoff.
- Existing queue capacity remains independent (VIP+ retains +1 waiting slot).
- Faith/Alchemy are not tied to a world region. Crafting/Forge and cooking still use their separate systems.
- Paid cross-region permission is **not** a region unlock, activity unlock, combat power bonus, extra AFK capacity or extra queue slot.

## Interaction
- Home Add to Queue and Skills Queue planner offer region choices only for paid accounts, filtered by `regionTravelAvailability`. The current region always remains available.
- Remote content must individually be unlocked (enemy unlocks, gathering skill level, exploration skill/character level).
- Queue panel continues to show each regional item's region and readiness; the player can manually navigate to World when travel is needed.
- Gameplay Settings offers **Auto-travel between queued activities**. It is off by default and disabled without an eligible paid entitlement.
- A VIP/Supporter can still plan remote work with auto-travel off. Such work waits for manual travel or for the player to enable the setting; it does **not** auto-start remotely.
- Turning the setting off never drops already scheduled entries.

## Authoritative execution
- Shared `activityQueueSchedulingIssue` enforces the paid + region unlock + content unlock gates when `queue_add` runs. This path executes on the online backend and offline prototype.
- Shared `queuedActivityReadiness` enforces entitlement **again at every handoff**, as well as the auto-travel preference and all existing safety prerequisites.
- Only after a successful readiness check does `tryStartNextQueuedActivity` change `currentRegionId`, at the exact source-completion timestamp. No call to manual `travelToRegion` is made from automatic queue progression.
- The offline claim cap remains one shared allowance across all queued jobs.
- Combat safety fallback does **not** auto-travel; no auto-travel on injured/out-of-food/storage safety stops.
- Expired/cancelled Supporter without another eligible entitlement cannot cross-region hand off, regardless of a persisted true setting. Queue entry is preserved for manual travel. VIP or VIP+ retain the entitlement independently.
- Manual travel continues to settle and stop ongoing work, keeps the queue saved and checks whether the next job is ready.

## Automated regression coverage
`apps/mobile/tests/queue-premium-travel.ts` covers all three tiers, manual toggle, late claim and split claim, sequential region changes, unlock gating, subscription expiry, combat safety, save/setting normalization and AFK cap.
`apps/mobile/tests/queue-planner-ui-contract.ts` checks both planners and the guarded Settings toggle.
The focused workflow `.github/workflows/mobile-queue-regression.yml` runs native typechecking, core compilation, premium gameplay regression tests and UI contracts.

## Before releasing 1.0
- Deploy the updated online gameplay backend, not just the mobile app. Confirm commerce entitlements are refreshed from the existing server purchase validation path before remote handoffs.
- Staging/manual QA: free and all paid tiers, Supporter expiry/refund, unlocked vs locked regions, no food, low HP, full storage, missing Alchemy ingredients, handoff while offline, multi-hop offline cap, app restart, reconnect / stale state conflict, toggling auto-travel with waiting remote work.
- The general `Mobile core validation` workflow may remain blocked at Expo Doctor until the Expo SDK patch in the lockfile matches the expected patch; this is separate from the focused queue suite.

**Deliberate non-goals:** no automatic region unlock, no automated manual travel through the World screen, no journey animation, no spending premium currency for travel, and no player-selected queue cross-region activity without a paid grant.
