# VELDRYN Pixel UI Kit — v1.0

Core UI, Login, Create Account and Character Creation. This is a reusable production asset library for React Native / Expo. Text, form behavior, validation, navigation and accessibility remain application code. Read `instructions/ASSET_INVENTORY.md` for every filename, native size, inset and padding value; `asset-manifest.json` is the machine-readable equivalent.

## Folder map

| Folder | Contents |
| --- | --- |
| `ui/core` | Large, compact, parchment and modal panels |
| `ui/buttons` | Primary, pressed, secondary, destructive, disabled and icon button housings |
| `ui/navigation` | Selected/unselected tabs and chips |
| `ui/inputs` | Input states, search, dropdown, toggles, checkboxes, slider |
| `ui/progress` | Empty track and XP, HP, activity and loading fills |
| `ui/account` | Login and registration form frames |
| `ui/character` | Class frame, character cards, gender frames, carousel controls and dots |
| `ui/decorations` | Corner fittings and separators |
| `icons` | Character, Skills, World, Inventory, Account, Settings, Search, Filter, Back, Next and dropdown |
| `branding` | VELDRYN wordmark and crystal crest |
| `slices` | Pre-cut 9-slice / horizontal 3-slice components, each with density variants |
| `implementation` | Literal Metro asset registry and reusable React Native rendering examples |
| `preview` | Local browser gallery, contact sheets, assembly and stretch previews |
| `source` | Individual unmodified ImageGen originals, exact prompts and generation records |
| `tools` | Repeatable export, verification and ZIP tools |

## Measurements and export contract

One base PNG pixel is one logical art pixel. The default layout scale is one logical art pixel per dp. Most buttons have a native height of 40; render inside a 48 dp or larger hit area. Do not enlarge border art simply to enlarge the hit area. Each file has `name.png`, `name@2x.png` and `name@3x.png`. The density variants are exact nearest-neighbor 2×/3× expansions of the base image; these suffixes describe pixel density, not different layout dimensions.

Examples: `button_primary_3slice.png` is 144×40; `button_primary_3slice@2x.png` is 288×80 and still has a natural React Native size of 144×40 dp. `icon_character_32.png` is 32×32; render it at 32 dp in a 48 dp touch wrapper. Brand wordmark is 288×96, crest 64×64. Preserve the aspect ratio of fixed assets. Do not downscale the 32 px icon set to 16 px; use a separately authored smaller icon set if needed.

Blank icon-button housings are 48×48, with space for a centered 32 px glyph. Carousel controls are 40×40 and already contain a chevron. Gender frames remain label-neutral and use live text. Decorative corners are supplied in all four orientations.

Exports have actual alpha, hard pixel edges, a transparent perimeter, at most 256 colors per base asset, and no JPEG compression or baked checkerboard. Small assets have a 1 px transparent gutter; other assets have 2 px. Insets and padding include this gutter. Most surface centers are opaque navy or parchment. Character-card centers are transparent to allow portraits behind the frame. A transparent PNG does not imply that its entire center is transparent.

The retained sources are larger ImageGen illustrations. The exporter bounds each individual image using its own alpha, resamples onto the declared pixel grid with nearest-neighbor, snaps generated alpha at 128 for a hard pixel silhouette, and exports a palette without dithering. It never crops assets out of screen mockups. Source images are provenance files; use the delivery PNGs at runtime.

## Nine-slice geometry

Insets use **top, right, bottom, left** in base PNG pixels. For a W×H image and insets T/R/B/L, the protected corners are L×T, R×T, L×B and R×B. The stretchable center is `(W−L−R) × (H−T−B)`. Keep the four corner dimensions fixed. Extend top/bottom rails horizontally and left/right rails vertically. Extend the center in both directions. At art scale S, multiply all fixed corner sizes, insets and padding by S exactly once.

All nine pieces are supplied as `top_left`, `top_center`, `top_right`, `middle_left`, `middle_center`, `middle_right`, `bottom_left`, `bottom_center`, `bottom_right`. They reconstruct the original base image without overlap or gaps. Central surfaces contain subtle artwork shading; stretch these pieces rather than repeating the entire panel image. Do not apply whole-image `contain`, `cover` or `stretch` to a resizable ornate panel.

