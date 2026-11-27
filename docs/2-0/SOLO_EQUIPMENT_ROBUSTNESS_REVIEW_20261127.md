# Solo equipment robustness review — 27 November 2026

Private 2.0 QA only. Parent #1938 exact head 128372f66644ca0d0216c298dc39738a53f00a21 passed source integration (run 45992131080). All Tank/Support cases won in both budget arms (24 per class), no wipes/timeouts. Unweighted same-level/enemy-kind mean relative efficiency (Damage reference 100%):

| Class | Prior solo tempo | Wider budget | Wider budget + targeted skills | Min/max targeted per band |
|---|---:|---:|---:|---:|
| Bastion | 32% | 50% | 61% | 49–78% |
| Ironwarden | 51% | 67% | 71% | 39–96% |
| Dreadguard | 54% | 63% | 67% | 41–87% |
| Dawnkeeper | 35% | 49% | 66% | 53–99% |
| Stonecaller | 48% | 54% | 62% | 55–75% |

All Damage classes unchanged across arms. Some individual bands already exceed the intended 75–85%; blanket increases could overcorrect. Do not select or increase coefficients solely from this fixture. Actual role gear budgets differ, and prior pinned-reference rolls were not curated as high quality.

## New robustness experiment
- Levels 10,13,38,63 cover T1–T4. All nine classes/two specializations; two independent deterministic encounter seeds, ordinary/elite, three existing balance policies (solo tempo, wider role budget, wider budget plus authored skill factors).
- 198 real source-compiled gear builds, 792 matched three-arm sets, 2376 candidate executions plus deterministic repeats. Original pinned reference, all-common Q10–30, and partial-tier-upgrade common Q10–30 at T2–T4 (helmet, legs, cape, ring capped to previous tier; actual slots available depend on original canonical catalogue). No forced unowned items, no artificial quality/stat modification, no missing-slot filler or illegal paired-weapon offhand. Real draft roll generator filters accepted outcomes; exact templates, mint/claim/custody QA receipts and original affix-compatibility gates retained. This is a conditioned QA sample, not the distribution of player equipment.
- Fixed per-level enemy base on original reference builds, identical class/spec seed across gear/policy; actual compiled stats differ only by genuine equipment. Legal skill selection identical across gear profiles; Damage unchanged within each gear profile across policies. No new coefficients added. Compare throughput including all unsuccessful attempt time against both same-profile and pinned-reference Damage averages. Per-class profile/arm summaries include band counts below 75%, within 75–85%, above 85%, and missing reference denominator; normal/elite detail, actual quality/rarity, slot gaps and stats reported separately. Use minimum adequate candidate per class only after assessing all bands; if no candidate reaches target without overcorrection, revisit authored solo offensive variant coverage and underlying weapon stat budget rather than repeated blanket increases.

New exact-head CI pending. No live skill changes, no runtime role policy, no main merge/deployment. Parent mobile and Edge red, remaining inherited skills/gem validation not resolved. T5 preparation still separate, Ashlands disabled. Next after verifying robustness: choose minimal adequate candidate or refine individual skill loops, then move to regional completion boss calibration. No claim that final farming target or real player equipment availability is verified.
