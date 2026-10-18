# Event and Guild board UI

Implemented the approved quest-screen visual direction using existing artwork and theme tokens.

## Event

- Shared index tabs, compact non-overview banner, and wrapping currency balances.
- A single-column shop catalogue with All / Collectibles / Supplies filters, correct reward kinds, purchase limits, level requirements, and currency-specific shortfalls.
- Inspect expands an inline description and explicit purchase action. Pending purchases and activity claims use the existing command/settlement path and busy guard.
- Weekly activities use pinned postings, objective artwork, shared progress bars, ready/claimed states, and existing activity navigation callbacks.

## Guild

- Activities separates Quests, Muster and Projects. All existing primary Guild destinations and chat badges remain available.
- Quest postings distinguish shared progress from personal contribution, retain completion/Activity transition feedback, and disclose objective breakdowns.
- Projects use pinned postings with a separate disclosure control, keeping claim actions outside the disclosure button.
- The Activity meter uses a true 0–100 scale with milestone ticks; reserve is labelled separately. Weekly Rally now displays Rally progress rather than Activity progress.
- Hall separates Facilities, Skills and Trophies. Facility cards show the next tier, required Hall level and remaining Project progress.
- Local Guild Skills use the shared authored skill definitions and show active bonuses, next-rank effects, bank readiness and an explicit cost review before the existing spend handler runs.

## Live data boundary

The current live Hall projection contains facilities and trophies, but no live skill allocations, shared skill bank balances, allocation command or upgrade audit history. Its Skills tab is an interactive guide with no fabricated ranks or spend action. Actual cost review/spending is wired to the existing local Guild Skills path. Trophies use the real Hall projection; no synthetic upgrade history was added.

## Refinement pass

After rendering the first pass, made shop category filters quieter than primary navigation, darkened catalogue surfaces, added explicit Inspect labels, increased dense Guild metadata sizes, added Activity milestone ticks and consolidated upgrade cost definitions. Reused existing pixel artwork throughout.

## Validation

- Full mobile TypeScript check.
- Existing event, reward trail, Guild Hall, Muster, project/chat, Guild management and released-event regression tests.
- Browser checks at 320 and 390 pixels across Blackout, Ember and Paper Mint: 24 base layouts plus 24 event activity/shop/reward and expanded upgrade layouts.
- Memory-only interaction checks: purchase settlement and sold-out state, currency shortfalls, catalogue filtering, activity claims, rejected purchases preserving balances/limits, objective/project disclosure, upgrade effects/point/bank settlement, insufficient materials, member permissions and unknown live allocations.
- Preview entry: `EXPO_PUBLIC_VISUAL_QA=1`, `EXPO_PUBLIC_VISUAL_QA_SCREEN=boards`. `BoardExperienceReview` is development-only and sends no online mutations.

Native device verification remains outstanding.

## Additional refinement

- Added an optional Can afford filter that respects currency type, purchase limits and level requirements, with a recoverable empty state.
- Shop previews now show Balance / Cost / After (or Missing), use the button's asynchronous pending feedback and label purchased one-time collectibles Owned.
- Combined catalogue metadata to reduce row height and made Inspect a quieter secondary affordance.
- Compact Guild Activity now prioritizes the meter and next milestone. An accessible disclosure retains member scaling, decay protection and all milestone descriptions; reserve remains visible.
- Upgrade confirmation hides the branch browser and active-bonus summary to keep the resource review and confirmation action together.
- Event banners identify the current section and show multi-day deadlines in days and hours.
- Rechecked TypeScript, six existing event/UI regression tests and 24 refined layouts at 320/390 pixels across all three themes. Browser interaction checks covered affordability filtering, empty-state recovery, balance preview, purchase/Owned transitions and Guild Activity disclosure.

## Density and hierarchy pass

- Reduced non-overview event banners to 92px and tightened section spacing. Categories and the affordability toggle now share a wrapping control row with 44px minimum touch targets; the offer count stays visible below.
- Removed the extra outer Guild Quest frame and the boxed personal contribution surface. Rarity joins the quest metadata, completion remains explicit, and the summary combines completion and earned Activity.
- Shortened the Activities banner and compact Activity meter while retaining their text, milestone disclosure and reserve information.
- Upgrade review keeps Confirm as the primary button and uses a quieter, keyboard-accessible Cancel action with a 44px minimum target.
- Added an optional `shell=1` memory preview using the actual GameTopBar and PrimaryNavigation. Its secondary back row is a preview stand-in; the Guild fixture still uses a reduced destination set, so this does not replace full-app/native validation.
- Validation: full TypeScript check and six existing event/UI regression checks passed. Eighteen browser layouts at 320/390 CSS pixels across three themes had no horizontal overflow; changed controls retained their minimum targets. Checked Activity details, category/affordability filtering, enabled purchase review and cancellation restoring upgrade browsing. No browser console errors appeared.
- Evidence: `output/event-shop-density-shell.png`, `output/guild-board-density-shell.png`, `output/guild-upgrade-density-shell.png`. Physical-device and OS enlarged-text validation remain outstanding.
