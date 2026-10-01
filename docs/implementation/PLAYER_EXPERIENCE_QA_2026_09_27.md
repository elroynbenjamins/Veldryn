# Player experience QA - 2026-09-27

## Scope and result

Local checkout only. No deployment, production account changes, purchases, or database writes.
All 28 selected test suites passed, and the full mobile TypeScript check passed.
This is a focused regression pass, not a full release certification.

## Findings addressed

- Queue labels and goals were truncated on a 390px phone because reorder/remove controls occupied most of the row. Controls now stack below details below 480px; labels and blocking reasons wrap. Verified visually in the local component preview at 390px and at a 320x740 browser viewport.
- Queue waiting text referred only to older Hunt Goal / Idle Rule terminology. It now reports that the current activity has no handoff goal.
- Older source-contract tests assumed always-expanded combat training controls and inline chat social actions. Updated them to check the current disclosure and both full/limited profile placements without changing those screens.
- The activity-transition test assumed a flat 24-hour offline cap and that all released region level gates ended at 25. It now uses account reserve and released content definitions. Independent offline-cap tests still assert the concrete 8/24/30-hour progression.

## New recovery coverage

`apps/mobile/tests/online-recovery.ts` uses an in-memory pending store and mock idempotent server transport. It checks:

- A lost response retains the request ID across repository restart.
- A new action cannot replace an uncertain pending claim.
- Rapid duplicate taps send only one request.
- Failure to persist a retry record prevents sending the request.
- Failure to clear a confirmed record remains safely retryable.
- A response for another account cannot replace current progress.

The mock server proves the client retry protocol, not deployed server receipt behavior or Android process persistence.

## Browser checks

Using the existing isolated sample-data preview at http://localhost:8098/:

- Skills opens the queue popup.
- Mining is disabled in Greenfields with a region explanation.
- Zero-minute duration displays validation and disables submission.
- A valid 180-minute Fishing entry is saved, and reopening shows it in slot 1 of 2.
- Reorder arrows are disabled for a single entry.
- Activity name, duration, state, and controls remain readable at phone widths.

Proof screenshot: `apps/mobile/.welcome-preview/qa-queue-mobile.png` (local preview output, not a production screenshot).

## Reproduce automated pass

From the repository root:

```powershell
node tools/run-mobile-tests.mjs offline-smoke offline-cap startup-summary activity-queue queue-continuation queue-combat-recovery gathering-tools equipment-swap-game-feel save-transfer storage-bank inventory-view timed-processing v40-idle-rule-boundaries v47-launch-readiness online-roster navigation-notifications-v51 player-badges vip-supporter-entitlements commerce-purchase-readiness queue-planner-ui-contract ui-accessibility-responsive-contract ui-interaction-consistency-contract online-gameplay online-recovery first-session-tutorial character-creation-onboarding onboarding-guide-v1 playability
node apps/mobile/node_modules/typescript/lib/tsc.js -p apps/mobile/tsconfig.json --noEmit
```

Coverage includes core reward settlement and caps, safe queue handoffs, gathering tool speed changes, equipment presentation, inventory and bank capacity, timed processing, save import/export, onboarding and tutorial preference persistence, identity/entitlement contracts, and simulated online recovery. Source-contract checks do not establish native rendering or accessibility behavior.

The launch-readiness suite reports an existing warning: rare idle discovery pools remain disabled until canonical unique rewards are authored. This pass did not enable them.

## Remaining device and hosted checks

- Android background/foreground, force-stop/reopen, real network loss, and notification permission/delivery behavior.
- Native keyboard, large system font, screen reader, safe-area and hardware Back behavior.
- Real account creation/login and server command receipt replay against the intended test environment.
- Live social badge refresh across different accounts and expiration.
- Purchase, cancellation, restore and localized prices after the billing-enabled AAB is available through Google Play testing.

Badge migration-history alignment and gameplay/client deployment remain separate from this pass.
