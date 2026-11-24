# Equipment 2.0 — Pass 9: Class-neutral random-affix rehearsal and authored innate % boundary
**23 November 2026 · Hidden review-only development · No mint, custody write, gameplay change, or UI/theme deployment.**

## Approved principle, unapproved distribution
The item wearer/crafter/class/role **MUST NOT affect** which random bonus stats can roll. The only current affix-pool eligibility filter is the existing executable Combat 2.0 equipment **slot**. A Tank weapon can have Crit Rate or Ability Damage; Damage chest can have Defense / HP; Support gloves can roll offensive bonuses. This supports market scarcity, surprising combinations, rewarding rare rolls, and flexible counter-builds.

**Separately authored innate percent stats** are specific to verified item design/class (where appropriate) and do not use a random affix slot. A class-specific innate never class-restricts the random affix table; a strong random bonus never grants a class-specific innate.

## What is actually coded
The new `rehearseUniversalForgeRollV2` is deliberately **not mounted in gameplay**. It returns only a frozen REVIEW result: canonical pinned source piece ID, source tier, sampled original draft rarity and quality, exactly the original rarity's 1–3 distinct affixes, source per-tier range and graded source percent, with `canMint:false`, `canPersist:false`, `canEquip:false`, and `canTrade:false`.

For the internal QA simulation only:
1. Sample one original rarity from its existing six-band distribution, totaling 1,000,000 integer buckets. This is source fidelity, **not approval of launch odds**.
2. Sample the old Q0–100 quality formula independently of class or role.
3. Use the 11 compatible source-mapped universal stat types, with existing Combat 2.0 *slot* restrictions. Select distinct random stats uniformly **without replacement**. This class-neutral uniform weighting is a PROPOSAL, not an approved probability distribution and not a production roll engine. The original role-biased generator remains untouched.
4. Sample the original rarity quality-band value and per-stat tier magnitude to derive a two-decimal random percentage and displayed roll grade. High-grade items should remain distinguishable from low-grade outcomes. These are never granted as real stats by this module.
5. Reject invalid draw results, forged/unpinned items and duplicated affixes. All output is immutable diagnostic data, not an owned item, mint, job, signed receipt, seller listing or custody state.

The next code pass must separate the preview-only RNG from a future privileged, canonical, signed and versioned production generator with accepted weights, final caps, atomic ownership and receipt provenance, and no retroactive changes to already-owned or pre-2.0 items.

## Innate source candidates, NOT executable effects
`reviewAuthoredClassInnatesV2` enumerates **actual T3/T4 pinned class-specific weapon identities** as potential authored innate-% candidates. It purposefully supplies **no percentage coefficient**, **no skill target**, **no eligible rarity decision**, **no player grants** and **no runtime combat effects**. The canonical source weapon may be class-restricted for equipping, but the random affix pool remains universal for that slot and tier.

Innate bonuses need explicit signed item-template identity, an independently versioned source effect, correct ability/skill/class integration, equipment-set interactions, full 10-slot CP balancing and approved values. Never treat a future innate as a random roll or secretly add a fourth random roll.

## CI and remaining gates
The independent scoped Equipment+Combat workflow strictly compiles and tests all 169 original source items × six rarities × low/high grade rehearsals, same-tier/slot cross-role parity, malformed RNG rejection, correct affix counts, provenance and non-minting boundaries, and the innate-vs-random separation. Existing 648 signed Skills/boss matrix and 1,824 no-bonus-roll regression checks remain part of the scoped workflow.

The broader global Skills 2.0 pipeline has separately identified import/rootDir/mobile build blockers; a scoped green run does not resolve those. Pending final player-facing approval: exact uniform/economy weights, complete innate coefficient and item-by-item design, final CP and stack caps, real signed persistence/custody/market exclusions, companion effects, original set bonuses, UI/themes, and coordinated 2.0 launch.

**No main merge, no release, no staged/production database change, no new market trade or live item mutation.**
