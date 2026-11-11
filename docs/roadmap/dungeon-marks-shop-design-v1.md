# Veldryn — Dungeon Marks Shop · V1 design and hidden foundation
**Prepared:** 2026-11-11 · **Status:** three-region hidden catalogue, private staging RPC foundation and dev-only shop preview committed; **production not live**.
**Code:** `backend/src/server/expeditions/dungeon-shop-catalog-v1.ts` (server catalogue and read-only quote; hard-disabled).
**Do not confuse with:** `DungeonMerchantPanel`, which spends temporary per-run dungeon resources on boons, artifacts and salves.

## 1. Core decisions
- **One existing account-wide currency:** Expedition Marks from validated dungeon reward claims. Use `public.expedition_wallets.expedition_marks`; no separate dungeon token or new currency conversion.
- **Permanent shop** accessible from the Dungeons landing/lobby screen once Dungeons unlock. Never make purchases during the timed dungeon run, and never reuse temporary merchant resources.
- **Two shelves:** capped weekly practical supplies and permanent collectible sets. No stock rotation or expiration for collectibles; each account buys a cosmetic/pet once.
- **Region progression:** Asterfall, Sunscar and Frostmarch collectible purchases each require one verified, claimed successful dungeon clear in the matching region on the account. A player may see a preview with a clear lock reason, but cannot skip the region clear by having Marks from another activity.
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
All three regional sets use the same prices and bonus budget. **Rare** profile icons are visual-only; **Epic** borders and backgrounds provide **+2% active** to their specified attribute when selected and **+0.50% permanent owned passive**; **Epic** pets provide **+3% active** when selected and **+0.50% permanent owned passive**. Pet bonuses remain part of the normal collectible category caps, not an extra stacked Dungeon passive. Names, illustrations and exact bonus categories are provisional until launch review.

| Item | Price | Asterfall · Rootbound & Lantern | Sunscar · Vaults & Mirage | Frostmarch · Shiverlake & Choir |
| --- | ---: | --- | --- | --- |
| Rare profile icon | **500 Marks** | Warden's Lantern · visual only | Solar Vault Key · visual only | Resonant Bell · visual only |
| Epic profile border | **950 Marks** | Briarbound Frame · +2% Gathering Yield equipped / +0.50% owned | Amberglass Loop · +2% Crafting Speed equipped / +0.50% owned | Frostbound Chime · +2% Fishing Speed equipped / +0.50% owned |
| Epic profile background | **1,500 Marks** | Rootbound Sanctuary · +2% HP equipped / +0.50% owned | Buried Observatory · +2% Skill XP equipped / +0.50% owned | Shiverlake Reflections · +2% Defense equipped / +0.50% owned |
| Epic themed pet | **3,000 Marks** | Oathroot Seedling · +3% Healing Effectiveness equipped / +0.50% owned | Vaultscarab · +3% relative ordinary Drop Chance equipped / +0.50% owned | Choirbell Sprite · +3% Action Speed equipped / +0.50% owned |

**Time-to-earn:** an icon takes roughly 5–7 base Sunscar clears or 6–8 Asterfall clears; a pet 30–38 Sunscar or roughly 33–41 Asterfall clears; a complete four-piece regional collection is **5,950 Marks**, or about **60–75** base clears. Bonus-eligible results can accelerate these counts. There is **no collection-wide extra stat bonus**; purchasing more than one pet, background, or border never activates multiple selected-bonus slots. Owned passives remain constrained by the existing shared category caps.

