# Expedition balance and affordability audit — 30 October 2026

Status: **pre-release estimates only; not observed live earnings**.

## Implemented server rules
- Five tiers; clear Marks = round(map base Marks × [1.00, 1.10, 1.25, 1.45, 1.70]).
- Rootbound base Marks = 74; tier clear = 74/81/93/107/126.
- Shared enhanced clear charges: 3 capacity, one restored every 8 hours, 12 enhanced payouts per UTC week.
- Extra first 3 **successful** Live clears: +25% of the full Marks, even when enhanced charges are depleted.
- Beyond the enhanced limit, **successful** clears continue granting 20% of tier Marks; there is no hard total Marks cap.
- Proposed failure policy in PR #669: no enhanced charge spent on failure; 12 consolation payouts per UTC week, each min(12, round(progress-adjusted full Marks × 20%)). Account/weekly quota and ledger receipt must remain atomic.

## Expected weekly income (hypothetical, not actual win rates)
Assumes 12 successful enhanced clears in a single tier, 3 of them successful Live clears.

| Tier | Clear Marks | 12 clears | 3 Live bonuses | Total |
|---|---:|---:|---:|---:|
| I | 74 | 888 | 54 | 942 |
| II | 81 | 972 | 60 | 1032 |
| III | 93 | 1116 | 69 | 1185 |
| IV | 107 | 1284 | 81 | 1365 |
| V | 126 | 1512 | 96 | 1608 |

The actual weekly total varies with wipe rate, queue delays, tier selection, prior charges, claims, and additional post-cap runs. Ten **additional successful** runs after cap earn approximately 150 Tier I or 250 Tier V Marks; unlimited play makes the true maximum unbounded.

## Design database comparison
Reference: uploaded `VELDRYN_Master_Design_Database_v4.5`, sheets `Expedition_Shop`, `Expedition_Supplies`, `Expedition_Blessings`, and `Expedition_Economy_Targets`.

- Casual target 350–550 Marks/week; engaged 800–1200; heavy 1200–1500. These are design targets, not measured payouts.
- Designed shop prices: expedition banner 250; simple dye 300; profile border 450; pet accessory 650; trail VFX 900; prestige cosmetics 2400–3200.
- Weekly material parcels 150–260; mastery token 200; upgrade pouch 225.
- Run supplies 50–140; weekly blessings 300–400.
- At 942 Tier I Marks for 12 eligible clears, a player could afford about 3 inexpensive 300-Mark cosmetics (subject to unique purchase limits) or a 900-Mark trail. At 1608 Tier V Marks, two 750-Mark cosmetics or 8 × 200-Mark utility purchases are theoretical, before weekly caps and unlock rules.
- A single 350-Mark weekly blessing costs ~4.7 Tier I full clears or ~2.8 Tier V full clears, ignoring bonuses.

## Findings / release gates
1. **Do not change shop prices yet.** The repository contains a purchase-storage table and generic personal cost deduction, but this review did not verify a complete live Expedition Shop catalogue and server-authoritative SKU price validation.
2. One weakness of the current infinite-postcap model: high-effort players can exceed the 1200–1500 heavy-player target. Observe actual post-cap runs before adding currency ceilings.
3. Tier V gives 70% more Marks per clear, but only 29% higher indexed enemy pressure. Actual efficiency must be measured using tier-appropriate win rates and run length.
4. Confirm end-to-end server-side shop purchase validation (SKU, exact price, stock/weekly cap, entitlement, idempotency, account ownership) **before** exposing new spending UI.
5. Validate candidate rewards with 1,000+ deterministic encounter samples per tier and representative player compositions; the small CI smoke audit alone does not establish target win rates.
6. Confirm that **failure consolation and charges** remain atomic under repeated and concurrent claims and don't retroactively adjust already claimed entitlements.
7. No production backend/schema rollout from this document. Verify AAB, minimum supported version, migration order, and staging Live multiplayer first.

## User-experience principle
Show earned Marks, Live bonus, and remaining enhanced charges after each run. Never promise a specific tier payout for an incomplete run; show an estimated full-clear amount in preparation.
