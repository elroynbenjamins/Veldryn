# Regional progression and crafting checkpoints — approved 27 November 2026

Scope: hidden 2.0 work. Owner approved the overlapping T1–T4 progression across the three 25-level regions, stronger region transitions and smaller halfway steps, and one regional completion boss per region. Region 4 is post-2.0, T5 throughout. T6–T9 deferred at least one month. No change to existing live dungeon boss pools: six authored dungeon profiles remain separate from the single regional progression gate; actual gate boss identity and completion persistence still need source verification.

| Region | Lower band | Upper band | End gate |
|---|---|---|---|
| Asterfall | 1–12 T1 | 13–25 T2 | 25 |
| Sunscar | 26–37 T2 | 38–50 T3 | 50 |
| Frostmarch | 51–62 T3 | 63–75 T4 | 75 |
| Region 4 (disabled) | 76–87 T5 | 88–100 T5 optimized | 100 |

Tier expectations are difficulty targets, not compulsory full-set checks. Strong builds and counterplay remain valid. Candidate wear checkpoints T1=2, T2=12, T3=37, T4=62, T5=76. Preparation windows start at levels 1, 8, 32, 57, 70 respectively; these are design targets for availability, not combat requirements for professions. T5 prep window is future-only until catalogue and acquisition rules are approved; do not activate Region 4 or T5 automatically.

## Candidate difficulty
On top of an independently smooth reference curve: each midpoint adds relative HP 8%, attack 6%, defense 4%; each region entry adds 16%, 12%, 10%; separate endpoint boss comparison adds 25%, 15%, 10%. Multipliers compound; review results before choosing final values. No adaptive scaling to actual player CP. 360 matched ordinary/elite QA comparisons (five launch steps, nine classes, two specs, two seeds, two enemy kinds); 30 role/step/kind summaries. Same character level for both pressure conditions, same enemy reference, compare prior gear against expected tier after step. The three region-ending bosses require separate gate-specific tuning after identities are confirmed; existing six dungeon profile matrix is not a substitute. Region 4 policy has no gameplay implementation.

## Recipe and acquisition audit
169 pinned pieces and 338 recipes across T1–T4; 23 distinct input IDs. Current wear field T1=2/T2=12/T3=26/T4=40; T3 and T4 conflict with candidate equip checkpoints. Current profession recipe gates 1/8/20/34 remain independent of combat. Preserve earlier source access where sensible, rather than delaying professional progress. Do not silently change existing recipe IDs or frozen copy eligibility. Need a versioned wear/recipe reconciliation and migration plan.
For every foundation/alternate ingredient report proposed acquisition window, all tiers using it and candidate route. Foundation ingredients require non-boss acquisition before the intended checkpoint. Ordinary combat materials can be traded/commissioned; rare elite or boss materials belong to optional premium recipes/sets, never the only route to baseline upgrades. ASTRAL_SCRIPT and THORN_SAP need actual source reconciliation. All source routes remain UNVERIFIED; audit does not claim these items have accessible drops or component recipes. Existing T4 recipes still rely heavily on Sunscar inputs. T5 has zero canonical recipes; do not mint/enable until reconciled, while preparing the catalogue as a priority. Resource quantities, gathering rates, refinement recipes and time-to-upgrade need actual source-led calibration.

## Repair and validation
Parent #1923 compact CP workflow passed, integration failed at unrecognized authored boss. Restore exact canonical boss names from the existing verified six-boss fixtures. New exact-head CI pending; no claim that repair or new simulations have passed. No live rule imports, main merge, migration, production deployment, final CP/difficulty approval. Existing mobile/Expo, Synchronization and Edge failures remain.
