# Veldryn 2.0 — Independent gathering-tool craft & equip (hidden server policy)

**22 November 2026 · design-approved specialization principle · implementation limited to pure server preflight + tests**

## What this fixes

Before 2.0, \`apps/mobile/src/core/game.ts\` checks a character's **combat level AND target gathering skill** both when equipping a tool and when Smithing *crafts* it. The 1.0.x recipe still sets Smithing level to 1 for every tier. This forces a Smith to level the target gathering profession and a peaceful gatherer to grind combat to equip tools. That breaks the approved specialization/trading rule.

**Proposed 2.0 invariant:** Craft with **your own Smithing tier only**, equip with **your own Mining, Woodcutting or Fishing tier only**; **never** require character combat XP or another profession on the same character. The Smith can buy rare gathered/combat materials and a blueprint; the gatherer can buy or commission the finished tool and use it. Tier thresholds follow the existing \`profession-progression.ts\` policy, not older combat-/zone-level requirements.

| Tool tier | Smithing level to manufacture | Matching gathering level to equip | Blueprint |
|---|---:|---:|---|
| T1 | 1 | 1 | Not needed |
| T2 | 10 | 10 | Required, or previously learned |
| T3 | 22 | 22 | Required, or previously learned |
| T4 | 35 | 35 | Required, or previously learned |
| T5 | 45 | 45 | **Not yet craftable:** no reviewed tool catalogue |
| T6 | 55 | 55 | **Not yet craftable:** no reviewed tool catalogue |
| T7 | 65 | 65 | **Not yet craftable:** no reviewed tool catalogue |
| T8 | 75 | 75 | **Not yet craftable:** no reviewed tool catalogue |
| T9 | 90 | 90 | **Not yet craftable:** no reviewed tool catalogue |

T1–T4 contain precisely 12 already-authored tools (4 per gathering skill). Nine require already-authored permanent blueprint knowledge, such as \`tool_recipe:ASTER_IRON_HATCHET\`. First-use blueprint item \`BP_ASTER_IRON_HATCHET\` must be **consumed and knowledge unlocked atomically** with a successful craft. Subsequent crafts require no additional blueprint item. Tool-source monster chances and materials remain unchanged by this policy; previously corrected 0.25–0.60% blueprint rates stay rare.

## Server contract added (NOT an active route)

\`backend/src/server/combat/v2/gathering-tool-profession-policy.ts\` contains:

- \`planGatheringToolCraftV2\`: requires authenticated Smithing tier plus either already-owned blueprint knowledge or an unconsumed physical blueprint. Does not inspect combat or Mining/Woodcutting/Fishing levels. Returns the required blueprint debit/knowledge update; never mints Gold/XP/items or bypasses material costs.
- \`planGatheringToolEquipV2\`: checks authenticated character-bound matching gathering tier and exact *physical* instance/custody. Allows ordinary crafting orders and Player Market acquisitions after a real ownership transfer. Does not inspect Smithing or combat levels. Rejects a different character's copy, an item in Bank or market escrow, duplicate/invalid tier-slot references, orphan equipped copies, invented item IDs and malformed progression.
- A per-gathering-skill/per-tier slot plan returns the exact copy to replace, preserving the live project's one-per-tier 4-tool approach without altering the current 1.0.x stacking/quality/speed/rarity math. A server transaction must reserve and swap those copies atomically, including inventory capacity, no multi-character double-equip, marketplace escrow locks, and read-after-write.
- Only the approved T1–T4 identities can pass this preflight. Unlocking profession T9 alone **does not create** an unreviewed T5–T9 tool or recipe.

The source is intentionally unmounted and has no unverified client-provided \`mayCraft\` route; the \`Trusted...\` argument types require server-side identity/progression/knowledge/inventory snapshots. This module alone is **not** a substitute for transactional database authorization and cannot make production 2.0 ready.

## QA and release holds

\`backend/src/server/combat/v2/__tests__/gathering-tool-profession-policy.ts\` checks all 12 maker/recipient professions at the exact tier threshold, zero combat progression, zero cross-profession training, locked vs learned blueprints, invalid/forged and cross-character copies, per-tier swaps, duplicate IDs, orphan equipment and T5–T9 absent-catalogue restrictions. The hidden \`Combat 2.0 skills validation\` workflow compiles and executes these tests.

Before runtime integration: authenticate every server source/ledger; add DB transaction with source receipt/idempotency and market/commission transfer, explicit quality/rarity roll ownership checks and no cloned copies, job Gold/material reservation, quest/profession XP settlement, four independent tool slot migrations, return-to-inventory capacity and rollback under CAS concurrency. Confirm balanced tool speed with current main's tier stacking and 80% effective speed cap. **Do not modify new 2.0 UI or themes before the owner's visual review and acceptance.**

**Non-effects of this PR:** no mobile/UI change, no legacy equip rule changed, no public Edge import, no production SQL, no real Player Market change, no actual character/item issuance, no \`main\` merge.
