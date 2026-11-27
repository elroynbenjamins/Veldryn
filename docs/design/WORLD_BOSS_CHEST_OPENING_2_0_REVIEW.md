# World Boss 2.0 — chest opening review (V97)

**Design for approval; not a mounted UI or reward service.**

## Reward policy
- Three milestone chests, plus up to three personal damage chests per account/event.
- Personal damage threshold is frozen server-side for the event/account progression bracket. Each crossed threshold has exactly 10% earning chance, independent of chest opening. Only committed global HP loss qualifies. Guard, local previews, unapproved Impact and counterfactual subset damage do not qualify. Persist misses and hits under event/account lock; a replay never awards again. No threshold numbers approved.
- Every earned new chest has exactly 10% equipment chance; no luck adjustment. Chest-exclusive gathering gear, rarity/quality and matching-skill speed/rarity/XP rolls. Common Q50 innate speed 10% per piece.
- Existing milestone guarantee amounts unchanged: War Camp 450 Gold/6 Essence/2 Gem Dust/2 Tempering Dust; Warrior 650/8/3/3; Realm Victory 900/10/4/4.
- **Proposed** personal damage chest guarantee: 450 Gold, 6 Companion Essence, 2 Gem Dust, 2 Tempering Dust and 8 boss-specific primary gathering materials. Amounts and whether to add themed materials to milestone chests require balance approval; current personal damage loot table remains a nonpaying gear-only preview, not a complete chest.
- No gear from a Sigil shop, direct purchase or crafting. Existing historical contracts not mutated.
- With all six chests, expected gear count is 0.6 and chance of at least one piece is 46.86% (assuming independent rolls). One chest never awards more than one gear piece.
- Raw gear speed is not an action-time subtraction. Review rate-based diminishing returns, same-skill isolation, tool speed/cap, and set effects together before integration; no new live cap.

## Compact mobile opening flow
1. Chests inventory / event reward overview: group by boss, show earned count, chest source, odds and guaranteed contents. Buttons Open one / Open all (up to 6 per request); optional selection for mixed bosses, use exact source IDs, not quantity alone. Confirm irreversible consumption before request.
2. Opening: centered boss-themed chest artwork, short glow/open animation; respect reduced motion and skip. Show actual pending count, no fake loot or pre-rolled animation. No client RNG. If connection uncertain, read committed receipts by source before offering retry.
3. Results: one compact modal for a single or bulk request. Header "Chests opened 4/6". Equipment first, individual exact-copy cards sorted rarity then quality, matching skill and innate/bonus inspection. Stack identical resource IDs below; use a scrollable body and sticky bottom Done / retry failed only. No six consecutive popups. Optional per-chest breakdown.
4. Partial results: show committed items only. Unknown pending state is not failure; reconnect/read receipts. Never reroll; retries use original source. Show inventory capacity/overflow outcome from actual server, not speculative. Close does not cancel already submitted requests; reopen history shows same receipts.
5. Empty gear roll: show guaranteed resource rewards clearly, never a fake equipment icon. Mythic/Legendary effects cosmetic only, skippable; no reward tied to watching animation.

## Integration gates
Use the existing V70 receipt-first settlement and V80 frozen entitlement, add new damage source keys/version dispatch and real EQ2 item delivery. Each source atomic; batch may partially succeed. No new public claim route, SQL, inventory writes or UI layout in this pass. Prototype presentation helper is unmounted and tests aggregate committed receipts without duplicate copies. Require phone-width/large-text/reduced-motion QA, independent source identity and actual authoritative readback. Design approval precedes mounting a new UI.
