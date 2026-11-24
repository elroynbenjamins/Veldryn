# Veldryn 2.0 — authentic authored-boss three-way comparisons and universal mint safety

**24 Nov 2026 | HIDDEN experimental source branch | no live changes**

## Pass 17 — actual original Forge source vs authored six-boss tactical A/B/C

Existing private integration of original Forge minted equipment + signed-shaped Enemy V2 regional boss kit has already passed 216 generic/targeted original source encounters; the 15 original Forge set concepts are still non-executable, and earlier 324 identity-only comparisons used generic enemies.

This pass adds a **third actual server-authored alternative Skills 2.0 route**, executing 9 classes × 2 specs × 6 genuine regional boss identities × 3 tactics = **324 authored-boss combat engine runs**. A new read-only `reviewOriginalForgeBossThreeWayV2` compares 108 generic/targeted/alternative triplets. It strictly requires:
- identical original minted item IDs, frozen pre-scaled rarity/quality base values, source-derived affixes, after-Forge player base stats, boss definition and authored mechanics for every strategy;
- separate **skill-build-bound** source receipt digests for different Skill selections (never misuse the generic receipt after changing skills);
- the existing one-player authenticated-shaped QA mint/claim/Bank custody + persisted Enemy 2.0 authority gates, with no mocked gear effects or unapproved sets;
- actual engine-observed victory, duration, damage done/taken, healing, interrupts, end HP, and boss ability/phase event counts.

Metrics are not a balance certificate or final Combat Power: same **source input stats** across strategies is verified, but final CP weights, cooldowns, opponent AI, class passives, and complete ten-slot/boss persistent replay have not been production approved. A targeted strategy can underperform and is not artificially credited. Only positive factual metrics are returned. The reviewer denies release, combat authority, loot and marketplace approval.

Negative source tests reject changed original gear, a substituted mint identity, stale build-bound receipt digest, wrong strategy ordering or missing tactic. Deterministic engine replay tests remain active.

## Pass 18 — source version / preview → original mint/market safety boundary

The independent 11-stat pool from preceding PR #1711 remains a **non-mintable proposal**. Adding `reviewOriginalForgeToUniversalBonusGateV2` makes the incompatibility explicit in source:
- rereads the canonical ORIGINAL Forge recipe/piece, original rules version `equipment-crafting-v2-draft-1`, frozen rarity/quality-scaled original outcome + exact template; never rewrites the source copy;
- checks the experimental preview version `eq2-universal-class-independent-bonus-proposal-v1` and original piece/recipe/role/slot, independently checking its retained rarity ladder and tier roll counts, bounded stat identities and exact magnitude ranges;
- requires all review flags `canMint:false`, `canEquip:false`, `canAuthorizeCombat:false`, `canListOnMarket:false`, `grantsRewards:false`, `releaseApproved:false`, rejecting a forged eligibility bit or a legacy item posed as an original;
- returns `originalCopyCanBeRebrandedUniversal:false`, `canForgeMigrateExistingCopy:false`, `canSellOrResellLegacy:false`, `requiresNewClaimAndCustodyVersion:true`; these are **proof-of-denial review statements**, not a new production market authorization service;
- executes per-tier original T1–T4 exact-mint and malicious version/roll/source tests within the existing source integration CI.

**Unfinished release blockers:** a new source-authenticated secure server RNG and mint/claim rules version; true immutable original copy provenance and online account revision CAS; full equipment 2/3/4/6/8/10 family balance as approved by owner; server-authenticated Enemy 2.0 boss battle and party persistent state; CP math; equipment innate %/affix class-independent final tier ranges; T5–T9, Player Market 2.0 release custody and permanent rejection of legacy pre-2.0 equipment. No proposed item or legacy copy gains trading rights.

**Operational safety:** no merge into `main`, no production SQL, no launch flag, no player grant, no loot, XP, gold, item, set, market or published UI change. QA callbacks are TEST stubs, NOT production transaction privilege. CI passing is a prerequisite, not release authorization.
