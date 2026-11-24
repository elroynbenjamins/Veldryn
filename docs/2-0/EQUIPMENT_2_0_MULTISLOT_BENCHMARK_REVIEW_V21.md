# Equipment 2.0 V21 — expanded benchmark and integration follow-up

24 November 2026. V14 catalogue/economy and V18 source-effect proposals remain unchanged. C12 and D1–D10 remain open. No live mechanics, release flags, main merge or database changes.

## Verified V20 outcomes
Exact head 584a9d13ff5433b3527acb98f116cf83cf301f3e: hidden catalogue 45389221562, isolated core 45389221392, private expanded integration 45389221324, T1–T4 expansion, unique forged equipment, Companion identity and Q-mode pressure passed. Private integration repeated V19's 324 actual single-item pairs, 0 wins in either arm, +430.0902 average raw damage and zero healing delta. Not suitable for CP calibration.
Private GameState boundary 45389221555 and release economy 45389221512 failed backend rootDir because the sixth effect-gem-policy test still imported mobile game and private type re-exports. V21 includes this exact test in cross-project config and backend exclusion, changes its two type imports to pure history/socket types, and ensures the private compile runs even if backend typecheck fails. All six existing tests retained; no weakening of strict typing or ownership validation. New V21 results unconfirmed.
Mobile core 45389221507 failed Expo patch compatibility (58.0.25 vs ~58.0.26). Mobile UX 45389221374 compiled and then failed tests including Copper Pickaxe Gold consistency, blueprint drop rounding/scarcity and scroll indicator validation. These are separate 1.0.x/content/UX reconciliation issues, not resolved by V21. Edge parity 45389221470 reported both generated bundles stale. No regeneration, lockfile change or deployment. Dungeon mechanics failed; remaining broad checks were queued/running at readback.

## New solo matrix (prepared, NOT confirmed executed)
648 matched pairs: 9 classes × 2 specializations × 6 authored regional boss kits × 3 strategies × 2 QA difficulty bands. 120s ceiling, shared fixed band values per region (base HP 20k/60k and attack 100/200, multiplied 1/2/3 in Asterfall/Sunscar/Frostmarch). These are deliberately hypothetical sensitivity bands, not shipped boss balance.
Select original Forge source-compatible non-set equipment at highest available tier at or below target T1–T4, use source-verified mint/claim/virtual-equip QA ledger, count missing and downgraded slots, never fabricate gear. Combined hand weapons omit offhand. Original Forge catalogue only; expanded T5 identities cannot be minted. Same source copies, skills and enemy/seed within pair; perturb one exact V19 permanent channel; deterministic original replay and targeted candidate replay. Real authored regional enemy kit through existing solo authority. The new ledger fixture verifier remains test-only, not real authenticated storage.
Measure win/timeout/wipe, both-win duration, raw damage/healing, damage taken, remaining HP and interrupts; never treat a timeout as a win or raw stat delta as CP.

## Controlled party matrix (prepared, NOT confirmed executed)
Three compositions covering all nine classes:
- Ironwarden, Wayfinder, Ravager, Dawnkeeper.
- Bastion, Hexweaver, Knife Dancer, Stonecaller.
- Dreadguard, Ravager, Hexweaver, Dawnkeeper.
3 regions × 3 teams × 2 spec indices × 2 bands = 36 distinct baseline encounters; 3 separate role perturbations per baseline = 108 matched pairs. One tank, two damage, one support, one actor perturbed at a time (first damage actor). Generic controlled boss pressure workload, not authored solo boss authority and not production dungeon simulation. 120s ceiling, HP 50k/150k and AP 220/440 times region multiplier. Per-player and team damage, effective healing, survival and damage taken; no shared source copy, fixed original baseline. No class-resonance effect applied.
Both matrices feed strict source-coefficient/coverage/result audits, with synthetic negative tests. Synthetic results do not count as actual engine results. Total planned 756 matched pairs, not 756 confirmed victories or simulations. New exact-head CI unconfirmed.

## Decisions and blockers
Do not modify legacy gear, mint, economy, live UI, loot or market authority. Conditional effects remain phase-bound QA operations only; no engine event adapter, no conditional combat results. Complete player CP remains null/unapproved. Next verify V21 CI and inspect coverage gaps and measured role outcomes; fix remaining private compile errors if any, separately reconcile Expo, tool economy and Edge generated artifacts; then implement a private typed event adapter for conditional mechanics. No release authority.
