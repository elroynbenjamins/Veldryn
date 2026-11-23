# Veldryn Equipment 2.0 — Dungeon boss loot, premium rarity and Market custody V5

**Read-only design and pure source preview, 23 November 2026. Hidden PR #1686. NO LIVE CHANGE, NO SQL, NO ITEM MINT, NO LOOT RNG, NO MARKET WRITE, NO UI/THEME APPROVAL.**

## What v5 adds beyond all-region V4

1. Source-linked **two distinct named-boss pools per actual surviving regional dungeon** (Rootbound EXP_001, Observatory EXP_003, Shiverlake EXP_005, future Ashlands Blackglass EXP_007). Retired EXP_002/004/006/008 cannot issue new boss equipment.
2. Category weights and exact conditional/unconditional odds for the **104 boss-only proposed gear identities**: 48 new role armor, 36 class-specific weapons, 16 class-approved offhands, plus the four original Shiverlake Bellwake pieces.
3. Two spell-compatibility corrections so **Hexweaver** can use 4-piece Damage set procs in Shiverlake and Ashlands; pure physical subtype calculations remain restricted to genuinely physical hits.
4. Four genuinely eligible offhand source families across each of four dungeons = **16 bounded offhand techniques**, not extra phantom equipment slots, each with a 22s shared-source/cooldown design.
5. A no-authority, unmounted Market provenance shape checker and exact required DB positive proof contract; the historical Market V30 **legacy negative fence stays intact**.
6. A production **read-only** dungeon participation sample to avoid treating theoretical 3–5% drop odds as adequate Market supply.

## Production observation — this is not a new drop table

Read-only queried Veldryn production on 23 Nov 2026. Source: `public.expedition_runs` joined to `public.coop_reward_entitlements`; filter `entitlement_kind='participant'`, `reward_stage='final'`, `claimed_at` in UTC [2026-10-26, 2026-11-24), `r.status='completed'`. These are **successful, claimed final participant reward records**, NOT proof that the player would satisfy a future new EQ2 boss gear mint entitlement or charge rule.

| Existing regular dungeon | Observed successful final participant reward claims | Unique claimed accounts | Most claims from one account | Expected all-gear items at hypothetical 3% / 5% / 8% / 10% (IF every claim were eligible) |
| --- | ---: | ---: | ---: | --- |
| EXP_001 Rootbound Vault | 313 | 7 | 231 (73.8%) | 9.39 / 15.65 / 25.04 / 31.30 |
| EXP_003 Buried Observatory | 4 | 2 | 2 (50%) | 0.12 / 0.20 / 0.32 / 0.40 |

Further caution: Rootbound's week commencing **16 November** produced 272 of 313 claims (86.9%), so 313 is NOT a stable representative month. Present data says higher-tier trading would currently be thin even with an 8% any-item rate; never promise a steady drop cadence or fair market distribution based on this small sample.

## Rarity — any boss equipment vs exact named item

**First gate:** A trusted, fully settled terminal boss victory *could* qualify for one gear-roll under the existing/approved account reward entitlement. Eligible human account+run must be unique. One proposed overall drop chance for **any** premium gear, not a separate roll for every item and not an auto gear drop for every kill.

**Working candidate:** **8% for any dungeon premium gear item** (explore 8–10% in source-only simulations). Not owner-approved or active. Earlier 3–5% remains a comparison scenario. Player-requested individual items remain genuinely very rare.

**Second gate:** Only if that roll succeeds, choose a category from the **actual frozen boss's** category weights, then one named equipment template uniformly within that category. Source-authored weights:

| Dungeon | Four-piece role armor | Exclusive Bellwake signature | Class weapons | Supported offhands |
| --- | ---: | ---: | ---: | ---: |
| Rootbound, Observatory, future Blackglass | 55% | — | 35% | 10% |
| Shiverlake Descent | 50% | 10% | 30% | 10% |

Because each run selects its real boss 50/50 once, effective probability of a particular named item from a fixed boss pool is `P(any gear) × 0.5 × P(category) / category_item_count`.

At **8% any gear**, across 104 named candidate items the approximate **individual probability is 0.20–0.37% per eligible run**, or around 1 in 500 to 1 in 273. This is a conditional source model with exact published boss weights, not proof of active RNG. Existing Bellwake items get the distinct 10%-of-premium signature category: 0.20% for a named Bellwake piece, under this proposal.

A low per-name probability should create chase gear without making the Market a bottleneck for basic combat progression: players can craft standard alternatives or trade authentic boss items. Player can receive any class's equipment and trade it to another class. Do not auto-filter random drops by the winner's class, or the small Market will fracture.

Do not stack a second `0.10% Mythic` requirement onto the gear-family drop. Source selection, server-approved rarity/quality/affixes, one innate percentage, then legal combat item identity are distinct stages. Boss gear is **premium due to one fixed authored %/percentage-point stat and a distinct role/class effect**, not by guaranteed maximum-quality or Mythic rarity.

## Exact boss pools

