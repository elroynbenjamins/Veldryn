# Localization status

Release target: English (`en`), German (`de`), Spanish (`es`), Dutch (`nl`), Italian (`it`), and French (`fr`).

## Implemented

- Typed six-language catalog with English as the default and fallback language.
- Language selection during character creation and in Settings.
- Localized primary phone navigation, secondary destination titles, back control, More screen, character-creation headings, and Settings section headings.
- Localized critical save-recovery controls, crafting and combat outcomes, live-combat labels, inventory overflow recovery, permanent-skin states, and world/guild chat controls.
- The language preference is stored separately from the main save so a damaged-save recovery screen can still use the player's chosen language.
- Save migration and normalization preserve all six supported language codes.
- Catalog-completeness and save-roundtrip coverage in the core test suite.

## Still required before localization is release-complete

- Translate gameplay screens, content descriptions, item/class/quest data, dialogs, validation messages, online/chat surfaces, and accessibility hints.
- Perform native-speaker linguistic review for every non-English catalog.
- Test text expansion, wrapping, screen-reader pronunciation, and truncation on narrow phones.

Until a string is moved into the catalog, the app intentionally displays its existing English copy. The Settings copy states this limitation so a selectable language is not mistaken for complete translation coverage.
