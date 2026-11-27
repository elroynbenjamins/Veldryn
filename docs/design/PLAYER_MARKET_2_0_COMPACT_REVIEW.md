# Player Market 2.0 — compact mobile UI concept (approval required)
Design-only, not an app screen. No imports, routes, navigation, theme, actual item names or live UI changes. All prices below fictional. Use established Veldryn pixel-art icons and approved theme/tokens after design approval; no new art or visual style assumed.

## Navigation and density
Market entry proposal: More shortcut or World destination (owner decision). Existing bottom navigation unchanged. Top header: back / Player Market / available Gold. One compact primary row: Browse | Sell | My Market. My Market has Listings | Inbox | History sub-tabs. Inbox unread/pending count reflects actual pending entitlements, never an estimated reward. Do not mount until coordinated 2.0. No preview tab in player build. Keep content scroll separate from sticky footer; measure actual navigation and safe-area insets, never absolute fixed screen-bottom offsets. At 320–359 dp, move nonessential filters to sheet and keep actions stacked if labels wrap. Minimum 48dp touch targets, accessible labels, system font scaling, no horizontal overflow. Test 320, 360, 384, 412, 480 dp plus landscape and 1.3x/2x text scaling; no device QA yet.

## Annotated wireframes (text mock)
Browse:
```
< Player Market                   12,450 G
[ Browse ] [ Sell ] [ My Market ]
[ Resources | Equipment ]  [ Filters ]
Search items…                  Sort: price
------------------------------------------
[icon] Copper Ore    1,000 available
       2 G / unit               [ View ]
[icon] Rare Helmet   T2 · Q77 · Rare
       125 G                   [ View ]
------------------------------------------
```
Resource detail sheet:
```
Copper Ore                  1,000 available
2 G / unit                 Expires in 6d
Quantity  [ - ] [ 100 ] [ + ]
[ Min ] [ 100 ] [ 1,000 ] [ All ]
Total                         200 G
[ Review purchase ]
```
Only show legal quantity shortcuts (dedupe Min/100/All, omit over-available or leaving invalid remainder). Use server quote with explicit recipient and expiry, recheck after price/revision change. Confirmation: "Buy 100 Copper Ore for 200 Gold?" Buyer pays gross; fee is seller-side. Never show stale confirmation or success before committed receipt. Resource vs gear filters: resource category/tier/price; gear slot, role/class, rarity, quality, damage type, tier, eligible recipient, sort. No client CP speculation. Equipment detail: exact approved base/rolled stats, quality, rarity, sockets, set identity and source label; choose recipient and optional comparison to equipped, using canonical comparison output. Missing stats show unavailable, not zero. No hidden or unapproved data.

Sell:
```
Sell                          19 / 20
[ Resources | Equipment ]
[ eligible owned item ]    Select
Quantity / unit price (resource only)
Gross                         125 G
Market fee                      7 G
You receive                   118 G
Listing duration               7 days
[ Review listing ]
```
Full-account count shared across characters/resources/gear. Explain bank withdrawal, protected or ineligible item without listing it. Exact-copy lock/favorite/equipped/loadout checks server-side. Resource quantity and minimum lot server policy; no fake item eligibility. Preview never overrides server restriction.

My Market:
```
[ Listings ] [ Inbox (2) ] [ History ]
Listings: Active 19 / 20 · expiry shown
Inbox:    Purchased item · Claim
          Expired lot · Return
          Inventory full · Make room
History:  Bought / Sold · total, fee, net
```
Receipt IDs internally only, no raw account IDs or private provenance, social name only where approved. Pending claim remains pending until committed destination update, even after source policy revocation. Full storage shows recovery instructions, not lost item. Claim/return target must be valid; no silent swap or auto-sell. Listing cancellation only returns unsold remainder; confirmation summarizes remaining quantity.

## States and implementation gates
Disabled/hidden -> no navigation entry and no item data. Loading skeleton, empty results, retry reads, stale quote/revision refresh, insufficient funds, partial remainder rejected, recipient mismatch, listing cap reached, expired/sold, inventory full, request in flight (one stable idempotency key), ambiguous network response (query receipt, do not initiate duplicate). No client authority from displayed quote. Separate server read models for browse, owned eligible inventory, listings, receipts/Inbox and history. Actual write UI requires authoritative authenticated API, quote/cap policy, physical serializer, release flags and owner visual approval. No real data or item art copied into mock; current fixture state model is not a UI component. 