**Art direction:** Asterfall's Warden's Lantern icon depicts an oathbound brass lantern; Briarbound Frame uses crisp tangled roots and amber highlights; Rootbound Sanctuary is a layered overgrown vault with lantern glow and moss, and Oathroot Seedling is a tiny oathglass-root guardian, visually distinct from Hollowroot's World Boss pet. Solar Vault Key is a small brass/amber glyph; Buried Observatory shows a sunken astronomical mechanism beneath sandstone and flickering lamplight, with optional subtle dust motion. Vaultscarab is a small glass-backed desert scarab, *not* another Sunscar dragon. Shiverlake Reflections shows a frozen lake, ruins and distant bell towers with subtle snowfall and a reduced-motion static variant. Choirbell Sprite is a small spectral bell spirit, not a copy of the Frostmarch World Boss Wisp. Runtime rarity frames stay separate from pixel-art assets.

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

**Current V2 staging implementation (November 11):** The authenticated Marks wallet and claim mechanism were already available. The server catalogue now defines **17 offers, including Asterfall**, and the mobile `DungeonMarksShopView` is wired to a **development-only preview** behind `EXPO_PUBLIC_DUNGEON_MARKS_SHOP_PREVIEW=true` (never displayed in production builds). A hard server flag `DUNGEON_SHOP_LIVE_V1=false` prevents buying even when a client calls the route. The authenticated `/coop/shop` GET path provides an unreleased read-only 17-item preview; POST purchases are rejected.

**Staging database:** Applied the hidden `dungeon_shop_hidden_atomic_foundation_v1` migration to **Veldryn Staging only**, with a disabled settings row, disabled 17-item authoritative price catalogue, receipt table, server-only snapshot RPC, verified first-clear projection and atomic purchase RPC. The SQL source is at [private SQL proposal](./dungeon-marks-shop-private-sql-proposal-v1.sql). Authenticated clients cannot invoke purchase directly; only the server service role can. **Production has not been migrated, and neither environment's shop is enabled.**

**Database test:** On staging, an exception-scoped rollback probe verified (a) exact 400-Mark debit and 100 Companion Essence grant together, (b) idempotent retry without double payment, (c) rejected request-key reuse for a different SKU, (d) one-per-week limit, and (e) material purchase rejection even when individually enabled in the test. The test rolled all writes back and left **zero shop receipts** and all shop flags disabled. No concurrency or live launch QA has yet been completed. Shop-bound material payouts are intentionally **fail-closed** pending nontradeable provenance rather than granting ordinary tradeable stacks. Building those and verifying actual account synchronization is a separate release gate, not evidence that items can already be bought.

## 7. Release and balancing checklist
- [x] Define two shop shelves, 17 SKUs across Asterfall/Sunscar/Frostmarch, base prices, first-clear rules, and ownership/weekly caps.
- [x] Reuse existing Expedition Marks wallet instead of adding another currency.
- [x] Commit hidden server catalogue, read-only quote contract and basic static test suite.
- [x] Stage a development-only, authenticated mobile presentation and hidden shop route; no public navigation entry.
- [x] Install disabled, server-authoritative atomic Mark debit/Companion-resource and collectible grant RPCs on **staging** and verify one rollback-only purchase flow.
- [ ] Commit the final deployable database migration after full rollout QA (staging proposal currently in roadmap; not production).
- [ ] Prove account-bound material provenance cannot be relisted in Player Market.
- [x] Author all nine hidden collectible bonus definitions and three profile icon metadata entries (not registered in released galleries).
- [ ] Produce and register all **12** distinct pixel-art rewards: three icons, borders, backgrounds and pets.
- [x] Add a compact mobile shop view, typed API client, dev-only navigation and purchase confirmation surface.
- [ ] Wire the real wallet snapshot for enabled builds and verify refresh/reconciliation after purchases.
- [x] Verify staging shop disabled, service-only purchase privileges, rollback atomicity, idempotency and weekly cap.
- [ ] Validate multi-device concurrency, selected account rewards in the real app, UTC boundaries, and cross-character rehydration.
- [ ] Run T1–T3 economy playtests, including clean clears, Live Fellowship, missed weeks, and high-tier future expansion.
- [ ] Explicitly approve and enable on staging, then production, only when all requirements pass.
