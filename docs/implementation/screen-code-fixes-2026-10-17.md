# Audit fixes — 17 October 2026

Implemented locally following the screen/code audit. Known T5–T9 equipment artwork gaps were excluded at the user's request. Existing equipment assembly timers are unchanged.

## Gameplay and progression

- Finite Alchemy and Faith entries hand off at their actual completion timestamp. Remaining eligible offline time passes to the next activity under the original shared AFK allowance.
- Added regressions for late login, partial claims, split claims, capped claims and repeated settlement. Manually started finite work can also hand off into a waiting queue.
- T8 equipment starts at character level 92 and T9 at 100; crafting floors are 89 and 97. All 1,620 equipment recipes fit within the existing level cap.
- Verdant Binding Resin is available at Alchemy 1 and includes a Rare Asterfall Botanical Essence. Oathglass Solvent uses Ironbloom and regional minerals rather than requiring Herbalism 60. Sunfused/Rimeward recipes align with their first gear tiers.
- Scorpion Venom and Rime Resin are Rare. Their existing 3% effective ordinary-enemy drop chances retain the material-drop reduction.
- Equipment ingredients show the source infusion's Alchemy level.
- Unlocked Alchemy recipes can be queued before materials and Gold are available. Execution still checks requirements. Idle planning with insufficient materials adds a waiting entry without immediately attempting to start it.
- Queue handoff presentation recognizes finite reservations, and the planner recognizes an active gathering activity when setting its current goal.

## Interface and performance

- Registered the missing Alchemy strings and added translations in all six supported languages.
- Alchemy/processing cards say Tap to brew/process and have an immediate synchronous duplicate-tap guard, Starting state and visible error feedback.
- Inventory mutations now return promises from App and keep the blocking progress overlay until the operation resolves or rejects. Unrelated state updates and elapsed timers no longer unlock pending submissions. Custom Gold input is retained on failure.
- Inventory/Bank use a virtualized grid with bounded desktop sizing, responsive columns and saved scroll restoration. Header controls, selection, capacity and footer actions remain available.
- Event announcement body scrolls inside its maximum safe-area height; footer actions remain outside that scroll. The surface grows with its content, paired actions stack when constrained, the CTA uses the actual event name, and common announcement labels/date formatting are localized.
- Bestiary reuses existing enemy portraits, retains a neutral marker for unknown creatures and uses the shared modal for filters. Removed implementation wording and increased the smallest labels in Bestiary and Profile.
- Item and hot recipe lookups use validated ID maps. Crafting caches static recipe groups, indexes stored quantities and skips expensive availability checks for level-locked rows. Gameplay translation callbacks remain stable between language changes so memoized projections can be reused.

## Verification

- All 203 mobile core checks passed.
- Full mobile TypeScript check passed.
- Additional partial/capped offline queue regressions passed after the main run.
- Phone-size browser checks verified the inventory, bank controls, profile and Alchemy planner. An unlocked brew was selectable with no ingredients, with Add to queue rather than an immediate start.
- Deposited and withdrew the guest test character's 100 Gold. Observed the progress overlay during each pending request and confirmed the final balance returned to 100 carried / 0 banked.
- Event announcement inspected at 390×844 and 844×390 viewport overrides: actions remained visible on the short landscape view; the body can scroll.
- No runtime JavaScript errors observed in the checked views. Existing web deprecation/animation and require-cycle warnings remain.
- Focused desktop benchmark, 100,000 item lookups across 2,185 definitions: array scans ~1,812 ms; indexed lookup ~5 ms. This is a lookup microbenchmark, not a claim of equivalent whole-app speedup or a low-end Android measurement.

Screenshots are in `artifacts/audit-fixes-ui/`: event-phone, event-landscape, inventory-phone, profile-phone, bank-transfer-pending and alchemy-queue-phone.

The fresh preview server is on localhost port 8083. Production services were not deployed. Native AAB rendering, physical-device font scaling and mature-account scroll performance still need device testing. The known equipment artwork backlog and lower-priority bespoke event-cache/purse artwork remain outside this pass.
