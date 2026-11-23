# Equipment 2.0 — Frostmarch T5 dungeon drop and two-piece combo sets (review v3)

**23 November 2026 — HIDDEN DESIGN REVIEW ONLY. NO MAIN MERGE, RUNTIME REGISTRATION, SQL, DROP TABLE, ART OR PLAYER MARKET ACTIVATION.**

Extends the prior [T5 catalogue v2](./T5_CATALOGUE_EXPANSION_REVIEW_V2.md), retaining all original T5 12 ordinary standard sets/51 pieces, 4 existing-plus-proposed rare sets/20 pieces and 9 weapons + 4 offhands unchanged. Two original accepted rare tanks, Citadel and Bloodsteel, retain their original innates, recipes and bonuses.

## Inventory accounting

| Category | Sets | T5 members |
| --- | ---: | ---: |
| Standard crafted (v2 unchanged) | 12 | 51 |
| Previously authored rare tank + damage + support candidates (v2 unchanged) | 4 | 20 |
| Class weapons and legitimate offhands (v2 unchanged) | — | 13 |
| **New Shiverlake Bellwake dungeon-exclusive** | **1** | **4** |
| **New crafted two-piece combos** | **6** | **12** |
| **TOTAL — review candidates, not canonical** | **23** | **100** |

**New in this pass:** 16 unique item IDs. **New across v2+v3 versus the inherited crosswalk:** 90. The previous 383-record crosswalk still incorrectly contains ten retired T4 Citadel/Bloodsteel drafts and lacks ten confirmed T4 Bastionmail/Ashguard replacements. Raw review record arithmetic 383+90=473 is NOT a count of approved, releasable canonical gear.

## Shiverlake Bellwake — 4-piece exclusive dungeon drop set

**Dungeon:** Shiverlake Descent (EXP_005); Frostmarch; currently development-only. It retains TWO server-frozen 50/50 bosses as in dungeon policy PR #1184. Retired EXP_006 must not become a new route. Do not alter already published Asterfall/Sunscar or temp dungeon boons. **Combat wear candidate:** Lv56.

| Boss encountered | Source-locked possible item | Slot |
| --- | --- | --- |
| Bellbeast | Shiverlake Bellwake Helm | helmet |
| Bellbeast | Shiverlake Bellwake Ring | ring |
| Frozen Cantor | Shiverlake Bellwake Chestpiece | chest |
| Frozen Cantor | Shiverlake Bellwake Mantle | cape |

### Set mechanics

- **2 pieces — Bellward:** +2% maximum HP and +2 percentage points Tenacity
- **4 pieces — Answer the Toll:** After eligible direct non-true damage removes at least 7% of own maximum HP post-mitigation, receive one shield of 5% maximum HP for 6 seconds and one Resonant Answer charge. Within 6 seconds, the next authenticated direct class-ability damage hit OR effective direct class heal consumes that one charge for +5% potency (not both). Internal cooldown 28s.

The 4-piece is **one** bounded damage/healing choice, not two stacks of +5%. The 5% maximum-HP shield uses Combat 2.0 approved global shield resolution and cannot recursively create itself. Trigger only from a server-authenticated **direct non-true hit that actually reduces HP** after existing mitigation, threshold checked after damage. The shield must not retroactively reduce that triggering hit. Separate direct ability/real healing consumption is one charge only, with 6s expiration, 28s shared ICD and strict status/event identity.

### Dungeon reward authorization — currently a proposal

- **Drop-only:** Boss completion chest. No crafting recipe, no personal or public shop, no Marks exchange, no Guild shop, no direct Player Market listing, purchase, gift, trade or resale. Nontradeable even as a verified newly minted EQ2 gear item. Optional account-bound character transfer requires a separate authentic atomic custody workflow and must not clone the item.
- **Boss pools:** Bellbeast awards only Helm/Ring; Frozen Cantor only Chestpiece/Mantle. Exactly one frozen 50/50 boss variant per run; players cannot reroll it through disconnect or checkpoint selection.
- **Roll guard:** One independently authorized chance per qualified human/account settlement reward receipt at terminal boss victory, including Solo/Echo human owner and qualifying Live party humans, with existing per-run reward rules preserved. NPC Echo donors never earn gear; no independent chance per room/failed attempt/reconnect/checkpoint/Mark payout.
- **Rate unknown:** Neither base drop probability nor depth/tier multiplier is set; use verified real entitlement and completion telemetry before approval. Existing dungeon gems, Marks, catalysts, weekly quests and temporary Endurance boons/artifacts must remain unchanged.
- **Duplicate prevention (candidate):** On a successful Bellwake-specific drop, prefer a missing item from that **defeated boss's own two-item pool** until both are collected, with account-versus-character tracking selected only after custody proof. This does not promise a full set, an automatic guaranteed drop or a second pity system.
- **Power:** Same T5 baseline stats/eligible quality/rarity budget as ordinary gear. No extra automatic authored per-piece percentage stats. Unique effects come from the 2/4 breakpoints, avoiding mandatory loot for all classes.

## Six new crafted two-item mini sets

Each pair contains **exactly two distinct fixed item IDs**, and its bonus requires both actual equipped source IDs; a duplicate copy, original cost-reference item, bank item or phantom offhand cannot activate it. All proposed mini sets have no separate fixed innate per-piece percentage. Smithing/Tailoring profession advancement, not combat level, unlocks **crafting (candidate level 43)**; wearing requires candidate combat level 52.

