# Equipment 2.0 — Unified T1–T5 hidden catalogue reconciliation (24 November 2026)

**HIDDEN REVIEW ONLY — no live game, no public catalogue, no minting, no recipes published, no loot, no equip, no Market, no UI theme changes.** The entire equipment generation stays completely hidden until the **coordinated Veldryn 2.0 release**, which itself requires explicit owner approval and all technical gates. **T5 inclusion at the 2.0 launch is not automatically assumed** by being in this registry.

## What this consolidation actually does

This pass creates one *source-reference register* of **554 distinct equipment design/source identities** and **95 source set records** for tiers T1–T5 in [the versioned review catalogue](./eq2-t1-t5-unified-hidden-review-catalogue-v1.json). It does **not** invent 554 mintable items, merge older Forge sets into newer Combat set IDs, or produce one new runtime manifest. Every row has explicit `mayMint:false`, `mayCraft:false`, `mayDrop:false`, `mayEquip:false`, `mayTrade:false`, `combatEnabled:false`, and `mayRenderInLiveUI:false`. Zero item IDs and set IDs collided across the four pinned source files.

| Tier | Hidden original Forge | Unregistered expanded 48-set members | Unregistered premium dungeon items | Rare blueprint-only concepts | T5 proposed sources | Total **review** item identities |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| T1 | 37 | 51 | 0 | 0 | 0 | **88** |
| T2 | 43 | 51 | 25 (Rootbound Vault) | 2 | 0 | **121** |
| T3 | 43 | 51 | 0 | 2 | 0 | **96** |
| T4 | 46 | 51 | 25 (Buried Observatory) | 2 | 0 | **124** |
| T5 | 0 | 0 | 0 | 0 | 125 (25 Shiverlake new boss + 4 Bellwake, 51 standard, 20 rare, 12 combos, 13 crafted armaments) | **125** |
| **Total** | **169** | **204** | **50** | **6** | **125** | **554** |

**T5 125 are not all non-dungeon:** they include **25 new regional Shiverlake items**, **4 preexisting Bellwake signature items** and **96 other authored T5 standard/rare/combo/armament candidates**. The separate T7 Blackglass Fen 25-item dungeon proposal is explicitly EXCLUDED from this T1–T5 count.

The 95 **set records** are not 95 available sets:

- **15** source-pinned original compact Forge sets (42 existing hidden set members); do not overwrite.
- **48** structural T1–T4 proposed tiered sets (204 distinct unregistered member concepts); their similar names do not make them the original 15 sets.
- **26** T5 proposed standard/rare/combo/dungeon sets (125 item candidates include 13 + 13 non-set crafted/boss armaments).
- **6** additional T2/T4 dungeon role-set concepts (three per dungeon).

## What is not yet reconciled

1. **Set canonicalization:** Original 15 compact sets versus 48 structural 2/3/4/6-member families. No automatic migration from 42 original Forge members to 204 expansion members. Decide whether to preserve both, replace future unissued proposals, or explicitly author missing pieces. None may grant a set bonus now.
2. **Gear tiers and target release:** The 169 T1–T4 ordinary hidden Forge templates are the current strongest source-backed crafting baseline. T5 content is a 125-item candidate plan. Whether T5 ships as part of the **single** 2.0 launch or follows later remains a separate owner decision. Items are hidden for **both** outcomes until 2.0.
3. **Slot/class and hand authority:** Nine class weapons, four permitted class offhands, and no phantom offhand for paired/two-handed types. Role gear is a build preference rather than an automatic hard class lock; real wear rules and future EQ2 acquisition levels still require owner signoff and server-authoritative checks.
4. **Random stats/quality:** Universal class-independent random bonus *identity* is approved as a principle; exact pool, rarity/quality magnitudes, per-tier ranges, caps and stacking are not. Original Forge rolls may not be rewritten. Generic Potency remains quarantined, not mapped into arbitrary Hex, damage or heal channels.
5. **Innate percentage stats:** Rare and dungeon candidates can have authored class/slot-specific percentage stats; their actual percentages, budgets and source-approved stat mapping remain provisional.
6. **Combat Power and set effects:** D1–D10 in the [canonical owner approval record](./EQUIPMENT_2_0_CANONICAL_APPROVAL_RECORD_20261124.md) remain open. There is no approved CP formula, executable expanded set effect, or source-authorized boss-counterplay proc.
7. **Crafting and economy:** Distinct crafted items need their own tradeable rare combat inputs, two genuine recipe methods where authored, appropriate profession skill gates **without mandatory combat level to craft**, rare blueprints and a source-owned RNG/XP/receipt/custody pipeline. Review recipes do not authorize starts or claims.
8. **Dungeon and Market:** Only authenticated actual defeated-boss drops from eligible participant enhanced reward receipts may become genuine future boss copies after explicit release policy; proposed numbers (including 8% any premium) are not active. The Market must permanently reject all pre-2.0 items, and positive EQ2 mint + transaction/custody authority is still missing. T4 Sunscar wearable-level-42 candidate conflicts with old V17 Market buy-level-52 gate. No direct NPC/Marks/shop source of dungeon gear.
9. **Appearance:** Style 4 art specification and some user-accepted concepts exist, but no unverified art assignment or unapproved equipment UI is registered by this pass. **All Equipment 2.0 stays undiscoverable** in today's Player Inventory, Market, shops, Collection, loot preview, world/dungeon flows, Search, tooltips, and any event sources.

