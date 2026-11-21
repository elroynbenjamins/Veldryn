# Equipment 2.0 — expanded set families reconciliation and gameplay identity (review v1)

**22 November 2026 · Source-audited, design-only. Not a live set bonus policy, item manifest, RNG configuration or UI.**  
Related: [core vision](./CORE_EQUIPMENT_COMBAT_VISION_V1.md), [balance matrix](./CORE_BALANCE_ACCEPTANCE_V1.md), [Forge crosswalk](./FORGE_COMBAT_RECONCILIATION_PASS1_20261122.md).

## 1. Two distinct EQUIPMENT SET catalogues; neither supersedes the other silently

### A. Earlier hidden Forge item catalogue (actual item templates)
- Latest expanded hidden Forge source holds **169 ordinary T1–T4 item templates, 338 crafting routes**. This includes **42 set pieces across 15 named sets**, **24 original standalone armor/accessories**, **51 expansion armor/accessories** (33 slot coverage + 18 alternative-stat designs), and **52 class armaments/offhands**.
- The 51 additional items have no Forge `setId`; they are **not** 51 new sets or pieces of an existing set.
- Six very rare blueprint-only items are further **candidates** and are **not** craftable, obtainable or included in the 169.
- Actual Forge set distribution: T1 3×2-piece; T2 3×3-piece; T3 3×3-piece; T4 3×4-piece + 3×2-piece. **Total 15 sets/42 pieces.**
- Source pins: Forge main manifest blob `d9da079bf924f94ac66ad5d8c33ae7221c8edf5d`, expansion `e338736eb9592ebe8ff64a26d8f79f035a21a60f`, armaments `800cd8cf98f6641892650b10419f8d0f784c88c6`. These must be rechecked against canonical integration SHA before any live issuance.

### B. Combat 2.0's larger structural **set design**
- `backend/src/server/combat/v2/set-catalog.ts` contains **12 named families × five tiers T1–T5 = 60 tiered set definitions**.
- The coordinated initial T1–T4 focus is **48 tiered set definitions**; T5 is structural future scope, not a promise of T5 launch craftables.
- Every tier has **51 designed set-piece slots**, split **17 Tank / 17 Damage / 17 Support**; T1–T4 require **204 distinct membership slots** if each tiered family is fully realized without sharing an item across set identities.
- There are **three 6-piece designs per tier** (Citadel, Breakerforge, Rootshield), hence 15 structural six-piece tiered definitions T1–T5. **None is a real six-piece Forge set yet.**
- These definitions are conceptual build structures. There are no guaranteed source-mapped item templates, authenticated complete equips, approved numerical set effects or loot sources for all 60.

**Do not claim 60 implemented sets, do not add 60 to the 15, and do not automatically apply a Combat family's bonus to a similarly themed Forge item.** The ID systems don't match. Current source-origin direct-ID match between the 60 and 15 is **zero**.

## 2. All twelve approved-for-design family identities

The names and slot/threshold structures below are **present in the Combat structural source**. Suggested gameplay identities are proposed, not approved/executable bonuses.

| Family | Role | Exact slot count | Authored thresholds | Proposed identity and balancing rule |
| --- | --- | ---: | --- | --- |
| **Oathplate** | Tank | 4 | 2, 4 | Reliable physical guarding; 2p modest Defense; 4p once-per-window direct-hit protection without reflecting phase damage |
| **Citadel** | Tank | 6 | 2, 4, 6 | Party protector; 2p HP; 4p shield assistance; 6p capped ally-protection effect based on *effective original* shield, not overheal |
| **Bloodsteel** | Tank | 4 | 2, 4 | Offensive defense and counterattacks; reflection or retaliatory chip must consume the same shared 5-second boss reflect budget |
| **Vigilhide** | Tank | 3 | 2, 3 | Evasion/ordinary-debuff resistance; cannot evade unavoidables or bypass scripted boss control |
| **Quickstep** | Damage | 3 | 2, 3 | Basic attack tempo and positioning; haste limited by minimum action interval, consecutive-hit stacks reset on miss/target switch |
| **Horizon** | Damage | 4 | 2, 4 | Precision/critical direct attacks; accuracy cannot skip telegraphed guaranteed mechanics; no permanent auto-crit |
| **Blackscript** | Damage | 4 | 2, 4 | Shadow/arcane/nature periodic magic; never scales physical Bleed, secondary trait effects or unrelated summons |
| **Breakerforge** | Damage | 6 | 2, 4, 6 | Heavy direct ability, penetration and earned burst windows; 6p can't create a new original cast/crit proc loop |
| **Brightweave** | Support | 4 | 2, 4 | Credited ally heal and shield strength; overheal and empty shields cannot activate other procs |
| **Stormthread** | Support | 3 | 2, 3 | Tempo/utility and class ability uptime; bounded haste, no permanent cooldown cycling |
| **Rootshield** | Support | 6 | 2, 4, 6 | Defensive nature wards and ally mitigation; party 6p effects share shield/mitigation caps, no chained shield pulses |
| **Echohide** | Support | 4 | 2, 4 | Small one-off secondary ally sustain; effective healing only, no recursive gear/gem/skill resources |

