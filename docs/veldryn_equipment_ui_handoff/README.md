# VELDRYN — Equipment UI implementation brief

## Status and scope

This is an implementation proposal and reference-component handoff, not a completed frontend patch. Preserve the existing Expo/React Native project, its installed package versions, state management and routing. The uploaded `veldryn_backend_v2.1(1).zip` was inspected; it is a TypeScript backend foundation, not the current mobile frontend. The live frontend repository was not inspected or modified.

The accompanying TSX files are reference components. They accept artwork as props; they do not include production PNGs, fonts, API integration or an app entry point. Run the project's native typecheck and device tests after integration. The screenshots are visual references, not runtime UI textures and not authoritative game-balance data.

## 1. Approved direction: do not redesign

Use these screenshots as layout/style references:

- `veldryn_equipment_original_small_corrections.png` — Equipment.
- `pixelkunst_rpg_inventar_veldryn.png` — Inventory.
- `veldryn_oath_rune_zwaard_vergelijken.png` — Item Detail / comparison.
- `uitrusting_upgraden_voor_veldryn.png` — Equipment Upgrade.

Retain dark navy panels, thin ornate gold borders, gold display headings, blue selected controls, rarity-colored item frames, framed full-character art, readable stat rows, and the approved fantasy pixel-art icons. Do not substitute a new phone-in-a-poster design, generic Material UI styling, emoji icons or the earlier chibi characters.

Exactly five root tabs, in this order:

`Home | Character | World | Inventory | More`

Male/female appearance is chosen during character creation and read from the saved character. There is no male/female control in Equipment, Inventory, Item Detail or Upgrade. Different characters can have different saved appearances.

Render adult-proportioned, front-facing characters from the approved 128×160 logical foundation. Use the same baseline, body scale and class-specific grip/posture across skins. Weapon and offhand must be visible as part of the approved full-character appearance. Do not implement armor-piece paper-doll rendering. Changing a statistical equipment item does not automatically change a body part or its skin; use the existing whole-outfit appearance rules.

## 2. Core approach: native UI with artwork layers

Use normal React Native layout and controls for interactions, text, scrolling, navigation and changing data. Use local PNG artwork for characters, equipment icons, ornamental borders, small motifs and button/frame decoration.

A screen is not one background screenshot with invisible buttons. Each item tile, stat, tab and action remains an independent native component. This supports real inventory contents, localization, larger text and different device widths.

Suggested feature structure (adapt to the repository rather than reorganizing it):

```text
src/ui/veldryn/
  tokens.ts
  assetRegistry.ts
  NineSlicePanel.tsx
  VeldrynHeading.tsx
  VeldrynButton.tsx
  EquipmentSlot.tsx
  StatRow.tsx
  CharacterPreview.tsx
  BottomNavigation.tsx

src/features/equipment/
  EquipmentScreen.tsx
  ItemDetailScreen.tsx
  EquipmentUpgradeScreen.tsx
  EquipmentGrid.tsx
  LoadoutSelector.tsx
  MaterialCostRow.tsx
  GemSocketRow.tsx
  equipmentViewModels.ts
  equipmentActions.ts

src/features/inventory/
  InventoryScreen.tsx
  InventoryFilters.tsx
  InventoryGrid.tsx

assets/ui/veldryn/    # actual exported UI art
assets/characters/   # approved complete appearance art
assets/items/        # unframed item icons
concepts/equipment/  # reference screenshots, never runtime screens
```

## 3. Separate artwork assets from live information

| Element | Artwork | Native/live layer |
|---|---|---|
| Panel | Corner pieces, plain edge strips, optional texture | Padding, size, contents |
| Heading | Small ornaments/divider | Localized title |
| Character | Complete transparent skin image | Saved appearance selection; accessible description |
| Equipment slot | Unframed item PNG and rarity frame | Upgrade number, selection, quantity/status |
| Button | Normal/pressed/disabled background treatment | Text, press handling, busy state |
| Stat row | Stat icon | Localized label and formatted value |
| Upgrade material | Material icon | Owned/required quantities and eligibility |
| Navigation tab | Pixel icon and selected highlight | Route state and label |

Do not bake item names, prices, stats, upgrade ranks, counts or button labels into images. Keep the item art independent from its frame: one sword icon can be rendered with its correct rarity and live rank everywhere.

