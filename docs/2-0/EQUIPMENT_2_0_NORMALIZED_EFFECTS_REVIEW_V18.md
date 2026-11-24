# Equipment 2.0 V18 — effect normalization and event review

24 November 2026. V14 canonical catalogue/economy baseline remains authoritative for review. V17 preserved source effects are normalized without modifying originals. No final stat, CP, effect, ownership or release approval.

## Coverage
All 95 exact families /195 attainable milestones have structured candidate descriptions: 127 V17 additions and 68 V18 normalizations (28 permanent and 40 conditional). Original V7 milestone texts, values, source cooldowns and IDs preserved. Candidate Sphinxclaw next-hit expiry 6s fills an unspecified source duration; haste percentage wording requires explicit percentage-point reauthoring, healing scope remains a decision. Bellwake's named charge is one direct damage OR effective heal bonus, never generic Potency or two charges. 27 dungeon signature traits retained. Six rare blueprint trait candidates now have precise draft trigger, value, duration and cooldown:
- Ironroot Guard T2: three direct non-true HP-loss events in 10s, next direct non-true hit within 6s gets 5% reduction, 22s ICD.
- Woodland Mending T2: effective ally heal grants 2.5%-target-max-HP shield for 5s, 20s ICD.
- Mirage Precision T3: successful verified evade grants next ability attempt +3pp accuracy within 5s, 18s ICD.
- Amberglass Ward T3: actual authored shield grant gives target heal of 1.5% target max HP, 22s ICD.
- Steadfast Anchor T4: first elite heavy direct non-true hit gets 6% reduction once per encounter, 40s ICD.
- Spellthread Echo T4: eligible direct class ability hit refunds 0.5s of that ability's cooldown if at least 1s remains, 20s ICD; no basics or recursive procs.
All six remain recipe/source-gated and max one copy equipped. These are numerical proposals, not implementation of current gameplay.

## Event review and stacking
142 conditional candidate records (96 V17 set/trait +40 normalized +6 blueprint). Review-only classified-event ledger checks source eligibility, thresholds, count, target, shield source, duplicate event, recursion, true damage where ineligible, over-heal and cooldown/charge guards. Candidate cross-effect policy: damage bonuses sum capped at 20% for same event; strongest temporary equipment damage reduction capped 15% (never true damage); strongest equipment-origin shield on target, no additive stacking; class shield interaction open; cooldown refunds max 0.5s. Permanent channels aggregate once with cap. Shared trait family per-owner ICD across tiers; one-use and expiry for charges. This is an abstract QA ledger, not an actual engine event classifier, combat effect resolver, custody validator or real shield depletion implementation. Negative and positive fixture tests, source reconciliation and trace shape tests added.

## Real private engine boundary
Previous V17 exact-head focused checks succeeded: hidden catalogue 45380381503, isolated core 45380381481, private integration 45380381493. Broader Edge parity, gem/dungeon runtime, release economy, merge regression, mobile core and dungeon mechanics workflows failed; Skills validation was queued when checked. No claim these are caused by or fixed by V18.

V18 opts into exporting 324 baseline traces from the existing original Forge + authored persisted boss private QA engine harness. A separate Node audit produces 972 rows (324 baseline +648 set/trait shadow opportunities) with source role/class/tier-specific proposed dungeon effects. These are broad trace hints, not verified trigger events, item custody, applied effects or actual candidate outcome simulations. Raw event fields cannot establish all damage schools, evade causes, exact event eligibility or HP threshold crossings. Candidate outcomes remain null. New private integration workflow executes baseline replay and trace audit on CI; no V18 exact-head result confirmed. The previously planned 972 effect-applied encounters remain blocked pending typed event provenance, actual candidate loadout/custody rules and isolated executable effect compiler approval. No player CP calculation or release authorization.

Next: confirm CI, fix broader regression blockers separately, extend private engine event evidence with exact source fields, implement isolated effect replay/calibration with authoritative candidate fixture IDs and deterministic seeds, and review full D1–D10 decision packet. No runtime route, live game, database or main merge modified.
