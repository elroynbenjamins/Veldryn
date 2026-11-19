# Veldryn Equipment 2.0: T1–T4 expansion and earned-gear exclusivity

**Status: hidden design manifest + unmounted source contract only; not yet wired to the authoritative Equipment/Crafting 2.0 server/client catalogs, item rolls, shops or actual reward paths.** This PR intentionally stacks on hidden Equipment/Crafting 2.0 PR #1382, not `main`. Both Equipment 2.0 client/server flags remain OFF. No drop odds or purchases are active.

## Decision (19 November 2026)

- Expand **T1–T4 only**. T5 starts **after Equipment 2.0 releases and settles**, then progressively T6+ based on telemetry and balance.
- Maintain 2-, 3- and 4-piece **compact sets**; do NOT resurrect ten-piece sets or force a set per class.
- Every tier must have at least **one Tank, Damage and Support** armor/accessory option in each of helmet, chest, gloves, legs, boots, cape, amulet and ring. Role is a recommended build, **not an exclusive equip lock**; no weapon hand rules change in this design.
- T2–T4 each add **six alternative-stat items**: two Tank, two Damage, two Support. These are separate canonical item IDs with different silhouettes and **different allowed ATK/DEF/HP stat profiles**, but **identical same-tier total base budget**, not a free 20% upgrade.
- T2–T4 each add **two rare-blueprint-exclusive craftables**: six in all, with a tier-appropriate unique silhouette, +3%/+4%/+5% draft base budget multiplier, 1 bounded trait and more expensive recipe. Blueprint only drops from qualifying elites or regional bosses—not from any shop. Provisional monster-source odds are expressed in basis points in JSON, **not installed or economy-approved**. Do NOT spawn these recipes globally unlocked.
- Dungeon/Party Event rewards should be **situationally stronger or more build-defining** than same-tier ordinary craft gear. Keep same-tier total power from invalidating the next tier; prefer a compelling conditional/threshold set bonus and a modest base multiplier over unconditional power creep.
- **World Boss gathering sets remain gathering-speed specializations**, not 10-slot combat-stat inflation.
- **Reward equipment from Dungeon boss drops/completion chests, Party Event chests or World Boss chests is strictly earned-only.** No NPC/vendor/Guild/Dungeon/World Boss/Event shop, coin/sigil exchange, or player Market purchase/listing until a future explicitly approved rule changes it. This preserves “only from drops/chests.” Collection preview is fine; a Buy/Exchange button is not.

## Code-audited base and proposed inventory

The hidden EQ2 T1–T4 client catalog contains **15 compact sets / 42 pieces**, **24 standalones**, and the independent class weapon/offhand catalog contains **52 templates**, total **118**. Do not conflate the *ten wearable gear slots* with set size.

| Tier | Existing nonweapon items | New role-slot fills | New same-tier variants | New rare-blueprint craftables | Proposed nonweapon total |
| :-- | --: | --: | --: | --: | --: |
| T1 | 12 | 12 | 0 | 0 | **24** |
| T2 | 15 | 9 | 6 | 2 | **32** |
| T3 | 15 | 9 | 6 | 2 | **32** |
| T4 | 24 | 3 | 6 | 2 | **35** |
| **Total** | **66** | **33** | **18** | **6** | **123** |

With 52 existing class weapons/offhands unchanged, the **proposed T1–T4 total is 175 canonical equipment item designs**. All **96 role × tier × armor/accessory-slot combinations** get a baseline option, even though some slots have multiple builds and others only one. This is coverage, not 96 independent full sets.

The complete **57 additional named item identities, slot, role, material, stat profile, art brief, resource theme, design class, blueprint ID and trait outline** are kept in [t1-t4-expansion-design.json](t1-t4-expansion-design.json). `node tools/audit-equipment-v2-expansion.mjs` compares this against **the real hidden server/client catalog**, enforces all missing combinations exactly once, valid slot profiles, distinct alternative profiles, T5 exclusion, blueprint lock and reward purchase denial. It rejects stale base counts and changed release flags.

## Three meaningful craft outcomes

| Acquisition | Same-tier combat basis | Special identity | How obtained |
| --- | --- | --- | --- |
| **Normal craft** | Base 1.00 | Standard compact set membership or reliable standalone stats | Regular existing recipe/material route |
| **Alternative stat piece (T2–T4)** | Base 1.00 | Different permitted ATK/DEF/HP distribution and distinguishable silhouette/material detail | Regular crafting, separate canonical item/recipe, not merely alternate ingredients |
| **Rare-blueprint craft (T2–T4)** | Design target 1.03–1.05 | One distinct passive/conditional trait; server-locked cooldown, caps, no stacked duplicates | Very rare *blueprint* drop from verified elite/zone boss, then more expensive crafting |

**The existing two alternate-material recipe routes are NOT separate items.** They output the exact same final item, so they must not be confused with the new alternate-stat items.

### Rare-blueprint candidates

| Tier | Item | Trait direction |
| --- | --- | --- |
| T2 | Ironwood Heartguard Carapace | Defensive mitigation after repeated strikes |
| T2 | Ironwood Whisperbloom Mantle | Small restorative absorb after healing |
| T3 | Sunscar Miragefang Gloves | Temporary precision after dodging |
| T3 | Sunscar Amberglass Signet | Tiny healing response after shielding |
| T4 | Glassbound Oathforged Boots | Elite opening-strike protection |
| T4 | Glassbound Soulweft Pendant | Tightly bounded cooldown refund |

