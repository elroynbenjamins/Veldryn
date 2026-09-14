# VELDRYN visual polish v8 — Event identity

Implemented on 13 September 2026.

- The active and upcoming Harvestwake hero now uses its generated festival crest.
- The crest shares the event-label row, leaving the event title the full phone width.
- The inactive event screen uses the established Events icon instead of a text diamond.
- Event section tabs use a restrained blue selected surface, gold underline, 48dp height, selected-state accessibility semantics, and guarded single-line labels.
- The isolated native review can mount an active event using memory-only state.

The first native capture exposed a poor Harvestwake title wrap. The hero was restructured and recaptured with the full title on one line. Android 35 review at 360dp covers the corrected hero, currencies, command center, next action and tabs. Three final screenshots are included.

The full mobile TypeScript check passed after the initial implementation. During the final retry, concurrent companion work arrived and the workspace check then stopped on `backend/src/server/combat/deterministic-rng.ts` because its active configuration could not resolve `node:crypto`; this pass leaves that unrelated work untouched. Production Android Metro export passed with visual QA disabled and bytecode disabled. The event-specific development bundle and native render completed without application errors.

The cumulative ZIP retains v4–v7 assets, prompts, reports and implementation changes. This is an update for the existing repository, not a standalone game. No event rewards, account state or progression were mutated during review. Physical devices, iOS, enlarged text and spoken screen-reader output remain unverified for this screen.