| Surviving dungeon | Boss A | Boss B | New set arms | Weapons | Offhands | Total (including inherited Bellwake) |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Rootbound Vault EXP_001 | Rootbound Heart, 13 | Bell-Warden, 12 | 12 | 9 | 4 | 25 |
| Buried Observatory EXP_003 | Buried Heliarch, 13 | Veiled Sphinx, 12 | 12 | 9 | 4 | 25 |
| Shiverlake Descent EXP_005 | Bellbeast, 15 | Frozen Cantor, 14 | 12 + 4 Bellwake | 9 | 4 | 29 |
| Blackglass Fen EXP_007 (future) | Blackglass Fen Prime, 13 | Crucible Prime, 12 | 12 | 9 | 4 | 25 |

Every proposed four-piece Tank/Damage/Support set has **two unique members in each boss's pool**. The actual route sees **one** of the pair of bosses, not both; trading helps players complete multiple-boss sets. All nine class-specific weapons appear exactly once in each dungeon, with four *real* eligible offhands for Ironwarden, Bastion, Hexweaver and Dawnkeeper.

## Class, damage-type and offhand refinement

- Damage role sets must accommodate *both* direct physical abilities and direct class spells. V4 Frostmarch Cantorshard and future Ashlands Fenreaver contained physical-only wording for their four-piece procs, which would leave Hexweaver unable to trigger them. V5 replaces those two descriptions with source-authenticated **direct class-ability damage**; only direct physical hits additionally carry their authored Blunt/Pierce/Slash subtype weights.
- Other classes are not forced to use a single set. Role labels are directional playstyle recommendations, not an unapproved class armor lock. Skills, builds, companions, set choices and defenses should offer multiple counter-build approaches.
- Genuine compatible offhands get bounded signature techniques: Ironwarden **Ward of Reversal** (Shield Bash → next-hit mitigation); Bastion **Bastion's Oathplate** (Shield Bash → Defense); Hexweaver **Resonant Focus** (direct spell → next spell amplification); Dawnkeeper **Merciful Guard** (effective direct healing → target Defense). All 16 per-dungeon offhand item IDs get their tier-scaled corresponding *candidate* trait; **22s ICD**, no proc recursion. No synthetic offhand for five 2H/paired weapon classes.
- If equipped weapon and offhand attempt a proc from the same original hit/heal, Combat 2.0 resolves only the authorized effects within one source-wide limit and never grants free duplicate event stacking. No automatic physical status, secondary affix or extra rarity-scaled % is generated.

## Permanent boss origin and Player Market — no positive adapter yet

The Market V30 branch already **denies legacy/V33 gear** even if someone spoofs `EQ2_` text and `generation: eq2` metadata. That is a NEGATIVE fence; it does not currently make authentic EQ2 gear marketable. Retain the negative fence and create the positive exact-copy mint/custody/list/claim/resale pipeline in a future dedicated hidden server branch.

At boss victory, a privileged trusted backend must prove and atomically commit: correct non-retired dungeon; run completed with real terminal boss defeat; frozen boss variant; eligible human `participant/final` reward entitlement; genuine account+character+reward leg and existing charge policy; one server-owned roll; one immutable generation-2 item instance with fixed source boss receipt, original owner, item template, slot, rolls/quality, innate and unique custody record. Failed, old-run synthetic, echo-NPC, duplicate or client-authored claims never generate an item.

A listing/purchase/resale must then independently check source proof, generation, physical item serial and current owner, item state (equipped, bank transfer, lock, escrow, sold/duplicate), class/level rules, offer revision, atomic Gold, existing seller tax and item handoff. Original boss source and stat rolls **never change after a resale**. No NPC merchant, Dungeon Mark shop or crafting route may ever mint these gear identities. Do not add direct private cross-account gifting shortcuts without the same custody controls.

**New discovered integration conflict:** old hidden Player Market V17 sets **T4 minimum market acquisition level 52** and blocks T5+ entirely, while the Sunscar dungeon's T4 item wear candidate is **level 42** in a region ending at 50. These must be reconciled in the future **EQ2-specific server item acquisition/equip gate** before launch. Do not quietly raise Sunscar wear to 52 or mistakenly loosen V33 market rules. Player-to-player buying before equipping and whether purchase should require the wear level are separate pending owner decisions.

## Source-only code, not a loot/market implementation

- `docs/equipment-2-0/regional-dungeon-boss-loot-and-market-review-v5.json` records 8 boss pools, all 104 exact source item IDs, category weights, direct ability corrections, candidate offhand signatures, time-stamped observed claim aggregates, Market trusted custody requirements and stop-ship blockers.
- `tools/lib/eq2-dungeon-loot-market-preview-v5.mjs` only calculates deterministic percentage previews, expected supply under *hypothetical* candidate claim counts and **always returns `marketAuthorized: false`** when examining object fields. Even a complete-looking forged client object cannot authorize a trade.
- `tools/test-eq2-dungeon-loot-market-review-v5.mjs` verifies positive and adversarial catalogue contracts and computes exact weight normalization. No real boss RNG, inventory credit, PostgreSQL schema, Market escrow, coin transfer or UI changes occur.
- `.github/workflows/eq2-dungeon-boss-market-review.yml` runs the hidden v3/v4/v5 Node source tests without secrets, production network access or deployment (check actual CI status before declaring green).

**Required before release:** owner reviews visuals/themes and numerical balance; source-owned boss reward and Market positive bridge; actual server+PG17+Android regression, anti-replay/race checks, Market T4/T5 level reconciliation; real economy telemetry; coordinated major 2.0 sign-off.
