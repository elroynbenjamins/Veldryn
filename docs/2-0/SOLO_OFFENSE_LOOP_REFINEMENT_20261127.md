# Solo offense loop refinement — 27 November 2026

Private test only. Owner approved class-specific secondary offense and target ordinary solo farming speed 75–85% of Damage. #1934 dedicated source-integration CI passed at c7e2dae9082db41749d9260d0f9021e3f6be458d (run 45987627749, job 140467171023), 648 solo executions and 432 party comparisons.

| Class | Original victories /24 | Approved direct-only | Doubled direct-only | Approved mean attempt seconds |
|---|---:|---:|---:|---:|
| Bastion | 8 | 12 | 15 | 52.55 |
| Ironwarden | 16 | 21 | 23 | 39.65 |
| Dreadguard | 24 | 24 | 24 | 34.34 |
| Dawnkeeper | 8 | 12 | 14 | 52.88 |
| Stonecaller | 24 | 24 | 24 | 33.93 |

Damage classes remain unchanged: 24/24 each, mean 8.39–15.08s. All unsuccessful solo attempts timed out, not wipes. Mean attempted duration includes timeouts. Party approved-start 81→83/216 wins, zero lost victories, Tank DPS 11.20→11.66, Damage 62.89→62.95, Support 16.78→17.40, Support HPS 3.89→3.88. Doubling yielded 84/216 wins, zero lost. Direct-only model does not resolve solo speed; notably Dawnkeeper has only one eligible direct action in current counter loadout. Do not equate damage coefficient changes with actual efficiency.

New 216 matched ordinary/elite solo sets, 648 new candidate executions. Same six levels 10/13/26/38/51/63, T1–T4, exact original class/Forge/counter-build, seed, fixed enemy, duration, and mock authority as #1934. Preserve historical arms; three new candidates:
- expanded_start: approved rates on basic and authored direct/DoT coefficient, using same capped replacement of legacy role conversion;
- expanded_double: doubled rates, same gentle cap;
- solo_tempo: expanded_double plus 30% shorter basic interval and 30% shorter purely offensive skill cooldown, with bounded floors 900/1000ms (never lengthens existing faster action). No changes to cast times, resource spends, control, taunt, healing or barrier coefficients or mixed support cooldowns. No changes to flat or true damage, generated procs or stored stats. Real lifesteal/trigger outputs may still change indirectly with more damage and basic attacks, measured rather than guaranteed unchanged.

All three are proposed QA sensitivity arms, not approved gameplay. Input adapter rejects more than one player/enemy, boss encounters, persisted player state and Q-mode. Damage classes exactly unchanged, including combat output. No party-mode application. Party direct-only evidence above retained separately. Actual authority and scope would require design and release review before implementation; this is a post-compile test projection, not runtime.

Measure kills/min across all attempt time (including failures) and ratio to Damage class reference within same level/enemy-kind; log normal/elite separately, actual direct/basic/DoT event amounts, basic hits, healing, HP, timeouts, wipes, ability coverage and relative efficiency. 648 additional executions plus baseline reproductions and deterministic repeats. No guarantee of 75–85% until new exact-head tests. If the remaining gap is large, examine pure offensive variant coverage and budget allocation before arbitrary global multipliers; preserve party roles. No live changes, no main merge/deploy. Inherited mobile, Edge, skills and gem runtime validation failures remain open; T5 preparation and disabled Ashlands unchanged.