### Frame implementation

Use eight border pieces plus a center fill (commonly called nine-slice framing). Keep corner ornaments fixed-size. Stretch only plain straight strips along their length; do not stretch patterned edge ornaments or the whole frame. A center texture may be tiled separately if required.

The included `NineSlicePanel.tsx` demonstrates this with eight PNG sources. Export all slices with matching join pixels and consistent logical thickness. Decorative images must not intercept touch input or enter the accessibility tree.

Do not rely on React Native `Image.capInsets` as the Android implementation: the documented prop is iOS-only. An explicit cross-platform slice component avoids that dependency.

### Typography and theme

Reuse the project's semantic color tokens and registered, appropriately licensed fonts. Existing design excerpts establish app background `#10151F`, panel `#192232`, raised panel `#222E42`, primary text `#F3F6FA`, secondary text `#AEB9C8`, and warm gold `#F2C14E` as useful starting references. Reconcile them with the live project's token file before adding overrides.

Use a decorative display face only for short headings; keep labels and numeric rows readable. Do not assume image-generated lettering corresponds to a real font. Live body text is preferable to illegible bitmap imitation. Let text scale and reflow; do not globally disable font scaling to preserve screenshot proportions.

Rarity is a semantic item property, not the same thing as upgrade rank or selection. Use the existing five-tier definitions unless the canonical content has explicitly changed: common, uncommon, rare, epic, legendary. Do not copy the invented Mythic tier from rejected overview images.

## 4. Shared screen composition

```text
Application navigator
  Shared top-level frame / safe areas
  Active tab's screen stack
    EquipmentScreen
      CurrencyHeader
      PageHeading
      ClassIdentityPanel
      EquipmentOverview
        CharacterPreview
        EquipmentGrid (10 slots)
        CharacterStats
      LoadoutSelector
      ActionBar
  Shared BottomNavigation (exactly five tabs)
```

Only one root navigation bar is mounted. Screen components do not manufacture their own tab systems. Use the current navigator and customize its presentation; if Expo Router is already installed, its custom or JavaScript tabs can host the pixel-art tab content. Do not add or migrate a router merely for styling.

Character remains selected for Equipment and an item detail opened from Character. Inventory remains selected when inspecting an item from Inventory. Preserve origin/back-stack behavior instead of choosing the active tab by screen title.

The ten equipment slots are: Helmet, Chest, Legs, Gloves, Boots, Weapon, Off-hand, Cape, Ring, Amulet. Resolve slot IDs through canonical content; do not confuse an offhand relic with an amulet.

Use native ScrollView for short fixed sections. For the potentially large inventory use a single virtualized FlatList with `numColumns`, stable instance keys, an empty state and memoized item tiles. Put filters in its header if they scroll with the grid. Avoid nesting a long vertical inventory list inside another vertical ScrollView. On a column-count change, remount the FlatList with a column-specific key and restore selection; handle scroll-position restoration intentionally.

## 5. Character assets and static registry

Store the saved body/appearance choice separately from statistical equipment. A conceptual view model is:

```ts
type AppearanceChoice = 'male' | 'female';

type CharacterAppearance = Readonly<{
  classId: string;       // existing stable content ID
  skinId: string;        // existing/approved complete outfit ID
  appearance: AppearanceChoice; // saved at creation
}>;

type EquipmentInstance = Readonly<{
  instanceId: string;    // unique owned item, not merely its definition ID
  definitionId: string;
  upgradeRank: number;
  enchantmentId: string | null;
  statGemInstanceId: string | null;
  effectGemInstanceId: string | null;
  locked: boolean;
  bound: boolean;
}>;
```

These are adapter examples, not instructions to replace the real schema.

Metro image paths must be statically resolvable. The registry may be keyed dynamically, but each local `require` uses a literal path:

```ts
// Illustrative filenames: export/reuse actual approved assets before adding these.
const skinArt = {
  CLS_001: {
    runeward: {
      male: require('../../assets/characters/ironwarden/runeward_male.png'),
      female: require('../../assets/characters/ironwarden/runeward_female.png'),
    },
  },
} as const;
```