### Tier depth and recognizable choices

- **T1:** introduce basic two-piece identity and teaching mechanics; do not require a six-piece set to clear Asterfall. Structural six-piece families exist as ideas, not forced T1 loot.
- **T2:** allow a few three-piece modifiers that change a tactical choice without breaking clear speed.
- **T3:** support meaningful 4-piece offensive/defensive/support choices and enemy resistance counters. Mid-tier crafted gear retains a use.
- **T4:** late-tier 4/6-piece identity effects can interact with the full Combat 2.0 event vocabulary **only** under source-owned proc budgets and verified real tiered item supply. Avoid giving every build both best offense and best defensive set effects.
- **T5:** retain all 12 structural definitions for later progression. Do not publish missing T5 ingredients/drops or implicit release promises.

**Candidate magnitude envelope for first benchmarks (not approved):** 2p 1–2% role-relevant relative stats or +0.5–1 percentage points of bounded utility; 3p a small conditional window with internal cooldown; 4p a meaningful but bounded 2–4% role-relevant effect in an intended scenario; 6p distinct utility with infrequent window/party value. A combination of several partial sets must never bypass global combat caps. Actual coefficients need class/boss/source simulations before becoming server policy.

## 3. Item-identity supply and impact

- The Combat 2.0 structural design needs **204 T1–T4 set membership slots** at 51 per tier, while Forge currently holds **117 non-armament armor/accessory templates** (66 original + 51 expanded), of which 42 have explicit Forge set memberships. The other 75 are non-set.
- Even reassigning **all** 117 existing non-armament pieces to exactly one of the structural families would still leave **at least 87 T1–T4 set membership slots** without distinct items. This hypothetical repurposing destroys standalone diversity and is NOT recommended as a silent migration.
- Retaining all existing item identities as they are leaves the structural family catalogue without any exact matching IDs. To realize all 204 slots from the current 42 Forge set-piece baselines **would hypothetically require 162 additional set-piece definitions after carefully mapped reuse**; this is a conceptual delta, not an approved craft count. That mapping may be impossible for some role/slot/tier pairs and needs an explicit editorial item-by-item review.
- Weapon/offhand instances are separate from the 12 structural families; do not count them as six-piece completion shortcuts.
- The 11-family shared weapon allowlist and four Hewing Axes live on a separate hidden branch; reconcile them explicitly and avoid counting those four as already present in the 169 without source proof.

## 4. Suggested integration strategy — preserve both, avoid a content explosion

**Recommendation:** Treat the 12×5 Combat definitions as the long-term **design catalogue**. Keep 169 ordinary T1–T4 Forge items as the current concrete item-crafting baseline. Reconcile piece-by-piece, with a transparent readiness status per family/tier: `structural_only`, `templates_authored`, `drop_or_recipe_source_verified`, `combat_bonus_implemented`, `staging_verified`, `release_ready`.

- First finish all 15 existing compact Forge sets with **real, available** pieces and role-appropriate bounded bonuses; do not downgrade existing intended set IDs.
- Then select future sets from the 12 named role families for authored item expansion while building the tiered set-family catalogue. New items must have unique exact IDs, role/slot eligibility, two valid routes where craftable, materials sourced by combat/gathering and verified Market/binding policies.
- **Do not** enable a Combat family set threshold for which a player cannot legally obtain all necessary members, and don't publish unavailable 4p/6p descriptions as if obtainable.
- At release, provide a clear per-family/tier catalogue showing **which sets are obtainable**. Whether full 48 sets should ship in one update or progressively is an explicit owner content-scope decision after costs, art, item supply, backend, combat balance and UI appearance are reviewed.
- Preserve real dungeon/party/world exclusive equipment and authored signature traits, with a maximum two active traits per build and no free extra trait from set count.

## 5. Set bonus engine and ownership gates

