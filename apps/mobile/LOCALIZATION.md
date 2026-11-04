# Localization status

Selectable languages: English (`en`), German (`de`), Spanish (`es`), Dutch (`nl`), Italian (`it`), French (`fr`), Russian (`ru`), and Turkish (`tr`).

Russian and Turkish are starter-only languages. English remains the fallback for all untranslated copy. Existing DE/ES/NL/IT/FR catalog rows are preserved.

## Implemented

- Typed eight-language catalog with English as the default and fallback language.
- Language selection during character creation and in Settings.
- Localized primary phone navigation, secondary destination titles, back control, More screen, character-creation headings, and Settings section headings.
- Localized critical save-recovery controls, crafting and combat outcomes, live-combat labels, inventory overflow recovery, permanent-skin states, and world/guild chat controls.
- The language preference is stored separately from the main save so a damaged-save recovery screen can still use the player's chosen language.
- Save migration and normalization preserve all eight supported language codes.
- Legacy-catalog validation and save-roundtrip coverage for all selectable languages.

## Current 1.0.6 redesign alignment

- The redesigned Party creation/preferences sheet, Party recruitment editor, Recruitment board, and private friend-invitation sheet use the shared typed social translation catalog rather than English-only buttons and helper text.
- The Cooking/Alchemy workshop now derives player-facing potion effects from current recipe/potion data, and recipe lock/source-help text uses the typed gameplay translation catalog. Dungeon preparation now resolves Russian/Turkish starter phrases through the correct catalog rather than returning English for translated controls.
- Companion unlock requirements, collectible discovery clues, and short Trial effect labels are now translated across all eight selectable languages. The companion QA gap snapshot retains 42 untranslated challenge/objective descriptions, which are still explicitly tracked instead of silently counted as complete.
- The five established translations (DE, ES, NL, IT, FR) have authored copy for these active flows. RU and TR have starter coverage for the same important actions; untranslated material continues to fall back to English.
- All eight UI languages can be selected as Party *communication preferences*. These preferences must not restrict joining a Party. The corresponding database change is in `backend/supabase/migrations/20261104121600_party_language_preferences_eight_locales.sql` and requires database deployment for backend acceptance.
- Existing catalog entries for legacy Social/Party flows are retained where they may still be referenced by history, saved shortcuts, tests or server-provided state. Do not delete by name alone; verify active call sites before pruning.
- Chat channel choices (for example English, Spanish and global rooms) are separate from the UI language and should not be changed simply because new interface locales were added.

## Still required before localization is release-complete

- Translate gameplay screens, content descriptions, item/class/quest data, dialogs, validation messages, online/chat surfaces, and accessibility hints.
- Perform native-speaker linguistic review for every non-English catalog.
- Test text expansion, wrapping, screen-reader pronunciation, and truncation on narrow phones.

Until a string is moved into the catalog, the app intentionally displays its existing English copy. The Settings copy states this limitation so a selectable language is not mistaken for complete translation coverage.
