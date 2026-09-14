# VELDRYN UI audit and refinement — 12 September 2026

This pass reviewed the source and shared component usage of all 17 screen files. Selected components were also reviewed in a browser companion at 320 and 390 pixels, including 150% text. This was not a walkthrough of the running native app.

## Completed refinements

- One shared icon registry covers all 13 quick-navigation destinations. Skills has its own crossed-tools symbol; Account uses its account crest; Events has a newly generated calendar/crystal icon instead of the quest scroll.
- Reused the approved Character, Skills, World, Inventory, Account, Settings, Search, Filter, Back and Next PNG families. Preserved the existing Home, Quests and social symbols. The shared registry contains 18 symbols.
- Account destinations now use full-width rows, visible descriptions and trailing chevrons.
- Shared panels and co-op panels use quiet single borders and softer corners. Gold remains in artwork and meaningful accents.
- Shared button labels wrap rather than truncate. Added loading/focus support and selected-state announcements to inventory, journal, friends, skills and settings choices.
- Shared fields enforce at least 48 dp height, balanced top/bottom padding and centered single-line text. Multiline fields align at the top and have at least 104 dp of room; larger backup fields retain their larger minimum.
- Search fields in Inventory, Quests, World encounters, Friends and Recruitment use the same search symbol, focus treatment and clear action.
- Confirmation text scrolls within a bounded dialog; Cancel and Confirm remain outside that scrolling area.
- Friend search shows its empty result only after a completed search, ignores results for an outdated query and shows initial loading explicitly.
- Progress bars handle zero, negative and non-finite totals without invalid widths and expose progress semantics.
- Shared heading/body weights are lighter, with more line spacing. No new typeface dependency was introduced.

## Screen coverage

| Screen | Review outcome |
| --- | --- |
| CharacterScreen | Shared panel/button typography and confirmation improvements; existing equipment and profile artwork retained. |
| ClassSelectScreen | Reviewed the already-refined arched hero carousel, upgraded class emblems and centered name field; preserved that design. |
| HomeScreen | Shared panels/buttons and robust accessible stat bars. |
| SkillsScreen | Correct navigation symbol, selected choices, softer panels and wrapping requirements. Existing tool/resource art retained. |
| WorldScreen | Shared presentation plus consistent encounter search; map/environment art retained. |
| InventoryScreen | Search/clear control, selected filters and sorting, cleaner empty state, scrolling destructive confirmation. |
| QuestScreen | Search/clear control, selected journal filter, robust progress display. |
| CombatScreen | Shared actions, panels and stat bars; combat logic and artwork retained. |
| MoreScreen | Replaced cramped tiles with readable destination rows and consistent icons. |
| EventScreen | Dedicated Events navigation icon and shared presentation; canonical event themes and existing reward/profile art retained. |
| FriendsScreen | Loading, completed-search empty state, stale-query protection, search field and friendship action label. |
| GuildScreen | Shared controls and fields through guild directory/chat components; existing guild behavior retained. |
| SocialScreen | Recruitment/search/party-chat field consistency and shared controls; no social operations executed during review. |
| SettingsScreen | Shared title hierarchy, selected controls, account fields and save-transfer fields. |
| CoopExpeditionScreen | Softer shared co-op panel/button/tile radii and typography; role/node/boon art retained. |
| CoopUiGalleryScreen | Inherits the same co-op presentation tokens and panel refinements. |
| ChatPilotDevScreen | Reviewed as a development-only gallery; kept its established asset registry and isolated component system. |

## Assets and remaining verification

The main navigation has complete icon coverage for its current destinations. Existing class heroes/emblems, profile/event decorations and three startup scenes cover this pass; additional decorative art was not needed to fix these UI issues.

Validation: full mobile TypeScript check; Android Metro JavaScript export with bytecode disabled for validation; 33 exported PNG files checked for dimensions and alpha; 18 registry imports resolved; nine progress edge cases; browser companion checks at 320/390 pixels and 150% text, including search clearing and long-dialog scrolling.

A native Android/iOS device pass remains necessary for the final keyboard, font metrics, OS text scaling and screen-reader experience. The HTML/PNG reviews are explicitly companion layouts, not screenshots of native screens. No native binary or Hermes bytecode build is claimed.

Implementation is already in the workspace. The accompanying ZIP is an icon/documentation addendum, not a replacement application or a patch containing the unrelated ongoing work in this repository.
