# Screen and code audit — 17 October 2026

Scope: source-level inventory of all 34 mobile screen modules, inspection of shared UI, inventory submission, recipe/gear progression, offline queue settlement and artwork resolvers. Executed the full 203-entry mobile core check list and full mobile TypeScript check. This is not a native-device visual sign-off, a production database audit, or an exhaustive proof of every code path. No gameplay implementation changes were made during this review.

## Verification

- Core compilation succeeded. 202 of 203 checks passed. The normal fail-fast runner passed 162 checks before the event-popup contract failed; all remaining 40 checks were then run separately and passed.
- Full mobile typecheck failed with six TS2345 errors, all from recently added text passed to the typed gameplay translator.
- Runtime reproduction confirmed that a queued one-minute Alchemy batch claimed after ten minutes starts Woodcutting at the ten-minute login boundary, instead of the one-minute completion boundary.
- Runtime progression check: both XP-to-level functions cap at 100; 180 equipment recipes require a character or skill level above 100.
- Registered equipment sprites: 80 of 162 catalog sets, corresponding to 800 of 1,620 catalog pieces. All T1–T4 sets are mapped. T5 has 4/18, T6 2/18, T7 2/18, T8 0/18 and T9 0/18.
- Resource/gem/tool resolver sweep found no catalog non-gear items without a recognized visual route. This checks mappings, not pixel quality or successful native painting.
- Logs: `artifacts/screen-code-audit-core.log`, `artifacts/screen-code-audit-remaining.log`, `artifacts/screen-code-audit-typecheck.log`.

## Priority findings

### P1 — Recent Alchemy UI fails full typecheck

`apps/mobile/src/components/ActivityQueuePlanner.tsx:86` and `:94`; `apps/mobile/src/components/RecipeCard.tsx:53` and `:58`.

Six strings are absent from the typed gameplay translation catalog: the continuous-brew description, Start brewing, Start continuous brewing, Start continuous processing, Hide recipe details and Show recipe details. Focused core compilation does not typecheck these screen components. Register and translate the messages, then require both core and full mobile checks for UI changes.

### P1 — T9 equipment cannot be reached through ordinary progression

`apps/mobile/src/content/equipment-recipes-v33.ts:63`; `apps/mobile/src/core/progression.ts:17`.

T9's character floor is 110 and crafting floor 104, while XP leveling ends at 100. All 180 T9 recipes are unreachable. The generated recipe also requires at least character level minus three for the crafting skill. Choose one consistent level model across progression, equipment requirements, unlock copy and source projections; a source existing somewhere is insufficient to prove it is reachable at the intended tier.

### P1 — Timed queue handoffs discard eligible offline time

`apps/mobile/src/core/game.ts:263`, `:666`, `:679` and outer settlement loop at `:621`.

Faith/Alchemy finish branches start the next entry using the requested claim time. Their reward does not mark a completion boundary for the outer loop to continue processing. Reproduction: one Dewleaf brew starts at 1,000,000 ms, takes 60 seconds and is claimed at 1,600,000 ms. Woodcutting starts at 1,600,000 ms and receives no progress for the intervening nine minutes. Settle at the actual completion timestamp, carry the remaining allowance into subsequent entries, and retain one shared AFK cap. Add a late-login regression, not only a claim exactly at completion.

### P2 — New infusion prerequisites are poorly aligned with their equipment tiers

`apps/mobile/src/content/alchemy.ts:50`; `apps/mobile/src/content/herbalism.ts:28`; `apps/mobile/src/content/equipment-recipes-v33.ts:40`.

T1 gear now requires Alchemy 5 despite starting at character level 2 / primary profession level 1. T3 and T4 require Oathglass Solvent, which consumes Oathblossom unlocked at Herbalism 60, despite their character floors being 26 and 40. This substantially raises the practical entry cost beyond what the equipment screen's primary skill gate communicates. Audit the complete dependency graph against each tier's intended level range and show secondary profession requirements clearly.

### P2 — Scarcity and rarity of new reagent inputs do not fully match the request

`apps/mobile/src/content/items.ts:104`, `:108`; `apps/mobile/src/content/alchemy.ts:50`.

Scorpion Venom and Rime Resin still have Uncommon item rarity. Their added authored 6% monster chance becomes 3% after the existing material-drop reduction. Verdant Binding Resin is labeled Rare but uses only common inputs and no rare botanical essence. Decide scarcity from actual acquisition rates and quantities, then align item rarity and recipe copy with that decision. Existing rare regional botanical essences are a possible controlled ingredient source without inventing more resource identities.

### P2 — 82 equipment sets still fall back to generic markers

`apps/mobile/src/theme/equipment-assets.ts`; `apps/mobile/src/components/ItemArtwork.tsx:20`.

Missing registered sets by tier:

| Tier | Registered / total | Missing pieces |
| --- | ---: | ---: |
| T1–T4 | 72 / 72 | 0 |
| T5 | 4 / 18 | 140 |
| T6 | 2 / 18 | 160 |
| T7 | 2 / 18 | 160 |
| T8 | 0 / 18 | 180 |
| T9 | 0 / 18 | 180 |

