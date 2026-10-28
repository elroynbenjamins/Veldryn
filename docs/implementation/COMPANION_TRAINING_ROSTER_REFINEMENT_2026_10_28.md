# Companion Training roster refinement — 28 October 2026

**Branch:** `refine/companion-training-roster-20261028`  
**Roadmap ticket:** B03 (owned-first Training roster and filters).  
**Status:** IMPLEMENTED IN REVIEW BRANCH; **not accepted/merged/deployed** and **not yet verified in full app/native UI**.  
**Baseline:** main `cb975ecb0ea5ba85c7aaeb3d8b5b740172a06290`.

## Why this narrowly scoped change

`CompanionTrainingV50Panel.tsx` used a single horizontally scrolling Codex-known roster. Owned, equip-ready, locked and discovered-but-unowned companions were mixed in catalog order and had no role or rarity filter. In a growing collection, returning to an owned unit took extra scrolling. The enclosing `CombatCompanionPanel.tsx` could default to locked `UNIT_001` when the player owned other companions but had none equipped.

## Behavior changed, and deliberately unchanged

- Training's **Change companion** modal defaults to an **Owned** view; its order is **Equipped**, **Favorite**, then stable catalog order for other owned companions.
- **Discover** shows only known-but-unowned Codex entries; unknown identities remain hidden. Explicitly owned companions remain visible even if Codex visibility metadata is missing.
- Role and rarity filters combine, and an empty result explains the filter with a reset action; tabs and chips expose accessible selected states.
- The enclosing companion panel starts on the first owned companion if none is equipped; explicitly selected and equipped companions still take priority.
- The selected companion's original level/Bond, ability, equipment restrictions and server-issued commands are untouched. Filtering never mutates account state, executes a command or unlocks a companion.
- New strings added to the five translated companion catalogues (German, Spanish, Dutch, Italian, French). English is the source key.

## Source changes

- `apps/mobile/src/core/companion-training-roster.ts` — pure generic selector and typed filters.
- `apps/mobile/src/components/CompanionTrainingV50Panel.tsx` — modal tabs, chips, result count, empty state and owned-first data projection.
- `apps/mobile/src/components/CombatCompanionPanel.tsx` — initial own-companion fallback.
- `apps/mobile/src/i18n/companions.ts` — six localized strings.
- `apps/mobile/tests/companion-training-roster.ts` — owned/discover/privacy/priority/filter/non-mutation regression fixtures.
- `tools/mobile-core-tests.json` — include new regression in the existing core suite once the baseline CI blocker is cleared.

## Verification actually performed

- **PASS (isolated):** the exact new pure selector and test files were copied into a temporary scratch directory, compiled with globally installed `tsc 5.8.3 --strict --target ES2022 --module commonjs`, and the emitted test ran under Node 22.16.0. Tests cover ownership priority, role/rarity combinations, undiscovered exclusions, catalog order, and input non-mutation.
- **NOT YET RUN:** full VELDRYN `pnpm typecheck` and `pnpm typecheck:core` on the branch, native Android rendering, five-language screenshot check and entire `test:core` suite. This local scratch check does not prove the full Expo app builds; repository uses TypeScript ~6.0.3.
- **KNOWN BASELINE BLOCKER (A01):** existing `tests/starter-companion-choice.ts` demands a role-aware starter-choice API, persistence fields and command absent from current runtime; this is a **product behavior mismatch**, not a trivial missing-export patch. Existing gameplay automatically unlocks Ironwood Hound on `QST_005` and existing tests rely on that. Do **not** hide the failing test, invent no-op exports or silently change player progression. Decide intended starter policy, then implement fully in a separate reviewed A01 scope.

## Outstanding acceptance and regression tests

1. Repo-native TypeScript6 checks (app and core) and all relevant companion/i18n tests after the A01 blocker is resolved, with known unrelated failures disclosed.
2. Native Android sheet on a narrow phone, large text, light/dark themes, and TalkBack role/rank chip focus.
3. No owned companions, only a single owned companion, 24+ companions, acquired but unknown-in-Codex, favorite+equipped same ID, and a currently selected but unowned Codex entry.
4. Open Training from a Collection selection, from an equipped unit, and from a character with no equipped unit; verify role constraints and upgrade/equip command behavior unchanged.
5. Ensure message keys and placeholders pass the project's five-language completeness/typed translation checks.

**Risk:** UI modal nested horizontal ScrollViews and `key={selection}` in the parent reset filter state after changing the selected companion. This is acceptable for the bounded pass but should be checked on Android and reconsidered if users repeatedly switch with the same filter; don't remove the key without verifying the panel's selection lifecycle.

**Deployment:** None. No database migration or server API changes.  
