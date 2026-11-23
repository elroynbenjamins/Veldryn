# Veldryn 2.0 — Pass 7/8: Instant-counter evidence + original Forge source handoff
**23 November 2026 — HIDDEN only, child of #1666. Do not merge into main, enable flags, deploy, award items, alter live combat, change UI, issue tokens, or activate Player Market.**

## Pass 7: Actual instant-skill counterplay observability
The engine currently emits `cast_complete` when an authored skill has cast time, but a zero-time class skill executes its effects directly without a `cast_complete` event. Previously the 324-encounter counterplay QA could label these instant moves as `selected_counter_not_cast`, even when combat effects did occur.

**New pure diagnostic behavior:**
- Prioritize source-attributed skill/effect events as proof that the original selected class skill executed.
- Count matching server-compiled instant abilities separately.
- When the boss presented an opportunity, the matching counter is instant, and *neither a timed cast completion nor an attributed effect is present*, report `instant_counter_use_unobservable` rather than claiming the player never cast it.
- Keep `selected_counter_not_cast` for matching noninstant skills without an observed completion, and `counter_cast_without_result` for observed casts without result.
- Preserve read-only audit, deterministic ordering and fail-closed forged/incomplete matrices. No live engine event schema or timing was changed; no test claims a missing event proves a move was fired.
- **Future release recommendation:** add a dedicated typed server-accepted skill intent/use event for instant abilities in the **hidden combat ruleset only**, with explicit legacy parity review and user-visible performance checks. Do not add an event in this pass.

## Pass 8: Frozen Forge evidence, no double-stat-scaling
The full original Equipment 2.0 source path remains a *different hidden stack*: #1661 (from #1653). It has `equipment-frozen-forge-bridge.ts`, `V2ExactEquipmentTemplate`, `V2DraftItem`, `V2CustodyCopy`, full Forge claims/awards/start receipts, virtual Bank/equip custody and a separate online revision/CAS recheck inspector.

The Skills/Combat branch **does not have those Forge modules**, so this pass **does not copy or fabricate them**. Instead it adds `equipment-frozen-forge-handoff-audit.ts`, a pure shape-and-arithmetic cross-branch review of the exact `FrozenForgeEvidenceV2` fields from #1661:
- `source='EQ2_FROZEN_FORGE_PRE_SCALED_NO_DOUBLE_MULTIPLIER'`, opaque digest, actor ID, equipped copy IDs, item ID/tier/rarity/quality and frozen `attack/defense/hp` once-only totals.
- Independently server-compiled Skills+Class baseline must exactly equal the Forge `afterSkills` stage. The Forge `afterFrozenBase` stage must equal baseline plus original **already quality/rarity-scaled** base values exactly once, and no unrelated stat changes.
- Refuse missing/extra/duplicate/foreign item IDs, invalid tier/quality/ranges, invalid or absent effects, forbidden activated sets and unsupported-affix laundering. The shape alone does NOT authenticate a mint, immutable item, original Forge roll or real custody.
- The inspector returns `canAuthorizeCombat:false`, `canGrantLoot:false`, `canListOnMarket:false`, `releaseApproved:false` **unconditionally**, even if all arithmetic passes.
- Explicitly retain the pending exact original 15 Forge set identities, 48 expanded sets, socket/enchancement proof, unknown Potency meaning, final CP weights, authorized DB locks and real source consistency.

**Release blockers:** Actual authenticated locked readback + matched digest across all source ledgers; final set/affix/skill/CP rules; T5–T9 item system; party 2–4 character state conversion, signed encounter replay, boss balance, rewards. World Bosses/Party Events/Player Market must consume the same finalized item custody and disallow all legacy gear on the Player Market, including resale.

## CI
The hidden `combat-v2-skills-validation` workflow includes read-only tests of both passes. Check the **exact branch head** before reporting green. The parent PR #1666 had a missing type-only import, corrected in its subsequent commit; independent validation is required. Broader mobile-core scroll-indicator/UI appearance issues must remain behind the established UI approval gate.
