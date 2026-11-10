# Veldryn Player Market — Economy Controls v11

**Status:** hidden, draft, default-deny. The Player Market remains disabled, no user-visible listing/purchase route is activated, and no new item or Gold transfer is permitted by this pass.

## V11 decisions and implementation

**1. Minimum listing lots (per listing, not an extra tax)**

| Category | Example materials | Minimum |
| --- | --- | ---: |
| Starter high-volume supplies | Copper Ore, Greenwood Log, Moss Fiber, Boar Hide, Wisp Dust, Meadow Perch | 10 |
| Mid-tier farmable supplies | Ironwood Log, Wolf Pelt, Thorn Sap, Dunewood, Sunstone Ore, Copper Ingot | 5 |
| Scarce or late-tier inputs | Astral Script, Rimeglass, Glassbound Core, Cinder Heart | 1 |
| Exact saved equipment | Any approved T1–T9 Forge piece | 1 |

Every one of the 35 curated resources has its own entry in the [V11 Market economy register](./spreadsheets/player-market-economy-v11.csv). A listing can only proceed when **both** its item and price range **and** its minimum lot have separate server approval. Raw gems are not implicitly approved.

**2. Seller tax on completed transactions**

Use a **5% Gold sink** charged when a listing sells successfully (not on listing, cancellation or expiration). Round the tax **up** to whole Gold. The seller receives the rest. This applies to resource and exact-gear settlements through the authoritative locked database transaction.

| Sale (Gold) | Seller receives | Gold removed from economy |
| ---: | ---: | ---: |
| 19 | 18 | 1 |
| 100 | 95 | 5 |
| 101 | 95 | 6 |
| 1,000 | 950 | 50 |
| 10,000 | 9,500 | 500 |

Total Gold is conserved as **buyer loss = seller gain + burned fee**. A 1-Gold total sale cannot settle, because it would pay the seller zero. This is rechecked before any purchase balance is updated. The existing settlement ledger records gross, burned fee and net payout. Existing idempotent retries return the same receipt without a second debit or fee.

**3. Review-only weekly repricing**

The preview engine can suggest a change to each approved item's **min/max** after a rolling **7-day** set of actual settled offers meets all requirements:
- At least **30** uniquely identified settled offers
- At least **10 distinct buying accounts** and **10 distinct selling accounts**
- Evidence spanning at least **6 days** of the seven-day window
- Any single buyer/seller accounts for no more than **20%** of sales; a repeated buyer–seller pair no more than **10%**
- Settlement receipts satisfy actual **Gold, fee and payout conservation** and contain no self-trades or idempotency replays
- 10% of the highest/lowest observed prices are trimmed before the median is computed; suggested weekly change is capped at **±10%**
- All suggestions are **review-only**; none update database prices automatically. Thin, highly concentrated, and high-value markets require explicit review.

Do **not** use a seller's asking prices, local-client event payloads, incomplete listings, cancelled sales or unverified account activity as evidence. All history supplied to the evaluator must be fetched from server-settled purchase receipts and reconciled with the locked private Gold ledger. A separate read-only private evidence projection will be necessary at launch.

## Implemented foundations and dependency boundaries

- **V11A**, `20261110103500_market_lot_tax_policy_foundation_v11.sql`: independent private 35-row lot policy with **zero approved rows**, private 5% tax quote, RLS, no public/user permissions. Installed and verified on **staging only**.
- **V11B**, `20261110104000_market_offer_minimum_lots_private_v11.sql`: two private offer publishers enforce approved lot sizes in addition to existing price checks. Authored but **not deployed**; requires prior V8/V9 custody and V10B guards.
- **V11C**, `20261110104500_market_completed_sale_gold_tax_private_v11.sql`: two private purchase settlements reconcile buyer/seller Gold, charge 5% seller tax, burn fee and persist gross/net/fee atomically. Authored but **not deployed**; requires prior custody, settlement and V11B dependency chain.
- `backend/online/market-economy-policy-v11.ts`: deterministic read-only lot, tax and verified-sale review helpers; no permission to settle/approve.
- `backend/online/tests/market-economy-policy-v11.ts`: safeguards for tier/resource policy, overflows, rounding, Gold conservation, wash-trades, self-trades and duplicate settlements.

## Before any Market launch

1. Audit and reconcile the 2026-11-08 private custody/offer/purchase/claim migrations in their original order, first on an isolated staging environment. **Neither staging nor production currently has that complete chain**; do not skip migrations.
2. Run PostgreSQL rollback fixtures (including purchase vs cancellation races, seller Gold underflow/overflow, exact-gear receipts and idempotent replays) against the reconciled schema.
3. Confirm the combined V10+V11 predicates apply at **both** publish and buy time. Ensure no gem/quest/event-bound item has been implicitly admitted.
4. Validate the exact full-copy equipment socket/enchant/rarity/quality transfer and inventory delivery; fully audit listings and post-sale Inbox credits.
5. Add authenticated server-facing listing/price-search, no client-authoritative price changes, 20 active offers max, daily value limits and suspicious-value alerting.
6. Decide whether sufficient real trading volume justifies human-reviewed adaptive bands. **No unattended weekly adjustment is released.**
7. Only after separate release approval: authorize curated items and corridors, reconcile shadow transfers, lift DB hard-false flags and expose the mobile Market.

The Player Market roadmap proposal may be visible for voting; the **actual Market stays hidden**.
