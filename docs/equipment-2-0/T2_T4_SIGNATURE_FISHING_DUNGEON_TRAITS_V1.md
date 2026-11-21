# Veldryn Equipment 2.0 — rare fishing, dungeon catalysts and signature gear (review v1)

**21 November 2026. Design and read-only validation only; not in live gameplay.** This extends the unmerged T1–T4 economy review on #1549 without changing the 169 ordinary items/338 normal routes or the six locked elite/boss blueprint-only item candidates. No UI/theme design, item registration, reward grants, migrations, Combat 2.0 skills, production flags or database rows were changed.

## Distinct equipment acquisition lanes

1. **Standard and alternate-stat crafts:** use the established two ingredient-route model, ordinary plus mandatory rare combat resources by slot and tier. Existing authored item stats, quality/rarity and compact set rules remain as-is.
2. **Signature crafted variants:** six **new and separate proposed item identities**, one Fishing-reagent version and one Dungeon-catalyst version per tier from T2 to T4. Each needs its corresponding ordinary same-slot/tier crafted-material bill, one special catalyst, and a single fixed unique trait. They are not the existing rare blueprint items. Proposed base-stat budget is 1.0× of an equivalent ordinary tier item, preserving the value of ordinary drops and avoiding an automatic power spike; **the conditional effect is their advantage**. Proposed extra-refined-resource cost ~1.25×, Gold ~1.5×, crafting time ~1.25×, XP unchanged, without authorizing any real recipes yet.
3. **Six existing rare-blueprint crafts (T2–T4):** remain locked to verified elite/zone boss blueprint knowledge, +3/4/5% proposed base budgets and one separate trait. Nothing from fishing or dungeons bypasses a blueprint unlock.
4. **Direct Dungeon / Party Event / World Boss reward equipment:** remains **earned-drop/chest only**, never craftable or offered through Marks, shops, escrow or exchanges. Crafted dungeon-infused signature items are a distinct, account-bound family and cannot substitute for this drop-only collection.

This gives a player a reason to fish, gather, trade or complete difficult dungeon runs without making the ordinary 2.0 gear pipeline a dead end.

## Six candidate items and effects

| Tier | Signature item | Rare material source | Proposed unique trait |
| --- | --- | --- | --- |
| T2 | **Ironwood Riverthorn Grips** · Damage gloves | **Ironwood Riverpearl**, 1.0% secondary catch at Rootstream Trout Pool | **Riverthorn Cut:** 6% on qualifying direct physical hit to apply Bleed worth 12% of triggering hit over 4s, 12s cooldown |
| T2 | **Ironwood Heartwood Mantle** · Tank cape | **Heartwood Dungeon Shard**, 24% per authenticated Asterfall dungeon difficulty-2 completion | **Heartwood Retort:** after taking a direct hit of 15%+ max HP, 2% less direct enemy damage for 5s, 18s cooldown |
| T3 | **Sunscar Oasistide Signet** · Support ring | **Oasistide Pearl**, 0.8% secondary catch at Oasis Carp Pool | **Oasis Afterglow:** a qualifying ally heal/shield creates an extra shield equal to 2% ally max HP, 18s cooldown |
| T3 | **Sunscar Scorpionstrike Grips** · Damage gloves | **Dunewarden Sigil**, 18% per successful Sunscar dungeon difficulty-1 completion | **Scorpionstrike Bleed:** 8% on qualifying direct physical skill hit to apply Bleed worth 18% of triggering hit over 4s, 10s cooldown |
| T4 | **Glassbound Glassfin Mantle** · Tank cape | **Glassfin Mirrorscale**, 0.6% secondary catch at Glassfin Pool | **Glassfin Guard:** **3% reduced incoming direct enemy, non-true damage** while equipped; this unconditional signature mitigation cannot stack |
| T4 | **Glassbound Riftfang Pendant** · Damage amulet | **Riftfang Dungeon Core**, 15% per successful Sunscar dungeon difficulty-3 completion | **Riftfang Bleed:** **10% chance** on qualifying direct physical hit to apply Bleed equal to 24% of triggering hit over 4s (half vs bosses), 10s cooldown |

**These are proposed chances and effects, not active drop probabilities.** Dungeon difficulty (1–3) and Equipment tier (T2–T4) are distinct progression axes; no extra boss-chest roll and no guarantee per run are included. Successful completion is validated once by an authenticated settlement receipt, not merely room victory, client UI or activity start. Weekly Marks/bonus rules must not be treated as a guarantee of independent material rolls.

