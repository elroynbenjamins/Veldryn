# Veldryn Skills & Abilities 2.0 — two development passes + two polish passes
Date: 2026-11-21 · Status: **hidden-only draft PR #1551** targeting the private canonical #1377 branch.

## Development pass 1 — multi-hit combat fidelity
- Before: V2 double-hit techniques such as Knife Dancer's Blade Flurry reused the same seeded hit, critical, and variance labels on a given tick. Twin hits could therefore not independently hit or miss.
- Now: each hit on the same target from one authored V2 class ability receives its own deterministic strike ordinal after the first. First-strike and every legacy RNG label remains stable; no global RNG changes.
- Regression: many seeded Knife Dancer Blade Flurry encounters must include split hit/miss outcomes and never grant two Rhythm stacks for one same-tick source.

## Development pass 2 — persistent Thunder Totem
- Before: Stonecaller's Thunder Totem applied its initial strike, while Ritual Surge used a synthetic 4-second expiration event without a persistent totem damage cycle.
- Now: a server-compiled Thunder Totem creates **one** per-character, per-encounter totem; recast refreshes it. Three nature pulses of provisional 0.18 authored attack coefficient occur at 2/4/6 seconds. The 6-second completion is the earliest Ritual Surge expiry. Effects use existing deterministic combat mitigation and replay events.
- Guard: V2_TOTEM pulses are periodic, cannot mint class resources, and cannot trigger direct-hit gem/skill/capstone recursion. No untrusted damage values, live route, DB persistence or cross-encounter state.
- Regression: exactly three deterministic pulses; capstone at actual expiration; no free resonance.

## Polish/refine pass 1 — source-safe timed buffs
- Recasting the same **V2 class ability** refreshes only an older buff/debuff from that same ability, originating actor, target, tag and kind. Distinct source actors and separate same-cast effects remain independent.
- Legacy status stacking stays byte-for-byte unchanged.
- Regression: repeating two simultaneous V2 buffs does not grow indefinitely; the analogous legacy fixture retains its original stack count.

## Polish/refine pass 2 — bounded V2 DoT/HoT ownership
- Refresh an old periodic effect only when the source character, ability identity, kind and tag match; never erase other players' effects.
- Preserve all deliberately separate same-cast effects via a V2-only recorded application timestamp, not a derived next-tick time.
- Legacy periodic behavior stays unchanged. Regression checks deliberate same-cast double DoT vs repeat-cast refresh and legacy parity.

## Follow-up / release holds
- Independent exact-head CI required: Combat 2.0 skills, 9-class 18-spec T1–T5 matrix, disposable PG17, Edge bundle, mobile and inherited legacy checks.
- All new mechanics remain provisional numbers for combined Equipment / Enemy / Boss 2.0 balancing. Test at varying hit/miss rates, encounter lengths, high haste, counter/totem buff windows and party compositions.
- No merges to main, live SQL, enabled feature flags, inventory mutation, item rerolls or UI/theme implementation. Actual UI appearance and themes require explicit user approval.