The inventory's geometry minimum reserves 8 logical pixels of center area. Actual component minimums must also accommodate text, icons and content padding. Larger body text may require taller forms and additional scrolling. Never shrink corner caps to force a panel into a narrow layout.

## Horizontal three-slice geometry

These assets contain `left`, `center`, `right` pieces. Preserve the native height and cap widths; only the center's width changes. Top/bottom insets are zero. Buttons, tabs, chips, thin tracks and fills use this mode. A 144×40 button with 24 px left/right caps has a 96 px stretchable middle. At width 288 dp and scale 1 the caps remain 24 dp; the center becomes 240 dp. To change button height, use an integer art scale or create a separate size variant. Do not independently stretch its vertical axis.

For a wider progress track, extend only the middle. Draw fill inside the track, centered vertically, with a clipping container that reflects progress. At zero, hide the fill. At very low values, clip a full-width fill instead of squeezing its end caps. Clamp progress to 0…1 and round the clip boundary to a physical pixel. Clip both fill artwork and its transparent gutter deliberately. The application provides `accessibilityRole="progressbar"` and numeric values.

## React Native / Expo integration

Copy the whole pack into a dedicated folder such as `apps/mobile/assets/veldryn-ui-v1`, keeping `implementation`, `ui`, `icons`, `branding` and `slices` relative to one another. Import the generated `implementation/assets.ts` registry; it contains literal `require()` calls for Metro. Never use a computed require path. Import only the assets needed by a screen if you later split the registry to reduce its bundle footprint. Original sources, previews and tools do not belong in the application bundle.

`implementation/PixelFrame.tsx` draws the pre-cut pieces on both Android and iOS with fixed caps. It is a rendering primitive: wrap controls with `Pressable`, `TextInput`, labels and real application state. Do not put accessible text into PNGs. The renderer intentionally has no application navigation or authentication logic.

`implementation/PixelInput.tsx` is the single-line input example. The frame owns the 8 dp top/bottom and 28 dp left/right content padding; the editor has zero additional padding, `textAlignVertical: 'center'` and `includeFontPadding: false`. Keep placeholder and entered text in the same native editor. Do not position text with a fixed `top`, translate the baseline downward, or apply the frame padding twice. The example defaults to a 48 dp field and grows with accessibility font scale. It intentionally leaves native line metrics intact for secure text. Multiline editors need a separate top-aligned layout.

For static visuals, center the measured glyph bounds inside the padded content rectangle: `textY = frameY + paddingTop + floor((frameHeight - paddingTop - paddingBottom - glyphHeight) / 2)`. This also centers short password-mask dots. Button, dropdown and gender labels follow the same content-area rule. Native editors retain platform baseline behavior, so validate placeholders, entered text, password masks and larger text on physical devices. The corrected login, registration and character assembly previews demonstrate the intended positioning; they are not device screenshots.

