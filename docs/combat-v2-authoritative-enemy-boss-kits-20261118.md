# VELDRYN 2.0 — single-authority Enemy and Boss kit composer
**18 November 2026 · Draft Classes/Skills 2.0 integration · not a release**

## Integration accomplished

Two separate unfinished systems previously modified enemies: the Classes/Skills draft appended a generic eight-archetype combat ability (and one generic boss phase), while the Enemies/Bosses draft generated randomized regional traits and six bespoke boss profiles. Applying both compilers in sequence would duplicate enemy abilities, produce conflicting phase timing, or give a boss a generic phase on top of its authored regional mechanics.

This change introduces **one new optional persisted authored-kit path** inside the already-hidden full Equipment+Classes 2.0 encounter compiler. The original Classes 2.0 default path remains available for its existing isolated tests; no production or legacy code imports the new path.

### One compiler per opponent

For newly authorized solo 2.0 encounters:

- Normal and elite opponents use the already authored seeded enemy-trait engine (nine implemented traits out of the 18 planned). Elite enemies receive up to two compatible traits at T3+; normal enemies receive at most one. Unrolled enemies keep their base abilities, not a second generic V2 ability.
- Handcrafted bosses use their **regional** source profile, never the generic "Pressure Shift" or normal/elite trait generator. Supported profiles: Asterfall Root and Bell; Sunscar Buried Heliarch and Veiled Sphinx; Frostmarch Bellbeast and Frozen Cantor. Existing boss phases are retained instead of overwritten when assembling a *new* 2.0 snapshot.
- Enemy IDs, original names, roles, levels, old abilities and baseline source are preserved. Duplicate IDs, existing V2 kit tags, incompatible elite IDs, unsupported region/boss combinations, and duplicate ability or phase IDs are rejected.

### Persist first, replay later

**Preparation is not combat authorization.** `prepareSoloEnemyKitsV2` returns `source: unpersisted-candidate-v2`. A trusted server transaction must store the candidate exactly once, associate it with the authenticated encounter and correct character, and return a pinned persisted version/revision. No replay should regenerate random traits.

The stored snapshot includes the complete prepared opponent definitions and SHA-256 digests of both base and prepared enemies. `verifyPersistedEnemyKitsV2` checks those hashes, original IDs/order, version, boss membership, valid trait tags and supported mechanics. A server persistence verifier then checks the stored row, sealed receipt, roster, revision and **final compiled combat-input digest**, which includes already verified class/skills, equipment, enemy abilities and stats.

Only then can the existing `issueEnemyV2EngineAuthority` issue its non-serializable WeakMap-backed token. Boss identity is explicitly included as an allowlisted solo boss ID; ordinary legacy/dungeon/World Boss encounters cannot self-enable it. The engine continues to use one-argument legacy semantics with no token.

The shared SHA-256 digest now canonicalizes object key order so JSONB property ordering cannot create false replay mismatches. It rejects circular, nonfinite, executable and oversized data rather than silently omitting unsupported values.

### Effect execution

The previously merged draft engine patch in #1395 already handles enemy-source poison/bleed stack limits, regeneration, modifier refresh and the 10% enemy shield budget, alongside nine class resource/passive/capstone systems. Prepared authored kits are passed to that engine *after* trusted Equipment 2.0/class-only skill and set/affix compilation. Neither branch's generic enemy-kit builder runs again.

### Regression coverage

- Original deterministic Enemy/Bosses 2.0 trait code and six boss profiles copied in isolation from #1376.
- Seeded normal/elite trait reproducibility, source immutability, anti-double-compile, unsupported trait rejection, all six regional boss profiles, six retained legacy boss phases, and malformed/modified stored receipt rejection.
- Full Equipment+Classes+Enemy kit simulation, preserving stat/quality/rarity and deterministic replay, with explicit rejection of altered kit data, mismatched seed, unverified persistence and disabled V2 mode.
- Full solo boss engine execution with explicit boss snapshot authorization and preserved original plus new V2 phases.
- Fixed an existing Classes 2.0 test error where `resolved` was accessed before its `const` declaration.
- Updated the draft Combat 2.0 CI workflow to run the new coverage and reject public-route/mobile imports.

## Hard launch blockers

1. Authenticated **transactional persisted-kit writer/reader** and revision/receipt verifier are still required; tests only use a trusted fixture callback. There is no new live SQL/Edge route.
2. The old player HP/cooldown carryover, legacy dungeons, Q-Mode rooms, World Bosses, Party Events, Guild PvE and marketplace rewards stay entirely on existing rules. No release flags or payout code have changed.
3. More boss-specific balance and telegraphs, ability targeting, status immunity and interruption UX remain, along with nine-class/18-specialization economy/party simulations.
4. Full CI must pass on the final draft head; staging Auth, load/replay parity, Android and rollback QA must be completed before promoting any 2.0 engine to main or production.

**Scope:** this PR targets only the unreleased Classes/Skills 2.0 branch. Never promote the full draft to `main` on the strength of this compatibility pass alone.
