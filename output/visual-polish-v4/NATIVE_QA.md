# Native Android review
Environment: existing Android 35 emulator (emulator-5580), Expo Go 2.33.22 and Expo SDK 53 / React Native 0.79.6. Actual native rendering; no browser reconstruction.

Baseline: 720×1280 physical pixels, density 320 (360dp), font_scale 1.0.
Additional checks: 640×1280 at density 320 (320dp), font_scale 1.5; 780×1560 at density 320 (390dp), font_scale 1.0.
The review screen adds a visible QA strip and uses fixed in-memory characters, parties and posts. Values in captures are fixtures, not player progression. The app's normal top bar/footer and changed native components are mounted directly. The QA wrapper adds extra top space; screenshots demonstrate component rendering, not production full-screen safe-area certification.

## Verified interactions and layouts
- Home collection appears before optional rates/details. Long character names wrap.
- Skill labels/progress remain legible at 320dp with 150% text using a single column. Normal phones use two columns.
- Crafting catalogue opens, lower-level outputs come first, recipe expands to material quantity/storage/requirement/action, and the layout remains usable at large text.
- Combat backdrop and both portraits load; estimated versus settled health is labelled. Boss presentation inspected at 360dp.
- Party roster wraps long names and displays class/role art. Guild recruitment wraps its title and metadata.
- Password field accepts dummy text and shows a native secure keyboard. Dragging the account form dismisses the keyboard, as configured, and reveals the create-account controls. Login/create-account mode switches without submission.
- Footer stays above Android's gesture area after added bottom padding. At 150% text, long navigation labels wrap over two lines.

## Repairs found by native testing
- Removed a stray JSX text node in SkillsScreen that triggered a native warning.
- Replaced initial mounting of hundreds of recipes with groups of 12 plus Show more; search still includes every recipe.
- Switched narrow/large-text skill cards to one column.
- Added 24dp Android footer clearance.
- Explicitly filled the account scene's width/height to avoid a strip at the side on wider viewports.
- Replaced older opaque role tiles with shared transparent shield, sun and sword art.

## Reproduce
Set EXPO_PUBLIC_VISUAL_QA=1, EXPO_NO_DOTENV=1, EXPO_PUBLIC_SERVER_GAMEPLAY=0, EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 and EXPO_PUBLIC_SUPABASE_ANON_KEY=visual-review-dummy in a temporary shell. Start Expo on a dedicated port and open it in Expo Go.
The dummy localhost configuration permits rendering the actual account form. No AuthSessionProvider is mounted. Do not submit account operations; form appearance and keyboard behavior can be tested without a real account.
Unset the review flag or set it to 0 for normal builds. __DEV__ also guards the alternate entry.

These checks cover the modified components, not every screen, language, physical device, signed binary, server action or iOS keyboard.

After review, the emulator was restored to its original 720×1280 / density 320 / font_scale 1.0. The QA app and its dedicated Metro server were stopped, and only its 8092 reverse connection was removed.
