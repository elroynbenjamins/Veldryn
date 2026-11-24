# Skills / Equipment / Party Synchronization consolidation — 24 Nov 2026

Hidden review-only child of Class Synchronization PR #1726. This branch copies the 17 non-workflow files from Skills/Forge PR #1700 unchanged, merges both CI sections explicitly, and adds one new cross-system party matrix. No main merge, public route, DB write, item grant, UI, feature flag or deployment.

## Why consolidate now
#1700 and #1726 diverged historically, but their changed-file sets overlapped only in `.github/workflows/combat-v2-skills-validation.yml`. The Skills counterplay/Forge review modules therefore integrate without rewriting Party Synchronization runtime code.

## New matched-build party matrix
`party-sync-ten-slot-matrix.ts` runs 432 deterministic four-player dungeon cases:
- 36 legal 1 tank / 2 distinct damage / 1 support class compositions
- 6 current boss identities
- 2 specialization bands (spec index 0 and 1)
- real Skills 2.0 class skill compilation from the #1700 fixture
- all 10 Equipment 2.0 slots per character
- 2/4/6 set thresholds
- nine ordinary affix sources plus ten base item sources per character
- epic / quality 100 synthetic review profile
- Party Synchronization composition resolution and scoped encounter authority

Each synchronized run is compared with the exact same unsynchronized compiled party. The matrix requires deterministic replay, immutable original input/gear/build snapshots, identical Equipment compiler evidence, identical compiled personal stat snapshots, finite outcomes, and a broad 0.90–1.50 integration-only damage-ratio safety envelope. It records per-boss damage/survival changes rather than claiming approved balance.

## Explicit limitations
The ten-slot fixture remains synthetic review data. The initial 432-case matrix still intentionally omits signed party traits and persisted authored boss custody so it can isolate Skills + ten-slot Equipment + Synchronization behavior. A later hidden persisted-party rehearsal on this same branch now adds both under a stricter shared run binding:
- committed ready-check `partyId` / `rosterRevision`
- all four frozen loadout `snapshotHash` values
- run / node / encounter / state revisions
- exact compiled combat input digest
- four exact-copy Equipment trait sources
- party-mode Enemy/Boss kit receipt
- the same Synchronization roster
- optional carried HP/cooldown state bound into the digest

The original solo/fresh trait issuer and solo Enemy issuer remain unchanged and continue to reject carried party state. Separate persisted-party issuers require the reviewed run binding; a solo-mode Enemy kit is rejected on the party path. The hidden wrapper can therefore execute ten-slot party traits + Synchronization + authored regional boss mechanics together without making those capabilities public or live.

This is now a genuine Skills + ten-slot Equipment + Party Synchronization + persisted authored boss integration rehearsal, but it is still NOT equal-CP final tuning and does not authorize a release.

## Next gates
1. Exact-head consolidated CI must pass.
2. Replace the current QA persistence callbacks with a real service-authenticated persisted party/dungeon run-binding store and atomic readback.
3. Persist party-mode Enemy/Boss kit receipts and exact-copy party Equipment trait receipts through that same transaction/revision boundary.
4. Repeat the full 36 × 6 matrix with the persisted-party wrapper, signed traits, authored boss kits and matched CP/loadout budgets rather than only the single end-to-end rehearsal fixture.
5. Tune Synchronization percentages only after that evidence; keep no-level/no-XP/random-party parity and no personal CP rules.


## Persisted-party authority follow-up
The branch now contains a review-only `PartyV2RunBindingReview` that bridges existing co-op committed ready checks and frozen loadout snapshots to Combat 2.0 without changing the current live run schema. It records run/node IDs, encounter/state revision, party/ready-check/roster revision, content/balance version, four actor/account/character/loadout identities, frozen snapshot hashes and the full finalized combat digest.

A derived persisted Synchronization scope may accept carried HP/cooldowns only when that run provenance exists. Separate persisted-party Equipment trait and Enemy engine issuers bind their sources to the exact same final digest. The original fresh/solo issuers still reject carried state. The party Enemy kit composer/verification API is explicitly `mode:'party'`; it does not reuse or relabel a solo receipt.

The end-to-end persisted party test currently exercises 40 equipped copies, 12 set thresholds, 36 ordinary affix sources, four exact-copy trait sources, active class Synchronizations, carried-state binding, and an authored Sunscar boss kit in one deterministic hidden encounter. All public route/release flags remain off and live Edge bundle fences explicitly reject the new authority symbols.


