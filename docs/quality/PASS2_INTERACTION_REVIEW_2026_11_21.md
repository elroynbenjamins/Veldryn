# Veldryn — Pass 2 interaction-quality review (design-only)

**Status:** Review gate. Do not merge UI runtime changes, redesigns or theme changes before the game owner approves actual visual mockups on both compact phones and Galaxy S24+.

**Boundary:** Target the existing 1.0.11 interface. Do not activate the unified 2.0 systems, modify combat/economy rules, migrate player data, alter purchase/reward receipts or ship this document as a player-facing feature.

## Source-backed observations

| Surface | Verified current implementation | Candidate friction to validate (not a confirmed bug) |
| --- | --- | --- |
| Inventory inspection | `apps/mobile/src/screens/InventoryScreen.tsx` manages inspection amount, item lock/favorite controls, select mode, confirmation and transient action feedback | Interactions may involve multiple competing layers or controls when inspecting and moving an item; test stale selection during network settlement |
| Equipment Pouch | `apps/mobile/src/components/EquipmentPouchPanel.tsx` includes select-safe, select-safe-to-salvage, quick sell, quick salvage, multiple action states and confirmation modals | Selection and batch actions may be visually dense or hard to distinguish; test copy-safe guidance and cancellation |
| Crafting cards | `RecipeCard.tsx` has compact Materials / Stats / Progress details, blocker actions and quantity selection; `CraftQuantitySelector.tsx` has drag, numeric input, +/- and Max | Expanded-card height, keyboard interaction and scroll anchoring still merit a real-device review; retain every material icon and the quiet inline crafting confirmation |
| Reward report | `RewardPopup.tsx` has a compact offline path and optional detail disclosure | Review widths below 384dp while preserving existing ~384dp S24+ appearance; do not duplicate the separately in-flight narrow-phone work |
| Dungeon route and outcome | Existing Q-mode/Live gameplay and reconnect behavior have separate runtime tests; battle results include timeout, wipe and victory reasons | Confirm the UI distinguishes a simulated 180-second combat timeout from real-world replay duration; never describe a timeout as a full-party wipe |

## Visual/interaction proposals to present for approval

### 1. Inventory & Equipment Pouch — highest Pass 2 priority

Prepare **two static/mobile interactive variations** of the exact existing screens, with current inventory resource and rarity art:
- A: Existing compact card, single pinned primary action, secondary actions within one clearly labeled action disclosure.
- B: One contextual action sheet that changes by inspection/selection mode, without extra stacked confirmation dialogs.

Keep the final confirmation for selling/salvaging high-value or selected gear, locked/favorited protection, true exact-copy identity and authoritative Gold/material values. The primary goal is fewer competing controls, not reduced safety. Measure number of taps from inventory to inspect, equip, deposit, and bulk salvage.

### 2. Crafting quantity / card flow

Keep the approved Materials / Stats / Progress tabs and icon-backed material rows. Review slider drag feel (including native back gesture interference), integer keyboard save/blur, long resource lists, disabled actions, and the pinned crafting confirmation. Do not recreate the old double accordion or global Saving modal. Avoid screen jumping after adding a recipe to the queue.

### 3. Dungeon result and recovery feedback

Design a compact status treatment for **Preparing**, **Battle replay**, **Combat timeout**, **Party wipe**, **Victory**, and **Reconnecting**. A boss may time out with players alive and boss HP remaining; surface that reason explicitly and show the simulated timer without implying the player died. Keep dungeon Shop and ? controls and preserve the existing flow's activity/chat rules.

### 4. Offline reward report

Audit 320dp, 360dp and 384dp portrait widths; maintain separate compact behavior only below the approved breakpoint and avoid a global typography shrink. Favor stable card heights, clear totals, inline detail disclosure, and a single coherent next action.

## Acceptance checklist before implementation

- Review actual rendered mockups in at least **320dp / 360dp compact**, **384dp (Galaxy S24+ reference)**, and a wider viewport.
- Provide **light/dark theme** previews where applicable, including rarity and ability contrast.
- Preserve language expansion in German, Spanish, Russian and Turkish; no clipped resource labels or narrow action buttons.
- Keep touch targets comfortably sized; support screen reader button labels and clear disabled/busy feedback.
- Test keyboard open/close, dragging across the entire slider track, horizontal navigation gestures and slow server responses.
- Distinguish no-op, retryable, pending and committed responses without double submission or automatic dismissal of critical errors.
- No change to receipt or reward amounts; no changes to authoritative server calculations.
- Obtain explicit owner approval of screen appearance and theme(s) **before** coding/merging any UI redesign.

## Proposed approval order

1. Inventory item inspector and Equipment Pouch disposal.
2. Crafting recipe/quantity interaction refinements.
3. Dungeon outcome and reconnect status.
4. Offline report narrow-device polish (coordinate with open PR #1546).

**This document is audit/design planning only.** It does not authorize a runtime implementation, deploy or build.