Do not use `require('../../assets/' + skinId + '.png')`. Resolve missing assets explicitly: development should log or fail the asset audit; production should show an approved same-appearance fallback or a clear placeholder, never silently substitute the other appearance.

The included `CharacterPreview.tsx` accepts one already-resolved source. It has no per-item armor layers and no gender controls. Keep all source canvases equally padded. When atlas packing trims empty pixels, record and restore the original canvas and trim offsets before placing the figure, so changing skins does not move its head, feet or grips.

128×160 describes the logical character-art foundation, not every screenshot's export size. Do not assume a generated high-resolution poster is already an aligned 128×160 sprite. Transparent production assets still need visual QA.

## 6. Pixel rendering and responsive behavior

Preserve the approved overall composition; do not simply shrink a 928-pixel screenshot into a phone width. Establish one measured reference viewport, then use container/window dimensions, safe-area insets and content-driven layout. Proposed QA widths: 360, 390, 412 and 768 logical pixels, plus increased system font sizes.

Use at least 48×48 logical touch targets for the interactive controls in this implementation. Body labels should generally begin around 14–16 logical units, then be checked visually. These are implementation targets, not a claim that all screenshot text already meets them.

Keep the original multi-column arrangement wherever it fits at readable sizes. On narrow screens, move or stack a section only when minimum content widths cannot be met; retain its artwork, order and information hierarchy. Let content scroll instead of forcing the entire poster above the bottom bar. Confirm responsive variants before treating them as approved replacements.

Use `contain` for item/character artwork to avoid cropping a weapon or stretching anatomy. Use appropriately sized local exports with nearest-neighbor scaling during asset preparation. React Native supports density-specific image assets, but fractional display scales can still resample pixel art. PixelRatio controls physical pixel alignment; it is not a nearest-neighbor texture-filter switch. Verify the actual Android build as well as the web preview.

Do not embed decorative backgrounds in every item icon. Reuse a small frame/texture set and keep transparent padding consistent. Do not decode a full screenshot repeatedly for every inventory cell.

## 7. Data and action architecture

Screens should consume view models derived from canonical definitions, owned item instances, saved character state and an action service. Keep formatting and presentation out of authoritative stat calculations.

```text
Canonical class/item/recipe definitions
           +
Owned instances + equipment + saved appearance
           |
           v
Equipment/inventory view-model selectors
           |
           v
Shared native components
           |
           v
Equipment actions / server adapter
           |
           v
Validated response updates the shared state
```

Inspect the existing backend before adding endpoints. The uploaded inventory foundation contains generic item stacks and consumption/grant helpers; it does not by itself establish a complete UI-ready per-instance enhancement model. Reuse any richer model already present in the live project.

Define one action interface for equip, unequip, save loadout, lock/favorite, compare, upgrade, enchant and sockets. A local prototype adapter and later online adapter can share this interface. Do not pretend local results are authoritative in the online game.

For an online upgrade, the client submits the owned instance ID, requested target rank, expected revision and an idempotency/request ID. The server validates ownership, current rank, costs, material balances, account state and limits, then commits atomically and returns the updated item/balances. The client must not submit its own authoritative stat values or trust client-side currency deductions.

The UI exposes idle, submitting, success, stale-data and error states. Disable a purchase/upgrade action while pending; duplicate requests must still be safe server-side. A retry of the same uncertain request uses the same idempotency key. Locked-item destructive actions and binding warnings follow the real policy.

### Comparison

Use `delta = prospectiveValue - currentValue`. Apply the candidate to the current loadout when computing total stats so set bonuses, removed affixes and socket effects are included. Do not assume every positive delta is beneficial (e.g. lower cooldown can be better). Express percentage-point changes separately from relative percentage changes.

### Upgrade readiness

Derive eligibility from the real next-rank recipe and current balances. Aggregate repeated reagent entries before comparing costs. Reject invalid costs, missing recipes, max-rank requests and non-finite values. On insufficiency, show missing quantity and material source; do not enable the action solely because the button art is gold.

## 8. Fix conceptual inconsistencies rather than implementing them

The corrected pictures are art-direction references. Their labels and figures are not fully reconciled with the database.