### First catalyst acquisition pacing (one material, no extra pity, no trading)

| Tier | Fishing expected actions | Fishing P90 unboosted hours | Dungeon expected eligible completions | Dungeon P90 eligible completions |
| --- | ---: | ---: | ---: | ---: |
| T2 | 100 | ~3.45 h | 4.17 | 9 |
| T3 | 125 | ~7.97 h | 5.56 | 12 |
| T4 | 166.67 | ~11.92 h | 6.67 | 15 |

Fishing P90 uses the *doubled* authored base cycle: Rootstream Trout 54 sec, Oasis Carp 100 sec, Glassfin 112 sec. Real tools, travel, interruptions, buffs, AFK idle rules and fishing eligibility may change results; dungeon completion time, queue, character strength, success rate, drops when weekly bonuses expire and boss rotation were not modeled. Market escrow for fishing ingredients may shorten self-farming, once separately enabled.

## Six exact source-anchored draft crafting costs

The preview compiler `tools/lib/eq2-signature-recipes-v1.mjs` now derives **one** signature route from a named, canonical, *foundation-only* recipe of the same tier/role/slot. The resulting immutable review artifact is `t2-t4-signature-generated-recipes-v1.json`, checked against 169 source item identities and 338 ordinary crafting routes. No route is registered in a real Forge.

| Tier / piece | Profession | Refined or processed inputs | Existing combat/binder inputs retained | Extra source catalyst | Gold / seconds |
| --- | --- | --- | --- | --- | --- |
| T2 **Riverthorn Grips** | Tailoring | 25 Wolf Leather; 10 Thorn Cloth; 5 Ironwood Planks | 5 Wolf Fang; 1 Ironwood Resin | 1 Ironwood Riverpearl | **1,400 / 210** |
| T2 **Heartwood Mantle** | Smithing | 18 Iron Bars; 18 Wolf Leather; 5 Ironwood Planks | 6 Wolf Fang; 1 Ironwood Resin | 1 Heartwood Dungeon Shard | **1,700 / 255** |
| T3 **Oasistide Signet** | Smithing | 7 Sunstone Ingots; 4 Amberglass; 5 Dune Cloth | 5 Sunscar Scale; 1 Dune Binder | 1 Oasistide Pearl | **4,200 / 289** |
| T3 **Scorpionstrike Grips** | Smithing | 27 Sunstone Ingots; 9 Treated Dunewood; 7 Sunscale Leather | 7 Sunscar Scale; 1 Dune Binder | 1 Dunewarden Sigil | **5,300 / 368** |
| T4 **Glassfin Mantle** | Smithing | 29 Glassbound Alloy Bars; 29 Hardened Sunscale; 8 Reinforced Dunewood | 11 Glassbound Plates; **1 Glassheart Fragment**; 1 Glassbound Binder | 1 Glassfin Mirrorscale | **12,800 / 702** |
| T4 **Riftfang Pendant** | Tailoring | 35 Soulweave Cloth; 14 Hardened Sunscale; 7 Glassbound Alloy Bars | 7 Glassbound Plates; **1 Glassheart Fragment**; 1 Glassbound Binder | 1 Riftfang Dungeon Core | **9,800 / 537** |

The exact source-preserving transform is: **ceil(1.25×) for same-tier refined resources; unchanged common/rare combat loot and Alchemy binder; one additional signature catalyst; Gold ceil(1.5× source to next 100); seconds ceil(1.25×); equipment skill XP unchanged.** These are material-cost proposals, not final Gold/Xp balancing. There is no free rare resource, no NPC/Dungeon Mark buyout and no rewrite of an ordinary item or its two recipes.

**Upstream blockers remain:** T3 uses the same `SUNSTONE_INGOT` ID as an incompatible existing Smelting formula; the planned EQ2 common and scarce combat items still need registered server-authoritative drops; T4 Glassbound Dust remains a mining proposal; the Fishing and Dungeon signature materials have not been registered or earned by players. Material bills are not release-ready just because their integers are pinned.

Nine additional regression checks lock the identity/source roles, rarity/binder conservation, all six source catalysts, cost/XP/seconds arithmetic and disablement under tampering. They also ensure T4 Glassheart Fragments remain mandatory and that no real Forge route or existing recipe is overwritten.

## Combat 2.0 safety contract

