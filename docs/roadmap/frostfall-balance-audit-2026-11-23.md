# Frostfall 2026 — deterministic balance review (23 November)

**Status:** REVIEW ONLY; not a gameplay balance approval or a release sign-off.
Source basis: `backend/src/server/expeditions/frostfall-endurance.ts`,
`event-service.ts`, `content/event-expeditions.ts` in the Endurance review branch.
No app UI, production flags, migration, price or combat tuning is changed by this document.

## Current event scope

- UTC play window: December 3 00:00 to December 27 00:00 (inclusive dates December 3–26).
- UTC claim-only cutoff: December 29 00:00.
- Five minimum-level tiers: 10 / 15 / 20 / 25 / 30.
- Six boss exits: after 7, 14, 21, 28, 35, or 42 cleared rooms.
- Exactly two rewarded **claims per account per UTC day**, not per character/tier; subsequent new runs are practice-only. Pending paid completions are counted against the start budget so players cannot create an unclaimable third pending payout.
- Base Frostbell Tokens per tier: 104 / 125 / 151 / 182 / 218. Depth multipliers: 1.00 / 1.15 / 1.28 / 1.38 / 1.46 / 1.52.
- The seasonal common-currency reduction of 25% applies after the base-depth calculation and event objective bonuses. Aurora Chimes are prestige-only, not a depth reward.

## Current *code-derived* enemy pressure versus base payout

Enemy pressure starts after the first checkpoint. The multiplier at boss depth `room+1` is
`HP = 1.035^max(0,room-7)`, `attack = 1.022^max(0,room-7)`,
`defense = 1.012^max(0,room-7)`.
These are raw enemy stat multipliers, **not measured player difficulty or completion odds**.

| Cleared rooms | HP factor | Attack factor | Defense factor | Base currency factor |
| ---: | ---: | ---: | ---: | ---: |
| 7 | 1.000 | 1.000 | 1.000 | 1.00 |
| 14 | 1.272 | 1.165 | 1.087 | 1.15 |
| 21 | 1.619 | 1.356 | 1.182 | 1.28 |
| 28 | 2.059 | 1.579 | 1.285 | 1.38 |
| 35 | 2.620 | 1.839 | 1.397 | 1.46 |
| 42 | 3.334 | 2.142 | 1.518 | 1.52 |

At the deepest boss, raw HP is 3.33x and attack is 2.14x the first-exit baseline before Warmth/boon/party build modifiers, yet base tokens are only 1.52x. This might be acceptable for an optional mastery challenge, but **cannot be called balanced without role-specific time-to-clear and failure-rate simulations**.

## Approximate token-budget sanity check

The values below use the base-depth tokens with the 25% common-currency reduction and ordinary rounding; they **exclude** Warmth/objective bonuses, quests, gifts, ranking, shop fees, failed runs, or other event income and are not a complete economy simulation.

| Tier | First exit, tokens/clear | Final exit, tokens/clear | 48 final-exit clears over 24 days |
| ---: | ---: | ---: | ---: |
| 1 | 78 | 119 | 5,712 |
| 2 | 94 | 143 | 6,864 |
| 3 | 113 | 173 | 8,304 |
| 4 | 137 | 208 | 9,984 |
| 5 | 164 | 248 | 11,904 |

Important: the Frostfall companion reputation requirements are 6,000 / 8,500 / 10,000, **not necessarily token-purchase prices**; never compare them directly to this token-only table as though they were the same wallet. Verify reputation gain separately from Frostbell Token gain and include event tasks, shop stock, other resource sinks and bank handling.

## Blocking experiments before balance lock

1. **Combat:** reproduce all five tiers, six exits and low/high role builds; measure real clear rate, median/95th-percentile run duration, damage taken, skill counters, potion depletion, Warmth and boon accumulation. Preserve Tank/2 Damage/Support composition.
2. **Reward fairness:** calculate tokens per minute and successful clear by exit/tier and compare to task rewards; avoid mandatory 42-room grinding. Verify two daily paid claims, pending claims, same-account multiple characters, UTC rollover and practice-only 0-currency settlements.
3. **Economy:** price-check all 20 event offers, two pets, companion reputation milestones (6,000/8,500/10,000), player access across tiers, weekly x100 resource bundle locks, inventory/bank overflow, and exploit/rollback paths.
4. **Compatibility:** test old event-route-v5 saves, co-op reconnect, duplicate reward request, Veilbreak migration parity, Rimebell boss loss and restart, and boss/season event coexistence.
5. **Android/UI:** actual mobile dungeon screenshots and appearance/theme approval, small-screen depth and daily-cap visibility, localization, signed AAB, exact-commit CI and Edge parity.
6. **Launch:** explicit separate go/no-go, production migration and Edge deployment, disabled event flags until authorized, monitored rollback plan.

## Verified staging parity note

On November 23, the staging-only migration `20261123181718_frostfall_review_event_completion_parity_v1` recreated the missing pre-existing Veilbreak `event_dungeon_completions_v1` table required by the seasonal advance RPC. Read-back confirmed RLS enabled, zero records, service-role SELECT/INSERT and no authenticated SELECT. Production already had the table and was not modified. This repairs predecessor-event parity; it does not count as Frostfall end-to-end combat validation.

