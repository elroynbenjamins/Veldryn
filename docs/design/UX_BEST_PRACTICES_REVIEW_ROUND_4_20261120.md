# Veldryn UI/UX review — Round 4, mobile best-practice quality gate
**Date:** 2026-11-20  
**Status:** UNAPPROVED DESIGN CONCEPT · SOURCE-INFORMED · NO RUNTIME IMPLEMENTATION OR MERGE

## Boundaries
This is a review of existing source, external mobile accessibility guidance, and an **illustrative standalone browser prototype**. No player data is used; sample progression, names, amounts, eligibility and dates in mockups are fictitious. The prototype is not the React Native app, has not been included in an app bundle, and cannot validate native rendering or actual API behavior. The source repo is `elroynbenjamins/Veldryn`, baseline `main` at `45740a19ed7640ff4c7881503b9aa407064b7a4b`.

The user explicitly requires seeing and approving **the actual UI appearance and all affected themes**, followed by separate authorization to implement/merge/build. “Continue” authorizes further design/review work only, not runtime changes.

## Authoritative quality references (guidance, not a claim of app conformance)
- Android Accessibility: https://developer.android.com/guide/topics/ui/accessibility/apps — aim for **48 × 48dp** tappable areas, including compact controls. The prototype uses 48 CSS px as a *browser-only proxy*; native RN hitboxes still need measured verification.
- WCAG 2.2: https://www.w3.org/TR/WCAG22/ — **4.5:1** normal text contrast, **3:1** essential non-text contrast (with the standard's exceptions); semantic status must not rely on color alone.
- NN/g Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/ — focus on the next user action; defer secondary options to existing filters/sheets. Do not hide frequent tasks just to reduce visual density.

## Current-source findings with proposed design-only corrections

| Priority | Location / verified source | Source observation | **Proposed** design acceptance condition |
|---|---|---|---|
| P0 | `components/LiveDungeonRunPanel.tsx` | Several role/name, vote-note and meta text styles are approximately 7–11px, with hard-coded charcoal/gold/teal shades | Increase core readable text; preserve party 1T/2D/1S, route votes and all server outcome boundaries; verify actual 48dp routes across themes |
| P0 | `components/LiveDungeonReadyCheck.tsx` | Several 9–11px labels; `Ready` and `Decline` buttons have padding but no explicit shared minimum-height token | Focus ready countdown, full role labels/participant status and 48dp ready/decline hitboxes; color-blind-accessible readiness |
| P0 | `components/LiveDungeonQueuePanel.tsx` | Some 8–10px labels; custom colors; custom cancellation button | Review queue status, role info, disconnection/error and accessible cancel target; do not imply an automatic successful queue |
| P0 | `screens/FeaturePreviewScreen.tsx` vs `components/{WorldBossPanel,PartyEventHubPanel}.tsx` | Developer QA preview routes and other live-flow panels have **different** sections and permissions | Do not flatten into a fictitious single production destination. Label QA previews and server-controlled state distinctly; phase/eligibility/attempts visible |
| P0 | `screens/InventoryScreen.tsx` | Four storage destinations (Inventory/Bank/Gems/Gear), Search, one `View` filter/sort trigger, Amount, and Select **already exist** | Keep this progressive disclosure; do not introduce duplicate chip rows. Preserve exact-copy identity, New/favorite/lock, bulk protections, error, bank and safe disposal |
| P1 | `screens/SkillsScreen.tsx` | Already has a category sheet, search, segmented skill sections, skill progress/XP | Keep existing navigation model; clarify next action and progress; 2.0 abilities require a separately verified contract, not guessed here |
| P1 | `screens/CharacterScreen.tsx` | Current source shows a 10-slot equipment view plus Enhance/Gems/Sets/Compare | This is **NOT** Equipment 2.0 architecture. Validate the agreed 2.0 slot model before preparing a final character/equipment redesign |
| P1 | `screens/RewardsInboxScreen.tsx` | Pending/History/Market and claim-all server error/inventory block logic | Show unclaimed/blocked/claimed separately; keep duplicate-claim protections |
| P1 | `screens/SettingsScreen.tsx` + `theme/theme.ts` | Three existing themes, with current six-color swatch selector and immediate preview behavior | Review representative mini-screens and all three themes without silently changing the existing player's preferences |

