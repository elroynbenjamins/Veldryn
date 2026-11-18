# VELDRYN 2.0 — Class-only baseline provenance and full-pipeline safety (v1.3)

**18 November 2026 | Draft PR #1377 | NOT LIVE | Not merged, no SQL migration applied**

## Implementation in this pass

### 1. Authoritative class-only source
`backend/src/server/combat/v2/class-baseline.ts` introduces the explicit `ApprovedClassBaselinePolicyV2` contract, with an individually authored `ApprovedClassProfileV2` for each class. The profile owns:
- Level-curve function returning **class + level stats only**, not legacy gear;
- Server-owned basic attack and ability definitions;
- Minimum and maximum supported level and versioned policy identity.

The compiler accepts only an independently verified class ID and level, checks source actor identity and role, and recreates all combat-effective fields from the server policy. It **does not copy** incoming actor stats, effect gems, tonics/Alchemy, source abilities or combat tags. Only actor ID/name remain, to preserve event/party identity. It rejects already-compiled or manually tagged actors.

No numeric class curves are invented in this pass. They must be approved in the shared Equipment/Classes/Enemies 2.0 balance policy. The current legacy `launchPlayer` helper cannot be treated as proof of a class-only baseline.

### 2. Strict combined encounter now requires that source
`unified-equipment-encounter.ts` must call `issueClassOnlyActorV2` before applying class skill/spec effects, item base stats, tier/rank/quality, set thresholds and random affixes. There is **no** caller-provided tag escape hatch.

Legacy party/dungeon HP and cooldown snapshots are rejected until a versioned conversion exists. Likewise, existing gem/tonic payloads are rejected rather than silently being dropped in the new encounter. The disabled path still delegates to the unchanged legacy simulation.

### 3. Five-stage stat provenance
The internal encounter evidence now includes policy revision and verified stat snapshots at:
1. Class/level baseline,
2. Skills/specs/passives,
3. Item tier and rarity/quality base,
4. Set threshold bonuses,
5. Random affixes.

This is **QA evidence only**, never player-facing Combat Power or untrusted input. It allows exact numerical isolation of class/gear contribution and helps verify the 15–18% target once approved CP weights and equipment tables exist.

### 4. Full nine-class coverage audit
`class-baseline-audit.ts` checks that all nine classes have a valid server profile, every required progression level has valid positive stats, skills are uniquely identified, and the same class/level gives exactly the same stat values when resolved twice. Missing profiles, missing levels, invalid curves or nondeterministic values **fail the release coverage gate**.

The rollout coordinator must call `assertApprovedClassBaselineCoverageV2` using the approved complete level progression before any server-side 2.0 switch is enabled. The tests use synthetic fixtures for levels 1, 10, 20, 30, 50 and 75; **those are test points, not new character unlock rules**.

## New and refined automated tests

- `__tests__/class-baseline.ts` covers all nine class roles, contaminated incoming Attack/HP, source gems/Alchemy, mismatched class/level, forged V2 tags, missing profiles, a complete 9-class × 6-level fixture and nondeterministic stat curves.
- `__tests__/unified-equipment-encounter.ts` proves even grossly inflated legacy Attack/Defense and fabricated source abilities cannot alter a server-issued 2.0 encounter; rejects unconverted gem/tonic and persistent HP states.
- `__tests__/full-equipment-role-matrix.ts` obtains a separate class profile for each of the 18 synthetic specialization scenarios.
- CI now runs the class-baseline test before full-equipment pipeline validation.

**Verification caveat:** GitHub Actions checks have remained queued. Authored tests and committed source do not mean TypeScript compilation or combat regression has passed.

## Next required pass

1. Approve and version the nine *real* class/level stat curves (not synthetic fixtures), including 15–18% full-loadout class contribution targets with real CP weights.
2. Approve T1–T5 one/two-stat gear tables, rarity/quality multiplier policy, and 2/3/4/6-piece effects; connect all 13 affix mechanics.
3. Implement versioned v2 gem/tonic and persistent-encounter-state migrations with item identity guarantees, followed by deterministic staging and rollback tests.
4. Resolve queued CI and merge only as part of the full coordinated Equipment + Classes + Enemies 2.0 launch.

**Draft:** https://github.com/elroynbenjamins/Veldryn/pull/1377