Combat's `applyVerifiedSetBonusesV2` already validates set IDs and thresholds against the 60 structural definitions and **requires** each active effect from server-approved `effectsByThreshold`. It does not grant guessed 6p effects and currently represents stat-only effects; real reactive identity procs are still unimplemented. This is **not an item/receipt-source adapter**. Its current build validator uses role and set-family ownership from a trusted future build snapshot, so no client-provided new set membership may be accepted.

Before implementing any of the design above:
1. Version/sign the canonical tiered set ID and each actual member item template ID, source recipe/drop, ownership and tier.
2. Check every 2/3/4/6 threshold against **actual authored member count** and equipped, owner-verified exact item instances.
3. Verify no role bypass, cross-tier cross-family mixing, alternative-item double counting, duplicate item IDs, weapon/offhand substitution or banked/other-character completion.
4. Apply stat bonuses once after frozen base primary stats and before source-authorized affixes, with shared global Crit/Haste/HP/mitigation caps. Every valid earned item/loadout must remain usable; invalidate only forgery.
5. Treat every reactive effect as a future separate typed original-event hook, with per-target cooldowns and shared cross-system caps, not generic stat modifier effects.
6. Run genuine 18 class/spec × tier × set-completion × enemy/boss/dungeon matrix and balance against companion/gem/trait/boon synergies before enabling release.
7. Actual pixel-art UI and themes need user review and approval before any runtime presentation changes.

## 6. Verified audit code

`backend/src/server/combat/v2/equipment-set-catalogue-reconciliation-review.ts` imports the existing Combat 2.0 structural catalogue and compares it to a **source-pinned read-only Forge snapshot** of its 15 named sets and 42 member slots. It establishes the 12/60/48/15 count discrepancy and refuses to claim any exact matching Forge/Combat set IDs. The test asserts 204 required conceptual T1–T4 slots, 15 structural six-piece tiered definitions, zero Forge six-piece sets, and no implied gameplay authority.

**No code in this pass issues a set, migrates an item, unlocks a threshold, modifies a player build, or changes live 1.0.x.**


## 7. Initial role-and-slot mapping review — NOT an automatic migration

A read-only comparison of all 15 Forge set IDs to the 12 Combat families shows possible thematic homes, but **a matching slot is never proof of matching item identity, semantics, power or loot source**. Recommendations below require owner review and separate authored member IDs. Do not silently rename Forge set IDs.

| Forge T1–T4 set | Best structural direction(s) from same-role slot overlap | Notes |
| --- | --- | --- |
| Fieldborn Guard (2p) | Oathplate / Citadel | Both currently share helmet+chest; candidate only |
| Fieldborn Trail (2p) | Quickstep | Gloves+boots; Quickstep still needs cape |
| Fieldborn Acolyte (2p) | Brightweave | Cape+amulet; still needs chest+gloves |
| Ironwood Sentinel (3p) | Citadel | Chest+legs+boots; 3 of its 6 structural slots |
| Ironwood Stalker (3p) | Quickstep / Horizon | Each shares 2 slots; no objective unique fit |
| Ironwood Mender (3p) | Stormthread / Brightweave | Each shares 2 slots; different support identities |
| Sunscar Thornhide (3p) | Oathplate / Citadel | Each shares 2 slots |
| Sunscar Breaksteel (3p) | Blackscript / Breakerforge | Each shares 2 slots; playstyle differs sharply |
| Sunscar Wildroot (3p) | Rootshield | Helmet+boots+cape, 3 of 6 |
| Glassbound Bulwark (4p) | Citadel | Helmet+chest+legs+boots; 4 of 6 |
| Glassbound Retaliator (2p) | Undecided | Four structural tank families share only 1 slot |
| Glassbound Shadowstep (4p) | Breakerforge | Helmet+chest+gloves+boots overlaps 3 slots |
| Glassbound Spellweave (2p) | Undecided | Four structural damage families share only 1 slot |
| Glassbound Lifewoven (4p) | Rootshield | Helmet+chest+legs+boots overlaps 4 of 6 |
| Glassbound Dawnshield (2p) | Brightweave | Gloves+cape; two other slots not authored |

**Recommendation for this first reconciliation:** keep all existing 15 Forge names/recipes/items unchanged; use the mapping purely to identify **future distinct item concepts** and real costs. Do not collapse multiple tier sets into a single family or unlock bonuses by equivalent slot count. A single signed server member catalogue must explicitly link each piece to precisely one valid tiered set ID before the expanded 12-family system becomes executable.

The source's first-pass exact role/slot comparison yields no equivalence authorization. Where two families fit equally well, differentiate them by gameplay mechanic, scarcity, art and material source during an owner's gameplay and visual review rather than guessing from a similar name.
