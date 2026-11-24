# Veldryn Equipment 2.0 — UNIVERSAL random bonus rolls (revised Pass 8)
**23 November 2026 · Approved DESIGN DIRECTION from owner, but code remains hidden review-only / nonissuable.**

## User-approved separation
1. **Random bonus affixes are NOT class- or role-bound.** Tank, Damage and Support equipment of the same slot and tier share exactly the same possible random bonuses, independently of the character who crafts, equips or trades it. A great off-role combination can be rare, valuable and useful in specialist builds. The roll probability must not silently prioritize the equipping class or its original role.
2. **Fixed innate % stats can be item-specific or class-specific.** These are authored separately, on selected rare/special/set pieces, with a distinct signed, non-random item definition. They may interact with an explicitly authored class mechanic. They never use a random affix slot and do not override the universal random pool.
3. **Slot restrictions still matter** (where the Combat 2.0 executor can apply the stat), but they must not be confused with class or role restrictions. A Tank weapon can roll Crit Rate/Ability Damage; Damage chest can roll Defense/HP; Support gloves can roll offensive stats. A stat without a working Combat effect or exact tier range is not quietly invented.

## Current actual source status
The old hidden Forge generator version `equipment-crafting-v2-draft-1` has ROLE-weighted pools and 70%-preferred-slot behavior. This is an **old draft**, NOT the newly accepted design and NOT a production-enabled generator. The 169 pinned server equipment identities, 42 original set members, 338 recipes and old generator remain unchanged in GitHub. The frozen item type `V2ExactEquipmentTemplate` includes minted base stats, random affixes, rarity, quality, role, source class and hands restriction, **but it does not yet have a distinct, executable authored innate % stat field**. Some reviewed class/set % concepts and traits exist elsewhere; they are *not evidence* that innate bonuses have been activated or released.

The initial original-source audit (pass 7) found 158/169 templates exposed to unsupported original role rolls and 77/169 lacking enough source-role legal affix choices. That is **historical diagnostic of the old role-based pool only**, not a problem to fix by giving each role a different upgraded pool.

## Revised candidate — shared pool independent of class and role
The review-only `eq2-hidden-class-neutral-random-bonus-affixes-candidate-v2` derives **11 original mechanically mapped Forge affix identities** from the pinned `V2_SERVER_AFFIX_RANGES` and verified Forge->Combat mapping, excluding only ambiguous `potency`. It filters candidates **solely** by the existing Combat 2.0 supported slot allowlist; it does NOT consult the Forge role pool, any character's class, specialization or a set family to decide bonuses.

For every combination of 169 equipment identities × 6 rarity bands, the proposed pool must contain at least as many unique roll channels as that tier/rarity's existing 1–3 roll budget. It never creates a fourth roll or a new numerical percentage. Exact source tier ranges are retained pending owner balance review. The class restriction and 1-/2-/dual-handed weapon identity are still carried into the immutable review as **equip/source data**, not a modifier to bonus availability. The same tier+slot returns the same candidate list across all three roles, with verified tests.

**Scope of the 11 sourced random bonuses:** Defense %, Maximum HP %, Ward, Tenacity, Crit Rate, Crit Damage, Haste, Penetration, Accuracy, Ability Damage %, and Forge Healing Power %. These represent Forge's 11 non-Potency authored source stats with original tier magnitudes. Future Attack %, Evasion, Shield Strength, class-healing or class-magic channels need **their own source-approved magnitude and semantic integration** before entering the same universal pool. They must not be restricted to a class once approved.

### Probability and luck (still needs exact approval)
- Use ONE class-neutral probability distribution for each slot/tier/rarity. The probability of a stat must not depend on character/class, or on whether its original equipment template belonged to the Tank/Damage/Support family.
- Preserve **different stat values/grades** within the original authored tier range and the existing rarity-dependent number of bonus rolls. A high-grade roll in a coveted combination should remain unusual, especially on rare dungeon drops and premium set equipment.
- Do **not** guarantee “best” stats for a class, hide unwanted rolls or auto-correct unlucky equipment. The player economy needs scarcity; no silent class weighting.
- All rolls remain **distinct stat identities** per copy; bonuses on distinct worn pieces are additive where appropriate and constrained by a separately approved full-build cap, never only the strongest roll.
- Future physical subtype bonuses, tool XP rolls or other new special channels must have separate source/semantic design, and if they are random equipment affixes, they **replace** one of the existing rarity roll slots rather than adding free affixes.
- Any proposed new probability weighting, tier magnitude caps, accumulated CP values or “perfect roll” odds are **not approved** by this document.

### Innate % stats — a different contract
Authored innate % bonuses should be associated with a canonical piece ID (and where appropriate a specific class/skill/effect), not with RNG. For example, a rare Blade Dancer dagger could have a fixed, designed synergy with one of its abilities; the weapon's random bonus pool would still be identical to another item in the same slot/tier, and ownership/gear eligibility would remain source-verified. These effects cannot be activated until the exact item authority, server stats projection, stack interactions and owner-reviewed coefficients are implemented. **A class-specific innate must never imply class-restricted random rolls.**

## CI and launch gates
The updated test exercises 1,014 actual source-pinned equipment/rarity scenarios; it cross-compares same-slot/tier candidates across roles and verifies that off-role bonuses are possible. It checks exact Combat slot legality, original tier magnitude arrays, no duplicate affix IDs, stable original class/hand data, and no new minting or item mutation. This is a pure authoring test, **not a generated-rarity statistics simulation or proof of future actual RNG odds**.

Before a real new-mint generator can ship: approve class-neutral draw weights, any stat-specific roll caps, versioned minted-identity and source provenance, integration with future item-specific innate % stats, true combined 10-slot Combat Power, authoritative source-set effects, companion and boss balance, Player Market legacy exclusion, and user review of the final UI/themes. All hidden PRs stay unmerged pending the coordinated 2.0 release.
