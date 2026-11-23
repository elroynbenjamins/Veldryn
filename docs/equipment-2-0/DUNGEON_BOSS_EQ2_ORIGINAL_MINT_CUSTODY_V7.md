# Equipment 2.0 — V7 Boss-Loot Decision Ledger & Market Resale Transaction Review

**23 November 2026 · HIDDEN / REVIEW ONLY / no live rewards, Gold movement, SQL migration, published release or UI implementation.**

## Why a new ledger is mandatory

The real dungeon reward function `public.claim_coop_reward(uuid,text)` currently handles Expedition Marks and enhanced charge entitlements. It does not authorize or mint an Equipment 2.0 physical instance. Market PR #1651 provides a negative legacy Equipment V33 fence but not a positive EQ2 exact-instance custody path.

One separate permanent original premium-boss decision must exist **per genuine final human participant entitlement**. A failed drop roll is still recorded, so a policy revision, reconnect, a second dungeon client, reward retries or parallel processing cannot reroll. The ledger's unique index is on the original `entitlement_id`, **not** on `(entitlement_id, roll_policy_version)`, date, owner or boss node.

The latest review-only proposal also requires an enhanced reward charge and actual committed terminal boss victory, rather than the low-reward unrestricted claim stream. The **8% any-gear** rate from V5 is not approved or live. In the read-only production sample (26 Oct–23 Nov), Rootbound had 49 enhanced final clears from seven accounts and Sunscar had two from one account. Even 8% means only about 3.92 and 0.16 expected premium items respectively in that sample. A boss-specific item is much rarer. This requires careful economy and future player-population recalibration rather than a promise of rapid set completion.

## Work actually prepared now

**Disposable PG17 transaction simulation:**

- `tools/eq2-review/v7/00_disposable_pg17_original_mint_and_custody.sql` defines a fully isolated `eq2review_v7` schema guarded by `current_database()='eq2_review_v7'`. It is **not under backend/supabase/migrations** and is explicitly forbidden to run against staging or production.
- The schema has source-fixture rows, boss-specific authored item pools, a permanent one-decision-per-entitlement table, a separate original mint/roll snapshot, a mutable versioned custody row, temporary synthetic Market escrow/offers, and an append-only simulated transfer history.
- The original decision and original mint are protected by PostgreSQL `BEFORE UPDATE OR DELETE` refusal triggers. Historical original boss/source, first owner and item rolls never change when custody changes.
- A review-only atomic decision function first locks the synthetic source entitlement and returns its existing frozen result on retry. On success it inserts the decision, source-checked item identity, immutable mint record and custody in the **same SQL transaction**; on miss it writes only the permanent original decision. It rejects a bad boss/item mapping, failed runs, non-enhanced rewards, Echo donors and unavailable boss pools.
- Review-only sale helpers lock custody to avoid double listing, move it to simulated escrow, allow cancellation and exact return, perform **ownership-only simulated transfers**, and allow a later resale. Every review return says `authority:false`.
- The review explicitly **does not** mint to live Inventory/GameState, generate real RNG, move Gold, apply seller fees, credit an actual player, publish a public RPC, or bypass the V30 legacy fence.
- `tools/eq2-review/v7/01_disposable_pg17_regressions.sql` tests original win and permanent miss, invalid source cases, cross-boss denial, two same-source decision attempts, once-only origin, immutable original roll, first listing, duplicate listing, cancel/relist, second buyer rejection, idempotent transfer, two authentic source-preserving resales and original first owner retention. Its assertions cover synthetic PostgreSQL behavior, **not actual integrated Market sales**.
- `.github/workflows/eq2-dungeon-boss-pg17-review.yml` uses a fresh `postgres:17` service with local disposable credentials and a synthetic database. It does not receive production or staging credentials and does not deploy or apply any Supabase migration.

## Key invariant: first-owner lineage vs current custody

| Invariant | Intended source of authority |
| --- | --- |
| Item identity | Permanent EQ2 generation-2 mint instance; not name or cosmetic tag |
| Original acquisition | Authenticated terminal boss receipt plus actual frozen route and enhanced reward |
| Actual source pool | The named defeated boss's specific template pool, never its sibling boss's pool |
| Permanent result | Unique original entitlement decision, including misses; no rerolls after policy changes |
| Original stats | One immutable rolled rarity, quality, authored innate percentage and legal affixes |
| Ownership now | Separate server-locked exact-instance custody record |
| Cancel/expiry | Return the same exact physical copy and preserve its serial |
| First sale and later resales | Atomic authenticated transfer, sale receipt, seller Gold/fee debit-credit, current custody revision and original immutable source verification — **future implementation** |
| Legacy equipment | Remains permanently Market-ineligible under hidden V30, including labels that look like EQ2 |
| Shop/crafting source | None for dungeon-only premium gear; original mint must always be a boss victory |
| T4 Sunscar purchase rule | Versioned EQ2 rule pending: old Market T4 buy level 52 conflicts with proposed Sunscar EQ2 wear level 42 |
| Profession-only participation | Buyer may acquire/hold materials and trade genuine boss items through an approved market, without forced combat leveling; **equipping combat gear** remains separately level/class gated |

## Security boundaries and next integration

The review harness intentionally accepts synthetic outcome and UUID values because it lives only in a disposable database. **Do not copy that test API as a production trusted function.** Actual issuance must receive only authenticated reward identity, read and lock all relevant run/node/claim/custody rows inside its transaction, use a cryptographically appropriate server-generated roll, choose a template from a signed approved EQ2 manifest, and atomically commit both decision and the genuine physical item. It must never rely on `client enhanced_reward` fields or client-provided odds, instance IDs, boss identity or loot source.

For PostgreSQL/Supabase, eventual private privileged functions must use `search_path=''`, schema-qualified objects and no public `EXECUTE` grants. All exposed-schema tables need RLS as appropriate; a new positive EQ2 Market adapter must be independent from the V33/V30 escrow tables. Review of Supabase security documentation confirms that simply hiding a function from the UI does **not** revoke Postgres default function execution.

The future Market function must also check and move real Gold, seller tax, expiry, delivery and account/character capacity in the same authority-controlled transaction as custody. The V7 tests deliberately **do not** pretend that moving an item between synthetic owners constitutes a paid sale.

**Launch gate remains unchanged:** complete Skills and Equipment, Combat, Enemies/Bosses; then finish dungeon reward mint, World Boss/Party Events and Player Market. No gameplay, UI or theme release without explicit owner approval and the coordinated 2.0 gate. Player-facing drop rates, appearances and original premium stats remain candidates.

## Tests and source references

- Preceding source verification: `docs/equipment-2-0/DUNGEON_BOSS_ORIGINAL_EQ2_MINT_AND_MARKET_PREFLIGHT_V6.md`.
- 104 authored boss-pool candidates and earlier numerical simulations: `docs/equipment-2-0/regional-dungeon-boss-loot-and-market-review-v5.json`.
- Existing negative Market generation fence: GitHub draft PR #1651, **not merged**.
- Current V7 PG17 disposable workflow: `.github/workflows/eq2-dungeon-boss-pg17-review.yml`.
- All review assets remain within hidden draft PR #1686; **never** claim complete Market, Supabase/production success or UI approval from a synthetic test.