## Technical hidden-release contract

- The existing **server** `EQUIPMENT_CRAFTING_V2_SERVER_RELEASED=false` remains unchanged. No route mounting, privileged SQL minting or player rewards are added.
- New isolated `tools/eq2-review/t1-t5/hidden-catalogue-policy-v1.mjs` exposes an **always-empty public review catalogue** and an explicit denial for every gameplay/market/source operation. It does NOT replace the actual server gate or expose a gameplay route.
- `tools/eq2-review/t1-t5/hidden-catalogue-policy-v1.test.mjs` audits **554 item identities / 95 set records**, all source groups and tiers, original server Forge identity parity, one source per item, exact playable-class offhand profiles, no future T7, immutable legacy rules and negative release gates. It exercises adversarial duplicated item ID, forged extra set member, altered release flags and mimicked item permission.
- `.github/workflows/eq2-t1-t5-hidden-catalogue-review.yml` runs isolated Node 24 tests and static no-release gate assertions. No secrets, deploy or asset registration.
- Four pinned source snapshots are linked in the JSON `sources` entries with their original GitHub ref, PR and immutable blob SHA. The registry is a cross-branch **reference document**, not a claim that its proposed members were merged into the current Forge source or that remote branches can automatically be bulk-merged.
- A future approved major release must independently establish and enforce a **coordinated versioned server/client release decision**, not merely flip the Boolean in this review file. Do not rely on UI hiding alone: crafting/mint/drop/equip/Market must all check actual server authorization.
- Legacy/pre-2.0 equipment remains owned and usable under the current game rules but can **never** be rebranded as EQ2 nor admitted into Player Market 2.0 by a fake name, tag or custody record.
- Nothing in this pass approves D1–D10, upgrades an old player item, generates real items, changes live feature flags, grants an EQ2 copy or makes any review set selectable.

## Recommended next implementation passes, still hidden

**Pass A — item/set membership reconciliation:** resolve exactly which of the original 15 compact Forge sets and expanded 48 proposed families should become final launch sets, with per-piece unique IDs, real source availability and 2/3/4/6 set thresholds. Reuse names only by explicit owner approval; never mutate original items.

**Pass B — stat and CP freeze:** finalize the universal affix pool (including Potency disposition), innate percentages, source probabilities, CP weights, exact Combat 2.0 stat effects, class/slot grip rules, set proc windows and equal-CP acceptance targets. Record explicit approvals D1–D10.

**Pass C — source-gated equipment issuer:** only after approval, implement server-authored craft/start/claim and authenticated boss reward source, exact item copy/Bank/equip custody, replay/race-proof private PG17 settlement, and positive Player Market 2.0 provenance. Keep every new item off the public game until the one coordinated major-version switch and fully validated UX/art.

**Release lock:** No T1, T2, T3, T4 or T5 2.0 item may display, mint, drop, equip, sell or have its effects active in any current 1.0.x game even if its draft source is technically complete. Do not activate T5 or selectively expose sets before the coordinated 2.0 gate.
