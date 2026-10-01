# Localization Implementation Pass

## Policy

- Supported languages: English, German, Spanish, Dutch, Italian and French.
- Preserve proper names: classes, abilities, items, places, creatures and named world content.
- Translate UI, explanations, authored descriptions, accessibility labels and feedback.
- Never translate player chat, usernames, guild notices, recruitment text, IDs or command payloads.

## Implemented

- App-wide language context covering startup, character creation and the main game.
- Domain catalogs for account, creation/profile, gameplay, progression, companions and social UI.
- Shared dialogs, navigation, battle descriptions, system notices and artwork accessibility labels.
- Parameter interpolation that preserves inserted names, safe missing-key fallback, and locale-aware dates/numbers. All current `formatGameNumber` UI calls receive the selected language.
- Existing source-contract tests updated where literal English became a translation call; behavioral expectations retained.
- Regression guards against translating technical props and command identifiers.

## Verification

Run from `apps/mobile`:

```sh
npm run test:localization
```

This runs the full app typecheck, catalog/placeholder and technical-boundary checks, foundation tests, and six domain-focused checks. Catalog validation covers 5,838 rows, each with five translations in addition to English; this is not a count of unique phrases or proof of complete UI coverage.

Browser checks used the isolated in-memory preview at `http://localhost:8098/phone`, without account writes:

- Dutch class selection and Skills hub; proper names preserved.
- Dutch queue: unavailable regional skill, duration goal, correct queued activity and wait state.
- German class abilities at 320px, 390px and 1440px; readable wrapping and reachable actions.
- French Skills categories and offline queue results; completed goals and continuing final activity.
- Native-device rendering, production connectivity and live chat were not exercised.

The broader 179-check suite is not fully green. Existing content, asset, progression and encounter-presentation expectations still fail. The encounter omissions were present before this localization pass. Do not remove those assertions to make localization appear release-ready.

## Remaining Work

This is a broad implementation pass, not completed translation everywhere.

- Item ownership, upgrade costs, socket summaries, recipe status/actions, batch costs and mastery bonus fragments now have localized templates. Deeper crafting preparation routes, equipment-set/gem-family descriptions and uncatalogued item passives still have English fallbacks.
- Larger quest, event and regional description catalogs and generated progression guidance need a content pass.
- Social/guild/co-op subpanels and server-generated descriptions/errors remain partly English. See `apps/mobile/tests/localization-social-remaining.json` for the scoped inventory.
- Companion requirements, expedition bonuses, some pet sources, boss effects and progression guidance remain partly English. See `apps/mobile/tests/companions-localization-gaps.json`.
- Already-displayed action notices can retain the language used when created until replaced.
- Native-speaker review and complete device-by-device visual QA remain necessary.

Generate a fresh direct-literal inventory with `node tools/audit-mobile-localization.mjs --details`. It intentionally reports proper-name and abbreviation false positives and cannot certify runtime content completeness. Do not use a global Text interceptor or machine-translate user content to hide gaps.

No deployment, database migration or commit was performed in this pass.

## Crafting and Item Follow-Up

- Added 95 catalog rows for item inspection and recipe details across all six languages. Proper item/region names are inserted verbatim, including Tempering Dust and Tempering Core.
- Inspector descriptions use field-scoped patterns, not a global text interceptor. Regression coverage distinguishes combat drop descriptions from gathering requirements and preserves unknown text.
- Recipe mastery bonuses support combined XP, yield and speed descriptions. Game calculations, availability rules and callbacks remain unchanged.
- Checked Dutch item inspection and German expanded recipe details in the in-memory preview at 320px. Corrected the Dutch socket heading discovered during this check. Native-device QA remains outstanding.
- Screenshot: `apps/mobile/.welcome-preview/localization-german-recipe.png`.
- Full localization suite (including typecheck), equipment enhancement and timed-processing checks pass. The additional `herbalism-alchemy` check stops at its catalog assertion: 11 herb nodes exist while it expects 9. This pass did not change herb content or that assertion.