## Full persisted-party matched tuning matrix
A new `persisted-party-sync-full-matrix.ts` expands the single end-to-end persisted rehearsal into **432 matched baseline/Synchronization pairs**:
- 36 legal dungeon compositions
- 6 authored regional bosses
- both specialization bands
- identical ten-slot Skills/Equipment build, set thresholds, affixes, exact-copy traits, party-mode boss kit and run binding on both sides
- the only execution difference is whether Synchronization authority is issued

Diagnostics are emitted overall, per boss and by active-link count, including average/min/max damage ratio, healing ratio, damage/survival improvements, victory gains/losses and identical traces. The test uses broad catastrophic-outlier fences rather than declaring balance. It also records which authored links cannot appear under the strict 1 Tank / 2 distinct Damage / 1 Support dungeon roster (same-role Tank/Support links require flexible party content for direct exercise).

This gives a much cleaner basis for evaluating the provisional 1/2/3/4/5/6 link effectiveness curve of 100/100/80/65/55/50, because each comparison holds the entire compiled party and persisted boss encounter constant.

## Lobby / recruitment projection
A separate presentation-only projection now supports the future 2.0 party lobby:
- active links, effective link scale, effective/capped totals and localization keys
- candidate preview showing newly activated links and any change in diminishing-return scale
- explicit `personalCpDelta: 0`
- explicit `requiresProgression: false`
- explicit `canGateEntry: false`
- explicit `canFilterRecruitment: false`
- explicit queue eligibility independence from Synchronization

The projection accepts no friendship, guild, relationship, XP or history inputs, so random and established parties resolve identically. It remains hidden and is fenced from public routes/Edge bundles pending UI approval.

## Provenance hardening
The persisted run binding no longer assumes ready-check roster array order matches combat actor order. The hidden wrapper supplies an explicit server-derived actor → character mapping from the already verified Equipment runtime. Ready-check rows and frozen loadouts are then joined by character identity, while the final member list follows compiled actor order. Foreign, duplicate or incomplete mappings fail closed.


## Fairness, cap pressure and display-value follow-up
Additional review guards now protect the design goal that Synchronization should add variety without creating an obvious mandatory class.

### Strict dungeon role fairness
All 36 legal 1 Tank / 2 distinct Damage / 1 Support compositions are exhaustively audited. Under the current 18-edge graph the expected link-count distribution is:
- 10 compositions with 2 active links
- 19 compositions with 3 active links
- 7 compositions with 4 active links
- no legal strict dungeon composition reaches 5 or 6 links

The fairness guard compares the average equivalent-link budget for every class when that class appears in a legal dungeon composition. The allowed spread is <= 0.10 equivalent links. This protects against a future catalogue edit that keeps degree=4 on paper but makes one class materially better under actual role restrictions.

### Synchronization-only cap pressure
The resolver now exposes `cappedStats` rather than silently truncating stacked bonuses. The 495 four-class multiset audit requires **zero capped stats in every strict dungeon roster**. Under the current draft catalogue, exactly one flexible-only composition creates cap pressure: Bastion + Dawnkeeper + Dreadguard + Ironwarden combines Radiant Covenant, Sacred Bulwark and Twilight Accord for 10.4% raw healing received, which is explicitly shown as 10.0% effective under the provisional Synchronization-only ceiling (0.4% discarded). No bonus percentages were changed in this pass.

### Presentation semantics
Server projections now carry numeric basis points and an explicit value kind (`percent` vs `percentage_points`) rather than preformatted text. The mobile review layer formats these locally; e.g. 240 bps => +2.4%, while 200 bps of critical chance => +2 pp. Combined-cap state is also exposed so the lobby can explain raw versus effective totals.

Candidate-specific Synchronization remains forbidden from recruitment candidate cards, sorting/ranking, LFG filtering and queue priority. Active links are intended for post-formation lobby/combat information only.

### Identity binding hardening
The persisted four-player wrapper no longer relies on array ordering for builds, Equipment runtime or exact-copy trait receipt ports. Builds/gear are joined by actor ID and trait receipt ports by verified character ID. Regression coverage shuffles all three input arrays and requires an identical deterministic encounter result.