React Native 0.79 documents `Image.capInsets` as **iOS only**. You may use that shortcut on iOS with inventory insets; use the supplied separate pieces for a shared Android/iOS implementation. See [React Native 0.79 Image](https://reactnative.dev/docs/0.79/image#capinsets). Native `resizeMode="stretch"` describes geometry and does not select nearest-neighbor filtering. Do not claim that `resizeMethod="scale"`, `none` or `blurRadius={0}` forces nearest-neighbor.

For crisp delivery, keep art at its native dp size, ship the supplied density variants, use integer art scales, snap outer bounds with `PixelRatio.roundToNearestPixel`, and avoid fractional transforms. Adjacent slice bounds must share the same rounded coordinates to prevent seams. On web use `image-rendering: pixelated` on the actual image elements. React Native's core Image API does not expose a portable nearest-neighbor sampler; strict native nearest-neighbor rendering at arbitrary sizes requires a renderer with explicit nearest sampling, or pre-baked target-size images. The provided PNGs and pre-baked examples are crisp; confirm final sampling on physical Android/iOS targets before shipping. Density handling is described in [React Native Images](https://reactnative.dev/docs/images#static-image-resources).

`tools/bake.mjs` provides the pre-baked option without adding a native dependency. Example: `node tools/bake.mjs button_primary_3slice 288 40 preview/button_288.png`. For a 2× density version of that same 288×40 dp layout: `node tools/bake.mjs button_primary_3slice 576 80 preview/button_288@2x.png 2`. The tool preserves the caps and uses nearest-neighbor for the stretchable pieces. Use a complete base/@2x/@3x family if bundling a baked component in Metro.

## Visual rules

| Role | Reference color | Usage |
| --- | --- | --- |
| Deep ink | `#101521` | Screen backgrounds and dark outlines |
| Navy surface | `#1B2638` | Primary panels and inset surfaces |
| Slate | `#30425A` | Subtle separation and disabled surfaces |
| Bronze shadow | `#584034` | Metal shadows |
| Bronze | `#987044` | Secondary edging |
| Warm gold | `#CEA363` | Primary edging, headings and selected emphasis |
| Gold light | `#F0D49A` | Small highlights and readable display text |
| Deep blue | `#236288` | Interactive enamel |
| Crystal blue | `#4BAED0` | Active/focused interactions |
| Crystal light | `#A2E5ED` | Tiny crystal highlights |
| Parchment | `#E3C894` | Secondary information surfaces |
| Destructive red | `#8F283E` | Destructive action / error accents |

These are design tokens, not a claim that every shaded artwork pixel equals a token. Use token colors for code-rendered text, focus cues and fills. Prefer one ornate outer frame per form; use quieter fields and compact panels inside it. Keep crystal accents for active controls, focus and brand identity. Preserve stepped corners, hard pixel silhouettes and a common top-left light source. Do not add smooth pill outlines, soft blur shadows or busy texture behind body text. Keep ornament out of labels and icons' central reading area.

Maintain the established primary navigation: **Character / Skills / World / Inventory / Account**. The Account icon is a profile medallion; Settings is a gear. Back/Next chevrons are directional glyphs; carousel controls already include a button background. Search/dropdown housings are blank; overlay the separate search and dropdown glyphs. Do not bake the same icon into a field and then overlay another one.

Use a licensed readable UI font already present in the app for body and input text; this pack does not bundle a font. Reserve a pixel/display face for short headings if available. Starting hierarchy: screen titles 24–28 dp, section titles 18–20, button/input text 16, helper text 14. Avoid letter spacing in long body copy. Support text scaling, localization, keyboard navigation and screen readers. On parchment use dark ink; on navy use pale warm text. Verify contrast with the final displayed font and artwork.

## State and screen composition

Primary buttons use blue/gold, secondary actions dark/bronze, destructive actions red, disabled controls muted. Keep live labels and disabled semantics; color alone must never communicate status. Pressed state has a dedicated primary asset; for other controls use a 1 physical-pixel content offset and restrained opacity change without scaling their borders. Selected tabs/chips/gender frames also need accessibility selected state. Error fields need nearby explanatory text. Focus artwork does not replace a real focusable input.

Login: brand wordmark, login frame, live heading, email/password fields, primary sign-in and secondary create-account action. Registration: taller account frame, live fields and checkbox/terms label, primary create-account action. Forms must scroll and avoid the keyboard; authentication providers remain the existing application's responsibility.

Character creation: class-selection frame, character card with an existing game portrait behind its transparent center, Back/Next carousel controls, active/inactive dots, live class name/description, paired gender-selection frames with live labels matching the application's existing options, and primary continue/create action. The frame assets are deliberately label-neutral. Reuse existing canonical classes and character art rather than inventing gameplay content. Keep carousel position and selected class accessible. This first pack supplies the interface chrome; it does not introduce new class portraits or a scene background.

## Verification and provenance

`tools/verify.mjs` checks coverage, filenames, PNG dimensions, alpha, density expansion, checksums, slice bounds, and exact reconstruction. `tools/package.py` writes a ZIP, checks every CRC by reading the archive, and rehashes every member against its on-disk source. `qa` holds results. Inspect every contact page and the stretch/assembly preview, then use the local gallery's light/dark/checker views for transparency inspection.

Art was generated with the built-in ImageGen tool, one individual asset per request. Exact prompts are retained in `source/generation-results.json`; rejected replacements, if any, are documented in `source/ART_REVIEW.md`. No external icon pack, photo or font is included. This document records technical delivery and provenance; it does not claim trademark registration. React Native device runtime and authentication flow integration are separate from the asset export verification performed here.
