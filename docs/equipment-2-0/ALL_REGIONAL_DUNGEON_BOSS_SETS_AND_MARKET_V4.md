# Equipment 2.0 — all regional dungeon boss-only PREMIUM gear and Player Market access (v4)

**23 Nov 2026 · USER REQUEST CAPTURED / HIDDEN REVIEW ONLY.** This explicitly SUPERSEDES the older draft restriction that dungeon-exclusive gear cannot be traded. No game code, drop rates, item minting, inventory, production/staging database, app UI/theme or live Player Market was changed.

## Product decision

Each supported regional dungeon is designed to award **three distinct four-piece role gear sets** (Tank, Damage, Support), **one matching weapon for every one of nine classes**, and **the four legitimate supporting offhands**. All of these pieces are **rare, boss-defeat-only drops** from that dungeon and may be **listed, bought, sold and resold** on Player Market 2.0 only after original server-authoritative verified Equipment 2.0 mint/custody integration. They cannot be crafted, sold by an NPC, or exchanged for Marks or currency.

Not all nine classes need an offhand: Dreadguard, Wayfinder, Ravager, Knife Dancer and Stonecaller use source-authored paired/2H grip, so no fake offhand item is invented. Every class still has one eligible new class weapon and at least one role-appropriate four-piece armor set.

## Per dungeon structure

| Region | Surviving dungeon | Tier | Existing bosses, one chosen 50/50 once per run | Three new role sets | New pieces: armor + weapons + offhand |
| --- | --- | --- | --- | --- | ---: |
| Asterfall | Rootbound Vault (EXP_001) | T2 | Rootbound Heart / Bell-Warden | Rootbound Heartward, Rootbound Thornstrider, Rootbound Lifebloom | 12 + 9 + 4 |
| Sunscar | Buried Observatory (EXP_003) | T4 | Buried Heliarch / Veiled Sphinx | Heliarch Guard, Sphinxclaw Pursuit, Mirageveil Oracle | 12 + 9 + 4 |
| Frostmarch | Shiverlake Descent (EXP_005) | T5 | Bellbeast / Frozen Cantor | Shiverlake Rimevanguard, Shiverlake Cantorshard, Shiverlake Frosthymn | 12 + 9 + 4 |
| Ashlands | Blackglass Fen (EXP_007) | T7 **future candidate** | Blackglass Fen Prime / Crucible Prime | Blackglass Crucibleguard, Blackglass Fenreaver, Blackglass Seerthread | 12 + 9 + 4 |

**Totals:** 12 new sets × 4 = 48 armor pieces; 4 dungeons × 9 weapons = 36 class weapons; 4 × 4 valid offhands = 16; **100 new boss-only item identities**. Existing Shiverlake Bellwake four-piece remains a separate fourth Frostmarch dungeon set and is now *also* a tradeable candidate, bringing the dungeon gear count to **104 source candidates**. **T5 becomes 26 sets / 125 item candidates** including ordinary/crafted items. None of these counts are live items. Ashlands/Blackglass Fen is only a future unlaunched design; T7 and wear level are not final.

### Source and boss distribution

- The surviving dungeons and boss pairs are source-grounded in regional dungeon policy #1184. Each proposed gear ID belongs to exactly one named dungeon and one of its two possible bosses; half of each role's four pieces originate from each boss, so finding or trading for both pools is useful.
- A route selects its one boss variant with a server-frozen 50/50 choice. Never allow a user reroll on reconnect or repeatedly receive gear from room choices/checkpoints before the final victorious boss claim.
- The same `original_dungeon_id`, `original_boss_variant` and verified terminal claim receipt are permanently retained in the item's provenance after any legitimate Market resale. No boss preview/failed run/NPC donor/ordinary room/elite room awards permanent gear.
- Both Solo/Echo-human and Live-human reward entitlements must use the actual persisted per-run/character/account charge rules. One independent authorized roll per entitled victorious human once, not one group roll for the whole party; no duplicate grant by retries.

## Premium item mechanics

### Stat design

- Every new boss-only armor, weapon and eligible offhand includes **one authored fixed percentage or percentage-point innate bonus**, unlike ordinary same-tier pieces. The innate is a **source-owned stat channel** and stacks with legal rolled affixes without twice scaling with quality/rarity. Rarity and quality themselves remain generated under the same approved Equipment 2.0 roll rules, *not a second guaranteed Mythic roll*. Premium stat budgets must be balanced against 2-, 4- and 6-piece crafted sets, skills, companion effects and gems.
- **Tank examples:** +Max HP, +Defense, +Tenacity (percentage points), +Ward (percentage points). **Damage:** +Attack, +direct ability damage, +Haste, +Crit Chance (percentage points). **Support:** +Healing Power, +Defense, +Haste, +Ward. These are proposed stat channels, and their engine readiness/eligibility needs exact Combat 2.0 verification.
- Proposed scaling for otherwise similar role/slot innates is T2 ~75%, T4 ~90%, T5 100%, future T7 ~115% of the T5 candidate stat. This is not a generic multiplier on a previously rolled item and is not applied automatically to live rewards.
- The nine weapons have source-authored *class-specific* signature traits with bounded cooldowns: Ironwarden Oathguard's Riposte, Bastion Tower's Response, Dreadguard Scourge Reprisal, Wayfinder Farshot Resolve, Ravager Winterbreaker, Hexweaver Echo Sigil, Knife Dancer Froststep Blade, Dawnkeeper Aegis Light and Stonecaller Spirit's Shelter. All are review-only and must use real ability events.
- Weapons preserve verified basic attack physical source weights: Ironwarden/Bastion/Ravager slash; Dreadguard 70/30 blunt/slash; Wayfinder pierce; Knife Dancer 60/40 pierce/slash; Dawnkeeper blunt; Hexweaver spell-authoritative wand; Stonecaller blunt only on authenticated staff melee. Equipment source must never invent automatic Bleed, Stagger, penetration or resistances.

