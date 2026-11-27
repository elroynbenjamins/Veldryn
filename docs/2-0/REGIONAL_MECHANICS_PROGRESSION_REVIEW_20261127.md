# Regional mechanics-driven difficulty — 27 November 2026

Owner approved: difficulty must derive from stronger skills and mechanics as well as stats. Region bands T1/T2, T2/T3, T3/T4; future Region 4 T5 throughout, disabled. T6–T9 deferred.

## Prior evidence
Exact #1926 head a25cef5c42c85fc29893c4105acaa46329c4cff1 private source-integration passed (run 45977734039): 360 regional matched comparisons, 432 boss matches, 108 compiled CP profiles, 169 canonical pieces/338 recipes/22 distinct ingredients (corrects earlier documentation count 23). In 30s tests Tanks and Supports had zero victories across all ordinary/elite groups; damage upgrades improved multiple groups. 60s boss matrix reference accessible 71/72 wins, standard 10/72 wins, pressure 0/72 wins. Do not equate timeouts with deaths or approve difficulty; new tests deliberately use a longer solo time window and different HP/AP reference. Mobile, Edge, synchronization and gem runtime validation remain red.

## New mechanic candidates
Asterfall: Bramble Strike (physical direct, stronger coefficient and poison at midpoint), Bark Guard (elite barrier).
Sunscar: Scorching Brand (fire direct and burn, stronger upper band), Sandglass Ward (elite barrier).
Frostmarch: Glacial Rupture (ice burst and removable damage-taken debuff), Rime Pulse (elite frostbite periodic damage).
Use existing supported effect kinds; no fake stacking/chill/armor penetration claims. Telegraphs interruptible, no manual input dependency. Ordinary receives a primary skill, elite complementary secondary; existing deterministic trait compiler still applies. These are isolated archetype fixtures, not a production enemy catalogue. No boss identity changes.

180 matched four-arm sets, 720 executions, five launch checkpoints, nine classes/two specs, normal and elite, same seed per set; reference, full previous stat increment, enhanced abilities with identical reference stats, and enhanced abilities with 40% of the previous log-space stat increment. All arms use appropriate tier compact original Forge compiled builds, fixed stats per checkpoint, 60s duration; same actor and same kit RNG. Report wins, HP, enemy HP, duration, observed casts/interrupts/periodic/status/shield counts by role/step/arm. Prior stat-only matrix retained. Values not approved; future targeted/alternative counterloadout comparisons and live enemy source mapping needed.

## Equipment reconciliation
All 338 canonical recipe wear/profession boundaries audited under a prospective overlay; 178 T3/T4 recipes (89 pieces) need changed wear candidate from 26/40 to 37/62, T1/T2 unchanged 2/12. No changes to immutable manifests, mint snapshots, equip authority or independent profession gates. Ingredient demand min/max and shared-tier reuse logged for each canonical input; actual supply routes, gathering rate, component recipes, and quantity balance still unverified. T5 server catalogue absent. Prepare versioned migration only after source review, do not lock existing characters out.

## Gates
New exact-head CI pending. No main merge, live migration/deploy, final coefficients, live enemy skills, CP or regional gate approval. Next: read mechanics traces and solo viability; actual enemy catalogue mapping and alternate counters; verify material sources and versioned wear/recipe reconciliation; completion boss gate identity/persistence; T5 canonical preparation while Region 4 remains disabled.