These are **traits proposed for Skills/Combat 2.0**, not implemented executable procs. They need a server-owned exact-instance snapshot, deterministic trigger owner, cooldown, caps, mutually exclusive trait stacking policy, and fair enemy/dungeon/boss simulation. No client may invent a bonus or bypass blueprint unlock.

**Provisional drop rates in the manifest (server never consumes these yet):** Elite kills T2 0.05%, T3 0.03%, T4 0.02%; eligible region bosses T2 0.20%, T3 0.12%, T4 0.08%. Extremely rare per eligible kill, but actual acquisition time depends on elite/boss frequency and gameplay speeds, so balance using telemetry before enabling. Blueprints must use their own entitlement/read-only discovery record, not a client-provided `knownRecipes` flag. Decide duplicate protection and character-specific vs account-wide knowledge before integrating; the current proposal is character-specific and **not authoritative yet**. Crafting one does not bypass normal rarity and quality mechanics.

## Earned reward ladder / stronger set policy

**Regular T1–T4 craft:** affordable, role/stat oriented, 2/3/4-piece modest set bonuses as in hidden catalog. Items remain valid even when a full set is not equipped.

**Dungeon reward sets:** at the *same tier*, proposal is approximately +3–7% reference base budget **or** a stronger conditional bonus (not automatically both). Use two- or three-piece small sets (e.g. elite counter, room endurance, post-boss shielding) with a proper trigger and internal cooldown. Only the actual dungeon drop pool may issue them—no Dungeon Mark equipment purchase.

**Party Events:** preserve current 8 named sets and 20 actual pieces across 4 events (three-piece adventure set plus two-piece accessory set per event). Target +4–8% reference budget **or** noticeably more interesting existing threshold bonuses, with carefully bounded combat effects. Work with existing momentum/execute/barrier/echo skill effects; **do not automatically stack the full +8% and multiple proc buffs**. Do not change existing 12/16/24% chest odds or reintroduce event gear vendors. Production stat budgets, set bonuses and exact-copy item custody remain unapproved.

**World Boss:** preserve current boss-specific ten-piece *gathering* collections (woodcutting/mining/fishing), account-earning rules and **1% per-chest gear chance** from the existing hidden design. World Boss gear should be meaningful via high-value **gathering-speed specialization** and collection identity, **not** raw combat supremacy. Despite ten slot-like pieces in these existing World Boss collections, that does **not** mean normal craft sets have ten pieces.

### Existing hidden-design conflicts that MUST be resolved before enabling

1. Party Event V51 still declares `source:'party_event_chest_or_exchange'`. The exchange alternative violates the new user decision; refactor its canonical piece contract to **chest-only** in the consolidated Party Event branch (#1416), with versioned receipt migration/review rather than silently changing active entitlements.
2. World Boss V58 includes a **future World Sigil gear-exchange quote**. Although `purchaseEnabled:false` and no live issuer exists today, no gear purchase or sigil exchange may be enabled. Remove its equipment-exchange path or redirect shops to *non-equipment resources/cosmetics only*.
3. Any Dungeon Shop must likewise sell **no dungeon-exclusive equipment**, only suitable consumables/resources/cosmetics. New dungeon equipment drops and chests require authoritative table IDs, claim proof, exact-copy Gear 2.0 server registration, and protected inventory.
4. Player Market listings/purchases of **exclusive earned equipment** stay prohibited by this policy until the user explicitly authorizes trading. Regular craftable items may retain the Player Market's separate normal rules. Do not imply that a purchase in a player market is an “earned drop.”
5. Shop filters and UI hiding alone are not sufficient. Implement a **server-side offer generation AND purchase/fulfilment hard deny** based on a server-owned item-source registry, including mixed/injected loot source IDs, replay and old receipts. `equipment-v2-exclusive-acquisition-policy.mjs` is currently **unmounted review-only code**, not a functioning runtime block.

## Implementation sequence / release safety

1. **Rebase and reconcile:** hidden #1382 catalog, server-pinned mirrored manifest, class weapon compatibility and latest #1416 chest contracts. Do not overwrite other active branches or live game.
2. **Introduce 33 ordinary items:** server-owned IDs, two independent material recipe routes, stat profiles, profession/Gold/material/time balance and mobile previews. Preserve existing stable item IDs. Verify each role-slot cell becomes available.
3. **Introduce 18 distinct alternatives:** create separate item definitions, inspect their actual inherited slot-profile caps, ensure total same-tier base budget parity, and give visually differentiated art.
4. **Introduce 6 rare blueprints last:** separate server-owned drop table and proof, locked recipe entitlement check, anti-duplication, expensive craft route and dormant trait snapshot; do not include them in default unlocked recipes.
5. **Exclusive reward integration:** correct hidden Party/World source contracts and future Dungeon tables; register actual item IDs and sources in authoritative EQ2 issuer, block all purchases/exchanges/Market, verify cryptographic/SQL claim proof. Roll back entire reward commit on failure.
6. **Art:** select user's approved **Style 4** hand-painted dark-fantasy, slot pose guide and per-item 192px transparent optimized WebP. Produce assets by **real individual item ID**, not invented 10-piece set atlases. One visual lock across tier variations, with identifiable real source materials.
7. **Prove release:** exact-head tests, server/client manifest and recipe parity, golden Gear 2.0 copy + gold/XP settlement, market/shops denial, PGlite/PG16 concurrency/rollback, Android small-screen UI, combat and economy simulations. Keep both hidden EQ2 flags OFF until explicit release approval.

**This review PR is a concrete generation/implementation contract, NOT a fully wired 175-item game catalog.** Real template/recipe/trait and event-source integration is deliberately outstanding rather than being claimed prematurely.
