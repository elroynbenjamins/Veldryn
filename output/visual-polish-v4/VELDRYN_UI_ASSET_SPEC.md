# VELDRYN UI asset specification — Visual Polish v4
This is an implementation update for the existing VELDRYN React Native/Expo repository and its earlier UI kits. It adds 14 original illustrated assets and refines shared native components. The existing Core UI, class, event, profile and startup packs remain the foundation.

## New asset inventory
All files are separate RGBA PNGs with genuine transparent alpha. No checkerboard backdrop is shipped.
- activity-icons-v1: combat, mining, woodcutting, fishing, smithing, cooking. Main files are 40×40, @2x 80×80, @3x 120×120. The small/ family is 24×24, @2x 48×48, @3x 72×72. Six families, 36 PNGs.
- crafted-items-v1: copper_ingot, aster_iron_ingot, oathstone_ingot, reinforced_fitting, cooked_silverfin, seared_river_eel, roasted_oathscale, ironwood_stew. Main files are 48×48, @2x 96×96, @3x 144×144. Eight families, 24 PNGs.
- sources/activity and sources/crafted contain the 1254×1254 generation masters. Generation prompts and export audits accompany them. These masters are production source files, not runtime dependencies.
- Existing class emblems supply shield and sun role markers; the new crossed swords supply Damage. All are transparent and share the navy/bronze/gold palette. Guild marks are shared neutral guild emblems, not personalized guild crests.

## Native implementation
Use literal require paths from skill-assets.ts and crafted-item-assets.ts so Metro includes all density siblings. Import ActivityArtwork for activity cards and ItemArtwork for crafting/ingredient art. ItemArtwork resolves material/food PNGs, the existing tool atlas, and equipment art in that order. Unmapped ingredients use an explicit neutral inventory marker.

Use resizeMode="contain" and preserve the square aspect ratio. Main skill art is displayed at 40dp; small role/activity art at 24dp; recipe output at 48dp; ingredient art at 32dp. Touch targets are native controls at least 48dp, independent of decorative icon size. Do not bake text, labels, counts, states, or rarity frames into the art.

Exports were independently downsampled from each master with Lanczos3 and retained alpha. Display supplied density variants at native logical sizes; avoid repeatedly scaling an already reduced PNG. Web pixel artwork can use image-rendering: pixelated. Core React Native Image has no universal nearest-neighbor switch: select density variants and integer layout dimensions, and verify on device instead of assuming a web CSS property applies to native.

## Slices and padding
These 14 additions are standalone icons, not stretchable panels. Their 9-slice margins are not applicable; never stretch or nine-slice them. Keep their transparent canvas padding intact. The original Core UI kit remains the source for 3-slice/9-slice panel/button PNGs and their margins.
Native cards in this update use 12–16dp content padding and rounded native containers. Image content uses contain within fixed wells. Character and enemy portraits share a 128dp presentation area; portrait images retain their natural aspect ratio.

## Layout rules
- Navy/charcoal surfaces, warm gold emphasis, bronze edges and restrained blue interactivity. No white strokes around artwork.
- Use ornament on hero art and focal controls; keep ordinary lists quieter with a single thin edge.
- Shared serif titles convey fantasy; native sans text carries inputs, quantities and longer descriptions. Preserve text scaling and wrapping.
- Skill cards: two columns on typical phones, three at 430dp+ with normal text, one below 360dp when system font scale exceeds 1.25.
- Navigation retains the approved v2 icons. Labels are 12/16dp, two lines when necessary, with increased inactive contrast. Android has 24dp bottom clearance.
- GameTextInput uses symmetric 10dp vertical padding and centered single-line text. Account startup art fills its whole container, including wider phones.
- Recipes begin with lower-level outputs, render 12 per skill group, and expand on demand. Search covers the complete catalogue. Show more adds another 12; this avoids mounting hundreds of image-backed cards at once.
- Home prioritizes current activity and collection before optional details. The encounter preview is explicitly illustrative; no simulated damage is presented as settled gameplay.
- Identity artwork derives from actual class/portrait data. Unknown identity remains generic; never invent ownership or online presence.

## Integration
The workspace already includes these changes. For a different checkout, merge the supplied source snapshots with that checkout's current code. They depend on the existing VELDRYN content modules and earlier asset folders; this ZIP is an update, not a standalone app.
App.tsx now imports PrimaryNavigation and uses:
```tsx
<PrimaryNavigation destinations={primaryTabs} active={activePrimary}
  labelFor={item=>tabLabel(state.settings.language,item)} onNavigate={setTab}/>
```
The actual destinations remain Character, Skills, World, Inventory and More.
App.tsx is deliberately not included as a replacement snapshot because it also contains unrelated ongoing account/gameplay changes.

NativeVisualReview is an opt-in __DEV__ fixture screen selected by EXPO_PUBLIC_VISUAL_QA=1 in index.js. Normal/release builds load App. The review mounts no auth/save provider; use isolated localhost dummy configuration when reviewing the account form and never submit it. See NATIVE_QA.md.
