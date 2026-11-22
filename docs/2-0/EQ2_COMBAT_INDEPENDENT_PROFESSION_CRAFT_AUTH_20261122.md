# Equipment 2.0 × Classes/Skills 2.0 — Profession-Only Forge Authorization

**22 November 2026 · Hidden EQ2 integration candidate · NOT LIVE · NO MAIN MERGE**

## Real source inconsistency fixed
The existing 169-template / 338-route Equipment V2 Forge start path required **both** a combat \`characterLevel\` and the selected Smithing/Tailoring \`professionLevel\`. This would make combat Lv1 T9 crafters impossible. The revised hidden Forge start path imports the **exact current** \`profession-progression.ts\` server policy from canonical Combat 2.0 #1377, and authorizes crafting using only the *own profession's* T1–T9 tier licence and the pinned recipe's additional own-skill minimum.

In the current frozen T1–T4 manifest, the legacy \`characterLevel\` field still exists but now expresses **future gear wear/preview guidance**, not a crafting permission. Never silently remove it from serialized pinned recipes: the original immutable craft receipts must remain valid. The real equipment wearer must pass a separate verified combat-level equip guard when that adapter is wired. This change does not grant any new items, early market bypasses, or equip privileges.

## Security and economy
- A Smithing-only character may craft pinned Smithing routes at combat Lv1 if the verified Smithing level, owned items, Gold, queue and state permissions permit it. Tailoring works identically. Neither class, combat XP nor the other profession authorizes a recipe.
- We intentionally preserve the server-pinned author recipe requirement when stricter than the tier gate; the new provisional tier gates are T1=1, T2=10, T3=22, T4=35 (and future T5–T9 45/55/65/75/90).
- T4 early manifest recipes with own-skill 34 now need own-skill **35** under the proposed common T4 unlock policy; this is a deliberate **hidden** balancing proposal requiring game-owner economy approval before launch.
- Hard-to-get combat components remain required by pinned recipes, but pure crafters will need authenticated Player Market/commission supply routes. This PR does NOT remove materials, lower drop scarcity, or invent commission payment/escrow.
- Original-crafter XP continues to use the existing server mirror of the live XP curve. The alternative 2.0 XP formula is a **target only** and cannot overwrite persisted skill XP before explicit economy review, profile conversion and rollback.
- Never pass client-supplied level or material counts to the authorization checker. Current \`V2DraftSnapshot\` is trusted, hidden, account-scoped; real production command activation stays prohibited.

## Regressions
- New deterministic test verifies all **338 pinned source recipes** permit combat Lv1 owner with only the exact required Smithing/Tailoring level, full verified inputs and Gold, and fail one level below the **maximum** of own-tier and author recipe threshold.
- Explicitly checks T1–T4 tier policy and that an otherwise expert Lv1 smith cannot equip combat-level-gated armor.
- Workflow \`equipment-v2-server-core-hidden.yml\` includes the test and canonical profession source on changes.
- Existing 169 item templates / 338 routes, known Gold/XP/time, inventory, Bank, jobs, receipts, roll distributions and live V33 records remain unchanged.

## Integration blockers
1. Exact-head isolated EQ2 server core and broader hidden CI green.
2. Bring this change into the **canonical** Equipment/Combat shared compiler without clobbering the updated Classes/Skills branch or last-known EQ2 item catalogue. Same provenance/custody source must be used for craft, equip, stat projection, Market and encounter settlement.
3. Verify profession training times, source quality of combat-only materials, valid trade/commission supply, all T1–T9 templates/recipes, owner-equipment source gates.
4. UI/theme design review approval, Android and staging transactions, atomic persist, migration+rollback. No public routes, flags, production SQL, real player XP, bank or item changes.
