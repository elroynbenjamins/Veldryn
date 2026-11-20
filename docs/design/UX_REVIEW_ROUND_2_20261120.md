# Veldryn UX design review — round 2 (2026-11-20)

> **UNAPPROVED DESIGN REVIEW. DOCUMENTATION ONLY. NO APP, THEME, RELEASE, DATA OR GAMEPLAY IMPLEMENTATION. NO MERGE.**

## Provenance and scope

Read-only source check against `main` at `45740a19ed7640ff4c7881503b9aa407064b7a4b`. Reviewed `apps/mobile/src/theme/theme.ts`, `screens/{Skills,Inventory,Character,RewardsInbox,Settings,FeaturePreview}Screen.tsx`, and `components/{LiveDungeonQueuePanel,LiveDungeonReadyCheck,LiveDungeonRunPanel,WorldBossPanel,PartyEventHubPanel}.tsx`. The comparison prototype is illustrative browser markup, **not** a screenshot of the running React Native app. Numbers, icons and event names in mockups are illustrative. No conclusion below claims that a visual defect has been reproduced on an actual device.

## Specific corrections to avoid regressions

1. **Skills:** `SkillsScreen.tsx` already implements a compact category dropdown + searchable navigator, 5 category labels, segmented sections, level/progress, and a category picker in `GameModalSurface`. The next design should **retain this structure**, not replace it with several rows of chips. A 2.0 ability-system shell requires a *separate* review of skill-to-ability relationships; the current navigation alone does not prove 2.0 integration.
2. **Inventory:** `InventoryScreen.tsx` already presents four storage destinations (Inventory, Bank, Gems, Gear), search, one `View: [filter] · [sort]` trigger, Amount and Select. The View trigger already opens a sheet with sort/category. Do **not** implement a second row of proposed primary filter chips. Preserve multi-select, lock/favorite/New, protection of special stacks, equipment-copy identity, exact selected copy, disposal confirmation, and busy/error feedback. Concept should focus on information density and clarity, not removing functionality.
3. **Character:** `CharacterScreen.tsx` currently renders 10 equipment slots and `Enhance / Gems / Sets / Compare & Swap`. This is evidence of the *current* UI, **not authorization to carry the 10-slot arrangement into Equipment 2.0**. Updated equipment layout must be reviewed against the separately agreed 2.0 model before any approved implementation.
4. **World Boss:** `FeaturePreviewScreen.tsx` already exposes `Overview / War Camp / Battle / Rewards / Rankings` and distinct loading/error/empty/read-only status for server-supplied data; `WorldBossPanel.tsx` represents another live-flow presentation. Do not confuse developer QA examples with live production permissions. In a concept, prioritize phase, eligibility, attempt count, next action, and authenticated response boundaries.
5. **Party Event:** `FeaturePreviewScreen.tsx` has `Adventure / Stages / Supplies / Voting / Finale / Results`; `PartyEventHubPanel.tsx` separately exposes `Overview / Milestones / Party`. Both flows exist. A future redesign must identify which is the release destination before choosing tabs; no premature consolidation.
6. **Dungeons:** `LiveDungeonRunPanel.tsx` has route vote, party role/readiness indicators, a warning, and final-boss context. Its component styles include hard-coded charcoal/gold/teal hex colors rather than applying the global theme tokens everywhere. This is an **audit candidate**, not an approved fix; verify the intended combat-art palette and contrast in all themes. No faux preview may show server-unconfirmed combat results.
7. **Rewards Inbox:** `RewardsInboxScreen.tsx` preserves Pending/History/Market separation and guards claim-all with server responses and inventory-full feedback. Ensure concept keeps those distinctions and does not introduce an unsafe claim shortcut.
8. **Settings:** `SettingsScreen.tsx` currently shows each theme with six swatches; the chosen theme previews immediately and persists through its own callback. A larger representative **preference preview** is a proposal requiring separate UX approval, not a current feature.

## Theme direction — optional, not final

| Theme ID | Existing name | Existing canvas | Proposed canvas | Proposed tone |
| --- | --- | --- | --- | --- |
| `obsidian` | Blackout | `#030405` | `#080D14` | very dark slate, more surface separation, warm restricted focus |
| `ember` | Ember | `#100909` | `#120D0D` | charcoal-umber, reduced orange competition |
| `ivory` | Paper Mint | `#F2F7F4` | `#F5F5EF` | soft parchment/mineral mint and clear typography |

