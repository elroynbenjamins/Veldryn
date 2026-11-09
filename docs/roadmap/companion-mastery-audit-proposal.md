# Veldryn — Companion skill audit and proposed mastery expansion
Status: **Current mechanic verified; proposed mastery not activated** (2026-11-10)

## Implemented in game
- The Skills hub previously labeled a `Companions` tile with a "level" that was **not a skill XP level**. It read `account.companionSanctuary.trainingGroundLevel`, which caps at 3.
- The Sanctuary Training Ground is a 0–3 facility upgrade. Training XP/day **per idle companion** is `[0,24,52,84]` for levels 0–3. A claim consumes full 24-hour periods, max 7 days at once. A companion already on an Expedition or active Trial cannot benefit from that claim.
- Leveling actual companions uses Gold/Essence and companion XP; companions also develop via Bond, Ascension, techniques and individual abilities. Equipped-companion combat contribution already consumes individual companion level, Bond and rarity.
- Expeditions grant companion XP and Bond XP at claim; Trials award XP/Bond on victorious floors.
- This first pass clarifies the Skills tile, accurate 0–3 progress, claim readiness, daily XP, eligible companion count and next upgrade costs. It does **not** introduce XP accrual for the fake tile or change combat balance.

## Proposed distinct Account-wide Companion Mastery skill (future implementation)
Do **not** reuse or conflate Training Ground level with Companion Mastery. Train this separate skill through server-authoritative outcomes; include it in real skill summaries only after its XP and bonus consumers are deployed.

### Earn XP
- Successful expedition reward claims (reward once per validated assignment ID).
- First-time/seasonal Companion Trial floor clears and limited repeat clears. Avoid farming a trivial floor.
- Real companion training claims (credit completed training days, capped to the same 7-day accrual window).
- Companion level-up / Ascension actions credited on the server, but do not award XP for viewing the screens, changing companions or abandoned runs.

### Balanced unlock goals (proposal, subject to testing)
- Levels 1–100; account-wide, not one level per character.
- Small additive companion-training XP growth, target ~10% at level 100.
- Small equipped companion contribution growth, target at most ~5% of the **companion effect**, not 5% of the player's raw Attack/Defense. Do not duplicate rarity multipliers or ignore existing role balance.
- Milestones at 10/25/50/75/100 may unlock cosmetic/nameplate rewards or modest expedition utility. No extra expedition slots; those belong to Expedition Pens.
- Show actual XP sources, XP-to-next, present and future bonus values. No unimplemented promises in the live Skills screen.

### Release checklist
1. Design XP curve and anti-repeat caps with historic account metrics.
2. Implement server-authoritative award/replay protection and account save migration or safe projection.
3. Integrate **all** applicable battle/expedition/trial consumers and offline path consistently. Add tests for buff stacking, no double rewards, max caps and idempotency.
4. Regenerate both gameplay and co-op Edge bundles with the canonical build and run full generated-parity CI.
5. Deploy server changes, then publish the client UI/release notes. **Do not treat a GitHub merge as a server deployment.**
