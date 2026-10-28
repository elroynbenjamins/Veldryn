# Companion simple-flow implementation — 28 October 2026

**Status:** Implemented in **draft PR #619** / branch `refine/companion-simple-flow-v1-20261028`, not merged/deployed, **not native-device accepted**. Source baseline `main` `cb975ecb0ea5ba85c7aaeb3d8b5b740172a06290`. See separately proposed [Companion UX redesign specification](https://github.com/elroynbenjamins/Veldryn/blob/design/companion-ux-simplification-20261028/docs/COMPANION_UX_REDESIGN.md) (#618, **design only**).

## Implemented within existing components

1. **Four top-level companion destinations** rather than five: `Roster` (internal `Collection`), `Trials`, `Expeditions`, `Sanctuary`. Full Codex is still a secondary route.
2. **Roster-owned flow**: opens `Owned` by default, compact equipped-assist summary, simplified level/role/rarity tiles, and a tap on an owned tile now displays the existing companion Training, Equip, Bond, Techniques and Ascension controls **in a focused Roster detail view**, with Back. Locked entries still open requirements/detail. The old detailed lore, personal quarters, source lists and progression roadmap remain accessible from a secondary button.
3. **Training focus**: when embedded in Roster, redundant Training intro and second roster picker are hidden using an optional backwards-compatible `showPicker` prop (default true); repetitive explanatory copy on the main Training growth links shortened. Business logic and `onCommand` unchanged.
4. **Trial priority**: formation, explicit suggested-team indicator if the existing recommender has a valid lineup, and Start/Fight are placed **ahead** of the tower/challenges. Tower remains accessible through a disclosure; team editor, season info, boss details, battle playback and rewards are retained. Without an explicit valid team, the current validated suggested lineup is displayed and used when the player chooses Start; nothing is equipped automatically. Server remains authoritative and the normal Start→Fight command distinction is preserved.
5. **Expeditions**: active/ready claims stay first; selected mission, team picker, food summary and Send now appear **before** the optional full mission details/requirements/manual food panel. The duplicated long page introduction is removed; server mission eligibility and resource checks remain intact.
6. **Sanctuary**: long hero introduction removed; daily Training XP and weekly Essence claims remain directly visible, along with supplies/materials and the original five shared facilities/upgrade actions.
7. **Translations**: `Back to roster` and `Edit` added for de/es/nl/it/fr, reusing existing localized Level/Bond labels.

## Exact code files

- `apps/mobile/src/components/CombatCompanionPanel.tsx`
- `apps/mobile/src/components/CompanionTrainingV50Panel.tsx`
- `apps/mobile/src/components/CompanionExpeditionsV50Panel.tsx`
- `apps/mobile/src/i18n/companions.ts`
- `apps/mobile/tests/companion-simple-flow-contract.cjs`
- `tools/mobile-core-tests.json`
- This implementation note and the status entry in `docs/MASTER_DEVELOPMENT_ROADMAP.md`

## Verification evidence and limitations

- **PASS manual source-level contract check:** 10/10 assertions checked directly against GitHub branch source (four tabs; no standalone Training section; owned detail; Trial formation and Start/Fight before tower; existing Trial/Expedition command use; Sanctuary claims). The same invariants are codified in the added CJS regression and registered in the mobile core suite.
- **PASS backend/SQL integrity job** in [Guild Shop validation run #40669175064](https://github.com/elroynbenjamins/Veldryn/actions/runs/40669175064). No backend files or migrations changed.
- **FAILED mobile TypeScript job** on run #40669175064 with **16 errors outside the edited companion components**, related to Guild chat/guild components, missing exports/translation keys and App.tsx chat props. The first run exposed 3 new local style issues `s.between`/`s.ready` in `CombatCompanionPanel`; **these were fixed**, and the later run did not report them. Do not claim the whole app compiled successfully.
- **FAILED mobile core TypeScript** on [run #40669175098](https://github.com/elroynbenjamins/Veldryn/actions/runs/40669175098): pre-existing **11 starter-companion-choice test/type conflicts** (A01). Test runner stops at compilation, so **new CJS contract was not run by GitHub CI**; manual 10/10 source assertions are a narrower check.
- **PASS interactive HTML preview smoke (local Chromium/Playwright):** four screen tabs, Roster→detail and demo Train, Trials Start→Fight→Continue, Expeditions demo Claim, with zero JS exceptions. Source labels/roles are grounded in current code; levels/currencies/actions are explicit demo fixtures, and sprites are **original placeholders**. This validates the *preview only*, not React Native.
- **NOT EXECUTED:** signed Android device UI, native screen readers, interaction timing with server, full Expo build, full mobile tests (blocked), production/staging multiplayer/Trial integration. No DB modifications or production deployment.
- Current preview files were generated for the conversation as `veldryn_companion_flow_preview.html` and `veldryn_companions_four_view_preview.png`; **they are not native app screenshots**.

## Risk / QA before approval

1. **Back and selection:** switching between Collection/Codex/Trial/Expedition/Sanctuary and back should not unexpectedly lose a selected companion; current `key={selection}` may reset Training sheet after selecting an alternate companion. Ensure no inaccessible detail when a roster entry is deleted/refreshed.
2. **Companion role and mission locks:** must preserve same-role character equip restriction; do not expose busy, active-Expedition or active-Trial members as eligible in inappropriate editors.
3. **Trial suggested formation:** ensure the server's `recommendedCompanionTrialTeam` result is always valid under real monthly affinity and availability rules, and that start failure shows exact reason; formation must be conspicuously marked suggested, not silently committed to account.
4. **Resource/claim integrity:** automatic food choices, duplicate requests, monthly rollover, offline progress and Battle event/reward playback remain server-owned; no gameplay code was changed here.
5. **Accessibility/responsiveness:** 320dp short screens, long names, 200% text, TalkBack and reduce-motion need real screenshots, plus Season/Challenge modal behavior, safe-area and keyboard tests.
6. **Visual polish follow-on:** Current Sanctuary facility cards, Companion Training resource comparison and Expedition manual food remain information-dense. Deeper redesign would be a separate PR after device validation, not an assumption that they are now perfect.
7. **Pre-existing blockers:** A01 starter companion mismatch plus mobile/guild compilation failures need independent repair. Do not mask failing checks to “complete” B01/B03.

**Review decision:** Approve layout flow first; rerun full mobile CI after unrelated compilation blockers are resolved; then validate real Android and add UI interaction tests. Keep as draft until those gates pass. No merge/deployment authorized.