Review **existing and proposed** palettes for each retained theme name/ID. `60/30/10` is a visual attention heuristic, not a forced ratio. Keep rarity, class, quality, resource, positive/negative stats, boss telegraphs and safety states semantically distinguishable. Tint neutrals without drowning production pixel art. The sampled browser palette does **not** establish WCAG conformance of a running screen.

## Round-2 visual package (standalone, not production)

The local HTML concept `veldryn_ux_theme_review_v2.html` lets the reviewer choose:
- 3 existing theme identities, and existing vs proposed palette anchors.
- 8 illustrative screen samples: Skills, Inventory, Dungeon, World Boss, Party Event, Character, Rewards Inbox, Theme Settings.
- 320/360/390/430 px concept viewport widths.
- normal/loading/empty/error example overlays.

**Known limitations**: placeholder glyphs, example values, no real sprites or authentic React Native snapshots, illustrative screen routes, no live backend. A tab or mock button never performs actual game work. Side-by-side and tablet/landscape checks are still needed. The proposal is for hierarchy/density/colors only.

## Detailed approval matrix

| Target | Preserve | Specific visual questions to approve | Evidence still needed |
| --- | --- | --- | --- |
| Skills / Abilities 2.0 | category dropdown; search; skill level+XP | How much ability progression is visible in hub vs detail? Does navigation stay one level deep? | 320–430 px live captures, separate 2.0 ability-spec alignment |
| Inventory / Equipment 2.0 | four destinations, View sheet, amounts, multi-select, safety | Is the summary line compact enough; does equipment selection remain safe? | real equipment art, selected/locked/rarity, error and disposal screenshots |
| Dungeon / Echo | roles and readiness, server-confirmed outcomes, no jumpy room stage | Can player see own role, missing role and active vote without clutter? | lobby, ready, combat, route vote, disconnect and syncing captures |
| World Boss | preparation/battle windows, read-only vs actionable states, rewards | Is the current phase + allowed next action unambiguous? | live vs QA route confirmation; each server phase and failed read capture |
| Party Event | stage, contribution, claim/vote/finale | Does stage progress lead to a permitted action without hiding six QA sections? | resolved feature destination and eligible/locked/finalized samples |
| Character | current equipment controls, stats, comparisons | What is the final 2.0 equipment model? | **2.0 slot specification** before final screen artwork |
| Rewards Inbox | Pending/History/Market, safe claims | Are claimable, blocked and claimed states distinct without color only? | real account screenshots, inventory full and offline |
| Theme Settings | current theme IDs and player preference | Do enlarged previews communicate Blackout/Ember/Paper Mint accurately? | native screenshot of each theme + preview vs saved behavior |

## Round-2 QA cases (required *before* approval)

- Width 320, 360, 390, 430; 100/120/140% text scale; small-height landscape; Android status/system insets and keyboard.
- Semantic surfaces, focus rings, body contrast target 4.5:1; essential non-text target 3:1; icon+text for non-color distinctions.
- Busy, disabled, disconnected, empty, server failed, stale read-only lease, claim-blocked, selected, compact numbers and large numbers.
- Production sprite size, integer/pixel-safe scaling, rarity outlines, all theme IDs.
- Translation stress including DE, ES, RU and TR; no action-label overflow.
- Confirm no new false server state, blocked options, live actions, or changed game rules.

## Decision gate (cannot be bypassed)

- **G0 prepared:** source audit + 3 optional theme directions + standalone v2 concepts.
- **G1 awaiting explicit user feedback:** visually compare all theme directions and all relevant screen layouts; record accept/revise/reject per item. No interpretation of silence as approval.
- **G2 only if G1 approved:** create separate scoped runtime implementation PR and *do not merge*.
- **G3 before merge:** actual rendered React Native screenshots with production art across three themes/required widths; compare to accepted concepts, get explicit approval for any changed appearance.
- **G4 merge/build:** requires separate explicit user authorization after verified tests and diff review.

No app code, database, migrations, theme contract, feature flag, installable package or build configuration may be changed as a result of this doc-only review.
