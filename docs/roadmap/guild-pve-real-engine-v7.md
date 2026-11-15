# Veldryn Guild PvE — V7 source-derived phase combat bridge (hidden, test-only)

**November 15, 2026.** Follows [V6 theoretical feasibility](./guild-pve-expedition-feasibility-v6.md), [V5 Broken Forge encounter content](./guild-pve-broken-forge-content-v5.md), [V4 campaign design](./guild-pve-expeditions-content-v4.md) and archived V3 workbook.

> **State:** New isolated source-code modules and QA designed for development. **No production combat, Guild Expedition feature flag, API route, migration, inventory charge, player data read, reward grant, live UI or scheduler.** V7 source-derived **synthetic** combat fixtures do not establish release-ready balance.

## 1. What V7 actually implements

The disabled module [`backend/src/server/combat/guild-pve-broken-forge-v7.ts`](../../backend/src/server/combat/guild-pve-broken-forge-v7.ts) calls Veldryn's existing deterministic [combat engine](../../backend/src/server/combat/engine.ts), rather than estimating progress using Combat Power or the V6 algebraic participation factors.

The [fixture suite](../../apps/mobile/tests/guild-pve-real-combat-v7.ts) uses:

1. All **nine** current class definitions.
2. **Four** released equipment-reference tiers **T1–T4**, built from existing *synthetic regional fixture* equipment and XP/level rules.
3. The real `verifyPartyEventEquippedCopyOwnershipV4` equipment verification path.
4. The real `deriveOnlineCoopLoadout` service, including class skill definitions and calculations for equipped gear, sockets/gems, set bonuses and eligible companions (where actually equipped by a fixture).
5. The same `combatantFromVerifiedSnapshot` converter as existing co-op combat.
6. Real `simulateCombat` results and replay event data, never invented on-screen damage.

The planned deterministic matrix is **9 classes × 4 tiers × 3 bosses × 3 phases × 3 stances × 2 seeds = 1,944 independent Scout, phase-local single-character fights**. The test suite proposes **36 aggregate cohort summaries** (boss/phase/tier). This is **not 1,944 shared guild clears**; every simulated attack is a bounded 18-second preview. Published measurements must come from an actual passing CI run, not simply the existence of the source.

### Guardian model

| Guardian | Phase I | Phase II | Phase III |
| --- | --- | --- | --- |
| Ironbound Gatekeeper | Iron Skin: plates + hammer slam | Gate Collapse: Sunder and rubble | Open Gate: charged strike and exposed mechanism |
| Emberbound Seer | Ash Veil: burning DoT | Curse Web: marked curse + arcane burst | Emberfall: delayed area eruption |
| Hollow Warden | Armoured: damage mitigation | Overload: area shock + burn | Exposed Core: delayed detonation |

All enemy **numbers** in V7 are **explicitly synthetic**: HP from a frozen reference attack cohort, Attack/Defense tied to the same cohort (not to the attacking player), and small Scout/Veteran/Mythic threat factors. They **must not** be copied into server manifests or deployed before calibration.

**Frozen profile integrity:** `makeGuildPveReferenceV7` creates a per-tier immutable-in-use reference record with a SHA-256 digest. `verifyGuildPveReferenceV7` rejects accidental stat tampering. **A digest is not authentication**: production would require an authorized server-owned profile and version, not a client JSON hash.

### Phase scripts and V5 content accuracy

The original [36 authored V5 cues](./spreadsheets/guild-pve-broken-forge-encounter-cues-v5.csv) are **not yet runtime-driven**. The new [read-only cue checker](../../tools/guild-pve-v7-content-verify.mjs) checks three boss IDs, nine phases, ordered cue positions, HP bands, unique cue identifiers and warning-before-resolve ordering. The combat module implements **thematically matched phase-local engine abilities**, not a full 36-beat sequential cross-phase interpreter. This limitation must remain visible.

### Stance instrumentation

All classes can use Assault, Guard, or Rally in the prototype. The following values are **diagnostic hypotheses**, not approved balance:

- **Assault:** original verified class kit, gear, skills and companion, no additional stance ability; V3 raw Pressure delta proposal +15 less 4 normal decay.
- **Guard:** attack power ×0.80 and Defense ×1.20; add one self-shield equal to 14% of source max HP at a 30-second cooldown; proposed Pressure −12 less 4 decay.
- **Rally:** attack power ×0.75 and Healing Power ×1.20; add a self-cleanse and conditional heal at 5.5-second cooldown when injured or suffering DoT; proposed Pressure −8 less 4 decay.

These stance ability values **are not mapped onto the eventual shared guild-pressure system**; the actual combat engine determines if any shield was absorbed, condition removed, or HP restored. `shieldAbsorbed` summarizes absorption **from all sources**, including class kit and gems, so it must not yet be used as a Guard-specific reward credit. `effectiveHealing` is real engine healing but may be zero when there is no missing HP. Existing passive support and guard class skills are not silently changed in live systems.

## 2. Safety and validation

The suite explicitly tests source-derived loadout legality, positive loadout stats, distinct class identities, frozen reference digest tamper rejection, illegal phase rejection, identical replay under the same seed, 18-second maximum fight, no negative/non-finite damage metrics, real guardian HP removed capped by guardian max HP, and **zero** granted rewards/Seals spent/server persistence.

The focused [GitHub Actions workflow](../../.github/workflows/guild-pve-v7-validation.yml) checks TypeScript and compiles/runs the test-only fixture suite. It also validates V5 cue IDs/telegraphs. **CI is not considered verified until a specific completed successful run is observed.** No job may access Supabase secrets or deploy.

## 3. Why no guild-clear percentages yet

A single preview cannot determine the total HP budget of seven mandatory combat nodes over 14 days. The engine's HP and status resolution is authentic for each synthetic preview; the subsequent **asynchronous aggregation** is still unbuilt.

The V6 effort ratio proposals (Scout 0.38, Veteran 0.50, Mythic 0.62) therefore remain **only budget hypotheses**, not final HP changes. A full V8 guild simulator must introduce:

1. Server-owned, frozen **18-node graph/manifest** and exact encounter phase threshold accounting; V5 36 cues become executable warnings/replay events.
2. The **seven mandatory** shared-combat nodes plus exploration, supplies and guild vote, with a separate per-guild HP and Pressure ledger.
3. Idempotent Seal accounting by **account** rather than character, exactly-once shared damage and stage progression, stale-target refunds and post-crash result replay.
4. Planned roles as measured effective HP damage, damage prevented, effective healing and cleansed harmful effects rather than a fictitious scalar.
5. **4/8/12/20 guild sizes** with representative T1–T4 equipment, mixed level/gear/role rosters and observed attendance/Seal distributions; 1–3-guild partial reward checks.
6. A defensible boss HP/supply economy derived from **actual** recorded fixture samples, frozen per chosen difficulty/tier at event start; never scale boss Attack up because one attacker has better gear.
7. Completion-rate and optional-node trade-off analysis, player-market-neutral resource availability, first-clear cosmetic entitlements and Guild Token inflation.
8. Real client UX, auth-owned GameState and account/guild claims, database transactions, runtime scheduling and security controls **only after explicit later approval**.

## 4. Review gate

**No launch approval.** V7 cannot yet make claims that Tank/Support are useful in final guild progression, that Mythic is completable, or that Scout meets the 65–75% participation target. It establishes a reusable, isolated bridge to the actual combat engine and records real outputs for comparison once CI completes. Continue using the V6 resource/supply safeguards until actual material and participation calibration succeeds.