- **One deterministic, immutable trait ID** per exact-item instance; server verifies original source/recipe, ownership, bound status, slot and equipment snapshot. Rarity, quality and affixes already affect base combat stats; trait coefficients are never multiplied again.
- **At most two active signature-family effects per loadout**, no more than one offensive and one defensive/support. This is a proposed shared build policy intended to include the existing six rare-blueprint traits and any future exclusive gear traits. Conflict with active gems/sets must be checked before allowing one. The UI should display inactive/conflicting traits only after visual approval.
- **Bleed is a physical DoT, not the existing Hex Potency shadow/arcane/nature DoT channel.** The source is an eligible post-mitigation direct physical hit; no reflected hits, other procs, repeated hits within the same ability use, support ticks, pet echoes, DoT ticks or client-provided RNG. One effect per attacker/target from the same source; refreshing does not stack multiple bleeds. Boss coefficient half; immune bosses get no effect. All proc timing and damage must be simulated by the server and replay-verifiable.
- **3% direct mitigation** is applied multiplicatively after Defense/Ward, only to enemy direct non-true hits, capped globally at 3% from this signature family. Enemy DoT, environmental effects and true damage do not get this reduction. Defensive trigger effects have their own duration/internal cooldown; there is no uncapped additive resistance stacking.
- **Healing/shield trait** triggers only on actual positive credited ally healing or shielding, not free self-casts or zero-effective healing, with a target shield cap and internal cooldown.

The Combat 2.0 draft already explores 13 affix families and physical versus nonphysical DoT paths. Actual signature trait resolver, offhand compatibility, proc scheduling, loadout caps and nine-class boss/dungeon power testing are **not implemented** by this review.

A pure, **unmounted preview-only** verifier now demonstrates the proposed 3% mitigation on a 1,000-point enemy direct hit (970 after the signature reduction), a seeded 10% Bleed roll with one roll per ability use, boss-half Bleed coefficient, no proc-from-proc, and no two offensive traits together. See `tools/lib/eq2-signature-combat-preview-v1.mjs` and its regression tests. This does **not** run within real combat, settle DoT ticks or grant equipment.

## Fishing and dungeon material ownership

**Fishing:** keep the original catch and grant at most one supplemental rare signature reagent on an independently verified server roll tied to a credited gathering settlement. The rare materials and their crafted fishing signature gear are **proposed** for eventual market listing, only after exact-instance Market escrow and sink validation. Fishing speed/rare-find modifiers must apply at most once; any rare-find multiplier cap needs a separately verified real implementation.

**Dungeon:** account-bound material and account-bound signature gear. Earning may use any valid character, but payout receipts are unique account-wide; no duplicate via retries, switches or Bank. Never list or send these materials/gear, sell them to an NPC, award them for failed runs or spend Dungeon Marks to buy them. This protects dungeon-exclusive progression from a trading workaround. Exact party reward attribution and per-character eligible clears must be settled through the existing authoritative dungeon command.

## Still blocking an executable 2.0 version

1. User approval of actual **named items, source probabilities, trait values and balance**; source labels are provisional.
2. Authoritative fishing side-drop source definitions and verified skill/area access in backend; server dungeon completion claims and reward-window cap rules.
3. Approved six distinct immutable item identities, physical exact-copy custody, bind tags, account-wide receipt lineage, Forge job transaction and character versus account unlocks. No mutation of current 169 items.
4. Combat 2.0 proc types and deterministic 9-class × spec × enemy/boss/dungeon matrix; DoT immunity, direct/true mitigation, supports, cooldowns and cross-equipment effect budgets.
5. Verified Market escrow/tradeability and source supply; compact pixel-art layouts and themes require separate appearance review **before any UI code is added**.
6. Staging concurrency, rollback, localization, Android QA and **one coordinated major 2.0 release**. Current 1.0.x combat, dungeons, crafting and economy must remain unchanged.

**Files:** `t2-t4-signature-equipment-fishing-dungeon-v1.json` is a non-executable design manifest; `tools/preview-eq2-signature-equipment-v1.mjs` validates all six item/source/trait proposals against the actual hidden 169-item catalog and six rare-blueprint IDs; `tools/tests/eq2-signature-equipment-v1.test.mjs` checks the safety contract and fail-closed tamper cases.

**Release status: HOLD.** Neither the proposed items nor the materials exist in the actual gameplay catalog, and no real fishing/dungeon award or signature Combat 2.0 proc has been enabled.