### Bonus thresholds

For each of 12 new four-piece role sets: a modest **2-piece role bonus**, and a **4-piece conditional special effect** with an explicit 18–24s internal cooldown. No hidden blanket damage buff, no multiple procs per original hit, no DoT/reflection/other proc chains, no free Haste/Shield stacking beyond approved Combat 2.0 budget. This encourages 4+2, 4+4, and other mixed gear where the eight equipment armor/accessory slots actually fit; no duplicate item/phantom offhand set counts.

## Very rare drop chance — proposal for calibration, NOT deployed

Candidate: **3–5% chance for any one premium dungeon gear item per eligible successful boss-victory reward claim**, then one item selected from the **actual defeated boss's own ~12–15 candidate pool**, with future source-approved weighting. Under equal weights and frozen 50/50 bosses, a particular named piece is only roughly **0.10–0.21% per eligible run** (about 1 in 1,000 to 1 in 480) depending on pool size and global chance. Individual classes are *not* limited to only their own weapon on drops because tradeable cross-class supply matters.

This may be too scarce for the current active population and weekly charge frequency. The source-of-truth drop chance is intentionally **UNSET** until production reward-bearing runs, average boss wins, attempts per active account, unique sellers, Market availability and per-piece liquidity are measured. Do not stack a further '0.1% Mythic chance' on top of the entire equipment family to create impossible acquisition rates; roll item quality/rarity **after** deciding that an item drops. Boss difficulty and dungeon tier multipliers must be proven, not inferred.

## Player Market 2.0 — exact allowed and denied cases

| Action | Allowed when the 2.0 market is approved? |
| --- | --- |
| Win gear from the correct dungeon boss | YES — authenticated final boss completion reward only |
| List the newly minted, genuinely owned, unequipped item | YES — exact physical copy+source receipt+cold custody verification |
| Buy it from another player | YES — server atomic escrow and Gold/item settlement |
| Resell the same genuine item later | YES — original boss proof persists throughout transfer history |
| Trade gear originally minted before Equipment 2.0 | **NEVER** — even renamed/retagged/obtained from legacy dungeon drops |
| Craft this boss-only item, purchase it from shops or spend Expedition Marks on it | **NEVER** |
| List an item without a genuine original dungeon boss receipt or with duplicate/stale custody | **NEVER** |

Source identity must be **physically verifiable**, not a name, visible tag, or client-supplied `EQ2_` prefix. Keep a versioned server mint source, signed boss terminal receipt, immutable original owner, dungeon/boss and rolled stats, physical item instance, serial custody chain, inventory/bank/equipped state and Market escrow lock. Selling does not reroll stats, boost rarity, regenerate an innate, or change where it originally dropped.

### Important supersession: Shiverlake Bellwake

Original v3 incorrectly excluded Shiverlake Bellwake from the Market and proposed it as account-bound. **This specific restriction is now superseded.** Bellwake's four original item IDs, boss pools (Bellbeast Helm/Ring; Frozen Cantor Chest/Mantle) and **existing 2p/4p effects are unchanged**. Its four pieces now gain proposed deterministic innates: Helm +2.8% Defense; Chest +2.8% Max HP; Mantle +1.5 percentage points Ward; Ring +1.5 percentage points Tenacity. Those genuine boss-only EQ2 pieces can likewise be listed and resold after the pending Market custody implementation. The prior V3 file remains historical and does not authorize old restrictions. No already-issued player item has been changed, because no T5 dungeon draft items have been minted.

## Review and release gate

1. Obtain owner signoff on premium stats, 3 role families per dungeon, named weapon traits, exact worn level and tier, especially provisional Ashlands
2. Verify source-owned each dungeon + 50/50 two named boss variants, ensure no ghost retired EXP_002/004/006/008 rewards
3. Balance combined rare item occurrence and per-name effective probabilities against actual reward-bearing boss clears, time, charges, party sizes and market liquidity; prevent impossible full sets
4. Verify every one of nine classes can equip its class weapon, eligible offhand only for four, role armor, and no 2h phantom offhand; CP balances relative to crafted gear
5. Use immutable authoritative generation 2.0 mint and original dungeon boss receipt linking: listing, buy, resale, transfer, canceled listings and bank moves require current custody and proof
6. Retain V1 legacy market block permanently regardless of item names, EQ2 tags, upgrade, resale and transferred ownership
7. Prove per-human per-run premium loot receipt uniqueness across Live, Q/Echo, reconnect, checkpoint, failed and duplicate claims
8. Integrate within 2.0 Enemies/Bosses source-authority and Combat 2.0 effect verification without inventing auto Blunt/Pierce/Slash procs or free penetration
9. Review owner-approved Style 4 art and actual UI themes for dungeon loot preview, market filters, and rarity tooltip before any build integration
10. Preserve coordinated EQ2, Skills, Combat, Enemies/Bosses, Dungeon and Player Market launch gate; no main merge, staging/prod mutations or publication

## Source artifacts

- Machine-readable 100-item regional source: `docs/equipment-2-0/regional-dungeon-boss-tradeable-premium-gear-review-v4.json`.
- Complete Frostmarch T5 v4 catalogue with superseded Bellwake market flags: `docs/equipment-2-0/t5-catalogue-expansion-review-v4.json`.
- This specification is additive to hidden T5 review draft #1686, **not** a runtime implementation and **not** approval of screens/themes.
