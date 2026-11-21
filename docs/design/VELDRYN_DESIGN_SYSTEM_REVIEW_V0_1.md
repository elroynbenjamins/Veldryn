# Veldryn UI/UX system — design review v0.1
**Status: UNAPPROVED CONCEPT — DO NOT IMPLEMENT OR MERGE INTO THE REAL APP**

This document is a source-informed design proposal prepared 2026-11-20. It borrows the visual-discipline lessons from the user's UX video (60/30/10 distribution, restrained accents, subtly tinted grays) while preserving Veldryn's pixel-art MMORPG identity. This branch contains design-only documentation; no app, theme, settings, release, or database files may be changed before visual approval.

## Existing design foundation (verified on main at 45740a19)
- `apps/mobile/src/theme/theme.ts`: three shipping theme IDs, `obsidian` displayed as **Blackout** (default), `ember` as **Ember**, `ivory` as **Paper Mint**. Existing `ThemeColors` contract provides background, panels, raised panels, typography, semantic colors, overlays, nav backgrounds, and button tokens.
- `ThemeContext.tsx`: `GameThemeProvider` and `useGameTheme()`; themes already flow through shared components.
- `GameButton.tsx`: themed primary/secondary/danger states, busy/disabled/pressed feedback; shared 44px minimum and 48px preferred touch targets.
- `Panel.tsx`: quiet background surface with accent border only when meaningful.
- `GameModalSurface.tsx`: sheet/dialog/fullscreen variants with keyboard, safe-area, and reduced-motion support.
- `SettingsScreen.tsx`: currently displays three theme choices with six swatches each; player chooses directly in Display settings.
- Spacing: 4, 8, 12, 16, 24; radii: 6, 10, 14; typography caption 12/16, body 14/20, title 19/25, hero 26/33. Co-op UI has its own declared sizing and typography.

## Rules — apply after user approves actual UI
1. **60/30/10 as visual-attention guidance, not a pixel-count law.** Main canvas provides rest; panels provide structure; dominant action should stand out. Bright rarity, status, class and combat telegraph colors are exempt from the decorative accent budget.
2. **Maximum one dominant action per view.** Secondary actions are lower contrast; destructive actions use danger semantics and confirmation.
3. **Subtly tinted neutral surfaces.** Four ordered elevations: canvas < panel < soft surface < raised surface. Borders show structure; glow belongs only to exceptional rewards, events, or meaningful focus.
4. **Accessible meaning.** Never communicate rarity, class, locked status, negative stats, or completion solely through color; combine with icons/text. Maintain target contrast: 4.5:1 for body text, 3:1 for large text and essential controls, with documented exceptions for decorative artwork.
5. **Compact, scannable typography.** Use existing font scale and semantic roles; no gratuitous display fonts. Primary values first, supportive metadata second. Preserve readable number formatting.
6. **One-row primary navigation and filters.** Favor 3–4 frequently-used chips; put remaining filters under a clearly labeled 'More' or filter sheet. No two vertically stacked chip rows unless intentional categorization. Keep a visible selected state.
7. **Responsive and accessible.** Review 320/360/390/430 px; text scale 100/120/140%; portrait + landscape; Android keyboard/safe areas. Minimum hit target 44 px, preferred 48 px. No horizontal page overflow.
8. **Predictable loading and actions.** Use known content previews or reserved-height skeletons instead of layout-jumping spinners. Async buttons disable duplicate dispatch, show pending and retain contextual errors. No fabricated combat/reward outcomes.
9. **Motion hierarchy.** Tap response immediate; brief 120–220 ms state changes, 180–260 ms entrances, faster exits; reduced-motion disables nonessential transitions. Dungeon simulation previews must never imply authoritative server completion.
10. **Fantasy/pixel consistency.** Retain original sprite proportions, rarity outlines, region art, class identity, and equipment silhouettes; do not upscale small icons as blurred hero art. UI design tokens are subordinate to legibility of production art.

## Current themes (facts) vs optional refinements (UNAPPROVED)
| Theme | Current canvas / panel / accent | Optional concept canvas / panel / accent | Intent |
|---|---|---|---|
| Blackout (obsidian) | `#030405` / `#0B0D0F` / `#D5DADD` | `#080D14` / `#111923` / `#E4C48D` | blue-slate surfaces with restrained parchment-gold action |
| Ember (ember) | `#100909` / `#211313` / `#FF9A72` | `#120D0D` / `#211919` / `#E7AD79` | softer charcoal-umber, fewer competing warm accents |
| Paper Mint (ivory) | `#F2F7F4` / `#FFFFFF` / `#287967` | `#F5F5EF` / `#FDFDF8` / `#28684D` | muted parchment-mint, accessible dark text |
These optional values are comparison anchors, not replacement theme contracts. Every supporting token, border, selected state, semantic status, and elevated surface needs actual screenshot approval before implementation. Existing theme IDs and player choices must remain compatible if an approved refinement ships.

## Component contracts to formalize later (not implemented)
- Page shell: safe-area aware, consistent heading hierarchy, status info, activity/notification bars.
- Cards: quiet default with selected, warning, claimable, complete and disabled variants.
- Tab/filter: 1-row primary controls, accessible select state, overflow sheet.
- Primary/secondary/danger buttons: preserve `GameButton` semantics and busy guard.
- Detail sheet: use `GameModalSurface`; keyboard and small-screen layouts tested.
- Inventory tiles: preserve rarity/lock/favorite/new cues, compare and safe disposal actions.
- Event stage bars: meaningful progression states with text/icon meaning independent of palette.
- Skeleton/preview: constant box size, error retry and reduced motion.

## Approval gates (mandatory)
G0 — source-informed inventory/audit and candidate palette published (documentation only).
G1 — **the user reviews visual previews of all themes and representative screens**; capture per-theme acceptance and requested edits. Silence is not approval.
G2 — after explicit user go-ahead, create a separate implementation branch with a scoped screen/theme diff and tests. Never mix unapproved variants into live code.
G3 — show actual app screenshots (production sprites, not wireframes) at required widths and themes; obtain explicit acceptance again if the implemented appearance meaningfully differs.
G4 — only then propose runtime PR merge/build. Do not auto-merge; existing release gate still applies.
**No runtime changes, release flags, migrations, deployment or player-facing experimentation may be bundled with this design-only branch.**

## UI review sequence
Skills hub + 2.0 abilities; Inventory + equipment; Dungeon + Echo selector; World Boss; Party Event; then Rewards Inbox, Settings theme picker, Character management. Review functionality remains independently intact until approved.
