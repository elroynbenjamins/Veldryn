# Skills & Classes 2.0 — CI recovery + cross-system source safety
Date: 2026-11-19 | PRIVATE DRAFT | hidden / not live

## Pass 1 — consolidated Skills 2.0 CI recovery

The consolidated canonical Skills & Classes PR #1377 (head `3d1f248d89dc1f74a3258bef175d5a5a22c47a02`) was checked against its actual GitHub Actions logs. The backend compile job failed with `TS1128`, `TS1005`, etc at lines 121–158 of `solo-reward-disposable-qa-writers.ts`, so cross-system matrix, Edge and gameplay test steps never ran. This was not an equipment balance finding. GitHub source inspection identified a duplicated and orphaned ~1.8k-byte function tail after the legitimate closing brace. Removed it without changing grant persistence logic or live reward behavior.

The QA writers are still disabled by default, unmounted, and restricted to disposable private SQL test tables. Live characters, gold, materials, XP and Inbox were untouched.

## Pass 2 — class + equipment + enemy source contract reconciliation

Two previously divergent pilots for exact crafting copies and authored enemy snapshots cannot safely be merged wholesale; in particular, the exact-craft pilot explicitly reports `eq2-cv2-exact-source-v1`, `rarityAndQualityAlreadyApplied:true`, and `combatReady:false`. The current Combat 2.0 `resolveVerifiedEquipmentBaseV2` applies rarity/quality once to unscaled catalog base stats. Feeding that pre-scaled receipt back into the resolver would apply its multipliers **twice**.

- Added guarded stat provenance fields to `EquipmentBaseDefinitionV2`: `statSource`, `rarityAndQualityAlreadyApplied`, and `sourceSchema`. A frozen exact-crafting receipt is rejected by a named error until a separately reviewed exact-copy adapter exists. An unknown explicitly declared provenance is rejected, while documented historical synthetic fixtures without a marker remain allowed. **This is not yet a production source-authentication solution**.
- Added tests at the actual unified class / Skills / Equipment pipeline to ensure marked frozen receipts fail closed and explicit authored/unscaled stats preserve exactly-once application.
- Enhanced generic `compileEnemiesForCombatV2` to reject input tagged or authored by the persisted Enemy V2 compiler, including authored ability and phase IDs. It remains idempotent for its own generic compiled entries. Added negative tests for authored mixed pipelines and preservation of disabled legacy processing.
- The authoritative `prepareSoloEnemyKitsV2` and `verifyPersistedEnemyKitsV2` route remains separate and continues using the server-issued kit authority. We do not inject the older Enemy snapshot pilot, nor change live dungeons or Q-Mode.

## Holds before merging to main

1. Exact-head green backend, synthetic matrix, hidden source-isolation and legacy regressions. The previous consolidated head failed backend compilation.
2. Agreement with Equipment 2.0 on one server-owned item source format (authored unscaled versus frozen pre-scaled), identity, custody and gem/affix behavior. An explicit canonical source marker should eventually be mandatory on all production definitions, with a staged data-shape review.
3. Enemy kit parity for Tier 1, final behavior and balance of all nine classes and 18 specs (synthetic scenarios are not live calibration).
4. Updated `main` reconciliation, staging/production database migration plan, native Android QA and explicit enablement approval.

No public routes, Supabase migrations, flags or production character data changed.
