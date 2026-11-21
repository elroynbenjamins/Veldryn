# Veldryn Equipment 2.0 — T1–T4 resource/crafting economy v1 review

**Status:** DESIGN + VALIDATED GENERATOR OUTPUT ONLY. **NOT IMPLEMENTED INTO GAMEPLAY.**
Prepared 2026-11-21. Base: hidden EQ2 T1–T4 expansion and its TypeScript isolation branch.
Do not merge this work into `main`, install SQL, enable feature flags, or modify the live economy.

## Goal and source-of-truth boundaries

Make Mining → Smelting → Smithing, Woodcutting → Processing, and hides/fibres → Tanning/Weaving → Tailoring useful and understandable. **Keep equipment difficult and market-worthy** through large refined-material sinks plus ordinary AND scarce combat materials. Players can progress skills through processing without having to produce expensive finished equipment repeatedly.

The existing hidden equipment identities remain authoritative:
- **15 compact 2/3/4-piece sets** across Fieldborn, Ironwood, Sunscar and Glassbound; no forced ten-piece sets.
- **169 ordinary equipment item templates, 338 draft recipe methods**. The six blueprint-exclusive T2–T4 items stay locked and excluded.
- Existing item IDs, role recommendations, armor/weapon slots, stat profiles, normal Forge timing/Gold/XP, existing class/equip constraints are not changed in this review.

The original hidden Smithing recipes often require large raw wood and fibre totals (for example, the Fieldborn Guard Chest used Greenwood Logs and Moss Fibre without copper ore or smelting). This design **replaces that material logic in an offline preview**, not in the manifest.

## Review files

- `t1-t4-economy-review-v1.json`: four tier resource palettes, 16 material-processing recipes, per-slot weighting, alternate-route policy, provisional rates, shop/exclusivity guardrails.
- `t1-t4-economy-generated-recipes-v1.json`: 338 **explicit read-only** recipe proposals derived from actual 169 hidden item IDs; `reviewOnly:true` on each.
- `tools/preview-eq2-economy-v1.mjs`: regenerates from the hidden *server-side* catalogue, checks count/uniqueness/routes/mandatory combat parity. Use `--write` to rewrite the review output only.
- `tools/simulate-eq2-economy-v1.mjs`: compares ordinary chest and valid illustrative tank 10-slot loadout at 300 vs 900 eligible kills/hour. No live player telemetry accessed.

## Materials: reusable existing sources plus REVIEW-ONLY new identities

| Tier | Metal chain | Wood chain | Tailoring chains | Common combat | Scarce combat |
| --- | --- | --- | --- | --- | --- |
| T1 Fieldborn | Copper Ore ×3 → Copper Bar | Greenwood Logs ×3 → Plank | Boar Hide ×3 → Leather; Moss Fibre ×4 → Cloth | Boar Tusk | Verdant Essence (not ordinary-gear mandatory at T1) |
| T2 Ironwood | Iron Ore ×3 → Iron Bar | Ironwood Logs ×3 → Plank | Wolf Pelt ×3 → Leather; Thorn Fibre ×4 → Cloth | Wolf Fang | Troll Sinew |
| T3 Sunscar | Sunstone Ore ×3 → Ingot | Dunewood ×4 → Treated Plank | Sunscale ×3 → Leather; Dune Fibre ×4 → Cloth | Sunscar Scale | Miragefang Core |
| T4 Glassbound | Sunstone Ingot ×2 + Glassbound Dust ×1 → Alloy Bar | Dunewood ×5 + Dust ×1 → Reinforced Plank | Sunscale ×4 + Dust ×1 → Leather; Soul Fibre ×5 + Dust ×1 → Cloth | Glassbound Plate | Glassheart Fragment |

**New source IDs, inventories, drop eligibilities, UI icons and gathering-node allocation are not wired yet.** Existing Greenwood, Ironwood, Boar Hide, Wolf Pelt, Sunscale, Sunstone Ore/Ingot, Dunewood, Amberglass and binder IDs are reused where appropriate; do not conflate a proposed EQ2 ID with a currently earnable item. Distinct jewellery/gem source chains still need a specific gathering balance pass.

No recipe should have more than about six ingredient **types**: three refined resources, common combat material, optionally scarce combat material, plus tier binder. Difficulty is quantity and rarity, not a maze of filler components. Each weapon family may use wood/metal/cloth in different proportions, including wood-centric bows and staves.

## Representative full-size chest recipes

| Tier and existing chest identity | Foundation material proposal |
| --- | --- |
| T1 Fieldborn Guard Chest | 18 Copper Bars, 8 Greenwood Planks, 5 Boar Leather, 6 Boar Tusks, 1 Verdant Binder |
| T2 Ironwood Sentinel Chest | 28 Iron Bars, 10 Ironwood Planks, 7 Wolf Leather, 8 Wolf Fangs, 1 Troll Sinew, 1 Ironwood Binder |
| T3 Sunscar Breaksteel Chest | 36 Sunstone Ingots, 12 Treated Dunewood, 9 Sunscale Leather, 12 Sunscar Scales, 1 Miragefang Core, 1 Dune Binder |
| T4 Glassbound Bulwark Chest | 48 Glassbound Alloy Bars, 14 Reinforced Dunewood, 12 Hardened Sunscale, 16 Glassbound Plates, 2 Glassheart Fragments, 1 Glassbound Binder |

Additional slots use multipliers: chest 1.00; legs .82; weapon 1.12; offhand .66; helm .72; gloves .56; boots .63; cape .65; amulet .43; ring .39. Material archetypes differ (steel, mail, leather, cloth, jewellery). Every recipe has ≥2 common combat drops. T2 requires scarce material for chest/legs/weapon; T3 adds helmet/offhand; T4 requires scarce materials for every slot, with **two** for chest/legs/weapon.

