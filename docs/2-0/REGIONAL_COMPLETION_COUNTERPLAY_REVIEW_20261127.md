# Regional completion boss counterplay — 27 November 2026

Private QA only. Parent #1943 exact head 2019412acb7ee7bc6fb1e569bacd84f5f4a214a1 integration passed (run 45995605358): 864 executions, 216 matched sets. All four arms won every encounter (72/72 per boss per arm); both enhanced phases fired in every enhanced encounter. Mixed reference gear average seconds:
| Class | Fallen Knight | Sand Tyrant | Frost Wyrm |
|---|---:|---:|---:|
| Bastion | 96 | 65 | 71 |
| Ironwarden | 48 | 41 | 42 |
| Dreadguard | 44 | 35 | 35 |
| Dawnkeeper | 86 | 91 | 85 |
| Stonecaller | 45 | 49 | 45 |
| Ravager | 16 | 17 | 16 |
| Wayfinder | 11 | 12 | 11 |
| Hexweaver | 19 | 19 | 21 |
| Knife Dancer | 13 | 13 | 12 |

Mixed reference and common gear both cleared; neither wipe nor timeout. Boss phases fire but fast builds have less exposure to repeat mechanics. Do not solve this by raising HP alone. Numbers from synthetic engine fixtures, not live gear or gameplay. Parent mobile, Edge, skills and gem runtime remain red.

## New fixed-stat pressure candidate
Retain exact mixed boss HP/AP/DEF, phase thresholds, original shields, debuffs and damage coefficients. Shorten repeat cooldowns by 20% Fallen Knight, 25% Sand Tyrant, 30% Frost Wyrm; retain cast time, telegraph and interruptibility. Add small direct damage pulse at each authored HP threshold (.24/.30/.36 AP coefficient respectively, physical/fire/ice; target current enemy of boss). Phase pulses immediate, not telegraphed; deliberately bounded sensitivity, no HP floor, forced downtime, unavoidable one-shot or positional mechanic. Faster cast repetition may expose slower builds to more pressure; measure survival and avoid assuming it is superior.

## Counterplay and role coverage
324 matched five-arm sets, 1620 additional executions, nine classes/two specs, two same seeds, all three endpoints. Exact source reference/common Q10–30 and partial-tier common loadouts (helmet/legs/cape/ring capped to preceding tier). Preserve original enemy reference from pinned reference loadouts. Compare:
1. mixed_counter: reproduce prior mixed counter loadout (216/216 wins for previously tested gear), plus new mixed gear;
2. pressure_counter: enhanced pressure, same actor and approved starting direct secondary conversion;
3. pressure_default: three legal default skills, same enemy and equipment;
4. pressure_offensive: three legal offensive skills, same enemy and equipment;
5. pressure_counter_basic: counter build, same pressure, approved-start secondary conversion additionally applies to basic attack coefficient only. No ordinary-hunt doubled/widened scaling or attack cadence on boss, no stat/DoT/heal/shield/cooldown changes, Damage classes identical actor definitions. Potential indirect changes in resource/procs and healing measured. This is separate boss-specific sensitivity, not new runtime or player entitlement.

All candidates are preselected, not chosen after results. Counter selection uses existing legal authored effect score and is not proof of optimality or actual counter benefit. Report duration, wins, timeouts, wipes, remaining HP/enemy HP, phase and cast events, interrupts, actual debuff-cleanse events (not all forms of cleanse), phase damage and recovery. Confirm identical stats, thresholds, unchanged player equipment, legal builds, determinism and rejects ordinary-hunt policy on boss (parent), dungeon IDs/party/persisted-state for new boss projection. Private mock digest-bound authority only, no production verification or unlock/grant implementation. New exact-head CI pending.

Next evaluate actual boss pressure tradeoffs and alternative counter-builds; choose lowest viable candidate, don't enforce one class or skill. Ordinary Tank progression remains separate and unresolved; Support leading candidate from #1942 retained. Develop server-owned authenticated, idempotent completion receipts and existing victory migration separately after source/gate verification. Ashlands disabled, T5 preparation separate. No main merge/deploy, no live changes.
