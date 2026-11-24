# Veldryn UI audit and visual approval checklist — 2026-11-20
**Read-only code audit. No visual design approved; no implementation authorized.**

## Scope and evidence
Source baseline: `main` commit `45740a19ed7640ff4c7881503b9aa407064b7a4b`. Reviewed `apps/mobile/src/theme/theme.ts`, `ThemeContext.tsx`, `coop-ui-theme.ts`, `components/{GameButton,GameModalSurface,Panel,GameTopBar}.tsx`, and `screens/{Settings,Skills,Inventory,RewardsInbox,FeaturePreview}.tsx`. Static source inspection identifies improvement opportunities, not proven visual defects in running builds. Review a real device before implementing anything.

## Existing strengths to preserve
- Existing three-theme system and Settings theme selection.
- Reusable themed buttons, panels and modal shell.
- 44/48 px touch standards, responsive width/text-scale awareness in Inventory and Rewards Inbox.
- Busy and disabled feedback for core actions; inventory screen's rarity/quality and equipment-delta cues.
- World Boss/Party Event review routes with tabs and event-specific metadata, already present in FeaturePreviewScreen.

## Proposed screen-by-screen **preview**, not implementation
| Priority | Screen / source | Source-informed review target | Preview acceptance test |
|---|---|---|---|
| P0 | Skills / `SkillsScreen.tsx` + 2.0 skills planning | Harmonize mode/filter patterns and reduce wrapping of location/action chips; preserve skill XP, level, tools and gathering/crafting context | Distinguish skill categories, see next useful action, no horizontal overflow at 360px |
| P0 | Inventory / `InventoryScreen.tsx` | Existing 10 named filter options suggest a one-row primary set + optional More sheet; preserve grid density, bulk actions, rarity, bank, new/favorite/locked semantics | Filtering needs <=1 primary chip row, actionable compare/equip and protection states remain visible |
| P0 | Dungeon / `LiveDungeonRunPanel.tsx`, `LiveDungeonQueuePanel.tsx`, `LiveDungeonReadyCheck.tsx` | Keep room/boss layout stable, avoid preview/sync jitter; compact Echo friend/guild selection with role certainty | Boss/room UI does not jump; safe loading preview; role and selected Echo obvious; no deceptive completion feedback |
| P0 | World Boss / `FeaturePreviewScreen.tsx`, `WorldBossPanel.tsx` | Screen is complex with Overview/War Camp/Battle/Rewards/Rankings; surface the current phase and next possible action | Preparation vs weekend battle window unambiguous; attempts and contributions clearly labeled |
| P0 | Party Event / `FeaturePreviewScreen.tsx`, `PartyEventHubPanel.tsx` | Adventure/Stages/Supplies/Voting/Finale/Results nav needs deliberate priority, fewer simultaneous accent treatments | Current stage + shared objective + player action apparent without reading all tabs |
| P1 | Rewards Inbox / `RewardsInboxScreen.tsx` | Preserve pending/history/market filtering, claim-all busy behavior, no accidental claim and error messages | Claimables easy to find, claim-all distinct from history, blocked inventory messages legible |
| P1 | Theme selector / `SettingsScreen.tsx` | Existing choices show only labeled six-color swatches; consider larger representative mini-screen preview before theme commit | Preview shown in all 3 palettes prior to accepting design changes |
| P1 | Character management / existing character UI | Verify compact roster and account-wide character unlock context without adding redundant chips | Switching characters and unlock requirements understandable at 360px |

## Visual validation matrix (execute only during review)
- Themes: Blackout / Ember / Paper Mint; baseline and proposed variant for each.
- Screen widths: 320, 360, 390, 430 px, and one landscape/small-height scenario.
- Text scales: 100%, 120%, 140%.
- States: default, focused, selected, disabled, loading, error, empty, no connection, success, warning, claimable, completed.
- Color checks: body text target 4.5:1, functional non-text elements 3:1 wherever applicable, semantic statuses distinguishable without color.
- Taps: preferred 48 px / minimum 44 px, inspect hitboxes for filter chips, icons, headers and close actions.
- Production art: use original sprites and verify no blurry large-size icon reuse.
- UX integrity: no additional settings options or superfluous navigation, no mistaken reward/combat states, no hidden user control.

## Suggested UX review checklist for future PR descriptions
- [ ] User explicitly approved exact target screen and theme(s); link to approval evidence.
- [ ] Screenshots at 360 and 390 px for all retained theme IDs.
- [ ] Verified 120/140% text size, Android keyboard and safe areas.
- [ ] At most 1 dominant CTA and 1 row of primary filters.
- [ ] No lost rare/class/status/locked/equip/quest semantics.
- [ ] Loading/pending/empty/error states shown.
- [ ] No new backend changes or flags bundled with design PR.
- [ ] Diff and tests reviewed; no merging without explicit separate user approval.

## Review status 2026-11-20
Design tokens documented: **complete**.
Source-informed audit: **complete**.
Live device screenshot verification: **not performed**.
Visual review of candidate palettes: **awaiting user**.
Visual review of each screen using real production sprites: **awaiting user**.
Runtime implementation: **blocked**.
Merge/build: **blocked**.