- The latest item comparison labels the shield-bearing Ironwarden's sword as two-handed. Use the class's canonical sword-plus-shield compatibility, not that caption.
- The upgrade image shows 38/60 of a reagent while displaying an apparently available upgrade button. The live button must be disabled, with a reason, until the actual costs are affordable.
- Some upgrade previews change frame color as though rarity changed. Upgrade rank, rarity and selection are separate states. Do not promote rarity unless a separate canonical system expressly does so.
- `Lv. 60 MAX`, displayed stat totals, set effects, example prices and the pictured enchant payment must not become hardcoded rules. Use the current class, item, progression and economy definitions.
- Do not infer paid combat rolls from an illustrative crystal icon. Use canonical acquisition/payment rules; the art does not authorize new monetization.
- Do not implement the caption suggesting each upgrade automatically changes the whole character appearance. Statistical upgrades and approved full-outfit visual states are separate.
- Bloomwake flowers, Starfall symbols and event currencies should be optional theme/content data, not permanently required on every equipment screen.

## 9. First implementation slice

Complete one Ironwarden Equipment screen before building more views. It must contain the approved full-character portrait with visible sword/shield, the ten functional slots, live basic stats, a usable loadout selector, action controls and the exact five-tab navigation.

First match static sample data to the reference at the chosen viewport. Then connect the existing game state, show correct disabled/error/empty states, and run a visual comparison. Build Inventory, comparison and Upgrade from those same shared primitives only after this baseline is accepted.

The initial asset preparation pass should export or reuse: two approved complete Ironwarden figures for saved male/female choices, character stage/background, gold panel slices, selected/button decoration, five rarity frames, five nav icons, ten slot silhouettes, the relevant item/material icons and required stat/status icons. Actual item quantities determine the complete icon list; do not estimate a fixed total from the mockup.

## 10. Acceptance tests for Codex

1. Exactly Home, Character, World, Inventory, More; correct selected tab and Android back behavior.
2. No appearance toggle after creation; correct saved character in every screen.
3. Same approved adult proportions, posture and baseline; no clipped weapon/offhand.
4. Equipping statistical armor does not invoke paper-doll or runtime image generation.
5. Rarity/frame, item icon, rank and socket/status badges agree between screens.
6. Item copies use unique instance IDs; selection survives ordinary inventory updates.
7. Missing material, max rank, locked item, offline and network failure states are understandable.
8. Busy-state double taps cannot create duplicate online purchases/upgrades.
9. Long names, localized labels, large currency values and larger system text do not overlap controls.
10. At the reference viewport, compare alignment, corner size, spacing, icon scale, typography and avatar bounds against the concept. Mask intentionally dynamic values when using screenshot diffs.
11. Verify Android/native output separately from the web preview; check safe areas and navigation hit regions.
12. Run project typecheck, unit tests and device smoke tests. Record missing assets or mismatches rather than labelling unverified work production-ready.

## 11. Reference components supplied

- `NineSlicePanel.tsx`: border slices plus native center/content.
- `EquipmentSlot.tsx`: item art, rarity frame, live rank, selection, accessibility and press handling.
- `CharacterPreview.tsx`: complete fixed-outfit rendering at a consistent aspect ratio.

These files intentionally receive assets rather than inventing PNG contents. They illustrate the implementation pattern, not a finished visual kit. The selection-border fallback in EquipmentSlot is only a development fallback; use the approved selection artwork for final fidelity.

## 12. Primary technical sources

Consult the documentation for the versions already installed in the project; do not upgrade packages just to match the current online documentation.

- React Native: static assets, literal require paths and density variants — https://reactnative.dev/docs/images
- React Native Image: contain/stretch and iOS-only capInsets — https://reactnative.dev/docs/image
- React Native Pressable: interaction and disabled states — https://reactnative.dev/docs/pressable
- React Native FlatList: virtualized multi-column lists — https://reactnative.dev/docs/flatlist
- React Native useWindowDimensions — https://reactnative.dev/docs/usewindowdimensions
- React Native PixelRatio — https://reactnative.dev/docs/pixelratio
- Expo: custom tab layouts — https://docs.expo.dev/router/advanced/custom-tabs/
- Expo: safe areas — https://docs.expo.dev/develop/user-interface/safe-areas/
- Expo: custom fonts — https://docs.expo.dev/develop/user-interface/fonts/
