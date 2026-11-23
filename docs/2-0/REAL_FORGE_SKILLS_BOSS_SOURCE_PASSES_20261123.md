# Veldryn 2.0 — real Forge × Skills handoff passes (23 November 2026)

> **HIDDEN / ISOLATED REVIEW.** Child of #1661 and #1653 on the *source-owning Equipment 2.0 Forge stack*, NOT main. Do not enable gameplay, grant items, list gear, deploy functions, approve designs, change production database, or merge with unrelated Combat stacks without dedicated reconciliation and CI.

## Pass 9: Real original-mint Forge copies plus authentic Skills choices
- Import **verbatim** the deterministic server-authored tactical selector `ability-counterplay-strategies.ts` from Skills/Combat PR #1700 (upstream code blob `58c99466e689c8b66c352c6916f64db7c941ca39`). The selector is **QA-only**. No new class skill variants, item recipes, or balancing coefficients were authored.
- Extend the existing source-owned `equipment-frozen-forge-bridge` test, reusing its exact `V2DraftItem` originally minted roll, claimed start/claim receipts, original Forge jobs/skill-XP awards, slot/role/level policy, original crafting quality and rarity, current replayed virtual custody and matched account revision.
- Execute **9 classes × 2 specializations × 6 boss identity selectors × 3 actual distinct Skills strategies = 324 Combat 2.0 Engine simulation runs**. Forge T1 corresponds to Root, T2 to Bell, T3 to Solar and Sphinx, and T4 to Bellbeast and Cantor. These are genuine **combat-engine** executions with genuine **Forge-minted test copy provenance**, *not* real player inventory mutations.
- **Boss limitation:** The enemy is still a *generic Combat 2.0 enemy compiler* with a boss identity and QA stats. The six authored/persisted regional Enemy 2.0 boss kits are not integrated into this Forge bridge. These 324 runs validate Forge→Skills→generic combat compatibility only, **not** six true regional boss mechanics or their final difficulty.
- Each scenario creates ONE genuinely minted original Forge copy from the canonical **169-item Forge catalog, 338 source recipes** (the other stacked Skills branch separately tests synthetic ten-slot 2/4/6-piece sets).
- Compare the original Forge item identity, scaled base stats, mapped original Forge affixes, after-skills stat baseline, after-frozen stats and final mapped affix stats across generic/targeted/alternative strategies. Different skills must not mutate the original Forge item or source custody; replay with identical signed QA inputs must be deterministic.
- Verify **one source receipt digest per exact skill build**: a changed selection must create a different digest because the original Forge bridge cryptographically scopes the full source ledger **and** the selected build. A strict test-only pinned digest must reject reuse by a different skill build.
- Extend the genuine-original-mint Tank/2 Damage/Support four-player QA encounter to tactical skill variants with the identical original frozen copies and stat base.

## Pass 10: Real Forge evidence × Skills arithmetic handoff
- Import verbatim `equipment-frozen-forge-handoff-audit.ts` from Skills branch PR #1700 (upstream code blob `d0984afb47bce7e1451f67c064107c905d3028c1`) and apply it to **actual** original Forge bridge output rather than the earlier shape-only sample.
- Independently compile the class-only baseline and selected original server-authored Skills 2.0 variants and compare them against the emitted Forge `afterSkills` stage.
- Check original `baseStats.attack/defense/hp` were **already quality/rarity-scaled** at Forge mint; add each frozen value exactly once to the verified actor's matching attack, defense and HP stats. Reject a second multiplier, any unrelated stat drift or missing item source.
- Refuse fake unequipped or Bank copies, substituted frozen stats, forbidden unapproved sets and invented affix-source rows. In the source bridge the original verification callback is a **test-only stub**, not a real signed service privilege or account transaction.
- Even when this shape/audit passes, it unconditionally returns `canAuthorizeCombat:false`, `canGrantLoot:false`, `canListOnMarket:false`, `releaseApproved:false`.
- Pin this integration test in the existing private Equipment+Combat 2.0 strict TypeScript and CI workflow and block accidental imports of the audit/selector into public Edge/mobile paths.

## Reconciliation and next gates
**Remain split:** source-owning Forge branch #1661 and tactical Skills/Combat branch #1700. Do not merge one whole branch into the other without finding and resolving the source overlaps in `backend/src/server/combat/engine.ts`, `types.ts`, `equipment-affixes.ts` and generated gameplay Edge bundles.

**Not complete / release blockers:**
1. Replace QA verifier callback with authenticated service-only locked readback, exact `online_game_states` CAS, immutable original mint/custody/Bank snapshots and signed battle authority. Maintain same-account multi-character Bank withdrawal, but reject cross-account and forged legacy items.
2. Real ten-slot originals and final 15 original Forge sets plus proposed 48 expanded sets require approved numerical 2/4/6-piece effects, innate stats, class-specific innate percentages and freely rolled non-class-bound bonus stats. No numerical bonuses may be issued until fully reconciled. T5–T9 remain future scope.
3. Original Forge Potency is intentionally unmapped; class-defined original Tenacity, Ability Damage and Healing Power must retain exact scoped semantics. Gems/enchancements, tool XP stacking and final approved CP weights still require source-owned provenance.
4. Next Enemy/Bosses 2.0 pass must use six **source-owned authored and persisted boss kits** with original Forge copies, actual timing, class counters, shield/debuff/interrupt status and replay authority; generic boss identity labels must not be called equivalent.
5. 2–4-player persistent combat and account locks, World Bosses, Party Events and Player Market must use one versioned item/custody authority. Player Market must permanently reject all pre-2.0 and legacy item copies for listing, purchase and resale, irrespective of UI tags.

**The strict source CI on the exact PR head is required before this work can be described as passing.** No live gameplay, UI, SQL, player item, economy or reward change has been made.
