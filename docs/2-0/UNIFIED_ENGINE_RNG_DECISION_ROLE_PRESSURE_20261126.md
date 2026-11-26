# Pass 7J — RNG evidence and first role-pressure calibration

Pinned #1857 99ae097c8991bd94aca1a81398fd40147da857aa; Skills job 139914800986. Compilation, original unit tests, live Edge isolation, authenticated build transport, PG17, hidden mobile preview and synthetic 540-case matchup job passed. Original persisted numeric fence still fails on one historical outlier, as intended. Both flexible matrices passed.

| Batch | Legacy mean damage ratio | Legacy min | Legacy improved | Action-stream mean | Action-stream min | Action-stream improved |
|---|---:|---:|---:|---:|---:|---:|
| 0 | 1.0416 | .8429 | 404 | 1.0388 | .9652 | 412 |
| 1 | 1.0418 | .9251 | 400 | 1.0399 | .9375 | 410 |
| 2 | 1.0393 | .9190 | 400 | 1.0404 | .9783 | 419 |
| 3 | 1.0416 | .8657 | 393 | 1.0390 | .9660 | 413 |

Total 1,728 comparisons per policy. Legacy 1,597 improved (92.42%), mean +4.1075%; candidate 1,654 improved (95.72%), mean +3.9525%. All candidate numerical fences pass, 0 lost baseline victories both policies. Bellbeast original seed candidate ratio 1.014863, victory 24.9s versus 25.5s baseline; all four candidate seeds improve 9s damage and clear faster in the extended diagnostic. Candidate is preferred for private relative calibration only. Half-range RNG probability defect remains separately unresolved, no default or release adoption; preserve old distribution for controlled comparison. Before future adoption require full [0,1) probability calibration, versioned persisted policy and performance evidence.

Short role reports have poor exposure: Hexweaver relative DPS approximately .69-.70 of same-role peers but interrupt utility concentrated; Wayfinder ~1.18-1.20. Dawnkeeper healing vs Stonecaller shield generation is not directly comparable. No class coefficient changes justified yet. Add fixed boss reference pressure matrix using all 36 legal dungeon compositions, six bosses, two specialization bands, three pressure bands and two seeds: 2,592 scenarios and 10,368 personal observations. Explicit tactical and candidate RNG, Synchronization off, real boss-targeted two-skill loadouts, original 13-channel synthetic gear and signed QA custody. Boss attack and HP fixed across compositions at a boss/pressure stratum from the nine-class unequipped mean, not rebalanced per party. Record phase/cast exposure, role-specific metrics and peer ratios per band; replay sampling and existing authority/finite-state guards. No equal CP certification, no final class recommendations based only on this fixture. New matrix CI pending.

No production changes, migration, deployment, main merge or threshold relaxation.
