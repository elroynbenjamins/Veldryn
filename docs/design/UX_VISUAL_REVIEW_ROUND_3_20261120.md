# Veldryn UI review round 3 — repository-art-linked preview
**2026-11-20 · Design-only. UNAPPROVED. NO RUNTIME CHANGE OR MERGE AUTHORIZATION.**

## What was actually completed
- Source-aware standalone HTML review `veldryn_ux_theme_review_v3.html`, provided as a separate chat artifact (not installed, imported, bundled or built into the app).
- Eight illustrative screens: Skills, Inventory, Dungeon, World Boss, Party Event, Character, Rewards Inbox, Theme Settings.
- Current-versus-proposed palette comparison for existing theme IDs `obsidian`/Blackout, `ember`/Ember, `ivory`/Paper Mint. The `current` setting refers to palette anchors, **not authentic current screen layout**.
- Art references point to original `apps/mobile/assets` paths on repository `main`, including `activity-icons-v1/{mining,woodcutting,smithing}.webp`, `class-emblems-v4/icon/ironwarden.webp`, `coop-ui/role_tiles/role_*.png`, `coop-ui/illustrations/forest_thumbnail.webp`, `card-backgrounds/{kingdom_approach_wide_v2,guild_plaza_wide_v2}.webp`, `currency/{gold-coins,expedition-marks}.webp`, `crafted-items-v1/*.webp`, and `ui-icons-v2/*.webp`. Art is linked over GitHub URLs, not copied into the game or confirmed rendered at native sizes.
- Equipment icon sheets and 2.0 slot definitions were deliberately *not* represented as final equipment layouts. The Character preview shows only the current-source 10-slot context, with glyph placeholders, pending separate 2.0 equipment-model alignment.
- All displayed character levels, progress, event names, inventory quantities, attempts and achievements are **example values**, not verified production player data.

## What was tested
Standalone HTML layout inspection with local headless Chromium (HTML loaded into an isolated browser page, image network calls intentionally aborted due environment access). Interactive controls for switching all eight screens, three themes, widths 320/360/390/430 CSS pixels, and text-scale selectors 100/120/140% were checked. The 8 × 4 × 3 × 3 = **288** displayed layouts had zero horizontal overflow in the scroll region and zero page JavaScript errors. Screen-state examples (normal, loading, empty, error) can also be previewed. **These tests are not native app tests and do not certify touch target geometry, font-scale accessibility, color contrast for every element, native keyboard, asset fidelity, or gameplay behavior.**

## Preliminary token-only contrast spot checks (WCAG luminance calculation)
Ratios computed for the prototype palette anchors (panel foreground vs panel) — not runtime compliance.

| Theme | Existing text | Proposed text | Existing muted | Proposed muted | Existing accent | Proposed accent |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Blackout | 16.39:1 | 15.58:1 | 6.83:1 | 8.37:1 | 13.81:1 | 10.60:1 |
| Ember | 16.54:1 | 15.10:1 | 8.36:1 | 7.95:1 | 8.67:1 | 8.75:1 |
| Paper Mint | 15.56:1 | 12.63:1 | 5.23:1 | 5.37:1 | 5.22:1 | 6.48:1 |

No per-theme redesign is approved by these figures.

## Source-aware refinements
1. Skills: keep category sheet and searchable navigator instead of reinstating one or two rows of chips. 2.0 ability mapping must receive a separate functional/spec check.
2. Inventory: retain all four storage destinations and the existing View filter-and-sort sheet; protect selection identity, favourite/lock/New, accidental disposal, bank transfer and bulk operation safety.
3. Dungeon: role and lobby status first; preserve server-owned route-voting, sync and result authority. Prototype combat and example numbers must never be mistaken for verified results.
4. World Boss: make preparation versus weekend battle phase, attempts, eligibility and next permitted action legible. QA preview routes do not imply combat permissions.
5. Party Event: do not conflate the live hub's Overview/Milestones/Party with the separate design QA preview's Adventure/Stages/Supplies/Voting/Finale/Results.
6. Character: no pre-authorization to import 10 equipment slots or today's set bonuses into Equipment 2.0.
7. Rewards Inbox: ensure claim-all server protection and blocked/inventory-full feedback survive any change.
8. Settings: expanded illustrative mini-screen previews may be useful, but saved preferences and theme switching behavior require separate design approval.

## Missing proof before any G1 visual acceptance
- **Native side-by-side screenshots from the actual running React Native build** for all three existing themes, using actual production artwork, at 360 and 390 px at minimum.
- Native state samples for Inventory and Skills; comparison for Dungeon/Echo, World Boss/Party Events including authorization/locked states; a correct Equipment 2.0 slot contract.
- Verify original artwork quality and pixel-safe scaling after actual image assets load. This sandbox's image network access was blocked; local screenshots show fallback symbols, **not the loaded production sprites**.
- 320/360/390/430 plus representative landscape and 100/120/140% font scales; Android keyboard, accessibility semantics, German/Spanish/Russian/Turkish overflow.
- Explicit *per-screen and per-theme* user verdict: accept, change or reject. Silence or “continue” is not approval.

## Hard gate
This is a documentation-only review, not an implementation mandate. Keep PR #1488 as **draft** and unmerged. No app code, assets, UI themes, 2.0 feature flags, backend, player data, builds or releases may change based on this review. Before any runtime implementation: obtain explicit user approval of actual look of UI and all relevant themes; before merge/build: require a further explicit approval after genuine native screenshots and verification.