Prioritize the remaining T5 classes, then T6/T7, followed by T8/T9. Verify whether suitable art already exists before generating replacements. The current coverage helper and test validate registered sheets but do not flag the catalog sets absent from the mapping. Report both registered-sheet integrity and total catalog coverage.

### P2 — Event announcement retains small-height clipping risk

`apps/mobile/src/components/EventStartPopup.tsx:35` and `:40`.

The current content-sized surface fixes the previous phone blank space, but has a fixed 238px hero, hidden overflow and no scrollable body. On short landscape windows or enlarged text, the combined content can exceed the constrained dialog. Make the body scroll within available safe-area height and keep actions outside the scroll. The CTA also hardcodes Open Veilbreak even though the component resolves arbitrary live-event definitions, and the announcement strings are not localized.

The failing contract at `apps/mobile/tests/ui-accessibility-responsive-contract.ts:149` requires the old forced 94% height and growing content. That assertion encodes the layout that caused the reported blank space. Replace it with behavior-oriented checks for content sizing, overflow handling and reachable actions rather than restoring the old layout to satisfy the test.

### P2 — Inventory loading does not track the actual request lifetime

`apps/mobile/src/screens/InventoryScreen.tsx:82`, `:85`; `apps/mobile/App.tsx:596`.

The local busy guard clears on any state update or after a twelve-second timer, while action props return void and App discards the request promise. It therefore cannot distinguish a completed transfer from an unrelated state update, a failed request, or a slow request still in flight. The server has its own save guard, so this finding is about misleading UI state and attempted duplicate submissions rather than proof of duplicate server mutations. Return and await action promises, clear busy in finally, and retain the synchronous ref lock against rapid taps.

## Refinements and optimization candidates

- **Bestiary:** discovered enemy cards omit portraits even though combat already has reusable portrait components. Add those existing visuals; reserve a silhouette for unknown entries. Remove implementation-oriented player copy such as canonical projections. Source: `apps/mobile/src/screens/BestiaryScreen.tsx:25`.
- **Readability:** Profile stat labels are 7.5px; Bestiary material-use labels are 7px. Raise secondary text size, reduce simultaneous metadata and test large font scaling. These are source-level concerns; the current native appearance has not been measured in this review.
- **Recipe cost computation:** `CraftingRecipeBrowser` computes readiness for every matching recipe before slicing rendered rows. Cache static recipe groups and indexes, separate cheap lock checks from inventory checks, and profile this work before changing behavior.
- **Catalog lookup:** `itemDef` scans a 2,185-item array on each call. A validated immutable ID map removes repeated scans in inventory, rewards and crafting. Similar recipe and monster indexes can share this approach.
- **Large bank rendering:** Inventory uses `ScrollView` plus `stacks.map`, mounting every tile. A virtualized grid is a candidate for mature accounts with large banks; measure scroll and rerender costs on a lower-end Android device first.
- **Shared modal behavior:** Bestiary and several other panels still use custom modal scaffolding while newer panels use `GameModalSurface`. Consolidate safe-area, keyboard, dismissal and footer behavior as those panels are revised.
- **Alchemy affordance:** tapping Ready to brew now immediately spends/reserves resources, but its text still reads as a status. Use explicit Tap to brew / Brewing labels and an immediate busy state, retaining the separate details target.
- **Queue planning:** Alchemy readiness requires current materials and Gold before an entry can be queued. This limits planning a brew after a gathering entry that would supply its ingredients. Consider allowing unlocked recipes to be scheduled while showing a start-time requirements warning, and keep authoritative checks at handoff.
- **Event shop art:** some reward kinds deliberately use generic currency/companion/reward symbols. Improve specific cache/purse art after the missing equipment art backlog; titled and currency rewards do not need arbitrary new illustrations.

## Screen inventory

All 34 screen modules were included in the source inventory. Highest-depth inspection targeted the shared paths implicated by current screenshots and recent changes; the inventory itself is not a claim of manual interaction with every screen.

- Progression: Home, Character, Skills, Combat, World, Quest, AdventurersJournal, MasteryHall, Bestiary.
- Inventory and account progression: Inventory, AccountBonuses, DailySupplies, ActivityOverview, ClassSelect.
- Identity and collections: Profile, ProfileCustomize, Collections, PetBonusOverview, Companions, Achievements.
- Social and multiplayer: Social, Friends, Guild, CoopExpedition, Rankings, WorldMilestoneFeed, RewardsInbox.
- Seasonal and service screens: Event, Store, Settings, More, Arena.
- Internal tooling: AdminQa, CoopUiGallery.

Arena and several World/Guild facilities are intentionally marked unreleased. These are release-scope decisions, not automatically broken implementations. Physical phone checks remain necessary for landscape, enlarged text, keyboard-open sheets, loading/error transitions and long translated labels. Production online deployment/database behavior was not exercised.

## Recommended order

1. Resolve the six translation errors and stale popup contract.
2. Fix finite-activity offline handoff timestamps and test late claims.
3. Reconcile T9 level caps and infusion dependency levels.
4. Tie inventory loading to confirmed request completion and address short-height modal overflow.
5. Fill T5–T7 art gaps and reuse portraits in Bestiary.
6. Profile mature-bank and crafting screens, then apply indexes and virtualization where the measurements justify them.
