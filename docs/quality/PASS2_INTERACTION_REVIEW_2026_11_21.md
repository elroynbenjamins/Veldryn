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

## Concrete preview — Inventory and Equipment Pouch (Pass 2A)

An **interactive, self-contained HTML mockup** has been prepared for owner review in the ChatGPT conversation. It is a design artifact, not an Expo screen or player-facing code; it uses illustrative low-resolution item symbols while expressly retaining the runtime's existing real equipment/resource artwork and rarity borders.

**Preview matrix (18 configurations):** `320dp`, `360dp`, `384dp` × Blackout / Ember / Paper Mint × Inventory / Equipment Pouch; each configuration compares A and B. HTML JS syntax and all 18 generated preview layouts were checked. This does **not** substitute for native screenshot/Android interaction QA.

### Option A — Compact inspector (recommended for user review)

- Tap item → one coherent bottom inspection surface, lock / favorite / close in a shared header.
- For equipment, show clear stat changes and a **single pinned Compare & equip** primary action; keep **To Bank** next to an optional **More actions** disclosure.
- For a material, show visible amount stepper and a pinned **Deposit to Bank** action; secondary sale stays distinct.
- In Equipment Pouch's compact toolbar, show **Select gear** and optional **Select safe** rather than three competing quick-disposal buttons before selection.
- Selecting multiple copies exposes counts for **selected**, **eligible**, **protected/high-rarity** and gated Sell / Salvage with one explicit destructive confirmation. Exact IDs and eligibility must be revalidated from the authoritative state.

**Reason:** Closest to the current approved equipment-comparison interaction, less relearning, shortest path to moving a gear copy to Bank while still de-emphasizing destructive actions. Estimated *conceptual* interaction count (does not include gameplay server latency): select item + bank = 2 taps; select item + More + Salvage + Confirm = 4 taps.

### Option B — Contextual action sheet

- Tap item → smaller sheet with identity/stat change and one primary action, followed by **Manage item** disclosure.
- Move/Bank/Sell/Salvage are shown only when expanded; destructive actions use one review stage, not nested modals.
- Pouch's first compact toolbar shows one **Manage gear** control, with bulk controls revealed through selection.
- Favored when visual minimalism is more important than frequently used secondary-action speed.

**Trade-off:** Cleaner initial screen than A; moving equipment to Bank takes an extra tap. Potentially harder for players to discover actions. Screen reader disclosure announcements and keyboard behavior require careful review.

### Reference at 384dp

Both preview variants deliberately converge on the **same existing-style layout at 384dp and wider**. Preserve the approved Galaxy S24+ interface. The prototype is **source-informed, not a pixel-exact live device capture**; do not treat it as an approved replacement for the actual current UI.

### Non-negotiable safety and final handoff

- Preserve source `ItemArtwork` / `EquipmentArtwork` asset wiring, set/rarity outlines, exact-copy instance identity, batch selection caps, carried/Bank Gold separation, gem/upgrades destruction warning and the protected-copy rules.
- Keep current `GameButton` pending/disabled guards and the backend idempotent receipt path. Do not auto-accept or send real commands from the prototype.
- Preflight and server-side revalidation for selections are essential: the preview's sample data is not a source of truth.
- Do not change shared theme tokens or 384dp behavior to achieve a compact-layout improvement.
- Before implementation, request explicit approval of **Option A or B** and chosen themes after inspecting the 320/360/384 previews.

**Preview status:** Draft for visual approval only. No runtime UI patch or deployment included.

## Proposed approval order

1. Inventory item inspector and Equipment Pouch disposal.
2. Crafting recipe/quantity interaction refinements.
3. Dungeon outcome and reconnect status.
4. Offline report narrow-device polish (coordinate with open PR #1546).

**This document is audit/design planning only.** It does not authorize a runtime implementation, deploy or build.


## Pass 2A — three further visual-polish iterations (21 Nov 2026)

**Artifact:** Standalone, local interactive HTML review file `veldryn_pass2_inventory_pouch_polished_v3.html` provided in the conversation. HTML does **not** contain live APIs, inventory commands or real player data. It is not committed to the app, since the user must approve rendered UI/theme appearance first.

### Refinement 1 — layout, geometry, and touch zones

- Rebalanced compact 320/360dp preview spacing, source-style buttons, inventory grid, comparison hierarchy and bottom action areas.
- Preserved the same existing-style presentation for both concepts at the **384dp / Galaxy S24+ reference**.
- Normalized key touch targets to **44dp or greater** in the preview wherever possible; avoided increasing screen density by shrinking all text.

### Refinement 2 — interaction semantics and disposal safeguards

- Decoupled both preview phones' state so choosing an item in Option A cannot unexpectedly alter Option B.
- Corrected inspection to use the **actual selected demo item**, its name, its type, quantity, rarity and sample stats rather than a fixed shield.
- Introduced a persistent selection-mode state even when zero items are chosen, explicit Select safe, per-copy lock/favorite states, and capped batch selection.
- Auto-selection excludes Epic/Mythic examples. Manual higher-rarity selection raises an explicit confirmation warning; **equipped** sample gear stays protected even after its separate lock is cleared.
- Replaced fake immediate disposal with one dedicated review step; never modifies actual inventory or currency.

### Refinement 3 — themes, accessibility, interaction QA

- Harmonized Blackout/Ember/Paper Mint contrast, selected states, button focus, toolbar legibility, navigation and action labels.
- Added **Normal / 125% text-size preview**, Escape dismissal, numeric-amount clamping, scrolling preservation during local rerenders and an event-safe quantity edit that avoids the blur/rerender race found in browser QA.
- Browser-rendered and structurally checked **72 phone configurations**: 2 screens × 3 widths (320/360/384dp) × 3 themes × 2 text scales × 2 A/B variations. Separate behavior tests covered item switching, independent A/B state, empty selection, rarity/lock/favorite protection, explicit confirmation, Cancel/Escape, quantity caps and non-live feedback.
- QA result: **0 JavaScript errors; 0 detected horizontal layout-overflow checks** across the matrix. This is prototype QA, **not** native Android screenshots or staging end-to-end testing.

### Owner review recommendation

**Option A** remains the preferred candidate for compact phones because it retains rapid Bank access and one pinned primary action while putting destructive actions under disclosure. **Option B** remains available as a less busy alternative. Preserve S24+ unchanged. Review the actual preview at 320dp, 360dp and 384dp in all three existing themes before approval. No app UI runtime patch is authorized by this document.
