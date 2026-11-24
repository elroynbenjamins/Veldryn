# Equipment 2.0 V25 — temporary stat overlays and validation ordering

24 November 2026. Draft only. V14 catalogue/economy, V17/V18 authored effects, C12 and D1–D10 unchanged.

## Validation
At readback V22, V23 and V24 private expanded integration and catalogue jobs remained queued. V24 exact head e346d6f8dd31b07b24c0d464b0e05bc6a186bc7d: expanded integration 45398090952, hidden catalogue 45398091536, GameState 45398091273. No new combat outcomes or passing CI claims. V21 fixture corrections still await a verified run. V25 readback compared the ten newly committed timed source entries against the exact V17/V18 JSONs; all ten matched magnitude, duration, cooldown. Source verification is not execution or approval. Added source audit tests and moved all V22–V25 boundary test blocks ahead of long V21+ matrices, so those checks can report before a later benchmark failure.

## Temporary Defense
Nine exact records / three distinct mechanisms:
- Oathplate 4p T1/T2/T3/T4: +3.2/3.6/4/4.4% Defense for 6s after an original nontrue direct hit removes >=5% max HP, 18s cooldown. T5 original source +4% for 6s, 16s cooldown. Preserve nonmonotone T5 coefficient; no silent rebalance.
- Oathguard's Riposte, Ironwarden dungeon weapon T2/T4/T5: +4% Defense for 5s, 20s family cooldown.
- Bastionmail 4p Braced Formation: +4% Defense for 5s, 14s cooldown.
For Riposte/Braced Formation, conservative fixture trigger requires actual positive HP loss on an original direct nontrue hit with positive ordinary mitigation coefficient; not an invented block event. Fully absorbed hits do not earn these candidates. Buffs never modify frozen item or actor baseline stats. Apply strongest active timed Defense bonus multiplicatively to effective defense before normal mitigation; no true damage benefit. Distinct channels may coexist; no same-tick activation benefit, exact expiration, source family cooldown starts on earning, no active refresh/stack. These are provisional semantics, not a global final stack policy.

## Temporary Haste
Runeforge Link 2p Frostworked Momentum: +2 percentage points of Haste for 6s, 18s cooldown, earned on original effective direct class ability hit or effective direct class heal, with duplicate event protection. Source V18 explicitly reauthors relative-percent wording to pp; preserve as a review candidate. Future basic and ability cooldown scheduling only, no retroactive cooldown reductions; same-tick exclusion. Private single-actor QA scope for Ironwarden/Ravager/Dawnkeeper; no new public stat authority. Spell-only Nightglass, evade-triggered Defense and ally-target Defense remain blocked pending more precise spell/evade/ally provenance; no guessed event classification. Attack buffs not added in this pass.

## Validation prepared
Added event boundary tests for owner, duplicate and source-family rejection, exact thresholds, time and cooldown, strongest-only Defense, effective heal and outgoing hit Haste. These are isolated event tests, not a new full matched combat matrix. No confirmed CI run yet. Current private adapter supports 20 source definitions / 12 distinct mechanics including the prior V22–V24 work; 122 source definitions remain unsupported. Source identities are not owned or equipped copies. No effect coefficient/CP/release approval. Existing Expo, tool economy/mobile UX and Edge bundle parity blockers remain; no generated bundles rebuilt.

Next: validate queued compilation, boundary checks and V21–V24 combat matrices; then run targeted timed-stat matched combat pairs and investigate real spell, evade and shield provenance before additional hooks. No main merge, staging/production DB, release flags, mint/market authority or deployment.
