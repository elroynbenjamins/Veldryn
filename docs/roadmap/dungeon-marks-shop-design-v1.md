# Veldryn — Dungeon Marks Shop · V1 design and hidden foundation
**Prepared:** 2026-11-11 · **Status:** proposed balance, implementation in progress, **not live**.
**Code:** `backend/src/server/expeditions/dungeon-shop-catalog-v1.ts` (server catalogue and read-only quote; hard-disabled).
**Do not confuse with:** `DungeonMerchantPanel`, which spends temporary per-run dungeon resources on boons, artifacts and salves.

## 1. Core decisions
- **One existing account-wide currency:** Expedition Marks from validated dungeon reward claims. Use `public.expedition_wallets.expedition_marks`; no separate dungeon token or new currency conversion.
- **Permanent shop** accessible from the Dungeons landing/lobby screen once Dungeons unlock. Never make purchases during the timed dungeon run, and never reuse temporary merchant resources.
- **Two shelves:** capped weekly practical supplies and permanent collectible sets. No stock rotation or expiration for collectibles; each account buys a cosmetic/pet once.
- **Region progression:** Sunscar collectible purchases require one verified completed Sunscar dungeon on the account. Frostmarch collectibles require one verified completed Frostmarch dungeon. A player may see a preview with a clear lock reason, but cannot skip the region clear by having Marks from another activity.
- **No direct finished equipment, Mythic gems, boss-specific rare materials, Gold, additional Dungeon reward charges, or extra dungeon entry attempts.** The current rare boss drops and crafting retain their value.
- All shop rewards are account-bound. **Material lots must not become tradeable player-market stock.** If the inventory system cannot distinguish bound provenance, keep those particular offers disabled until a reliable nontradeable award or spend-credit path exists.

## 2. Current earning baseline (not altered by shop)
The source dungeon definitions use approximately **80 base Marks** for a Sunscar run; published difficulty multipliers are 1.00 / 1.10 / 1.25 (T1/T2/T3), so their base completion rewards are **80 / 88 / 100** Marks. First-clear and clean-clear bonuses (within a combined cap), Live Fellowship bonuses and completion conditions alter actual payouts. Server-side claimed rewards are authoritative.
Enhanced rewards replenish one charge per eight hours (maximum three), with 12 enhanced claims per account per UTC week. After enhanced rewards are exhausted, successful clears pay **20%** of their uncapped enhanced Marks; a separate weekly budget constrains failed-run consolation.
**Planning baseline:** 12 ordinary enhanced Sunscar clears yield **960–1,200** base Marks/week before extra bonuses, with additional reduced-pay runs possible. This is a reference range, not a guaranteed weekly amount. No increase to the current Dungeon Marks income is proposed for V1.

## 3. Weekly supplies (per-account UTC Monday 00:00 reset)
| SKU | Price | Exact account-bound reward | Max buys / UTC week | Intent |
| --- | ---: | --- | ---: | --- |
| Delver Tempering Satchel | **120 Marks** | 10 × `TEMPERING_DUST` | 2 | Affordable resource sink, roughly 1–2 base clears |
| Gem Dust Cache | **240 Marks** | 8 × `GEM_DUST` | 1 | Refining assistance, no free completed gem |
| Tempering Core Cache | **450 Marks** | 2 × `TEMPERING_CORE` | 1 | Mid-tier enhancement support |
| Companion Essence Cache | **400 Marks** | 100 Companion Essence, credited to account | 1 | Small Companion training option |
| Bondstone | **750 Marks** | 1 Bondstone, credited to account | 1 | Scarce ascension support; deliberate saving |

The weekly offers cost **2,080 Marks** if a player attempts all permitted purchases. This exceeds the normal 12-enhanced-clear baseline, so players must prioritize rewards rather than buy everything automatically. Per-week limits apply to *successful purchases*, not UI requests, and never prevent playing additional dungeons.

## 4. Permanent regional collections
Both regional sets use the same prices and bonus budget. **Rare** profile icons are visual-only; **Epic** borders and backgrounds provide **+2% active** to their specified attribute when selected and **+0.50% permanent owned passive**; **Epic** pets provide **+3% active** when selected and **+0.50% permanent owned passive**. Pet bonuses remain part of the normal collectible category caps, not an extra stacked Dungeon passive. Names, illustrations and exact bonus categories are provisional until launch review.

| Item | Price | Sunscar · Vaults and Mirage | Frostmarch · Shiverlake and Choir |
| --- | ---: | --- | --- |
| Rare profile icon | **500 Marks** | Solar Vault Key · purely visual | Resonant Bell · purely visual |
| Epic profile border | **950 Marks** | Amberglass Loop · +2% Crafting Speed equipped / +0.50% owned | Frostbound Chime · +2% Fishing Speed equipped / +0.50% owned |
| Epic profile background | **1,500 Marks** | Buried Observatory · +2% Skill XP equipped / +0.50% owned | Shiverlake Reflections · +2% Defense equipped / +0.50% owned |
| Epic themed pet | **3,000 Marks** | Vaultscarab · +3% relative ordinary Drop Chance equipped / +0.50% owned | Choirbell Sprite · +3% Action Speed equipped / +0.50% owned |

