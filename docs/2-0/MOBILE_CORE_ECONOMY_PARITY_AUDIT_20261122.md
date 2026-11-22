# Hidden Classes / Equipment 2.0 — Current-main economy and mobile-test parity

**22 November 2026 · hidden #1614 review · never deployed or merged to main**

## Root causes from actual CI logs
The hidden Classes/Skills 2.0 PR #1377 diverged from recent 1.0.x \`main\`. The four broad mobile-core failures were:
1. \`gold-economy-costs\`: old test asserted a Copper Pickaxe costs **288 Gold**; its authoritative tier-1 tool recipe has long cost **400 Gold** (base 120 → 20% surcharge 144 → tier-1 multiplier 3 → nearest hundred 400). Main's test also expects 400. Do not lower the price to satisfy an obsolete fixture.
2. \`gathering-tools\`: test assumed a 0.10-percentage-point round-down and only the prior -25% blueprint scarcity; the current live policy added a second **-50%** reduction to avoid flooding the market when combat speeds up. The new final rounding step is 0.05 percentage points.
3. \`balance-projection\`: Thornling's Aster-Iron Hatchet blueprint final rate had an obsolete 3.5% fixture; the actual correct new intended final rate is **0.55%**.
4. \`tools/validate-scroll-indicators.mjs\`: \`apps/mobile/src/screens/SkillsV2PreviewScreen.tsx:315\` lacks an explicit horizontal-scroll-indicator flag. This is a hidden visual UI decision and has **NOT** been changed or waived pending game-owner review.

## Hidden parity changes
- Copied the exact authoritative current-main monster loot catalogue (the only source diffs were 3 blueprint-source moves and explanatory comments). No non-blueprint loot probability changes.
- Retained original authored blueprints and recipe costs, but applied the current-main blueprint-specific \`0.75 × 0.5\` drop multiplier; normal monster -5% modifier remains distinct.
- Rounds the final drop fraction to **0.0005** in integer ticks to avoid binary float multiplications causing false equality regressions.
- Moves two Tier-3 blueprint hunts to Fallen Sentinel and Oathglass Revenant and the Frostmarch rod hunt to Lakebound Specter, matching production's **source** instead of granting extra source copies.
- Reconciled three targeted stale regression tests and added nine pinned final chances (0.60%, 0.55%, 0.50%, 0.45%, 0.40%, 0.35%, 0.30%, 0.25%, 0.25%) with exactly one ordinary encounter per blueprint.
- Intentionally did NOT import the current-main additive 4-tier gathering-tool stacking, per-copy speed/rarity bonus rolls, new \`equippedToolIdsByTier\` save shape or the 2.0 independent profession-to-tool equip authority into the same patch. Those require their own focused state migration, new exact-copy custody validation and 2.0 approval gates.

## Build evidence and gates
The guarded workflow \`Hidden Combat 2.0 economy parity Edge bundle sync\` run **45027405679**, job **137223323063** was **SUCCESS**: froze deps, generated gameplay and co-op with \`liveEdgeCombatV2IsolationPlugin()\`, checked byte-for-byte parity, rejected all unallowlisted changes, and committed **only** those two generated files to hidden branch \`integration/combat-v2-mobile-core-economy-parity-20261122\`.

The bot's commit does not re-trigger full PR CI; this document revision requests a fresh, authored, exact-head validation. **Do not declare all four broad test failures fixed** unless latest source+tests prove it. The fourth scroll-indicator issue remains explicitly unapproved. The final 2.0 release still needs full current-main convergence, staging custody, signed gear snapshots, T5–T9 materials, independent professions, Android and visual design approval.

**Hard safety:** no \`main\` merge, no SQL applied, no feature toggles enabled, no Android release, no player data or actual UI/theme runtime changed by #1614.
