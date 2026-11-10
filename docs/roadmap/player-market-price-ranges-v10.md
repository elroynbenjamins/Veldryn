# Veldryn Player Market — Price Corridors v10 (pre-release)

**Status:** Implemented as a **hidden, draft-only** price-policy foundation. Not approved for live player trading. Saved supplies, Gold, equipment, the Player Market UI, and the existing hard-disabled runtime guard are not modified by this proposal.

## Decision

Adopt FIFA/Ultimate-Team-style **minimum and maximum Buy Now prices**. Listings are priced in **Gold per resource unit** or per **exact forged equipment copy**. The seller chooses a price inside the server-owned interval; the Market will not create a listing or move an item unless its full authoritative custody checks also pass. Bidding, cross-account coin transfer, partial fills and market speculation algorithms are **not** part of the initial release.

The [35 curated resource bands + 9 tier-wide equipment anchors](./spreadsheets/player-market-price-corridors-v10.csv) are balancing **proposals**, not live market quotes. They're purposely *not* derived from NPC vendor resale prices.

## Draft examples (Gold)

| Asset or tier | Minimum | Maximum | Unit |
| --- | ---: | ---: | --- |
| Greenwood Log | 3 | 18 | per log |
| Copper Ore | 4 | 24 | per ore |
| Ironwood Log | 12 | 72 | per log |
| Dunewood | 40 | 240 | per log |
| Astral Script | 230 | 1,380 | per script |
| T1 forged gear | 600 | 3,600 | base per item |
| T2 forged gear | 1,900 | 11,400 | base per item |
| T3 forged gear | 5,500 | 33,000 | base per item |
| T4 forged gear | 10,000 | 60,000 | base per item |

Gear tier figures represent a **common-rarity, neutral-reference** anchor before the exact forged copy's modifiers. Both endpoints scale together, maintaining the same price-range width.

**Gear formula:** `base tier band × rarity multiplier × quality multiplier × permanent enchant multiplier`.

- Forge rarity: Common ×1.0, Uncommon ×1.25, Rare ×1.65, Epic ×2.5, Legendary ×4.0, Mythic ×6.5.
- Saved quality Q0–Q100: ×0.70 to ×1.30, linear; Q50 is ×1.0.
- Permanent enchant rank 0–4: ×1.00 / 1.12 / 1.24 / 1.36 / 1.48.
- Price increments: 1 Gold below 10,000; 10 Gold from 10,000; 100 Gold from 100,000.
- Actual item rarity and quality must be proven using its **exact immutable Forge receipt**. Legacy item-ID-only items stay unverified, not auto-assigned a quality/rarity.
- Gemmed equipment: gem IDs/rolls are preserved by the exact-copy escrow foundation, but **pricing gem value and final copy-movement auditing still require validation before any equipment listing release**.

The preview model is implemented in `backend/online/market-price-bands-v10.ts`; it **cannot approve a listing**. A server-owned, default-deny policy is in `backend/supabase/migrations/20261110095000_market_private_price_bands_v10.sql`.

## Risk controls and price governance

1. **No live user actions.** `PLAYER_MARKET_RELEASED=false`. The database trading and equipment-transfer guards are hard-disabled; tradability policies are default deny; no user-facing market write RPCs are granted.
2. **No unpriced assets.** Unsupported, event-bound, guild-only, quest and premium items cannot infer a trade value. Individual catalog and binding checks remain independent of price approval.
3. **Server validation on publish.** The pending `20261110095500_market_private_offer_price_guard_v10.sql` migration updates **both** private stack and equipment offer publishers to reject prices outside the approved corridor *inside their existing escrow transaction*. An unapproved tier or item gets no listing.
4. **No arbitrary client benchmarks.** Never trust suggested price, last asking price, account Gold amount, item type, or quality provided by the client. Only server-authoritative copies, approved policies and verified, settled market receipts may influence pricing.
5. **Launch fees (recommendation, not implemented):** 5% seller sale tax (Gold sink), disclosed before listing and calculated at settlement; no up-front fee for cancelled/expired listings to avoid punitive errors. Keep the current zero-fee prototypes disabled until settlement conservation is verified.
6. **Manipulation controls (recommended):** retain the 20-active-offer limit, self-trade denial, revision fences, idempotent whole-lot settlement, transfer-safe delivery and cancellation. Add per-account daily value caps and anomaly detection before release.
7. **Adjusting ranges (later pass):** initially hold static ranges. Once sufficient **verified completed trades** exist (proposed threshold: 30 trades, at least 10 distinct buyer and seller accounts, 7-day observation), use a winsorized median and sell-through ratio to recommend weekly revisions capped at ±10%. Never use unsold asking prices, a handful of accounts, self-trades or event hype alone to reprice. Human-review thin markets and exceptional equipment.
8. **New player protection:** don't automatically approve legendary/Mythic gear, very scarce event resources or high-tier gems at launch; observe farming time and crafting sinks first. Listing preview should show per-unit min/max, total quantity, estimated tax and net Gold, plus price increments.

## Release passes

| Pass | Purpose | Status |
| --- | --- | --- |
| V10A | Draft resource + T1–T9 gear bands; private, no grants | Implemented, staging foundation validated |
| V10B | Private offer publisher range guards | Authored, blocked by missing custody/offer migrations in staging/production |
| V11 | Content-driven tradability audit, tier/slot weighting, gems, exact enchant/socket proof | Planned |
| V12 | Completed-sale analytics, admin range tuning, anti-wash-trade limits, tax accounting | Planned |
| V13 | Mobile Market listing/search/checkout/Inbox UX and full snapshot-to-escrow reconciliation tests | Planned |
| Release | Production migration audit, kill switches, shadow transactions, launch flag | **Not authorized** |

The existing private custody migrations from Nov 8 are checked into GitHub but **are not installed in staging or production**. Do not attempt to run V10B, switch `trading_enabled` to true or expose Market UI before the entire dependency chain is reconciled and validated. The World roadmap's Player Market entry may remain visible as a future feature without exposing trading itself.

**Sources on mechanic, not Veldryn prices:** [EA official range/rules](https://help.ea.com/en/articles/ea-sports-fc/fc-rules/) and [EA price-range FAQ](https://www.easports.com/fifa/ultimate-team/news/2015/fut-price-ranges-faq).
