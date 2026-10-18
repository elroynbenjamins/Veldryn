# Guild raid encounter presentation

Implemented the approved raid concept in the live guild PvE UI without changing damage, unlocks, attempt budgets, durations, claim requirements or server endpoints.

## Presentation

- Raid Gate heading and separate weekly/event selectors replace stacked encounter cards.
- Existing bundled regional backgrounds and boss art form a bounded full-width encounter scene.
- Remaining-health meter, accessible HP value and remaining HP label use the same value. Contribution is still damage dealt, not HP remaining.
- Actual character class and equipped companion artwork appear beside the attempt action. The historical companion remains separate in the resolved summary.
- A clear three-minute attempt action respects the existing server-derived eligibility. Pending attempts count down locally, then display resolving until authoritative refresh.
- Mechanics, difficulty and attempt cadence remain accessible through an expandable detail section.
- Milestone claims and separate guild-event cosmetics are preserved. Player and companion damage summaries retain authoritative values.
- New control labels have all six supported translations.

## Review and refinements

The first browser review caught natural-size background overflow into the content. Stage clipping and explicit image dimensions corrected it. Reviewed the revised weekly forest and seasonal ruins scenes at phone sizes; retained dark image captions for readability in all themes. Tested narrow German text with the light theme (321 CSS pixels) and found no horizontal overflow.

## Verification

- Full 203-check mobile core suite passed after the presentation change.
- Full mobile TypeScript check passed.
- Added and ran source contracts for the selected encounter, bounded scene, HP semantics, real party art, gated action, countdown cleanup, expandable details and authoritative summary.
- Isolated browser fixture verified weekly/event switching, actual artwork, player/companion summary, pending countdown and disabled repeat attempts, guild-level lock, exhausted attempts, expired encounter, and claim-to-claimed transition. No production attempts or rewards were consumed.
- Screenshots: `artifacts/guild-raid-concept/weekly-phone.png`, `event-phone.png`, `attempt-summary.png`.
- Normal local app restarted on port 8083; isolated raid fixture on 8084. These are local previews, not a deployment or AAB build.

## Event rewards concepts

Produced separate interactive Reward trail and Collectible showcase concepts. Recommended the trail for clear claimed/ready/next progression, with guild rewards kept in the Raid Gate. Reward names, reputation amounts and icons in the concepts are illustrative; the event rewards screen and balance were not changed.

Native/AAB rendering, physical-device font scaling and real online raid settlement remain outside this presentation-only verification.
