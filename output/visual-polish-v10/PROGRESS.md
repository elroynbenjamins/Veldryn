# VELDRYN visual polish v10 — Contextual activity bar

Implemented on 13 September 2026.

- The permanent player header is now compact and keeps only environment, health, gold, and quick navigation.
- Combat and gathering add a separate live activity strip directly beneath the header.
- Idle state renders no activity strip and leaves the reclaimed screen space to the current screen.
- Combat uses the current monster portrait, a restrained red accent, the monster name, elapsed time, and encounter-cycle progress.
- Mining, woodcutting, and fishing use their existing high-quality activity artwork, crystal-cyan accents, the target name, elapsed time, and action-cycle progress.
- The full activity strip is a native button. Combat opens Combat; gathering opens Skills focused on the active skill.
- Content remains native text for accessibility and localization. The supplied transparent artwork is reused without white outlines or baked labels.

Validation completed: full mobile TypeScript check passed; production Android Metro export passed with visual QA disabled and bytecode disabled. The opt-in native fixture supports `topbar-idle` and `topbar-skill` in addition to its default active-combat state. A new Android emulator capture was unavailable in this sandbox because ADB could not create its user configuration directory; the implementation itself was checked through TypeScript and the production bundle.

This cumulative ZIP contains the earlier visual-polish assets and implementation files plus the v10 activity-bar components and integration instructions.
