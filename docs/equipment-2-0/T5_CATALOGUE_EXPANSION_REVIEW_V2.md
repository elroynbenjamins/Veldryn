# Equipment 2.0 — Frostmarch Tier 5 expanded catalogue v2

**23 Nov 2026 | HIDDEN DESIGN REVIEW ONLY | Not merged, not live, no item/recipe/mint/market/UI activation.**

This proposal extends the source-verified [physical subtype catalogue #1674](https://github.com/elroynbenjamins/Veldryn/pull/1674). It adds **12 standard T5 sets (51 pieces), two NEW rare sets (10 pieces), and 13 class armaments (9 weapons + 4 supported offhands)**, while retaining the **two EXISTING approved rare tank sets (10 pieces) completely unchanged**. That gives **16 T5 sets, 84 T5 item candidates (74 newly proposed)**. Adding 74 draft IDs to the inherited 383-identity review yields **457 raw source rows**, NOT 457 approved or distinct releasable items: the inherited crosswalk still includes ten retired T4 Citadel/Bloodsteel draft IDs and omits the ten approved T4 Bastionmail/Ashguard replacement identities. Those must be reconciled one-for-one before any canonical count. None are registered templates or craftable items.

## Preserve the two accepted rare T5 designs

- **Frostmarch Citadel:** 6-piece tank; original percentages, Tower Guard and Citadel Unbroken unchanged.
- **Frostmarch Bloodsteel:** 4-piece aggressive tank; original percentages, Tempered Guard and Red Reprisal unchanged.
- Do not reissue or alias the retired T4 Citadel/Bloodsteel sets. T4 Bastionmail/Ashguard replacements stay separate.
- Source of truth for both older rare proposals: [`t5-rare-set-catalogue-review-v1.json`](./t5-rare-set-catalogue-review-v1.json). This expansion LINKS those entries rather than copying or changing existing members or recipes.

## New standard T5 sets

| Set | Role | Pieces / slots | Identity | 2/3/4/6-piece bonuses (all draft) |
| --- | --- | --- | --- | --- |
| Frostmarch Oathplate | tank | 4: helmet, chest, legs, cape | Steadfast guard | 2p Oathbound Guard: +3% Defense; 4p Oathplate Resolve: After a qualifying direct hit removes at least 5% maximum HP after mitigation, gain +4% Defense for 6 seconds (16s ICD) |
| Frostmarch Rimewatch | tank | 6: helmet, chest, legs, boots, cape, ring | Shield discipline | 2p Winterwall: +3% maximum HP; 4p Rimeguard: When a qualifying direct hit is received while below 50% HP, create a shield for 4% maximum HP lasting 6 seconds (24s ICD); 6p Weather the Break: When Rimeguard's shield is fully broken by a direct hit, reduce incoming non-true damage by 6% for 4 seconds (30s ICD) |
| Frostmarch Rimebrand | tank | 4: gloves, boots, amulet, ring | Counterstrike | 2p Tempered Edge: +2% Attack and +2% Defense; 4p Measured Reprisal: After taking eligible direct HP damage, the next direct class-ability hit within 6 seconds deals +9% damage (16s ICD) |
| Frostmarch Snowveil | tank | 3: helmet, gloves, boots | Evasive guard | 2p Cold Footing: +2 percentage points Evasion; 3p Slip and Brace: After successfully evading a qualifying direct attack, gain +4% Defense for 5 seconds (18s ICD) |
| Frostmarch Whitefang | damage | 3: gloves, boots, cape | Mobile physical damage | 2p Swift Pursuit: +3% Haste; 3p Snowstep Opening: After successfully evading a direct enemy attack, the next direct class-ability hit within 5 seconds deals +8% damage (14s ICD) |
| Frostmarch Farwind | damage | 4: helmet, gloves, amulet, ring | Precision ranged | 2p Clear Sight: +3% Attack; 4p Patient Volley: After three consecutive successful direct weapon hits on the same target, the next direct weapon hit within 6 seconds deals +8% damage (14s ICD) |
| Frostmarch Nightglass | damage | 4: chest, legs, boots, cape | Direct spellcraft | 2p Arcane Etching: +3% direct class-ability damage; 4p Fractured Tempo: After an eligible direct spell hit, gain +4% Haste for 6 seconds (18s ICD) |
| Frostmarch Avalanche | damage | 6: helmet, chest, legs, boots, amulet, ring | Heavy burst | 2p Weight of Winter: +3% Attack; 4p Follow-Through: After a direct physical class-ability hit, the next basic attack within 6 seconds deals +6% damage (16s ICD); 6p Crushing Finish: A direct physical class-ability hit against a target below 30% HP deals +8% damage (20s ICD) |
| Frostmarch Dawnweave | support | 4: chest, gloves, cape, amulet | Efficient healing | 2p Gentle Radiance: +3% Healing Power; 4p Soft Refuge: After an eligible direct heal that restores missing HP, grant that target a shield for 3% of their maximum HP for 6 seconds (18s ICD) |
| Frostmarch Stormthread | support | 3: helmet, gloves, boots | Tempo and buffs | 2p Gathering Wind: +3% Haste; 3p Storm's Cover: After granting an authenticated class ally-buff, grant that ally 3% reduction to incoming non-true damage for 5 seconds (20s ICD) |
| Frostmarch Winterroot | support | 6: helmet, chest, legs, boots, cape, ring | Recovery and cleanse | 2p Rooted Hope: +3% maximum HP; 4p Shelter Bloom: An effective direct heal on an ally below 50% HP grants a shield for 4% of target maximum HP for 6 seconds (20s ICD); 6p Purifying Shelter: A successful authored cleanse grants its target 6% reduction to incoming non-true damage for 5 seconds (30s ICD) |
| Frostmarch Echohide | support | 4: helmet, legs, boots, ring | Reactive healing | 2p Winter Echo: +3% Defense; 4p Answering Care: After an ally takes eligible direct HP damage, the next effective direct heal on that ally within 6 seconds gains +7% Healing Power (16s ICD) |

Standard families have one/two role-suited **base stat channels**, ordinary rarity/quality rolls per the eventual approved T5 pool and **NO authored innate percentage stat per item**. Named set bonuses are authored separately and should never be mistaken for random roll affixes.

## Two *new* rare T5 candidates

| Set | Role | Pieces | Deterministic innate percentage / pp stats | Breakpoints |
| --- | --- | --- | --- | --- |
| Frostmarch Shardrunner | damage | 4 | gloves: +3% attack_pct, boots: +2pp evasion_pp, cape: +2.5% haste_pct, amulet: +3% ability_damage_pct | 2p Frozen Pursuit: +3% Attack and +2 percentage points Evasion; 4p Shatterstep: After successfully evading an eligible direct attack, the next direct physical class-ability hit within 6 seconds deals +12% damage (16s ICD) |
| Frostmarch Dawnspire | support | 6 | helmet: +3% max_hp_pct, chest: +3.2% defense_pct, gloves: +3% healing_power_pct, boots: +2.5% haste_pct, cape: +1.5pp ward_pp, ring: +3% healing_power_pct | 2p First Light: +4% Healing Power and +2% Defense; 4p Sanctuary Thread: After an eligible effective direct heal, shield that target for 5% of target maximum HP for 6 seconds (20s ICD); 6p Dawnspire Rally: When an ally crosses below 35% maximum HP, the next effective direct heal on that ally within 6 seconds gains +14% Healing Power and grants 6% incoming non-true damage reduction for 5 seconds (35s ICD) |

These are **not visual/art-approved**; they do not inherit Citadel/Bloodsteel's approved status. Their deterministic innates stack with LEGAL future random affixes once, with no duplicated rarity scaling. The **new rare recipe candidates explicitly apply +35% refined/wood/common materials (rounded up), +45% Gold (rounded up to 100), +35% queue time (rounded up to 10 seconds)** against equivalent standard T5 slot templates. Scarce combat inputs, binders, signatures and blueprints remain mandatory. These are not approved economy values and do NOT alter the accepted Citadel/Bloodsteel absolute recipes.

## T5 armament baseline

| Class | Proposed T5 weapon | Authored physical strike profile / exception |
| --- | --- | --- |
| IRONWARDEN | Frostmarch Ironwarden Oathblade | 100% slashing |
| BASTION | Frostmarch Bastion Shieldblade | 100% slashing; Shieldblade art identity still pending owner decision |
| DREADGUARD | Frostmarch Dreadguard Chained Scourge | 70% blunt / 30% slashing |
| WAYFINDER | Frostmarch Wayfinder Bow | 100% piercing |
| RAVAGER | Frostmarch Ravager Greatblade | 100% slashing |
| HEXWEAVER | Frostmarch Hexweaver Wand | No automatic physical subtype; Spell-authored damage only; no automatic physical subtype |
| KNIFE_DANCER | Frostmarch Knife Dancer Paired Blades | 60% piercing / 40% slashing |
| DAWNKEEPER | Frostmarch Dawnkeeper Mace | 100% blunt |
| STONECALLER | Frostmarch Stonecaller Staff | 100% blunt; Blunt applies only to explicitly authored staff melee hits, not spells |

**Offhands (4):** IRONWARDEN — Frostmarch Guardian Shield (Authored Shield Bash may be Blunt); BASTION — Frostmarch Tower Shield (Authored Shield Bash may be Blunt); HEXWEAVER — Frostmarch Hex Focus (No physical attack subtype); DAWNKEEPER — Frostmarch Dawn Aegis (Authored Shield Bash may be Blunt). 2H/paired weapon classes must not receive phantom offhands. Future damage types are sourced from authenticated weapon or skill hits; armor does **not** cause hidden Blunt/Slash/Pierce vulnerabilities. No extra damage instances or bleed/stagger procs.

## Crafting/economy (new proposals, not approved costs)

- Standard sets: candidate **combat wear level 52**, profession **Smithing/Tailoring 42**. Weapons/offhands: candidate Smithing/Tailoring **44**, same wear level. New rares: **wear level 56**, profession **48**, subject to accepted original rare policy. **No combat level gate to craft, ever.**
- Every proposed new item has Foundation and Alternate recipes. The alternate reduces primary refined inputs by 20% (round up) and increases secondary refined inputs by 35% (round up). It never reduces combat-common, scarce-combat, Alchemy binder, Gold, queue time, or new rare signatures. Every recipe is no-fail in this review.
- Frostwood planks create a **new specialist Woodcutting/refining sink** in armor construction and weapons. No current Frostwood resource source or output efficiency is asserted; the input and supply chain must be registered and telemetry-verified. Existing T5 material IDs are also not registered.
- Common Rimebone Shard and scarce Icevein Sigil are **unregistered candidate combat drops**. Effective enemy rates, elite/boss contribution, fast-clearing impact and supplier access must be tested instead of inventing production probabilities.
- New rare sets additionally require separate **tradeable signatures** Shardheart / Dawnspire Core and a master blueprint. Trade/commission access must allow dedicated crafter progression with little or no combat. The old rare sets keep their own material recipes unchanged.
- Gold/time and main resource bills in the JSON are **not final**, do not represent actual live resource quantities, and do not authorize crafting XP. Equipment-craft XP remains secondary to refining/profession training.

## Combat integrity

New bonuses need verified damage/heal events, after-mitigation eligibility and global caps. DoT ticks, reflection, self-damage, procs, absorbed-only hits and duplicate simultaneous triggers cannot activate direct-hit bonuses. Thresholds trigger on crossings; real effective heals are required for healing bonuses; stat snapshots and existing 13-affix pool never mutate retroactively. No subtype resistance/bonus becomes active through catalogue metadata.

## Rollout blockers

1. Owner visual review for all new Style 4 art and actual UI/themes before app implementation
2. Reserve exact identities and reconcile with 169 original pinned plus 204 proposed T1–T4 plus 10 existing T5 source records, never merge accidental duplicates
3. Register all new material sources with actual enemy/gathering grants and payout telemetry, including Frostwood specialist throughput
4. Approve numeric base stat budgets, set-specific trigger semantics, overlapping caps, class/spec eligibility and new rare innates
5. Enforce original fixed rare Citadel/Bloodsteel innates and set bonuses byte-for-byte unchanged
6. Approve future T5 rarity/quality/13-affix compatibility, recipes and XP/Gold/time with observable economy impact
7. Implement authenticated PG custody, escrow, commissions, 2-route server reservations, rollback, duplicate protection and protected market provenance
8. Prove distinct weapon source + physical subtype handling for all nine classes and skill overrides; no automatic shield bash
9. Run nine-class/eighteen-spec/role counterplay replays and signed source tests across T4 and T5 plus dungeons/bosses
10. Obtain coordinated Veldryn 2.0 release approval; DO NOT merge this review, deploy, change runtime or reveal in live market

## Source files

- Machine-readable authoring and 2-route review data: [`t5-catalogue-expansion-review-v2.json`](./t5-catalogue-expansion-review-v2.json).
- Older accepted rare snapshots: [`t5-rare-set-catalogue-review-v1.json`](./t5-rare-set-catalogue-review-v1.json).
- Original T1–T4 48-set and 204-piece plan on sibling branch #1598 is not automatically changed by this review.

No art, UI, combat, material registration, database, player economy, or live feature was changed by this catalogue write.
