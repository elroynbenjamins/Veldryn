# Original Forge multi-slot source compatibility × persisted regional bosses — hidden passes
**23 November 2026 | Private staged Equipment/Skills/Enemy 2.0 integration.**

## Isolation
Child of private original Forge Skills/custody PR #1702 (and source-owned Forge bridge #1661), not `main`. No live build, UI, game state, marketplace, rewards, SQL or production mutations. All account identifiers and original Forge mint/custody receipts are synthetic QA records from the existing source-owned authenticated-transaction *model*. Existing `verifyPersisted` callbacks remain TEST STUBS and NEVER certify real account ownership.

## Pass 11 — Actual original-mint multi-slot coverage, including source-gap detection
- Attempt exact real `V2_SERVER_PIECES` source identities among the **169 pinned original Forge 2.0 pieces**, excluding all pieces with pending source-dependent `setId` bonuses. Class role and weapon/offhand restrictions are preserved. **When the original Forge roll is incompatible with Combat V2 slot/affix semantics, the slot remains unequipped and its source gap is counted. Do not reroll, drop the affix, or fabricate an equipped copy.**
- Each selected real template is independently created from the server's original recipe/Forge roll compiler (original rarity, quality, baseStats already scaled, affix roll, slot, source piece ID). No fake stats or overwritten roll strengths.
- Compose the complete same-account original mint ledger for **every genuinely source-compatible equipped copy**, with distinct job IDs, start/claim receipts, exact XP awards, storage reservation and monotonic virtual equip receipts per copy. Every selected item must match its canonical output.
- Recompile **source-compatible multi-slot original loadouts** for **18 class/specialization combinations**, comparing `generic` versus `targeted` authored class skills (**36 real-engine simulations**). Report the verified slot-count distribution and all missing/incompatible slots. **Complete 9/10-slot original Forge coverage is NOT yet approved or proven**.
- Two-handed / dual weapons do not require a fictional second offhand. Six-slot set bonuses and final T5–T9 expansion are **not inferred or granted**.
- Require the original frozen rarity/quality-scaled item base stats to sum exactly once against the independent Skills 2.0 baseline; original item identity and affix source must remain immutable when skills change. Test for counterfeit mint stat, duplicated slot/copy ID, and forged Bank/inventory custody.

## Pass 12 — Authoritative regional Enemy/Boss kit, ORIGINAL Forge source
- Add a hidden solo-only adapter that calls `compileRealFrozenForgeActorV2` for an original minted Forge copy, then **`verifyPersistedEnemyKitsV2` + `issueEnemyV2EngineAuthority`** for genuine regional authored boss profiles. The generic `V2_ENEMY_` / pressure-phase compiler is deliberately excluded.
- Exercise 9 classes × 2 specs × **all six regional bosses** (Root, Bell, Solar, Sphinx, Bellbeast, Cantor) × two real class skill strategies = **216 deterministic authored encounter executions**, with source-owned original Forge T1–T4 item rolls and authoritatively structured persisted-kit QA snapshots.
- Track real casts, status applications, phases; report only observed events, no final CP or boss-balance approval.
- Reject a forged kit digest, wrong encounter seed/boss, absent claimed equipment, simulated storage verifier failure, or party input to the solo bridge.
- Both original-Forge and persisted-enemy verification callbacks are QA stubs, NOT an authenticated database account lock, battle authority certificate or transactional reward claim.
- `grantAllowed:false`, `marketTradeAllowed:false`, `releaseApproved:false` unconditionally.

## Strict release blockers
Source-compatible original multi-slot Forge builds and actual authored six-boss encounter source are now separately testable. Neither means the **same production-authoritative** source has been assembled, transactionally locked and signed with the final Skills × Combat 2.0 party/reward engine. Remaining:
- Full T1–T9 item and profession creation, claimed set identities and numerical 2/4/6 effects, innate class-based percentages with nonclass-restricted random affixes, socket/gem/enhancement custody, source-defined final CP policy.
- Source-owned class/ability/trait/Enemy 2.0 version coordination, signed replay and class balance against multiple viable counters, not a mandated specific class.
- Actual authenticated PostgreSQL lock/transaction/CAS, four-player account/character state, original Forge Bank ownership handoffs, boss/death/dungeon settlement and replay-safe no-duplicate rewards.
- World Bosses, Party Events, Guild PVE and Player Market 2.0 all consuming the **same** new exact-copy equipment authority; legacy equipment forever untradeable in Player Market, even via resale.
- Verified CI, actual mobile UI/theme review approval, no live deployment until user-approved coordinated 2.0 release.

## CI
Private `Equipment + Combat 2.0 expanded-set integration` compiles under strict TS and executes both suites. Report confirmed exact head workflow result, not draft completion, and never authorize execution from a successful test.
