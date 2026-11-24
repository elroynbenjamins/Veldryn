# Equipment 2.0 — V3 universal random affix and cap proposal

**REVIEW ONLY — no approval, production mint, Combat effect, equip, UI, Market or release authority. EQ2-C12 remains mandatory.**

## Source-derived direction
The existing original Forge draft-1 roller is unchanged. Its 11 mapped bonus identities, T1–T4 ranges, rarity buckets and roll counts are retained as proposed baseline; Potency remains excluded and quarantined. The new candidate version chooses uniformly without replacement across every class, role and slot. Intrinsic gear identity, hand restrictions and wear requirements remain separate. A future production roll must be newly minted from an authenticated approved rules version; never rebrand an existing copy.

## Proposed T5 and equipment-only diminishing returns
T5 extends each T4 range by 20% (rounded once to centipercent); no T6–T9 extrapolation. Raw item rolls stay immutable. Aggregate matching equipment channels once, then apply a 50% marginal return beyond the soft knee, up to a hard cap. A cap is not a per-piece roll limit; no item roll is truncated on storage. The following values are proposals, not final D1/D2 approval.

| Stat | T5 full range (before rarity band) | Soft knee | Hard cap | Unit |
|---|---:|---:|---:|---|
| Defense | 1.8–3.6 | 25 | 45 | relative % |
| Max HP | 2.4–4.8 | 30 | 55 | relative % |
| Ward | 0.6–1.8 | 8 | 18 | pp |
| Tenacity | 2.4–4.8 | 20 | 40 | pp |
| Critical chance | 0.6–1.8 | 8 | 18 | pp |
| Critical damage | 3.0–6.6 | 35 | 65 | relative % |
| Haste | 0.96–2.4 | 12 | 25 | pp |
| Penetration | 1.2–3.0 | 12 | 25 | pp |
| Accuracy | 0.6–1.8 | 8 | 18 | pp |
| Ability damage | 2.4–5.4 | 25 | 45 | relative % |
| Healing power | 2.4–5.4 | 25 | 45 | relative % |

Example: raw +40% Defense becomes +32.5% (25 + 15×0.5). Ten perfect T5 Mythic HP rolls yield raw +48%, effective +39%. No cap forces a particular class build. Nine-slot and ten-slot class comparisons and actual rarity supply still require D3/D7/D9 testing. Permanent authored innate contributions should eventually share the same exact channel cap when semantics match, but the executable preview deliberately excludes unapproved innate values. Set/gem/skill/companion/temporary effects, combined hit/penetration and final haste/crit-multiplier caps require their own integrated ordering and approvals.

## Known source mechanics and benchmark risk
The existing engine clamps final crit chance at 75%. Forge ability damage affects original direct class abilities, not basics, DoT or secondary procs; Forge healing applies to class heals/HoTs, not shields, potions or secondary effects. Ward excludes physical/true damage. Tenacity excludes boss status locks and boss-sourced effects under the current source implementation. Do not turn that into universal boss immunity or silently add new mechanics. Crit damage is a relative multiplier, not percentage points. The engine also documents a legacy RNG range [0,.5); actual Combat 2.0 probability paths must be checked before interpreting equal-CP trials. No engine changes in V3.

## Isolated implementation
The JSON proposal pins the four actual source blob hashes. The unmounted Node tool provides deterministic synthetic roll inspection for every one of the 554 current review item IDs, excludes the ten retired T4 IDs, verifies roll counts/magnitudes/units, rejects duplicate slots and tampered rows, and computes random-affix-only raw/effective totals without mutating input or granting combat. It never establishes actual ownership, class hands or approved innate source authority. The 10-slot stress case is intentionally an abstract upper bound, not a legal build for all classes. The test suite checks all eleven first-draw identities for each catalogue row, source ranges, rarity boundaries, quality, caps, replay order and negative permissions. The previous original Forge implementation and Combat code are unchanged.

**Next:** obtain stat contract decisions and benchmark CP from effective marginal combat utility, then integrate approved innate, set and temporary effect cap ordering, real legal nine/ten-slot builds and the 18-spec boss comparison. D1–D10 remain open. No release of any Equipment 2.0 content before coordinated 2.0.
