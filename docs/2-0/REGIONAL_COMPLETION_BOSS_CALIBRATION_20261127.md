# Regional completion boss calibration — 27 November 2026

Hidden 2.0 QA only. Owner approved regional completion bosses at levels 25, 50 and 75 alongside solo balance. No live gameplay, region unlock, reward or migration change.

## Verified parent evidence

#1942 exact head b4ac48b308d78c41dc4a45ad782aa1268538d074 source integration passed (run 45994786739), 792 matched sets and 1584 new executions. All 440 Tank/Support cases win per arm. Unweighted same-profile Damage-relative band means for offensive_progression:

| Class | Reference | Common Q10–30 | Mixed tier |
|---|---:|---:|---:|
| Bastion | 67% | 68% | 69% |
| Ironwarden | 69% | 72% | 76% |
| Dreadguard | 66% | 67% | 66% |
| Dawnkeeper | 76% | 75% | 72% |
| Stonecaller | 75% | 78% | 75% |

Retain Support offensive_progression as leading ordinary-solo candidate, no final approval. Dawnkeeper and Ironwarden individual bands still approach/exceed 100%; avoid broad increases. Stonecaller now near target across all gear profiles. Bastion/Dreadguard remain slower, early Ironwarden/Dreadguard still below target. Future targeted early loop work and broader seeds/level coverage needed. Efficient-defense alone had little throughput effect. No party scope change, no application of ordinary solo policy to regional bosses. Existing mobile, Edge, combat skills, gem runtime failures persist.

## Separate completion boss fixtures

- FALLEN_KNIGHT (Fallen Knight): existing mobile monster identity and level 25 verified by prior source audit; expected T2. Oathbreaker Cleave, Broken Oath bleed; Last Stand shield at 65%, Shattered Oath damage increase and temporary vulnerability at 30%. New candidate mechanics, not claims about live kit.
- BOSS_002 (The Sand Tyrant): authored server source level 45; proposed completion level 50, expected T3. Tyrant Charge and Solar Pillar burn; Crown of Pillars shield at 66%, Tyrant Sandstorm burn/vulnerability at 33%. Adapt source concept names and thresholds to supported idle-engine effects; no claimed actual burrow/add-routing/safe-lane mechanics.
- BOSS_003 (Frost Wyrm): authored server source level 70; proposed completion level 75, expected T4. Frost Breath, Wyrm Dive, Ice Prison Collapse; Airborne Hunt shield at 68%, Wyrmstorm damage increase and temporary vulnerability at 32%. No actual flight, prison immobilization or positional movement implementation; only supported engine effects.

All primary attacks telegraphed and interruptible. Periodic damage and shields use existing enemy-v2 policies. No manual-dodge requirement, no mandatory class. Survival, cleansing, interrupt, damage and sustain paths to be tested, not guaranteed. Compare simple reference kit, enhanced mechanics with identical stats, enhanced mechanics plus modest HP/attack/defense pressure (+8/+6/+4%), and same mixed enemy without approved direct secondary offense. Fixed reference HP=20x mean attack of 18 reference Forge builds, AP=.045x mean HP, defense=.35x mitigation constant. Numeric values provisional, no player-specific enemy scaling. 120-second window. No existing dungeon boss composer mutation, no new persisted catalogue entry. Exact original source identities are verified from authored Sand/Frost server definitions; Fallen Knight identity from prior source audit. Opaque engine authority binds each exact fresh input using mock QA verifier only; not production persistence proof. Rejections for modified input, ordinary-solo offensive policy on a boss; no actual unlock authority.

864 executions, 216 matched four-arm sets, all nine classes/two specializations, two source-compiled gear profiles (pinned reference and genuine common Q10–30), two independent seeds, all three region endpoints. Legal counter loadouts and exact Forge receipts; direct-only approved starting conversion as candidate, separate mixed unconverted control. No widened ordinary-solo conversion or cadence on bosses. Record actual wins/timeouts/wipes, HP, enemy HP, duration, phase/cast/interrupt/periodic/shield events and healing. Test determinism, source identity, stat invariance in mechanics-only comparison, bounds and closed reward/release/unlock flags. New exact-head CI pending. No claim any boss is balanced or even passed new CI yet.

## Next passes

Review new boss results; calibrate ordinary versus elite/final encounters separately, longer duration and appropriate accessible difficulty. If direct-only Tank/Support boss damage too low, test a separately justified boss-specific offensive policy (not ordinary-hunt modifiers) while preserving boss mechanics and role identity. Test different viable build approaches, more seeds, lower/mixed gear, and meaningful phase triggers. Then design server-owned completion receipts: authenticated character/account identity and eligible region, exact boss and frozen input, completed victory, idempotent grant, monotonic progression and migration of verified existing completions. No grants until source and migration approved. Frostmarch completion may record a milestone but Ashlands/Region IV remains disabled, T5 preparation separate. No main merge/deploy. Inherited mobile, Edge and other failures remain.
