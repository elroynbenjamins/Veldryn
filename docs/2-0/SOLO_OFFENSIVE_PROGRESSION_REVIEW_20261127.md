# Solo offensive progression refinement — 27 November 2026

Private 2.0 QA; no live changes or balance approval. Owner-approved direction is class-specific secondary scaling with a target 75–85% solo farming efficiency relative to Damage classes.

## Verified parent evidence

#1939 exact head 18ed52ee3a607093eccc962fc4f711d17e0ee729 private source integration passed (run 45993185775). 198 actual source-compiled gear builds, 792 matched sets, 2376 executions. The role_budget_skill arm won 440/440 Tank/Support encounters; all 440 also won with role_budget. The solo_tempo arm had four Bastion mixed-tier timeouts. Neither stronger arm had wipes or timeouts. Same-profile Damage-relative mean efficiency, rounded to percent:

| Class | Reference | Common Q10–30 | Mixed-tier |
|---|---:|---:|---:|
| Bastion | 65 | 66 | 67 |
| Ironwarden | 66 | 69 | 75 |
| Dreadguard | 63 | 64 | 65 |
| Dawnkeeper | 70 | 70 | 66 |
| Stonecaller | 61 | 62 | 62 |

Reference Ironwarden level 10–13 bands 44–52%, Dreadguard 45–58%, versus 79–91% and 62–87% respectively at 38/63. Dawnkeeper level 10 normal reached 101%, so avoid an across-the-board increase. Stonecaller reference bands 56–66%, consistently below target. Bastion level 38 reference 49–51%. Genuine source-compiled low/mixed gear confirms no blanket coefficient increase should be selected solely from ideal gear. Source availability and actual player distributions remain unverified.

## New candidate arms

- efficient_defense: retain the entire prior role_budget_skill policy; pure healing, HoT or barrier abilities with ally_below_80_or_targeted may use existing ally_below_80 condition in fresh one-player ordinary/elite encounters. Being the sole enemy target should not itself require an immediate defensive cast at full HP. This is not a reduction in defensive power; actual healing/HP outcomes must be checked. All emergency, cleanse, mixed, buff, taunt, interrupt, damage, resource and timing rules otherwise unchanged.
- offensive_progression: same readiness adjustment plus direct authored positive nontrue damage coefficient factors on exact compiled variant IDs only: Ironwarden Rune Challenge default ×1.65, Dreadguard Dread Challenge default ×1.55, Bastion Challenge default ×1.18 / aggressive ×1.25, Stonecaller Thunder Totem default ×1.45 and Earthen Grasp Stormbind ×1.30. Dawnkeeper Sun Smite Searing ×1.30 only from existing level 20 variant mastery checkpoint (new progression sensitivity, not an already-existing mastery mechanic). Factors multiply the previous role_budget_skill candidate, not final approved rates. No added damage to heals, DoTs, basic attacks or generated procs. No new skills or unlock changes. No change to ability cooldown or cast time. The default-variant factors can also apply to those variants at later levels; this is intentional and must be measured, not inferred as early-only.

792 same matched sets, 1584 new candidate executions, original three arms retained. Four levels (10/13/38/63), nine classes, both specs, three source gear profiles where applicable, two independent encounter seeds and normal/elite. Same original exact Forge build, fixed enemy, skill selection and max duration; no outcome-based selection of ability or gear. Inherit fresh single-player/single-enemy ordinary encounter restriction, reject parties/bosses and persisted/Q-mode. Damage actors/results exactly unchanged. Coefficient-only and readiness-condition assertions, deterministic replay, finite output and HP bounds. Summary records each class/profile/arm, victories vs prior, target band coverage, actual support output, interrupts, and per-level/kind HP and efficiency. Evaluate any reduced healing or increased deaths; do not assume increased efficiency equals safer play.

## Release limits and next step

No runtime policy, no main merge/deploy. Exact-head new CI pending; inherited mobile, Edge, combat skills, gem runtime failures remain. These candidates require review for per-class speed, survival, and outlier bands; don't force every class into an exact percentage by dynamic enemy scaling. If the target remains low, address weapon budget or authored variant coverage rather than repeat broad increases. Keep the existing party direct-only review unchanged. Next start the regional completion boss calibration in parallel with final solo policy selection; 25 Fallen Knight, 50 Sand Tyrant, 75 Frost Wyrm. T5 preparation stays private; Ashlands disabled.
