# Player Market 2.0 — compact mobile UI concept (approval required)
Design-only, not an app screen. No imports, routes, navigation, theme, actual item names or live UI changes. All prices below fictional. Use established Veldryn pixel-art icons and approved theme/tokens after design approval; no new art or visual style assumed.

## Navigation and density
Market entry proposal: More shortcut or World destination (owner decision). Existing bottom navigation unchanged. Top header: back / Player Market / available Gold. One compact primary row: Browse | Sell | My Market. My Market has Listings | Inbox | History sub-tabs. Inbox unread/pending count reflects actual pending entitlements, never an estimated reward. Do not mount until coordinated 2.0. No preview tab in player build. Keep content scroll separate from sticky footer; measure actual navigation and safe-area insets, never absolute fixed screen-bottom offsets. At 320–359 dp, move nonessential filters to sheet and keep actions stacked if labels wrap. Minimum 48dp touch targets, accessible labels, system font scaling, no horizontal overflow. Test 320, 360, 384, 412, 480 dp plus landscape and 1.3x/2x text scaling; no device QA yet.

## Annotated wireframes (text mock)
Browse — refined mobile design proposal (27 November):
```
< Player Market                      12,450 G
 Browse          Sell          My Market
╭──────────────────────────────────────────╮
│ Search items…                     clear │
╰──────────────────────────────────────────╯
 All items      Resources      Equipment
 24 results     Lowest price ▾     ⚙ Filters
 [T2 ×] [Rare+ ×] [Clear all]      (only if set)
 ─────────────────────────────────────────
 [icon] Copper Ore                      2 G
        1,000 available              / unit  ›
 ─────────────────────────────────────────
 [icon] Iron Helm                     125 G
        T2 · Rare · Quality 77%             ›
```
* Search and asset category are the only primary controls. Default All items; switch category without navigating away. Search uses canonical player-facing names and aliases, not internal IDs. Search field has a clear affordance, submit/short debounce (250–350 ms candidate), cancel stale reads; category/sort/filter changes reset pagination. Keep text and scroll state on returning from item details. No extra permanent row for each facet. Keep results as the majority of the viewport.
* Sort + Filters share the result-count toolbar. Default lowest unit price for resources and lowest item price for equipment; make mixed-view unit-price semantics explicit. Sort sheet offers lowest price, highest price, newest; no unsupported price/CP sorts. Applied filters become removable compact chips; show max two plus “+N” on narrow screens with full accessible summary in sheet; Clear all resets applied facets but not search or primary category. Filter icon includes active facet count, not number of selected values. Empty search is not an active filter. Keep count from server response; use ellipsis/loading rather than invent numbers.
* Whole result row is the detail target; no repeated Buy/View buttons. Use existing pixel-art item icons, rarity accent only on equipment name/edge, readable neutral price and metadata. Two-line rows preferred, minimum 48dp touch target, 40dp visual icon, 56–72dp standard row target. Resource rows show current remaining quantity and per-unit price; equipment rows show tier, rarity, quality and total price, no “/unit” or artificial quantity. Do not mix per-unit and total silently. Missing stats show unavailable only inside detail. No seller identifiers, raw receipts, private provenance or fake gear art. Never allow one-tap purchase directly from search results.
* Keep item names left-aligned, prices aligned on the right, and chevron subtle. On 320–359dp or enlarged text, allow item name/metadata to wrap and price move below name if needed; no ellipsis on price or quantity. Header/search/categories remain compact; scroll results without obstruction. Preserve existing bottom navigation and safe areas. If filtered, show result count and current applied chips; if empty, use “No matching items” with Clear filters, or “No listings yet” without filters. Keep applied filters on read failure and provide Retry; avoid flashing empty state during refresh.

Filter bottom sheet — one scrollable sheet, sticky action footer:
```
                  ━━━━━
 Filters                            Reset
 Find equipment that fits your build
 ─────────────────────────────────────────
 Tier
 [Any] [T1] [T2] [T3] [T4] [T5]
 Equipment type
 [Any slot ▾]               [Any role ▾]
 Rarity
 [Any] [Rare+] [Epic+] [Mythic]
 Quality
 [Any] [50%+] [75%+] [90%+] [Custom]
 ─────────────────────────────────────────
 Price range · Gold per item
 [Minimum             ] [Maximum          ]
 ▸ Advanced filters
 ─────────────────────────────────────────
 [            Show 24 items              ]
```
* Contextual groups: Equipment — tier, slot/type, role/class, rarity minimum (or Any), minimum quality, price range. Damage type and named stat threshold belong in Advanced filters, collapsed by default. Eligible recipient option only when real server eligibility available. Resource — tier and resource category (raw / refined / other approved categories), unit-price range; full listing cost is an advanced distinct filter. Mixed All items — tier and total/lot price only, plus category; no gear-only controls until Equipment selected. If an incompatible category is chosen, clear incompatible facets explicitly; never retain invisible filters. Use only actual supported canonical metadata and policy values; unsupported controls remain unavailable rather than applying a client-only subset.
* “Any” means no filter; a single selected tier or rarity threshold uses a radio-style chip group, not ambiguous AND selections. Quality quick presets use inclusive minimum; custom numeric 0–100; distinguish unset from zero. Price inputs accept whole Gold, no negative or inverted range; field-level error and disable Apply until valid. No slider requiring precision for very large prices. Sort is separate from filters. Maintain focus, labels, contrast, non-color selection indicator and 48dp targets. No horizontal scroll requirement for chips; wrap as needed.
* Applied filters and sheet draft are separate: open copies applied state; edit drafts without fetching a new main list; Reset clears draft; Close/back discards draft; Apply commits valid changes once and resets page; preserve selected category. Footer “Show N items” only when an authoritative preview count exists for current draft, otherwise “Apply filters”. Cancel/ignore stale preview requests; no optimistic counts. Sheet uses measured safe-area and keyboard insets; at large font or landscape switch to full-height modal with same content, focus management and sticky footer. Keep scroll state independently from Browse. Use 320/360/384/412/480dp, long localized labels, 1.3x and 2x fonts, keyboard, screen reader and back gesture in acceptance tests.
* Existing disposable browse supports only bounded fixture categories, tier, exact rarity, quality threshold, stat and total price. Role/slot/damage type, minimum rarity, unit-price filters, friendly-name/alias lookup, count preview, authenticated cursor/snapshot pagination and actual EQ2 stats need authoritative integration. These are design proposals, not approved policy or UI changes. Before implementing, obtain visual approval; never mount new screens in live 1.0.x.

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