**Time-to-earn:** an icon takes roughly 5–7 base Sunscar clears; a pet 30–38; a complete four-piece regional collection is **5,950 Marks**, or about **60–75** base clears. Bonus-eligible results can accelerate these counts. There is **no collection-wide extra stat bonus**; purchasing more than one pet, background, or border never activates multiple selected-bonus slots. Owned passives remain constrained by the existing shared category caps.

**Art direction:** Solar Vault Key is a small brass/amber glyph; Buried Observatory shows a sunken astronomical mechanism beneath sandstone and flickering lamplight, with optional subtle dust motion. Vaultscarab is a small glass-backed desert scarab, *not* another Sunscar dragon. Shiverlake Reflections shows a frozen lake, ruins and distant bell towers with subtle snowfall and a reduced-motion static variant. Choirbell Sprite is a small spectral bell spirit, not a copy of the Frostmarch World Boss Wisp. Runtime rarity frames stay separate from pixel-art assets.

## 5. App layout and availability
Entry: Dungeons overview → **Marks Shop** button, showing the wallet balance on its face. This is a separate modal/screen, not the dungeon room Merchant. Tabs: **Supplies** | **Collections** | **Owned** (or compact chips if tab width is constrained). Above the list, show the wallet total and the next UTC weekly reset. Collections can filter Sunscar/Frostmarch and show the lock condition when the corresponding account-first-clear is missing.
Each offer is a compact icon/title/rarity/price row with exact contents or buff, weekly quota/owned state, and a confirm sheet. A two-tap purchase protects against accidental spend. After settlement, display the server receipt and updated balance; if the response is lost, refreshing must reveal whether the purchase was committed.
A purchased pet, border or background immediately appears in **Customize Profile**, and purchased account resources appear in the correct Companion and material balances. Account ownership persists when changing or deleting characters. Do not issue a collectible reward until the actual art/catalogue ID is supported by its customization gallery.

## 6. Transaction and anti-exploit requirements
Existing foundations:
- `public.expedition_wallets` contains one account-owned `expedition_marks` balance.
- `public.expedition_currency_ledger` supports negative purchase entries, has an idempotency key, and is readable by the owning account.
- `public.expedition_shop_purchases` already stores account ID, item ID, weekly period, quantity, Marks spent and purchase time. It lacks a dedicated purchase request key, and its existing index alone does not enforce purchase limits or permanent uniqueness.
- `public.online_game_states` owns the saved game-state JSON used by existing Guild Shop collectible delivery. It must be updated under the same transaction/lock order as the currency deduction, never by accepting client price or reward data.

**Server purchase contract** for the later controlled release:
1. Authenticate the account; verify feature flag, catalogue version, server-authoritative price and reward, and the appropriate Dungeon/region-first-clear.
2. Lock the account-owned online game-state and wallet rows in a deterministic order. Server-check permanent entitlement ownership, current UTC week purchase count, and available Marks. Require a unique account/request idempotency key and reject reused keys with mismatched parameters.
3. Atomically consume Marks, append a *negative* currency-ledger transaction, record a purchase receipt, and deliver the account-bound item or permanent entitlement (including companion balances) in the same transaction.
4. On timeout/retry, return the same receipt **without another debit or duplicate credit**; on partial failure, roll back everything. Never grant if a wallet debit cannot be validated.
5. The client may only read a server projection and submit a **SKU ID + unique request ID**, not price, quantity, item ID for reward generation, account ID, or a fabricated first-clear flag.
6. Run double-device, low-balance, duplicate request, week-boundary, character-swap, incomplete-art, material provenance, reward repair and insufficient-wallet tests before enabling.

**Current V1 implementation state:** Authenticated wallet and claim infrastructure pre-exist. The **new V1 server catalogue, quote/weekly-reset rules, and tests are staged as hidden code**, with an isolated TypeScript test command and Dungeon mechanics CI step. A disconnected **mobile presentation component** is also staged (`DungeonMarksShopView.tsx`), but is not mounted in navigation and has no purchase API. No actual currency debit RPC, material grant, entitlement grant, production schema migration or release flag is enabled. Building those and verifying actual account synchronization is a separate release gate, not evidence that items can already be bought.

## 7. Release and balancing checklist
- [x] Define two shop shelves, 13 SKUs, base prices, regional first-clear rules, and ownership/weekly caps.
- [x] Reuse existing Expedition Marks wallet instead of adding another currency.
- [x] Commit hidden server catalogue, read-only quote contract and basic static test suite.
- [x] Stage a mobile presentation component and isolated Dungeon mechanics CI test (unreleased; requires server projection wiring).
- [ ] Wire a server-authoritative, idempotent atomic transaction into existing wallet, ledger and profile/account inventory.
- [ ] Prove account-bound material provenance cannot be relisted in Player Market.
- [ ] Create all eight distinct icon/border/background/pet assets and collectible definitions.
- [ ] Build polished mobile shop screen with real wallet snapshot, preview and purchase confirmation.
- [ ] Validate database RLS, concurrent purchases, duplication, UTC limits, and post-purchase sync.
- [ ] Run T1–T3 economy playtests, including clean clears, Live Fellowship, missed weeks, and high-tier future expansion.
- [ ] Explicitly approve and enable on staging, then production, only when all requirements pass.
