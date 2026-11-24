# Veldryn Equipment & Combat 2.0 — Pass 10: real-slot affix stacking pressure and innate Skill identity source
**23 November 2026 · HIDDEN / READ-ONLY DESIGN & VALIDATION · NO MERGE, MINT, STAT GRANT, OR DEPLOY**

## Why this pass is important
Random bonus rolls are **universal across class and role**, filtered by actual available equipment slot and source-authored stat meaning only. The benefit of a rare high-grade roll is real when a player can stack that bonus across multiple different equipment pieces. But a per-item limit is NOT an adequate whole-build cap. Similarly, authored class-/item-specific innate % bonuses must reference real Skills 2.0 identities and remain independent of the universal random roll pool.

## Full class-legal source equipment envelope — *not* actual equipment
`reviewFullLoadoutAffixStacksV2()` enumerates **9 real class identities × 4 pinned source tiers × 6 original rarity grades = 216 read-only cases**. It selects real pinned Forge piece IDs for each ordinary body slot from the exact role/tier manifest, class-specific weapons/offhands only from matching class source, and never creates items or grants set bonuses.

Crucially, the source *hands* restriction is respected:
- **Ironwarden, Bastion, Hexweaver, Dawnkeeper**: one-handed source weapon; a class-specific offhand exists, so the candidate has 10 worn slots.
- **Dreadguard, Wayfinder, Ravager, Stonecaller**: two-handed source weapon, so the candidate has only **9** real slots; no imaginary offhand bonus.
- **Knife Dancer**: dual-handed source weapon, so the candidate also has **9**, with no second offhand item granted.

For each permitted source piece, the universal 11-mapped-stat proposed bonus pool is looked up with the original source rarity-specific 1–3 distinct random roll count and original tier stat ranges. For every affix ID the review records:
- the exact **distinct slots** that could roll it, separately from the actual number of random rolls the build could receive;
- a **per-stat potential minimum/maximum sum** of percentages *if every eligible item rolled that particular bonus*, using the original rarity high/low bands;
- **no approved cap, no actual rolled total, no effects, no final Combat Power**.

**Never add the maximum of all stats together.** The roll slots compete on each item, so the upper-bound values of different stats are not simultaneously attainable. Percentage-point bonuses and relative percentages retain their different meanings; the review does not transform them into one invented Combat Power number. It is a balance pressure diagnostic, not predicted player damage or legal PvE/boss stats.

## Innate % effects: canonical Skills 2.0 reference, no fabricated numbers
Original 18 pinned T3/T4 class-specific weapons (9 classes × 2 source tiers) remain **potential design candidates only**. `reviewInnateOriginalSkillTargetsV2()` now joins those 18 verified pieces to each class's **six actual canonical active Skills 2.0 identities**, producing 108 source-checked candidate item×skill links, including real variant IDs and cooldowns.

There are intentionally **zero approved selected skill targets, zero approved % multipliers, zero executed effects, and zero changes to random affix slots**. The owner can later choose which rare item—if any—receives an innate and which class ability it enhances. A particular class bonus must not become a silent universal or random roll, must not grant extra random roll slots, and must be checked against actual boss counterplay and Skills/Companion V2 balance.

## Next decisions, release gates
1. Review realistic complete-build random roll distributions (not just separate extreme bounds), and set the authoritative **stat-specific equipment cap and final Combat Power formula**. Do not silently clamp existing rolled values.
2. Specify which innate weapon/item receives a skill synergy, its actual source target, effect semantics and % coefficient. Keep rare authored item identity separate from class-neutral random luck.
3. Implement signed full-item instance mint/custody and new-version provenance under production-grade privileged atomic DB checks. Old pre-2.0 equipment remains unmarketable. No retroactive roll changes.
4. Validate sets, gems, companion contribution, class skills and physical subtype counterplay together; only after that unblock Combat 2.0 and Enemies/Bosses 2.0. UX themes still require owner visual approval before any live app change.

Scoped integration tests strictly compile and prove 216 source cases, hands/offhand conflict rejection, original roll quota, source stat ranges, cross-slot potential stacking with no CP, and all 108 class-legal skill references. Broader Skills 2.0 CI has separate cross-monorepo import/rootDir failures; a scoped pass does not remove that release gate.

**No production/staging writes, real item mutation, merge to main, release enablement or gameplay UI changes.**