| Set | Role direction | Pair slots | 2-piece mechanic | ICD |
| --- | --- | --- | --- | ---: |
| Frostclasp Aegis | tank | helmet + cape | Ward Against the Deep: On successful hostile debuff application, gain +3 percentage points Tenacity for 6 seconds; never retroactively shorten the triggering debuff | 20s |
| Stonewinter Frame | tank | chest + legs | Unyielding Frame: After eligible direct non-true damage removes at least 6% max HP, reduce damage from the next eligible direct non-true hit within 6 seconds by 4% | 18s |
| Glacier Talons | damage | gloves + boots | Talonstrike: After a successful direct physical class-ability hit, the next basic direct weapon hit within 5 seconds deals +6% damage; no free Bleed/Stagger/Piercing | 14s |
| Astral Rime | damage | cape + ring | Echoing Spellglass: After a successful direct spell hit, the next direct class spell hit within 6 seconds deals +5% damage; exclude DoT/reflection/procs | 16s |
| Dawnmender Chain | support | legs + amulet | Comforting Thread: An effective direct class heal restoring missing HP grants the target +3% Defense for 6 seconds (self-heal eligible) | 18s |
| Runeforge Link | all_roles | gloves + amulet | Frostworked Momentum: After a successful direct class-ability hit OR effective direct class heal, gain +2% Haste for 6 seconds, once per source event | 18s |

These are intentional compact alternatives, **not** a new 10-piece mandatory full-set ladder. Some combinations intentionally compete for the same slots. Eligible cross-set combinations activate only if every distinct matching item ID is actually equipped and the class/role's final approved slot policy allows it.

### Crafting costs — illustration, not approved economy

- Each mini-set member starts from a v2 **same-tier, same-profession, same-slot** foundation/alternate recipe and adds 10% (round up) to refined/wood and common combat inputs, 10% to Gold (round up to 100), and 10% to queue time (round up to 10 seconds).
- The alternate route keeps the same mandatory rare Icevein Sigils, ordinary Rimebone Shards, existing Alchemy binder, Gold, queue time and combat source inputs as foundation. It changes the original first-versus-secondary refined balance, but cannot bypass scarcity. Recipes do not randomly fail.
- No player must level combat to Smith/Tailor these pieces; buy/trade combat inputs or obtain commissions from real players. Crafted combo items are **potentially** Player Market eligible only after 2.0 item-generation source provenance, mint receipts, ownership/escrow and resale controls. Legacy gear is permanently excluded.
- Crafting XP, source IDs, source difficulty, roll tables, 10% premium, required levels and sale prices are review candidates until real supply/demand data and owner balance signoff.

## Mixing examples (slot planning, not combat sign-off)

- **Citadel 6 + Runeforge Link 2:** Citadel occupies helm/chest/legs/boots/cape/ring; Runeforge fills gloves/amulet. All eight armor/accessory slots are used; weapon/real offhand handling remains independent.
- **Bloodsteel 4 + Frostclasp Aegis 2 + Stonewinter Frame 2:** Bloodsteel fills gloves/boots/amulet/ring; Frostclasp helm/cape; Stonewinter chest/legs. Tank synergy is subject to cumulative mitigation caps.
- **Shiverlake Bellwake 4 + Glacier Talons 2 + Dawnmender Chain 2:** Bellwake helm/chest/cape/ring; Glacier gloves/boots; Dawnmender legs/amulet. The third bonus is useful only when the build legitimately performs effective direct heals, so it is not automatically optimal for every class.
- **Large set + single two-piece filler:** Four- or six-piece builds may sacrifice a small set bonus for a better counter-build against a boss, without replacing the class's authored skills and companion choices.

## Safety, validation and release constraints

1. Do not reclassify, rename, copy, sell or market older unverified equipment. New hidden IDs have no authority until registered in the secure server catalogue with immutable generated item provenance.
2. Do not implement live dungeon-drop roll sources against the old dungeon until the coordinated Equipment → Skills/Combat → Enemies/Bosses 2.0 release. EXP_005 is unpublished and the future Endurance checkpoint flows are independently release-gated.
3. Verify terminal victory per-human receipt uniqueness; random boss frozen identity; actual reward entitlements; duplicate protection; full party disconnect/retry behavior; no drop grant via shops, crafting, NPC Echo or player trade.
4. Simulate all nine classes/18 specializations, support/Tank/Damage, solo/live, physical Blunt/Slash/Pierce and elemental hits: anti-proc recursion, shield budget, critical/haste effects, 4+2+2 stacking and class skills.
5. Approve actual item art, rarity border/quality/affix representation and all proposed inventory, dungeon-reward, Equipment and Set Bonus UI/themes before implementing visual changes.
6. Reconcile current source branches and correct the pre-existing retired T4 crosswalk conflict. Authenticated PostgreSQL custody, exact-head CI, Android and staging QA remain stop-ship.

**Machine-readable complete v3:** [`t5-catalogue-expansion-review-v3.json`](./t5-catalogue-expansion-review-v3.json). The v2 catalogue remains a preserved review snapshot. No new art is approved or mapped.