Both canonical material routes remain. Alternate route exchanges approximately 20% fewer primary refined materials for 35% more secondary refined materials while keeping required combat items, scarce quantities, binder, Gold/XP/time/levels **identical**. Do not claim economic parity until real market prices are known.

## Provisional combat rates: not live

These odds refer to eligible monsters only; no across-the-board drop table:
- T1: common 14%, scarce 4%, eligible elite scarce 20%. Ordinary T1 gear does not need rare essence.
- T2: common 10%, scarce 1.5%, elite scarce 10%.
- T3: common 7%, scarce 0.6%, elite scarce 6%.
- T4: common 5%, scarce 0.25%, elite scarce 4%.

Elite encounters must have independently controlled appearance frequency, so high-power players cannot assume 4% applies to every ordinary fight. The **much rarer blueprint unlocks** are separate from crafting-material odds; preserve existing proposed T2/T3/T4 elite blueprint odds 0.05%/0.03%/0.02% and boss blueprint policy until reviewed.

Specific enemy IDs, minimum zone, kill eligibility and per-character/account eligibility, drop limits, AFK/idle kill rates and boss schedules must be measured and reviewed before assigning these probabilities. Drops must never depend on client-declared kill power.

## Fast-combat back-of-envelope

Assuming eligible normal kills, independent random drops, no market purchases, no elite boost, no existing inventory and *conservatively adding* common and scarce farming if sourced from **different** enemies:

| Tier | Example tank chest at 300 kills/h | Illustrative full tank 10 slots at 300 kills/h | At 900 kills/h, 10 slots |
| --- | --- | --- | --- |
| T1 | 0.14 h | 1.07 h | 0.36 h |
| T2 | 0.49 h | 2.70 h | 0.90 h |
| T3 | 1.13 h | 6.92 h | 2.31 h |
| T4 | 3.73 h | 25.07 h | 8.36 h |

These figures include **combat drops only**. No mining/woodcutting, refining, binding, Forge queues, Gold, travel, monster spawn downtime, exact enemy-source restrictions or bad-luck percentiles. If the same kills can award both common and scarce materials, the total **can be lower** (for the T4 ten-item example, 17.33 h at 300 or 5.78 h at 900). An actual full loadout is NOT a 10-piece compact set; 10 slots is only the example equipment complement.

One T4 tank 10-slot loadout requires approximately **116 common + 13 scarce materials** in the review recipe selection. This is intentionally demanding: repeating T4 crafts for desirable rarity/quality/affix rolls consumes the materials again. It must still be tested against actual player power trajectories, kill speeds, enemy distribution, available Forge slots, and market elasticity.

## Processing skill and Market design

- Processing grants useful, capped-by-normal-progression skill XP independent of scarce drops. **Smelting awards Smithing XP; tanning and weaving award Tailoring XP; plank processing awards Woodcutting XP.** The separately proposed Forge skill remains a future decision, not a newly introduced Smelting skill. Proposed XP/step is in the JSON; target that a practical progression journey can get about **55–65% of profession XP from processing**, 35–45% through equipment, but do not enforce fixed XP shares as caps.
- Forge tier/skill speed perks can reduce job duration (up to proposed 10% maximum) without altering drop chances or reducing resources. Preserve server authority and existing request-id/idempotency behavior.
- Basic finished-equipment recipes always use combat drops, and perfect-roll crafting is a recurrent trade sink.
- Salvage should refund some ordinary resources but **no scarce components** (needs exact rules after review).
- Ingredients, refined resources and ordinary crafted gear may support future Player Market flows with actual escrow and supply/demand telemetry. Dungeon, Party Event and World Boss drop/chest exclusive gear remains **earned-only** and not market-listed under the already chosen Equipment 2.0 policy.
- Never guarantee pricing, prescribe flat price floors/ceilings or silently nerf player's existing legacy inventory from these theoretical inputs.
- Keep two routes per item; neither can omit the combat component. Do not grant rare blueprint craft permissions or convert existing unowned EQ2 items.

## Approval and implementation gates

**Done in this workstream:** design data, canonical 169-item/338-method coverage, invariants check against hidden manifest, read-only machine-readable review output and simulation harness.

**Not done:** new mineable node/source IDs, processing recipes in canonical craft catalog, monster drops, server-side material debit, profession XP balances, production market escrow, migration/legacy item mapping, UI screens/themes, icons, full Gold and craft duration rebalance, staging/Android/CI rollout.

Before implementation to hidden runtime:
1. Obtain review of this economy model and **actual UI/theme appearance**; avoid any UI implementation before explicit design approval.
2. Measure eligible kill/hour distributions at low/median/high CP for each tier, raw resources/hour, production volumes, processing XP/hour and repeat-reroll rates. Target times at P50/P90, not just average.
3. Run deterministic Monte Carlo or exact negative-binomial bad-luck simulations; compare low/high player power, market volumes, crafting material prices and expected 1/3/5/10-item attempts.
4. Resolve crafting tier level gates and name/source consistency with 2.0 Skills/Enemies/World redesign and rare-blueprint exclusivity.
5. Produce server-owned `itemDef`, gathering/refinement/craft/drop eligibility policies with fail-closed guards, clear legacy compatibility, receipt/ledger integration, tests, staging dry runs and rollback instructions.
6. Only then authorize source changes behind **disabled EQ2 gates**, with independent approval for real release.

No UI, economy, database, production data, release flag, working craft action, or public 1.0.x player behavior is modified by these files.
