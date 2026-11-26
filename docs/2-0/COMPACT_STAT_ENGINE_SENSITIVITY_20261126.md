# Compact stat scale — pass 4 combat unit and pressure sensitivity (2026-11-26)

Passes 1–3 exact head cf5b6f643eb920fe26d53b62cf91386ef4a20928 verified green on GitHub Actions 45893869859 and 45893862264. Preserve the existing hidden large-scale engine and gem evidence. No changes to engine or runtime defaults.

## Source findings

The real engine defaults mitigationConstant=1200 and accuracyScale=1400; defense/(defense+constant) is bounded 5–75%. Applying compact Defense while retaining 1200 compresses level-25 T2 reference damage-class mitigation to the 5% floor and tanks to 7.4–9.4%. This would erase much of the intended armor progression. Accuracy/evasion stay in their original rating units; no blanket divisor. The real engine also has a minimum raw damage of 1, flat damage/heal/shield amounts, a taunt minimum threat of 100, percentage healing/phase conditions and role offense conversion. A uniform numerical shrink is not behaviorally equivalent. Keep all existing formulas in place until the dedicated evaluation; no global mitigation cap change or hard gear cap is approved here.

Candidate sensitivity constants at level L: low = .75*(30+2L), middle = 30+2L, high = 1.5*(30+2L), unchanged = 1200 control. Level-25 constants 60/80/120. These are review assumptions, not final tuning. Existing 5–75% engine mitigation bounds are historical, not a new equipment stat limit.

### Level-25 reference mitigation (T2 common Q50, no passive/set/gem/affix)

|Role|Old constant|Low 60|Middle 80|High 120|
|---|---|---|---|---|
|Tank|7.4–9.4%|61.4–67.5%|54.4–60.9%|44.3–50.9%|
|Damage|5.0%|45.4–49.8%|38.4–42.7%|29.4–33.2%|
|Support|5.0–5.7%|51.0–54.7%|43.8–47.5%|34.2–37.6%|

At T4 L60, the previous alphabetical source reference gives weakest tank 49.5% versus strongest support 50.8% mitigation with the middle constant. Preserve those original references. A separate legal Defense-oriented Tank selection (highest flat defense per nonweapon slot; class weapon unchanged, same rarity, quality, combined budget) gives:

|Level / tier|Bastion|Ironwarden|Dreadguard|Highest other role|
|---|---:|---:|---:|---:|
|25 / T2|61.6%|61.1%|55.4%|47.5%|
|40 / T3|61.1%|60.5%|54.1%|49.3%|
|60 / T4|60.7%|60.1%|53.6%|50.8%|

These are mitigation formula evaluations, NOT effective survival or actual fight outcomes. The non-tank overlap in generic gear is intentional flexibility, not grounds for a blanket restriction; the narrower T4 margin warrants actual combat pressure review. Independent JS readback of source test bodies at 96acd4c5 passed all 12 arithmetic/source checks.

## Real-engine diagnostic

Dedicated CI now builds the actual backend then runs a separate Node review script:
- 720 primary encounters: 9 solo class rosters + 6 legal 1/2/1 party rosters x 3 tier/level bands x 2 fixed pressure bands x 2 seeds x 4 constants.
- 360 exact deterministic replays (first seed).
- 9 historical launch kit comparisons: original stats and a 20x reduced matched input including absolute boss shield, retaining historical ability coefficients, legacy threat minimum and damage floor. Report results, do not claim equivalence.
- 36 additional matched Tank defensive loadout comparisons (72 actual fights).
- Fixed synthetic enemy per level and roster size, never per actor strength: HP=300*tier*size; ATK=(70+4L)*.24 or .38; DEF=10+15*tier; existing rating scale, two interruptible authored QA casts and 4% max HP phase shield. All these encounter inputs are provisional.
- Report victories, remaining HP, damage, effective healing, shield output, downs, time, interruption metrics. The input roster, enemy and seed do not change between constant arms. Validate finite outputs, HP bounds and unchanged input. Retain source-level checks in separate CI.
- Uses actual simulateCombat and launchPlayer legacy ability kits, no compiled V2 specs, V2 authority, exact mint receipts, real regional boss kits, gems, sets or companions. This is a preliminary engine unit diagnostic, NOT final 2.0 balance certification. CI pending at write time.

Next: read exact-head engine results and refine candidate constant and enemy pressure, then introduce the full hidden V2 skill/gear/enemy authority path with explicit compact source versions. Review actual regional boss shield floors, threat and phase logic; preserve cooldowns and percentage effects. T5 reconciliation, Forge healing profile implementation, final CP and migration remain outstanding. No production changes, live routing, feature activation, main merge or deployment.