## Proposed visual and interaction system (not yet approved)
- Use 60/30/10 as *attention distribution*, not a strict pixel ratio or ban on semantic status/rarity colors.
- One dominant user action per view, except when two semantically distinct choices are necessary (e.g., Ready / Decline); secondary actions remain discoverable via contextual tabs or sheets.
- At least 48dp target hitbox on Android for tappable app controls. Small icon art may remain visually small if hitbox is properly enlarged.
- Four deliberate surface elevations: canvas / panel / soft surface / raised panel; avoid unnecessary nested boxes and equal-contrast borders.
- At least 12–14px equivalent for essential small labels in concepts as a starting design range; exact native typography needs device-specific testing, localization and dynamic text sizing. Do not reduce core labels to 7–9px to achieve a fixed-height screen.
- Keep informative validation: disabled vs loading vs locked vs confirmed and error vs empty vs offline. Never imply a server outcome from client-side simulation.
- Retain pixel-art sprite proportions, asset clarity, classes, rarities, progress, skill roles, and 2.0 data-model constraints.
- Review at 320/360/390/430 widths, 100/120/140% text scale, Android safe areas, keyboard, landscape, and German/Spanish/Russian/Turkish translations.

## Round 4 standalone prototype
Artifact: `veldryn_ux_theme_review_v4.html` (provided separately in the ChatGPT conversation; **not shipped to GitHub or mobile app**).
- Eight source-informed **concepts**, three existing theme IDs, existing vs optional palette anchors, four widths, three text scales and four example UI states.
- Actual game artwork is **referenced by original public GitHub paths**, but those paths could not be fetched in the isolated test environment. The browser screenshots therefore use fallback symbols; original sprite-size fidelity remains **unverified**.
- Interaction demonstrations: Skills category/search, Inventory View category/amount/storage, Dungeon Echo choice, World Boss tabs with battle-phase restriction, Party Event tabs with locked finale, Rewards Inbox tabs and error retry. None trigger game actions.
- **2,304 checks** (3 themes × 2 palettes × 8 screens × 4 widths × 3 text scales × 4 states) in headless Chromium, with zero horizontal overflow findings, zero active buttons below 48 × 48 CSS px in the scrollable screen content, no missing state copy, and zero JavaScript exceptions. Earlier 320px grid tap-width issue was corrected by adapting to four columns.
- Preliminary foreground/contrast spot-checks (panel pairs), all above 4.5:1 in those samples only:

| Theme palette | Text / panel | Muted / panel | Accent / panel | Primary button text / fill |
| --- | ---: | ---: | ---: | ---: |
| Blackout existing | 16.39 | 6.83 | 13.81 | 14.86 |
| Blackout proposed | 15.58 | 8.37 | 10.60 | 8.80 |
| Ember existing | 16.54 | 8.36 | 8.67 | 9.95 |
| Ember proposed | 15.10 | 7.95 | 8.75 | 9.28 |
| Paper Mint existing | 15.56 | 5.23 | 5.22 | 5.22 |
| Paper Mint proposed | 12.63 | 5.37 | 6.48 | 6.61 |

These tests do **not** establish WCAG compliance or ready-to-ship native UI. No automated testing of TalkBack, real touch targets, true game sprite render quality, safe areas, simulated keyboards, complex server-state transitions, or full locale variants was performed.

## Remaining review and approval process
1. Obtain **authentic running React Native screenshots** using actual Veldryn art for representative Skills/Inventory/Dungeon/World Boss/Party Event/Character/Inbox/Settings screens in Blackout, Ember and Paper Mint. Distinguish current native layout from alternative concept.
2. Check equipment/skills 2.0 contracts and the correct release destination/permissions for boss and party events. Do not assume developer preview screens are the production feature.
3. Run real-device contrast/touch/TalkBack/text-scale/translation checks; verify both baseline and proposed palettes.
4. Show user each actual UI/theme variant. Record **Accept / Revise / Reject** separately. Silence or “continue” is not approval.
5. After explicit visual sign-off, request separate authorization for a scoped runtime implementation PR. Keep it unmerged pending actual screenshots and a final explicit merge/build approval.

**No current app, backend, feature flag, theme, asset, player data, release configuration or build was changed in this round. PR #1488 must remain DRAFT and unmerged.**