## Calendar-correct milestone and shop affordability — verified against authored source

The 2026 Frostfall calendar runs for 24 playable UTC days (December 3–26).
`eventDailyGift` cycles its seven-day array rather than stopping after day 7.
The 2026 -25% seasonal common-currency adjustment applies **to each individual gift** with integer rounding down; Aurora Chimes are not reduced.

- All 24 gifts, if individually claimed: **4,609 Frostbell Tokens and 4,609 Frostfall Reputation, plus 3 Aurora Chimes**. This is a maximum for a player who claims every day, not typical player retention.
- Reputation thresholds from gifts alone still require **1,391** additional earned Reputation for the 6,000-point Rimeshard Wolverine, **3,891** for the 8,500-point Hearthguard Ram, and **5,391** for the 10,000-point Frostbell Herald. Shop purchases **spend tokens, not accrued reputation**.
- If all four community milestones are reached and claimed, they add **1,349** common Tokens/Reputation and **4** Aurora Chimes after the same common-currency adjustment. Gifts + all community rewards would total **5,958 Reputation** and **7 Aurora Chimes** before player activity.
- The two explicitly authored prestige shop items cost **4+10 = 14 Aurora Chimes**; claiming every daily gift and all community milestones only yields 7. The rest would need repeat caches or other verified sources, and that scarcity is **not yet signed off**.
- Fixed-price non-resource common shop stock totals **19,700 Tokens** if every quantity-limited offer is exhausted. The seven x100 equipment-resource bundles cost **8,500 Tokens per full weekly set** and reset weekly. An all-stock purchase is **not an expected entitlement**; these figures are a pressure test for choice and accessibility.
- Current product design permits profession-only progression, but **minimum time to earn 10,000 Reputation via gathering-only/crafting-only and boss-only routes is still unverified**. Include partial first/last event weeks and no compulsory combat in final economy QA.
- The production event_contributions, event_progress and event_daily_gift_claims tables returned **no Veilbreak/Merchant 2026 aggregate records** during the Nov 23 review. Do not claim a measured player-economy baseline; simulate the content and validate with staging fixtures instead.

This is an **authored-code calculation**, not evidence of a full end-to-end reward grant. Dedicated tests on the mobile release-check branch now assert the exact 24-day gift and prestige totals against `claimEventDailyGift`, including the claim-only cutoff.

## Nov 23 diagnostic follow-up — V3 proposal, NOT authorized for release

The original 60-case `launchPlayer` Endurance probe recorded 0/60 successful clears. An improved 75-case synthetic suite exercised the authoritative equipped-character -> co-op normalization -> combat chain across five tiers and multiple gear strengths. The initial baseline recorded 3/75 first-exit clears; all five deeper boss checkpoints failed at or beyond room 21.

To test **scoped fixes only** on the review branch, V3 introduced:
- New-run-only enemy baseline: attack ×0.72, HP ×0.80, defense ×0.90. Starter Tier I receives additional ×0.70 attack, ×0.85 HP, ×0.90 defense; Tier II receives ×0.85 attack, ×0.90 HP, ×0.95 defense. V3 is frozen by `run.graph.balanceVersion` and cannot affect already persisted V2 / six-room legacy runs.
- Later-floor scaling after initial checkpoint: attack ×1.010, HP ×1.016, defense ×1.005 per depth. At deepest boss: attack ≈1.42, HP ≈1.74 and defense ≈1.19 times its initial value **before V3 baseline**, compared with old unbounded-for-release 2.14 / 3.33 / 1.52.
- Rimebell boss **flat Ward + Frozen Carapace shield** values were defined at level 35 but not scaled to low tiers. A V3-only, server-owned `enemyShieldMultiplier` path now scales those two flat shield amounts to `seasonalPacing.hp × syncLevel/35` (minimum level ratio 0.25). Shield behavior is not changed for existing saved V2 runs, regular dungeons or other events. This separate fix is **still unverified in the final-source calibration**.

Measured CI results **before the shield correction** from the validated V3 depth/entry candidate (75 first-checkpoint cases; 50 deep-checkpoint cases, 1 seed per deep profile):

| Exit after rooms | Synthetic wins / attempts |
| --- | ---: |
| 7 | 61 / 75 |
| 14 | 9 / 10 |
| 21 | 8 / 10 |
| 28 | 6 / 10 |
| 35 | 2 / 10 |
| 42 | 1 / 10 |

The 61/75 first-checkpoint figure consists of Tier I 12, Tier II 12, Tier III 12, Tier IV 12 and Tier V 13 (each out of 15). Source: review workflow run `45271274464` at SHA `1dfb3fa913d05400dd323249a92a638d6d061e15`, whose **gameplay tests passed but overall workflow failed stale generated-Edge parity**. Newer shields and full-source CI are pending. Results are deterministic synthetic snapshots, not randomized production player outcomes; 1 deep seed/profile and missing real companions/potions are insufficient for release balancing.

Pre-boss diagnostics frequently showed combined party health at 75–90% of maximum, Warmth at 99 and 3/3 hearths; deeper boss fights still wiped. Therefore simply increasing camp healing is not the right first response. Need genuine boss counterplay, multi-seed build variety, rank-specific time-to-clear, and a physical Android acceptance before final tuning. Do not merge/deploy/activate based on these partial tests.
